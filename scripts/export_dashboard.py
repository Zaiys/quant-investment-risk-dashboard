"""Validate and publish already-computed research outputs. No finance calculations."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
from typing import Any, Mapping

from jsonschema import Draft7Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "web/src/data/dashboard.schema.json"
DEFAULT_OUTPUT = ROOT / "web/src/data/dashboard.json"
ANALYSIS_KEYS = ("market", "risk-return", "correlation", "portfolio", "stress")
MOMENTUM = {
    "status": "awaiting",
    "reason": "Awaiting results from notebooks/02_momentum_strategy.ipynb. Strategy research is in progress.",
}


def _unique(values: list[Any], label: str) -> None:
    if len(set(values)) != len(values):
        raise ValueError(f"Duplicate {label}")


def validate_dashboard(payload: Any) -> dict[str, Any]:
    """Apply the shared schema and presentation consistency rules without coercion."""
    # Reject NaN and infinities even when an in-memory producer supplies them.
    json.dumps(payload, allow_nan=False)
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft7Validator(schema, format_checker=FormatChecker()).validate(payload)
    def check_period(value):
        if value["start"] > value["end"]:
            raise ValueError("Source period is reversed")

    def check_source(value):
        check_period(value["period"])
        if value["period"]["end"] > value["asOf"]:
            raise ValueError("Source period ends after asOf")

    _unique([asset["id"] for asset in payload["research"]["universe"]], "universe ID")
    if payload["research"]["period"] is not None:
        check_period(payload["research"]["period"])
    for asset in payload["research"]["universe"]:
        check_period({"start": asset["availableFrom"], "end": asset["availableTo"]})
    if payload["methodology"]["status"] == "available":
        if payload["generatedAt"] is None:
            raise ValueError("Available methodology requires generatedAt")
        check_source(payload["methodology"]["source"])
        _unique([item["id"] for item in payload["methodology"]["items"]], "methodology item ID")
    for key, section in payload["sections"].items():
        if section["status"] != "available":
            continue
        if payload["generatedAt"] is None:
            raise ValueError("Available results require generatedAt")
        entity_ids = [entity["id"] for entity in section.get("entities", [])]
        scenario_ids = [scenario["id"] for scenario in section.get("scenarios", [])]
        _unique(entity_ids, "entity ID")
        _unique(scenario_ids, "scenario ID")
        for scenario in section.get("scenarios", []):
            check_period(scenario["period"])

        def references(item):
            if "entityId" in item and item["entityId"] not in entity_ids:
                raise ValueError("Unknown entity reference")
            if "scenarioId" in item and item["scenarioId"] not in scenario_ids:
                raise ValueError("Unknown scenario reference")

        for metric in section["metrics"]:
            references(metric)
        source = section["source"]
        if source["period"]["start"] > source["period"]["end"]:
            raise ValueError("Source period is reversed")
        if source["period"]["end"] > source["asOf"]:
            raise ValueError("Source period ends after asOf")
        _unique([widget["id"] for kind in ("metrics", "charts", "tables", "matrices") for widget in section.get(kind, [])], f"{key} widget ID")
        for chart in section["charts"]:
            references(chart)
            _unique([series["id"] for series in chart["series"]], "series ID")
            for series in chart["series"]:
                references(series)
                if chart["kind"] != "scatter" and [point["x"] for point in series["points"]] != [point["x"] for point in chart["series"][0]["points"]]:
                    raise ValueError("Line and bar series must share ordered x coordinates")
                _unique([point["x"] for point in series["points"]], "x coordinate")
                for point in series["points"]:
                    is_number = isinstance(point["x"], (int, float)) and not isinstance(point["x"], bool)
                    if (chart["xUnit"] == "text" and not isinstance(point["x"], str)) or (chart["xUnit"] != "text" and not is_number):
                        raise ValueError("Chart x coordinate does not match xUnit")
                    if chart["kind"] == "scatter" and not is_number:
                        raise ValueError("Scatter charts require numeric x coordinates")
        for table in section["tables"]:
            references(table)
            _unique([column["key"] for column in table["columns"]], "column key")
            _unique([row["id"] for row in table["rows"]], "row ID")
            for row in table["rows"]:
                references(row)
                if len(row["cells"]) != len(table["columns"]):
                    raise ValueError("Table row length does not match columns")
                for cell, column in zip(row["cells"], table["columns"]):
                    if cell is None:
                        continue
                    is_number = isinstance(cell, (int, float)) and not isinstance(cell, bool)
                    if (column["unit"] == "text" and not isinstance(cell, str)) or (column["unit"] != "text" and not is_number):
                        raise ValueError("Table cell does not match column unit")
        for matrix in section.get("matrices", []):
            _unique([label["id"] for label in matrix["labels"]], "matrix label ID")
            size = len(matrix["labels"])
            if len(matrix["values"]) != size or any(len(row) != size for row in matrix["values"]):
                raise ValueError("Matrix dimensions do not match labels")
    return payload


def publish_snapshot(payload: Any, output: str | Path = DEFAULT_OUTPUT) -> Path:
    """Atomically publish a validated JSON snapshot; never accept notebook outputs."""
    target = Path(output).resolve()
    if target.suffix != ".json":
        raise ValueError("Dashboard output must have a .json extension")
    validated = validate_dashboard(payload)
    encoded = json.dumps(validated, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile("w", dir=target.parent, suffix=".tmp", encoding="utf-8", delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(encoded)
        os.replace(temporary, target)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
    return target


def write_dashboard(sections: Mapping[str, Any], output: str | Path = DEFAULT_OUTPUT, *, research: Mapping[str, Any] | None = None, methodology: Mapping[str, Any] | None = None) -> Path:
    """Package complete, precomputed sections. Omitted sections remain explicitly unavailable.

    This writes a full snapshot, not a merge. Supply all sections to retain.
    Momentum results are intentionally rejected by the v2 contract.
    """
    unknown = set(sections) - set(ANALYSIS_KEYS)
    if unknown:
        raise ValueError(f"Unsupported section keys: {', '.join(sorted(unknown))}")
    pending = {key: {"status": "awaiting", "reason": "Reviewed analysis outputs have not been exported."} for key in ANALYSIS_KEYS}
    payload = {
        "schemaVersion": 2,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "research": research if research is not None else {"updatedAt": None, "period": None, "universe": []},
        "methodology": methodology if methodology is not None else {"status": "awaiting", "reason": "Methodological assumptions have not been exported for review."},
        "sections": {**pending, **sections, "momentum": MOMENTUM},
    }
    return publish_snapshot(payload, output)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_OUTPUT, help="Complete JSON snapshot from the Python analysis")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true", help="Validate without writing")
    args = parser.parse_args()
    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"), parse_constant=lambda value: (_ for _ in ()).throw(ValueError(f"Non-finite JSON value: {value}")))
        validate_dashboard(payload)
        if args.check:
            print("Dashboard export is valid.")
        else:
            print(f"Published {publish_snapshot(payload, args.output)}")
    except (ValueError, OSError) as error:
        parser.exit(1, f"Export failed: {error}\n")
    except Exception as error:
        # jsonschema validation errors include the failing field and schema context.
        parser.exit(1, f"Export validation failed: {error}\n")


if __name__ == "__main__":
    main()
