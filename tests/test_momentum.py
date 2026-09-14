"""Adversarial timing and portfolio accounting tests; all synthetic data are test-only."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pandas as pd

from scripts.momentum_research import month_end_prices, momentum_signals, select_weights, backtest
from scripts.momentum_outputs import load_outputs
from scripts.market_data import ROOT


def synthetic_prices():
    dates = pd.bdate_range('2018-01-01', '2021-03-10')
    companies = [f'C{i:02}' for i in range(12)]
    data = {t: 100 * np.exp(np.arange(len(dates)) * (i+1)/10000) for i,t in enumerate(companies)}
    data['SPY'] = 100 * np.exp(np.arange(len(dates))/10000)
    return pd.DataFrame(data, index=dates), companies


class MomentumTimingTests(unittest.TestCase):
    def test_future_prices_cannot_change_past_signals_or_weights(self):
        p, companies = synthetic_prices()
        formation = pd.Timestamp('2020-01-31')
        monthly = month_end_prices(p[companies])
        s = momentum_signals(monthly, p[companies])
        w, _ = select_weights(s)
        changed = p.copy()
        changed.loc[changed.index > formation, 'C00'] *= 1000
        changed.loc[changed.index > formation, 'C11'] = np.nan
        changed_s = momentum_signals(month_end_prices(changed[companies]), changed[companies])
        changed_w, _ = select_weights(changed_s)
        pd.testing.assert_frame_equal(s.loc[:formation], changed_s.loc[:formation])
        pd.testing.assert_frame_equal(w.loc[:formation], changed_w.loc[:formation])
        # Include one next-month date so formation is known to be a completed month.
        truncated = p.loc[:'2020-02-03']
        trunc_s = momentum_signals(month_end_prices(truncated[companies]), truncated[companies])
        pd.testing.assert_frame_equal(s.loc[:formation], trunc_s)
        self.assertEqual(w.loc[formation, 'C00'], 0)

    def test_full_lookback_ipo_and_missing_history_eligibility(self):
        p, companies = synthetic_prices()
        p.loc[:'2019-06-14', 'C11'] = np.nan
        p.loc['2020-06-15', 'C10'] = np.nan
        monthly = month_end_prices(p[companies])
        s = momentum_signals(monthly, p[companies])
        self.assertTrue(s.iloc[:12].isna().all().all())
        self.assertTrue(s.loc[:'2020-05-31','C11'].isna().all())
        self.assertTrue(pd.notna(s.loc['2020-06-30','C11']))
        self.assertTrue(pd.isna(s.loc['2020-06-30','C10']))
        # Exact endpoint missing: never use an earlier quote from the same month.
        p.loc['2020-07-31','C09'] = np.nan
        self.assertTrue(pd.isna(month_end_prices(p[companies]).loc['2020-07-31','C09']))

    def test_top_ten_and_deterministic_ties(self):
        s = pd.DataFrame(1.0, index=pd.to_datetime(['2020-01-31']), columns=[f'C{i:02}' for i in reversed(range(12))])
        w,h = select_weights(s)
        self.assertEqual(set(h.ticker), {f'C{i:02}' for i in range(10)})
        self.assertEqual(list(h['rank']), list(range(1,11)))
        self.assertFalse(h.duplicated(['rebalance_date','ticker']).any())
        self.assertAlmostEqual(w.sum(axis=1).iloc[0],1)
        w,h = select_weights(s.iloc[:,:9])
        self.assertFalse(w.to_numpy().any())
        self.assertTrue(h.empty)

    def test_fixed_units_drift_and_first_return_is_after_formation(self):
        dates = pd.to_datetime(['2020-01-31','2020-02-03','2020-02-28','2020-03-02'])
        stocks = [f'C{i}' for i in range(10)]
        p = pd.DataFrame(100.0, index=dates, columns=stocks+['SPY'])
        p['C0'] = [100,200,400,400]
        w = pd.DataFrame(0.1,index=dates[[0,2]],columns=stocks)
        r,d,e,events = backtest(p,w)
        self.assertEqual(r.index[0],dates[1])
        self.assertAlmostEqual(r.MOMENTUM.iloc[0],0.1)
        self.assertAlmostEqual(r.MOMENTUM.iloc[1],1.3/1.1-1)
        self.assertNotAlmostEqual(r.MOMENTUM.iloc[1],0.1)  # accidental daily rebalance
        self.assertAlmostEqual(e.loc[dates[0],'C0'],0.4/1.3)
        self.assertAlmostEqual(d.turnover.iloc[0],1)
        self.assertAlmostEqual(d.turnover.iloc[1],0.4/1.3-0.1)
        self.assertEqual(events,[])

    def test_missing_held_quote_is_written_off_without_replacement_or_resurrection(self):
        dates = pd.to_datetime(['2020-01-31','2020-02-03','2020-02-28'])
        stocks = [f'C{i}' for i in range(10)]
        p = pd.DataFrame(100.0,index=dates,columns=stocks+['SPY'])
        p['C0'] = [100,np.nan,1000]
        w = pd.DataFrame(0.1,index=dates[:1],columns=stocks)
        r,d,e,events = backtest(p,w)
        self.assertAlmostEqual(r.MOMENTUM.iloc[0],-0.1)
        self.assertAlmostEqual(r.MOMENTUM.iloc[1],0)
        self.assertEqual(e.C0.iloc[0],0)
        self.assertEqual(len(events),1)
        self.assertEqual(d.holdings.iloc[0],10)
        p.loc[dates[1],'SPY'] = np.nan
        with self.assertRaisesRegex(ValueError,'benchmark quote'):
            backtest(p,w)


@unittest.skipUnless((ROOT/'data/reviewed/momentum/manifest.json').exists(), 'Local reviewed momentum cache required')
class ReviewedMomentumTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.frames, cls.meta = load_outputs()

    def test_frozen_metrics_dates_and_initial_wealth(self):
        f,m = self.frames,self.meta
        self.assertEqual(m['strategy']['lookback_months'],12)
        self.assertEqual(m['strategy']['top_n'],10)
        self.assertEqual(m['verification']['missing_selected_quote_events'],[])
        self.assertTrue((f['wealth'].iloc[0] == 1).all())
        self.assertTrue((f['drawdowns'].iloc[0] == 0).all())
        self.assertTrue(f['returns'].notna().all().all())
        self.assertTrue((f['rebalances'].holdings == 10).all())
        self.assertEqual(len(m['verification']['manual_checks']),2)
        # Calendar results and full-year extrema reconcile independently.
        for year,g in f['returns'].groupby(f['returns'].index.year):
            for name in g:
                self.assertAlmostEqual(f['annual'].loc[str(year),name],np.prod(1+g[name])-1)
        for name in f['returns']:
            full=f['annual'].query("coverage == 'Full calendar year'")[name]
            self.assertEqual(f['best_worst'].loc[name,'best_year'],full.idxmax())
            self.assertEqual(f['best_worst'].loc[name,'worst_year'],full.idxmin())
        # Turnover reconstructed from target weights and prior month-end drift.
        targets=f['weights'].loc[f['rebalances'].index]
        expected=(targets.iloc[1:].to_numpy()-f['end_weights'].iloc[:-1].to_numpy())
        np.testing.assert_allclose(np.abs(expected).sum(axis=1)/2,f['rebalances'].turnover.iloc[1:])
        self.assertAlmostEqual(f['diagnostics'].mean_turnover.iloc[0],f['rebalances'].turnover.iloc[1:].mean())

    def test_modified_sources_or_reviewed_outputs_are_rejected(self):
        with patch('scripts.momentum_outputs.source_hash',return_value='modified'):
            with self.assertRaisesRegex(ValueError,'notebook source changed'):
                load_outputs()
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)
            meta=json.loads((ROOT/'data/reviewed/momentum/manifest.json').read_text())
            meta['frames']={'returns':'incorrect-checksum'}
            (path/'manifest.json').write_text(json.dumps(meta))
            self.frames['returns'].to_parquet(path/'returns.parquet')
            with self.assertRaisesRegex(ValueError,'reviewed output changed'):
                load_outputs(path)

@unittest.skipUnless((ROOT/'data/reviewed/momentum/manifest.json').exists(), 'Local reviewed momentum cache required')
class MomentumPublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.frames, cls.meta = load_outputs()
        cls.section = json.loads((ROOT/'web/src/data/dashboard.json').read_text())['sections']['momentum']

    def test_every_published_numeric_cell_and_chart_point_matches_reviewed_python_exactly(self):
        f = self.frames
        maps = {'momentum-summary':'summary','momentum-calendar':'annual','momentum-best-worst':'best_worst',
                'momentum-diagnostics':'diagnostics','momentum-frequency':'holding_frequency',
                'momentum-walkthrough':'walkthrough','momentum-stress':'stress','momentum-rebalances':'rebalances'}
        checked = 0
        for table in self.section['tables']:
            if table['id']=='momentum-latest':
                frame=f['holdings'].loc[f['holdings'].rebalance_date==f['rebalances'].index[-1]].set_index('ticker')
            else:
                frame=f[maps[table['id']]].copy()
            if table['id']=='momentum-rebalances':
                frame.index=frame.index.strftime('%Y-%m-%d')
                self.assertEqual([r['id'] for r in table['rows']],list(frame.tail(12).index))
            else:
                self.assertEqual({r['id'] for r in table['rows']},set(frame.index))
            for row in table['rows']:
                for cell,col in zip(row['cells'][1:],table['columns'][1:]):
                    self.assertEqual(cell,frame.loc[row['id'],col['key']])
                    checked += isinstance(cell,(int,float))
        for chart in self.section['charts']:
            frame = f[{'momentum-index':'chart_indexed','momentum-dd':'chart_drawdowns','momentum-annual':'annual'}[chart['id']]]
            for series in chart['series']:
                self.assertEqual(len(series['points']),len(frame))
                for point in series['points']:
                    index = point['x'] if chart['kind']=='bar' else pd.Timestamp(point['x'])
                    self.assertEqual(point['y'],frame.loc[index,series['id']])
                    checked+=1
        for metric in self.section['metrics']:
            key=metric['id'].removeprefix(metric['entityId']+'-')
            self.assertEqual(metric['value'],f['summary'].loc[metric['entityId'],key])
            checked+=1
        self.assertGreater(checked,2000)

    def test_v3_persists_momentum_and_rejects_rule_or_period_mismatches(self):
        import copy
        from scripts.export_dashboard import validate_dashboard,write_dashboard
        snapshot=json.loads((ROOT/'web/src/data/dashboard.json').read_text())
        with tempfile.TemporaryDirectory() as directory:
            out=write_dashboard({'momentum':self.section},Path(directory)/'out.json')
            self.assertEqual(json.loads(out.read_text())['sections']['momentum'],self.section)
        mutations=[lambda s:s.update(schemaVersion=2),
                   lambda s:s['sections']['momentum']['definition'].update(topN=5),
                   lambda s:s['sections']['momentum']['definition'].update(skipMonth=True),
                   lambda s:s['sections']['momentum']['definition'].update(firstReturnDate='1993-01-29'),
                   lambda s:s['sections']['momentum']['definition'].update(lastReturnDate='2026-09-09'),
                   lambda s:s['sections']['momentum']['source'].update(path='notebooks/01_market_exploration.ipynb'),
                   lambda s:s['sections']['momentum']['metrics'][0].update(value=float('nan'))]
        for mutation in mutations:
            s=copy.deepcopy(snapshot)
            mutation(s)
            with self.assertRaises(Exception):validate_dashboard(s)


if __name__ == '__main__':
    unittest.main()
