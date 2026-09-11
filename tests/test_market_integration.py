"""Regression checks for publication of reviewed market outputs."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

from scripts.market_data import ROOT, load_market_inputs, universe_from_notebook
from scripts.build_market_dashboard import observed_chart_sample, scalar
from scripts.research_outputs import load_reviewed_outputs


class SamplingTests(unittest.TestCase):
    def test_only_observed_points_are_selected_and_each_asset_base_is_retained(self):
        index=pd.bdate_range('2020-01-01','2021-01-04')
        frame=pd.DataFrame({'a':np.arange(len(index),dtype=float),'b':np.arange(len(index),dtype=float)},index=index)
        frame.loc[index[:40],'b']=np.nan
        frame.loc[index[90],'a']=np.nan
        sampled=observed_chart_sample(frame)
        self.assertIn(index[40],sampled.index)
        self.assertIn(index[90],sampled.index)
        self.assertIn(index[89],sampled.index)
        self.assertIn(index[91],sampled.index)
        self.assertEqual(sampled.index[-1],index[-1])
        pd.testing.assert_frame_equal(sampled,frame.loc[sampled.index])
        self.assertIsNone(scalar(np.nan))


@unittest.skipUnless((ROOT/'data/reviewed/manifest.json').exists(), 'Local reviewed research cache required')
class ReviewedPublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.frames,cls.meta=load_reviewed_outputs()
        cls.snapshot=json.loads((ROOT/'web/src/data/dashboard.json').read_text())

    def test_cached_loading_cannot_make_live_requests(self):
        with patch('yfinance.download',side_effect=AssertionError('Live data request during cache load')):
            prices,rf,manifest=load_market_inputs(universe_from_notebook())
        self.assertEqual(len(prices.columns),55)
        self.assertEqual(str(prices.index[-1].date()),self.meta['verification']['price_period']['end'])
        self.assertEqual(manifest,self.meta['input_manifest'])
        self.assertFalse(rf.empty)

    def test_every_published_table_cell_matches_its_reviewed_frame_exactly(self):
        mappings={'history':'asset_history','full-metrics':'full_asset_metrics','common-metrics':'common_metrics',
                  'spy-relationships':'spy_relationships','portfolio-comparison':'portfolio_metrics',
                  'risk-contributions':'portfolio_risk_contributions',
                  **{f'stress-{i}-outcomes':f'stress_metrics_{i}' for i in range(3)}}
        checked=0
        for key, section in self.snapshot['sections'].items():
            if key == 'momentum':
                continue
            for table in section.get('tables',[]):
                frame=self.frames[mappings[table['id']]]
                self.assertEqual(set(row['id'] for row in table['rows']),set(frame.index))
                for row in table['rows']:
                    for cell,col in zip(row['cells'][1:],table['columns'][1:]):
                        self.assertEqual(cell,scalar(frame.loc[row['id'],col['key']]))
                        checked+=1
        self.assertGreater(checked,900)

    def test_every_chart_coordinate_and_value_matches_python_without_rounding(self):
        mapping={'full-index':'indexed_history','common-index':'indexed_common',
                 'portfolio-index':'portfolio_indexed','portfolio-dd':'portfolio_drawdowns',
                 **{f'stress-{i}-wealth':f'stress_growth_{i}' for i in range(3)}}
        for key, section in self.snapshot['sections'].items():
            if key == 'momentum':
                continue
            for chart in section.get('charts',[]):
                if chart['kind']=='scatter':
                    frame=self.frames['full_asset_metrics' if chart['id']=='risk-full' else 'common_metrics']
                    for series in chart['series']:
                        self.assertEqual(series['points'],[{'x':scalar(frame.loc[series['id'],'volatility']),
                                                           'y':scalar(frame.loc[series['id'],'cagr'])}])
                    continue
                frame=self.frames[mapping[chart['id']]]
                for series in chart['series']:
                    valid=frame[series['id']].dropna()
                    values={point['x']:point['y'] for point in series['points']}
                    self.assertEqual(values[str(valid.index[0].date())],float(valid.iloc[0]))
                    self.assertEqual(values[str(valid.index[-1].date())],float(valid.iloc[-1]))
                    for point in series['points']:
                        self.assertEqual(point['y'],scalar(frame.loc[pd.Timestamp(point['x']),series['id']]))
                    if chart['id'].startswith('stress-'):
                        self.assertEqual(len(series['points']),len(frame))

    def test_all_matrix_values_and_overview_dates_match_python(self):
        for matrix,key in zip(self.snapshot['sections']['correlation']['matrices'],['correlation_matrix','common_correlation']):
            frame=self.frames[key]
            self.assertEqual([label['id'] for label in matrix['labels']],list(frame.columns))
            self.assertEqual(matrix['values'],frame.to_numpy().tolist())
        history=self.frames['asset_history']
        self.assertEqual(self.snapshot['research']['period'],self.meta['verification']['price_period'])
        for asset in self.snapshot['research']['universe']:
            self.assertEqual(asset['availableFrom'],history.loc[asset['id'],'first_date'])
            self.assertEqual(asset['availableTo'],history.loc[asset['id'],'last_date'])
        self.assertEqual(len(self.snapshot['research']['universe']),55)
        self.assertEqual(self.snapshot['sections']['market']['metrics'][0]['value'],55)
        self.assertEqual(self.snapshot['sections']['market']['metrics'][1]['value'],self.meta['verification']['common_return_observations'])
        self.assertEqual(self.snapshot['sections']['momentum']['status'],'available')

    def test_modified_reviewed_file_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            target=Path(temp)
            metadata=json.loads((ROOT/'data/reviewed/manifest.json').read_text())
            metadata['frames']={'full_asset_metrics':'incorrect-checksum'}
            (target/'manifest.json').write_text(json.dumps(metadata))
            self.frames['full_asset_metrics'].to_parquet(target/'full_asset_metrics.parquet')
            with self.assertRaisesRegex(ValueError,'changed after verification'):
                load_reviewed_outputs(target)


if __name__=='__main__':
    unittest.main()
