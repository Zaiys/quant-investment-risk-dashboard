"""Synthetic tests for momentum implementation-cost and execution-timing robustness checks."""
import unittest

import numpy as np
import pandas as pd

from scripts.momentum_robustness import (
    apply_turnover_costs,
    backtest_next_day_close,
    wealth_from_returns,
    cost_sensitivity,
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
            check_exact=True,
        )

    def test_costs_compound_once_at_initial_and_recurring_rebalances(self):
        dates = pd.to_datetime(['2020-02-03', '2020-02-28', '2020-03-02', '2020-03-03'])
        returns = pd.DataFrame({'MOMENTUM': [.1, -.02, .05, .03], 'SPY': [.01, -.01, .02, .01]}, index=dates)
        rebalances = pd.DataFrame({'first_return': [dates[0], dates[2]], 'turnover': [1., .25]})
        net = apply_turnover_costs(returns, rebalances, 10)
        ratio = (1 + net.MOMENTUM).prod() / (1 + returns.MOMENTUM).prod()
        self.assertAlmostEqual(ratio, (1 - .001) * (1 - .00025))
        pd.testing.assert_frame_equal(net.iloc[[1, 3]], returns.iloc[[1, 3]], check_exact=True)
        for invalid in [-1., np.nan, np.inf]:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                apply_turnover_costs(returns, rebalances, invalid)
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            apply_turnover_costs(returns, pd.concat([rebalances, rebalances]), 10)
        with self.assertRaisesRegex(ValueError, 'all portfolio capital'):
            apply_turnover_costs(returns, rebalances, 10000)
        rf = pd.Series(0., index=dates)
        for invalid in [[], [0, 0], [np.nan], [np.inf]]:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                cost_sensitivity(returns, rebalances, rf, '2020-01-31', invalid)

    def test_cash_gap_repeats_each_month_and_preserves_fixed_units(self):
        dates = pd.to_datetime(['2020-01-31', '2020-02-03', '2020-02-04', '2020-02-28',
                                '2020-03-02', '2020-03-03', '2020-03-31', '2020-04-01'])
        stocks = [f'C{i}' for i in range(11)]
        p = pd.DataFrame(100., index=dates, columns=stocks + ['SPY'])
        p['C0'] = [100, 200, 400, 800, 1600, 3200, 3200, 6400]
        p['C10'] = [100, 100, 100, 100, 1000, 2000, 2000, 4000]
        w = pd.DataFrame(0., index=dates[[0, 3, 6]], columns=stocks)
        w.loc[:, stocks[:10]] = .1
        w.loc[dates[3]:, 'C0'] = 0.
        w.loc[dates[3]:, 'C10'] = .1
        r, d, events = backtest_next_day_close(p, w)
        self.assertEqual(events, [])
        self.assertTrue((r.loc[dates[[1, 4, 7]], 'MOMENTUM'] == 0).all())
        self.assertAlmostEqual((1 + r.loc[dates[1:4], 'MOMENTUM']).prod(), 1.3)
        self.assertAlmostEqual(r.loc[dates[3], 'MOMENTUM'], 1.3 / 1.1 - 1)
        self.assertAlmostEqual((1 + r.loc[dates[4:7], 'MOMENTUM']).prod(), 1.1)
        self.assertEqual(d.iloc[-1]['observations'], 1)
        self.assertTrue(d.iloc[-1]['partial_month'])

    def test_missing_post_entry_quote_is_written_off_without_resurrection(self):
        dates = pd.to_datetime(['2020-01-31', '2020-02-03', '2020-02-04', '2020-02-28'])
        stocks = [f'C{i}' for i in range(10)]
        p = pd.DataFrame(100., index=dates, columns=stocks + ['SPY'])
        w = pd.DataFrame(.1, index=dates[:1], columns=stocks)
        p['C0'] = [100, 100, np.nan, 10000]
        r, _, events = backtest_next_day_close(p, w)
        self.assertAlmostEqual(r.loc[dates[2], 'MOMENTUM'], -.1)
        self.assertAlmostEqual(r.loc[dates[3], 'MOMENTUM'], 0.)
        self.assertEqual(events[0]['first_invalid_date'], '2020-02-04')
        p.loc[dates[2], stocks] = np.nan
        with self.assertRaisesRegex(ValueError, 'Complete portfolio loss'):
            backtest_next_day_close(p, w)

    def test_invalid_benchmark_or_non_month_end_formation_fails(self):
        dates = pd.to_datetime(['2020-01-30', '2020-01-31', '2020-02-03', '2020-02-04'])
        stocks = [f'C{i}' for i in range(10)]
        p = pd.DataFrame(100., index=dates, columns=stocks + ['SPY'])
        w = pd.DataFrame(.1, index=dates[1:2], columns=stocks)
        for bad in [np.nan, np.inf, 0., -1.]:
            changed = p.copy()
            changed.loc[dates[-1], 'SPY'] = bad
            with self.subTest(bad=bad), self.assertRaisesRegex(ValueError, 'benchmark quote'):
                backtest_next_day_close(changed, w)
        w.index = dates[:1]
        with self.assertRaisesRegex(ValueError, 'immediately before'):
            backtest_next_day_close(p, w)

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
