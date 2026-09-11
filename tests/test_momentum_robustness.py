"""Synthetic tests for momentum implementation-cost and execution-timing robustness checks."""
import unittest

import numpy as np
import pandas as pd

from scripts.momentum_robustness import (
    apply_turnover_costs,
    backtest_next_day_close,
    wealth_from_returns,
)


class MomentumRobustnessTests(unittest.TestCase):
    def test_cost_drag_uses_one_way_turnover_and_preserves_spy(self):
        dates = pd.to_datetime(["2020-02-03", "2020-02-04"])
        returns = pd.DataFrame(
            {"MOMENTUM": [0.10, 0.02], "SPY": [0.01, 0.01]},
            index=dates,
        )
        rebalances = pd.DataFrame(
            {"first_return": ["2020-02-03"], "turnover": [1.0]},
            index=pd.to_datetime(["2020-01-31"]),
        )

        adjusted = apply_turnover_costs(returns, rebalances, 10)

        # 10 bps on 100% one-way turnover = 0.10% portfolio drag.
        expected = (1 - 0.001) * (1 + 0.10) - 1
        self.assertAlmostEqual(adjusted.loc[dates[0], "MOMENTUM"], expected)
        self.assertAlmostEqual(adjusted.loc[dates[1], "MOMENTUM"], 0.02)
        pd.testing.assert_series_equal(adjusted["SPY"], returns["SPY"])

    def test_zero_cost_is_exact_identity(self):
        dates = pd.to_datetime(["2020-02-03", "2020-02-04"])
        returns = pd.DataFrame(
            {"MOMENTUM": [0.10, -0.02], "SPY": [0.01, -0.01]},
            index=dates,
        )
        rebalances = pd.DataFrame(
            {"first_return": ["2020-02-03"], "turnover": [1.0]},
            index=pd.to_datetime(["2020-01-31"]),
        )
        pd.testing.assert_frame_equal(
            apply_turnover_costs(returns, rebalances, 0),
            returns,
        )

    def test_wealth_requires_initial_date_before_first_return(self):
        returns = pd.DataFrame(
            {"MOMENTUM": [0.10], "SPY": [0.05]},
            index=pd.to_datetime(["2020-02-03"]),
        )
        wealth = wealth_from_returns(returns, "2020-01-31")
        self.assertEqual(float(wealth.iloc[0, 0]), 1.0)
        self.assertAlmostEqual(float(wealth.iloc[-1]["MOMENTUM"]), 1.10)
        with self.assertRaisesRegex(ValueError, "strictly precede"):
            wealth_from_returns(returns, "2020-02-03")

    def test_next_day_execution_waits_in_cash_through_first_close(self):
        dates = pd.to_datetime(
            ["2020-01-31", "2020-02-03", "2020-02-04", "2020-02-28"]
        )
        stocks = [f"C{i}" for i in range(10)]
        prices = pd.DataFrame(100.0, index=dates, columns=stocks + ["SPY"])
        prices["C0"] = [100, 200, 400, 400]
        prices["SPY"] = [100, 101, 102, 103]
        weights = pd.DataFrame(
            0.1,
            index=pd.to_datetime(["2020-01-31"]),
            columns=stocks,
        )

        returns, diagnostics, events = backtest_next_day_close(prices, weights)

        self.assertEqual(returns.index[0], pd.Timestamp("2020-02-03"))
        self.assertEqual(returns.loc["2020-02-03", "MOMENTUM"], 0.0)
        # C0 doubles after the delayed entry while nine names are flat.
        self.assertAlmostEqual(returns.loc["2020-02-04", "MOMENTUM"], 0.10)
        self.assertEqual(
            diagnostics.loc[pd.Timestamp("2020-01-31"), "execution_date"],
            pd.Timestamp("2020-02-03"),
        )
        self.assertEqual(events, [])

    def test_next_day_execution_keeps_spy_on_continuous_calendar(self):
        dates = pd.to_datetime(
            ["2020-01-31", "2020-02-03", "2020-02-04", "2020-02-28"]
        )
        stocks = [f"C{i}" for i in range(10)]
        prices = pd.DataFrame(100.0, index=dates, columns=stocks + ["SPY"])
        prices["SPY"] = [100, 101, 102, 103]
        weights = pd.DataFrame(
            0.1,
            index=pd.to_datetime(["2020-01-31"]),
            columns=stocks,
        )

        returns, _, _ = backtest_next_day_close(prices, weights)
        expected_spy = prices["SPY"].pct_change(fill_method=None).iloc[1:]
        pd.testing.assert_series_equal(
            returns["SPY"], expected_spy, check_names=False
        )

    def test_missing_next_day_execution_quote_fails_without_substitution(self):
        dates = pd.to_datetime(["2020-01-31", "2020-02-03", "2020-02-28"])
        stocks = [f"C{i}" for i in range(10)]
        prices = pd.DataFrame(100.0, index=dates, columns=stocks + ["SPY"])
        prices.loc["2020-02-03", "C0"] = np.nan
        weights = pd.DataFrame(
            0.1,
            index=pd.to_datetime(["2020-01-31"]),
            columns=stocks,
        )

        with self.assertRaisesRegex(ValueError, "execution quote"):
            backtest_next_day_close(prices, weights)


if __name__ == "__main__":
    unittest.main()
