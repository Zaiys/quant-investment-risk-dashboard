"""Frozen-cache reproduction, publication precision and stale-output rejection."""
import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import pandas as pd
from jsonschema import ValidationError

from scripts.market_data import ROOT
from scripts.momentum_robustness import run_robustness
from scripts.momentum_robustness_outputs import DIRECTORY, load_outputs
from scripts.export_dashboard import validate_dashboard


@unittest.skipUnless((DIRECTORY / 'manifest.json').exists(), 'Local reviewed robustness cache required')
class ReviewedRobustnessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.frames, cls.meta = load_outputs()
        cls.snapshot = json.loads((ROOT / 'web/src/data/dashboard.json').read_text())

    def test_reproduction_includes_all_independent_math_checks(self):
        recomputed = run_robustness(write=False)
        for name, frame in self.frames.items():
            pd.testing.assert_frame_equal(frame, recomputed[name], check_exact=True)
        self.assertEqual(self.meta['verification']['independent_metric_checks'], 56)
        self.assertEqual(self.meta['verification']['missing_quote_events'], [])

    def test_every_published_sensitivity_number_matches_reviewed_python_exactly(self):
        sensitivity = self.snapshot['sections']['momentum']['sensitivities']
        for table, name in zip(sensitivity['tables'], ['transaction_cost_sensitivity', 'execution_sensitivity']):
            frame = self.frames[name]
            for row in table['rows']:
                index = float(row['id']) if name == 'transaction_cost_sensitivity' else row['id']
                for column, value in zip(table['columns'][1:], row['cells'][1:]):
                    self.assertEqual(value, frame.loc[index, column['key']])

    def test_stale_source_baseline_inputs_assumptions_and_outputs_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            for file in DIRECTORY.iterdir():
                if file.is_file():
                    shutil.copy(file, directory / file.name)
            mutations = [
                lambda m: m['verification'].update(status='pending'),
                lambda m: m['verification'].update(daily_observations=1),
                lambda m: m.update(baseline_manifest_sha256='stale'),
                lambda m: m.update(input_manifest={}),
                lambda m: m.update(baseline_frames={}),
                lambda m: m.update(research_helper_sha256={}),
                lambda m: m['definition'].update(costBps=[0, 10]),
                lambda m: m['frames'].pop('execution_sensitivity'),
                lambda m: m['frames'].update(next_day_returns='incorrect'),
            ]
            for mutation in mutations:
                meta = copy.deepcopy(self.meta)
                mutation(meta)
                (directory / 'manifest.json').write_text(json.dumps(meta))
                with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                    load_outputs(directory)
            with patch('scripts.momentum_robustness_outputs.PROVENANCE', directory / 'manifest.json'):
                with self.assertRaisesRegex(ValueError, 'provenance differs'):
                    load_outputs()


class SensitivityContractTests(unittest.TestCase):
    def test_rejects_mislabeled_incomplete_or_misaligned_sensitivities(self):
        snapshot = json.loads((ROOT / 'web/src/data/dashboard.json').read_text())
        mutations = [
            lambda s: s['definition'].update(baselineUnchanged=False),
            lambda s: s['definition'].update(costBps=[0, 5, 10]),
            lambda s: s['definition'].update(executionTransactionCosts=10),
            lambda s: s['definition'].update(executionPolicy='retain old holdings'),
            lambda s: s['definition'].update(dailyObservations=1),
            lambda s: s['definition'].update(firstReturnDate='2000-01-01'),
            lambda s: s['source'].update(path='notebooks/02_momentum_strategy.ipynb'),
            lambda s: s['source']['period'].update(end='2026-09-09'),
            lambda s: s['tables'].pop(),
            lambda s: s['tables'][0]['rows'].pop(),
            lambda s: s['tables'][0]['rows'][0]['cells'].pop(),
            lambda s: s['tables'][0]['rows'][0]['cells'].__setitem__(1, float('inf')),
            lambda s: s['tables'][0]['rows'][0]['cells'].__setitem__(1, '0.2746'),
        ]
        for mutation in mutations:
            payload = copy.deepcopy(snapshot)
            mutation(payload['sections']['momentum']['sensitivities'])
            with self.subTest(mutation=mutation), self.assertRaises((ValueError, ValidationError)):
                validate_dashboard(payload)


if __name__ == '__main__':
    unittest.main()
