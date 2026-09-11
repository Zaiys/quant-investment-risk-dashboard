import unittest
import numpy as np
import pandas as pd
from scripts.research_checks import common_observations, wealth_from_returns


class ResearchCorrectionTests(unittest.TestCase):
    def test_immediate_loss_is_measured_from_initial_capital(self):
        returns = pd.Series([-0.2, 0.1], index=pd.to_datetime(['2020-01-02', '2020-01-03']))
        wealth = wealth_from_returns(returns, '2020-01-01')
        np.testing.assert_allclose(wealth, [1.0, 0.8, 0.88])
        self.assertAlmostEqual((wealth / wealth.cummax() - 1).min(), -0.2)

    def test_new_peak_and_subsequent_loss(self):
        returns = pd.DataFrame({'a': [0.1, -0.5]}, index=pd.date_range('2020-01-02', periods=2))
        wealth = wealth_from_returns(returns, '2020-01-01')
        self.assertAlmostEqual((wealth / wealth.cummax() - 1)['a'].min(), -0.5)

    def test_common_returns_share_dates_and_never_bridge_missing_quotes(self):
        index = pd.date_range('2020-01-01', periods=7)
        prices = pd.DataFrame({'a': [1,2,3,4,5,6,7], 'b': [np.nan,10,11,np.nan,13,14,15]}, index=index)
        levels, returns = common_observations(prices, ['a','b'])
        self.assertEqual(levels.index[0], index[1])
        self.assertEqual(list(returns.index), [index[2], index[5], index[6]])
        self.assertTrue(returns.notna().all().all())
        self.assertAlmostEqual(returns.loc[index[5],'b'], 14/13-1)

    def test_empty_or_incomplete_wealth_inputs_fail(self):
        with self.assertRaises(ValueError):
            wealth_from_returns(pd.Series(dtype=float), '2020-01-01')
        with self.assertRaises(ValueError):
            wealth_from_returns(pd.Series([np.nan],index=pd.to_datetime(['2020-01-02'])), '2020-01-01')


if __name__ == '__main__':
    unittest.main()
