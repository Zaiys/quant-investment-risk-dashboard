"""Presentation contract tests. All fixture numbers are synthetic and test-only."""
import copy
import json
from pathlib import Path
import tempfile
import unittest

from scripts.export_dashboard import ROOT, publish_snapshot, validate_dashboard, write_dashboard


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / "web/tests/fixtures/available.json").read_text())

    def test_preserves_every_computed_value(self):
        original = copy.deepcopy(self.data)
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "dashboard.json"
            publish_snapshot(self.data, target)
            self.assertEqual(json.loads(target.read_text()), original)
        self.assertEqual(self.data, original)

    def test_invalid_export_does_not_replace_previous_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "dashboard.json"
            publish_snapshot(self.data, target)
            previous = target.read_bytes()
            self.data["sections"]["market"]["metrics"][0]["value"] = float("nan")
            with self.assertRaises(ValueError):
                publish_snapshot(self.data, target)
            self.assertEqual(target.read_bytes(), previous)

    def test_helper_marks_omitted_sections_pending_and_preserves_supplied_section(self):
        with tempfile.TemporaryDirectory() as directory:
            target = write_dashboard({"market": self.data["sections"]["market"]}, Path(directory) / "dashboard.json")
            result = json.loads(target.read_text())
            self.assertEqual(result["sections"]["market"], self.data["sections"]["market"])
            self.assertEqual(result["sections"]["portfolio"]["status"], "awaiting")
            self.assertEqual(result["sections"]["momentum"]["status"], "awaiting")

    def test_momentum_results_cannot_be_published(self):
        with self.assertRaises(ValueError):
            write_dashboard({"momentum": self.data["sections"]["market"]})
        self.data["sections"]["momentum"] = self.data["sections"]["market"]
        with self.assertRaises(Exception):
            validate_dashboard(self.data)

    def test_notebook_cannot_be_an_output_target(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "02_momentum_strategy.ipynb"
            with self.assertRaises(ValueError):
                publish_snapshot(self.data, target)
            self.assertFalse(target.exists())

    def test_semantic_failures(self):
        mutations = [
            lambda d: d.update(generatedAt=None),
            lambda d: d["sections"]["market"]["source"]["period"].update(start="2025-01-01"),
            lambda d: d["sections"]["market"]["source"].update(asOf="2023-01-01"),
            lambda d: d["sections"]["market"]["source"].update(path="../secret.ipynb"),
            lambda d: d["sections"]["market"]["source"].update(asOf="2024-02-31"),
            lambda d: d["sections"]["market"]["tables"][0]["rows"][0]["cells"].pop(),
            lambda d: d["sections"]["market"]["tables"][0]["rows"][0]["cells"].__setitem__(1, "20%"),
            lambda d: d["sections"]["market"]["charts"][0]["series"][1]["points"].pop(),
            lambda d: d["sections"]["market"]["charts"][2]["series"][0]["points"][0].update(x="0.1"),
            lambda d: d["sections"]["market"]["metrics"].append(d["sections"]["market"]["metrics"][0]),
            lambda d: d["sections"]["market"].update(metrics=[], charts=[], tables=[]),
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                data = copy.deepcopy(self.data)
                mutation(data)
                with self.assertRaises(Exception):
                    validate_dashboard(data)

    def test_actual_snapshot_is_valid_and_momentum_is_ui_only(self):
        data = json.loads((ROOT / "web/src/data/dashboard.json").read_text())
        validate_dashboard(data)
        self.assertEqual(data["sections"]["momentum"]["status"], "awaiting")


class ExtendedContractTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / 'web/tests/fixtures/available.json').read_text())

    def test_matrix_and_reference_consistency(self):
        mutations = [
            lambda d: d['sections']['market']['metrics'][0].update(entityId='unknown'),
            lambda d: d['sections']['market']['charts'][0].update(scenarioId='unknown'),
            lambda d: d['sections']['correlation']['matrices'][0]['values'].pop(),
            lambda d: d['sections']['correlation']['matrices'][0]['values'][0].__setitem__(1, 1.2),
            lambda d: d['sections']['correlation']['matrices'][0]['labels'][1].update(id='a'),
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                data = copy.deepcopy(self.data)
                mutation(data)
                with self.assertRaises(Exception):
                    validate_dashboard(data)

    def test_explicit_metadata_and_documented_methodology_are_preserved(self):
        research = {'updatedAt':'2024-02-01','period':{'start':'2024-01-01','end':'2024-01-31'},'universe':[{'id':'a','name':'Test A','availableFrom':'2023-01-01','availableTo':'2024-01-31'}]}
        methodology = {'status':'available','source':self.data['sections']['market']['source'],'items':[{'id':'basis','title':'Test definition','detail':'Synthetic test documentation.'}]}
        with tempfile.TemporaryDirectory() as directory:
            target=write_dashboard({'market':self.data['sections']['market']}, Path(directory)/'dashboard.json', research=research, methodology=methodology)
            exported=json.loads(target.read_text())
            self.assertEqual(exported['research'],research)
            self.assertEqual(exported['methodology'],methodology)

if __name__ == "__main__":
    unittest.main()
