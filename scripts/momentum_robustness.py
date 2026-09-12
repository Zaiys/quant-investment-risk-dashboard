"""Robustness checks around the verified monthly momentum baseline.

These checks do not replace or retune the original strategy. They answer two
separate questions:

1. How sensitive is the verified gross backtest to simple implementation costs?
2. How sensitive is it to waiting until the next trading day's close to execute?

The original 12-month / top-10 / equal-weight / monthly rule remains unchanged.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from scripts.market_data import ROOT, load_market_inputs, universe_from_notebook
from scripts.momentum_outputs import load_outputs
from scripts.momentum_research import performance_summary

COST_BPS = (0, 5, 10, 20)
STRATEGY = "MOMENTUM"
DEFAULT_OUTPUT = ROOT / "data/reviewed/momentum_robustness"


def wealth_from_returns(returns, initial_date):
    """Prepend starting wealth 1 immediately before the first earned return."""
    if returns.empty or not np.isfinite(returns.to_numpy()).all():
        raise ValueError("Wealth requires complete non-empty returns")
    if returns.index.has_duplicates or not returns.index.is_monotonic_increasing:
        raise ValueError("Wealth requires unique chronological returns")
    if returns.le(-1).any().any():
        raise ValueError("Wealth requires positive remaining capital")
    initial_date = pd.Timestamp(initial_date)
    if initial_date >= returns.index[0]:
        raise ValueError("Initial wealth date must strictly precede first return")
    compounded = (1 + returns).cumprod()
    initial = pd.DataFrame(
        [np.ones(len(returns.columns))],
        index=[initial_date],
        columns=returns.columns,
    )
    return pd.concat([initial, compounded])


def apply_turnover_costs(returns, rebalances, cost_bps, strategy=STRATEGY):
    """Apply a simple cost drag at each rebalance's first earned return.

    ``cost_bps`` is charged per unit of the project's one-way turnover measure.
    Example: 10 bps with 25% one-way turnover applies a 2.5 bp portfolio drag.
    The initial cash-to-stock allocation is charged using its recorded turnover.

    The cost is applied multiplicatively before the first gross return of the
    holding month: ``(1 - cost) * (1 + gross_return) - 1``.
    """
    if not np.isfinite(cost_bps) or cost_bps < 0:
        raise ValueError("Cost assumption must be finite and non-negative")
    if strategy not in returns.columns:
        raise ValueError(f"Missing strategy column: {strategy}")
    required = {"first_return", "turnover"}
    if not required.issubset(rebalances.columns):
        raise ValueError("Rebalances must contain first_return and turnover")
    if not np.isfinite(returns.to_numpy()).all() or returns.index.has_duplicates:
        raise ValueError("Costs require finite returns on a unique grid")
    if pd.to_datetime(rebalances["first_return"]).duplicated().any():
        raise ValueError("Duplicate rebalance first return would charge costs twice")

    adjusted = returns.copy()
    rate = float(cost_bps) / 10000.0

    for _, row in rebalances.iterrows():
        first_return = pd.Timestamp(row["first_return"])
        if first_return not in adjusted.index:
            raise ValueError(
                f"Rebalance first return missing from strategy grid: {first_return.date()}"
            )
        turnover = float(row["turnover"])
        if not np.isfinite(turnover) or turnover < 0:
            raise ValueError("Turnover must be finite and non-negative")
        drag = rate * turnover
        if drag >= 1:
            raise ValueError("Cost assumption removes all portfolio capital")
        gross = float(adjusted.loc[first_return, strategy])
        if drag != 0:
            adjusted.loc[first_return, strategy] = (1 - drag) * (1 + gross) - 1

    return adjusted


def cost_sensitivity(
    returns,
    rebalances,
    daily_rf,
    initial_date,
    cost_bps=COST_BPS,
    strategy=STRATEGY,
):
    """Recompute strategy metrics across pre-specified turnover-cost assumptions."""
    assumptions = tuple(float(value) for value in cost_bps)
    if len(set(assumptions)) != len(assumptions):
        raise ValueError("Cost assumptions must be unique")
    if not assumptions or any(not np.isfinite(value) or value < 0 for value in assumptions):
        raise ValueError("Cost assumptions must be finite, non-negative and non-empty")

    rows = []
    for bps in assumptions:
        net_returns = apply_turnover_costs(returns, rebalances, bps, strategy)
        wealth = wealth_from_returns(net_returns, initial_date)
        summary = performance_summary(net_returns, wealth, daily_rf).loc[strategy]
        row = summary.to_dict()
        row["cost_bps"] = bps
        row["ending_wealth_multiple"] = float(wealth[strategy].iloc[-1])
        row["mean_recurring_cost_drag"] = (
            float(rebalances["turnover"].iloc[1:].mean()) * bps / 10000.0
        )
        row["mean_recurring_cost_drag_bps"] = row["mean_recurring_cost_drag"] * 10000
        rows.append(row)

    result = pd.DataFrame(rows).set_index("cost_bps").sort_index()
    if 0.0 in result.index:
        result["cagr_change_vs_gross"] = result["cagr"] - result.loc[0.0, "cagr"]
        result["cagr_change_vs_gross_pp"] = result["cagr_change_vs_gross"] * 100
        result["total_return_change_vs_gross"] = (
            result["total_return"] - result.loc[0.0, "total_return"]
        )
    return result


def backtest_next_day_close(prices, weights, strategy=STRATEGY):
    """Re-run the fixed signal with execution delayed to the next trading-day close.

    Holdings are still selected from the formation-close signal. The portfolio
    liquidates the prior holdings at each formation close and remains in
    non-interest-bearing cash through the first trading day of the following month, so its
    strategy return on that day is zero. It enters at that day's adjusted close
    and then holds fixed adjusted units for the rest of the month.

    SPY remains continuously invested on the original daily grid. This measures
    a monthly cash-gap convention, not a delayed rebalance that retains the
    prior holdings through execution. Next-day adjusted closes remain idealized
    fills and cash gaps can help or hurt returns.

    No transaction costs are applied here; this check isolates execution timing.
    """
    blocks, diagnostics, events = [], [], []
    started = False
    if prices.index.has_duplicates or not prices.index.is_monotonic_increasing:
        raise ValueError("Next-day prices require a unique chronological grid")
    if weights.index.has_duplicates or not weights.index.is_monotonic_increasing:
        raise ValueError("Next-day weights require unique chronological formations")
    if not np.isfinite(weights.to_numpy()).all() or weights.lt(0).any().any():
        raise ValueError("Next-day weights must be finite and non-negative")

    for formation_date, target in weights.iterrows():
        if target.sum() == 0:
            if started:
                raise ValueError("Fewer than ten eligible stocks after strategy inception")
            continue
        if formation_date not in prices.index:
            raise ValueError("Formation date missing from price index")
        if not np.isclose(float(target.sum()), 1.0):
            raise ValueError("Next-day check requires a fully invested target portfolio")
        if not started and pd.isna(prices.loc[formation_date, "SPY"]):
            continue

        holding_month = formation_date.to_period("M") + 1
        dates = prices.index[prices.index.to_period("M") == holding_month]
        if len(dates) == 0:
            continue

        execution_date = dates[0]
        if formation_date != prices.index[prices.index.get_loc(execution_date) - 1]:
            raise ValueError("Formation must be the trading close immediately before execution")
        selected = target[target > 0]
        base = prices.loc[execution_date, selected.index]
        if base.isna().any() or not np.isfinite(base).all() or (base <= 0).any():
            raise ValueError("Invalid next-day execution quote")

        # The strategy is in cash until the first holding-day close.
        strategy_return = pd.Series(0.0, index=dates, name=strategy)

        if len(dates) > 1:
            return_dates = dates[1:]
            quotes = prices.loc[return_dates, selected.index]
            invalid = quotes.isna() | ~np.isfinite(quotes) | quotes.le(0)
            failed = invalid.cummax()
            relative = quotes.div(base).mask(failed, 0.0)

            for ticker in selected.index:
                if invalid[ticker].any():
                    events.append(
                        {
                            "formation_date": str(formation_date.date()),
                            "execution_date": str(execution_date.date()),
                            "ticker": ticker,
                            "first_invalid_date": str(
                                invalid.index[invalid[ticker]][0].date()
                            ),
                            "policy": (
                                "Position marked to zero; no recovery within this holding month"
                            ),
                        }
                    )

            nav = relative.mul(selected).sum(axis=1)
            if nav.le(0).any():
                raise ValueError("Complete portfolio loss in next-day execution check")
            prior_nav = nav.shift(1)
            prior_nav.iloc[0] = 1.0
            strategy_return.loc[return_dates] = nav / prior_nav - 1

        spy_prices = prices.loc[
            pd.DatetimeIndex([formation_date]).append(dates), "SPY"
        ]
        if not np.isfinite(spy_prices).all() or spy_prices.le(0).any():
            raise ValueError("Missing benchmark quote inside next-day evaluation sample")
        spy_return = spy_prices.pct_change(fill_method=None).iloc[1:]

        block = pd.DataFrame({strategy: strategy_return, "SPY": spy_return})
        if block.isna().any().any():
            raise ValueError("Invalid next-day common return grid")
        blocks.append(block)
        diagnostics.append(
            {
                "formation_date": formation_date,
                "execution_date": execution_date,
                "first_return": dates[0],
                "last_return": dates[-1],
                "observations": len(dates),
                "holdings": len(selected),
                "partial_month": holding_month == prices.index[-1].to_period("M"),
            }
        )
        started = True

    if not blocks:
        raise ValueError("No next-day execution evaluation sample")

    returns = pd.concat(blocks)
    if returns.index.has_duplicates or returns.isna().any().any():
        raise ValueError("Invalid next-day return grid")

    diagnostics = pd.DataFrame(diagnostics).set_index("formation_date")
    return returns, diagnostics, events


def execution_sensitivity(
    prices,
    weights,
    baseline_returns,
    baseline_summary,
    daily_rf,
    initial_date,
    strategy=STRATEGY,
):
    """Compare the verified formation-close baseline with next-day-close execution."""
    delayed_returns, diagnostics, events = backtest_next_day_close(
        prices, weights, strategy
    )
    if not delayed_returns.index.equals(baseline_returns.index):
        raise ValueError("Next-day execution changed the verified calendar grid")
    pd.testing.assert_series_equal(
        delayed_returns["SPY"], baseline_returns["SPY"], check_names=False
    )

    delayed_wealth = wealth_from_returns(delayed_returns, initial_date)
    delayed_summary = performance_summary(
        delayed_returns, delayed_wealth, daily_rf
    )

    comparison = pd.DataFrame(
        [
            baseline_summary.loc[strategy].to_dict(),
            delayed_summary.loc[strategy].to_dict(),
            baseline_summary.loc["SPY"].to_dict(),
        ],
        index=["FORMATION_CLOSE_BASELINE", "NEXT_DAY_CLOSE", "SPY"],
    )
    comparison.index.name = "variant"
    comparison["cagr_change_vs_baseline"] = (
        comparison["cagr"] - comparison.loc["FORMATION_CLOSE_BASELINE", "cagr"]
    )
    comparison["cagr_change_vs_baseline_pp"] = comparison["cagr_change_vs_baseline"] * 100
    return comparison, delayed_returns, diagnostics, events


def run_robustness(output_dir=DEFAULT_OUTPUT, write=True):
    """Run both robustness checks from the frozen verified baseline and inputs."""
    frames, meta = load_outputs()
    prices, cached_rf, input_manifest = load_market_inputs(universe_from_notebook())
    initial_date = pd.Timestamp(meta["verification"]["initial_wealth_date"])
    daily_rf = ((1 + cached_rf.squeeze() / 100) ** (1 / 252) - 1).reindex(
        prices.index
    ).ffill()

    costs = cost_sensitivity(
        frames["returns"],
        frames["rebalances"],
        daily_rf,
        initial_date,
    )

    # Zero-cost sensitivity must reproduce the verified gross strategy exactly.
    for key in [
        "total_return",
        "arithmetic_return",
        "cagr",
        "volatility",
        "sharpe",
        "max_drawdown",
        "beta",
        "correlation",
    ]:
        np.testing.assert_allclose(
            costs.loc[0.0, key],
            frames["summary"].loc[STRATEGY, key],
            rtol=1e-12,
            atol=1e-14,
        )

    execution, delayed_returns, delayed_diagnostics, delayed_events = (
        execution_sensitivity(
            prices,
            frames["weights"],
            frames["returns"],
            frames["summary"],
            daily_rf,
            initial_date,
        )
    )

    outputs = {
        "transaction_cost_sensitivity": costs,
        "execution_sensitivity": execution,
        "next_day_returns": delayed_returns,
        "next_day_diagnostics": delayed_diagnostics,
        "next_day_wealth": wealth_from_returns(delayed_returns, initial_date),
        "transaction_cost_returns": pd.DataFrame({
            **{str(bps): apply_turnover_costs(frames["returns"], frames["rebalances"], bps)[STRATEGY]
               for bps in COST_BPS},
            "SPY": frames["returns"]["SPY"],
        }),
    }
    from scripts.momentum_robustness_outputs import verify_robustness, write_outputs
    report = verify_robustness(outputs, frames, meta, prices, daily_rf, delayed_events)
    if input_manifest != meta["input_manifest"]:
        raise ValueError("Robustness inputs differ from the verified baseline")
    if write:
        write_outputs(outputs, meta, report, output_dir)

    return outputs


def _print_percent_table(frame, columns):
    shown = frame.loc[:, columns].copy()
    for column in columns:
        if column in {
            "total_return",
            "cagr",
            "volatility",
            "max_drawdown",
            "cagr_change_vs_gross",
            "cagr_change_vs_baseline",
            "mean_recurring_cost_drag",
        }:
            shown[column] = shown[column].map(lambda value: f"{value:.2%}")
        else:
            shown[column] = shown[column].map(lambda value: f"{value:.4f}")
    print(shown.to_string())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Local reviewed-output directory (ignored by Git)",
    )
    parser.add_argument(
        "--no-write",
        action="store_true",
        help="Run checks and print results without writing local reviewed outputs",
    )
    args = parser.parse_args()

    outputs = run_robustness(args.output_dir, write=not args.no_write)
    print("Independent return-path, turnover, metric and calendar checks passed.")

    print("\nTRANSACTION-COST SENSITIVITY")
    _print_percent_table(
        outputs["transaction_cost_sensitivity"],
        [
            "cagr",
            "volatility",
            "sharpe",
            "max_drawdown",
            "mean_recurring_cost_drag_bps",
            "cagr_change_vs_gross_pp",
        ],
    )

    print("\nEXECUTION-TIMING SENSITIVITY")
    _print_percent_table(
        outputs["execution_sensitivity"],
        [
            "cagr",
            "volatility",
            "sharpe",
            "max_drawdown",
            "beta",
            "correlation",
            "cagr_change_vs_baseline_pp",
        ],
    )

    print(
        "\nThese are robustness checks. They do not replace the verified zero-cost, "
        "formation-close baseline."
    )


if __name__ == "__main__":
    main()
