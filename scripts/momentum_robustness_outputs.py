"""Independent checks and source-bound publication of momentum sensitivities."""
from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import platform

import numpy as np
import pandas as pd

from scripts.market_data import ROOT, sha256
from scripts.momentum_outputs import load_outputs as load_baseline

DIRECTORY = ROOT / 'data/reviewed/momentum_robustness'
PROVENANCE = ROOT / 'data/provenance/momentum-robustness-verification.json'
HELPERS = ('momentum_robustness.py', 'momentum_robustness_outputs.py')
FRAMES = ('transaction_cost_sensitivity', 'execution_sensitivity', 'next_day_returns',
          'next_day_diagnostics', 'next_day_wealth', 'transaction_cost_returns')
DEFINITION = {
    'baselineUnchanged': True,
    'costBps': [0, 5, 10, 20],
    'costBasis': 'one-way turnover including initial allocation',
    'executionPolicy': 'cash through next trading-day close every month',
    'executionTransactionCosts': 0,
}
METHODOLOGY = [
    {'id': 'momentum-cost-sensitivity', 'title': 'Momentum Strategy — transaction-cost sensitivity',
     'detail': "The verified zero-cost, formation-close strategy remains the baseline. Apply 0, 5, 10 and 20 basis points per unit of the project's one-way turnover, including the initial cash-to-stock allocation and resizing retained holdings. At 10 bps and 25% turnover, the portfolio drag is 2.5 bps. Net first-day return = (1 − turnover × bps / 10,000) × (1 + gross return) − 1; other daily returns and SPY are unchanged. Costs reduce invested capital proportionally without changing target weights. This is a sensitivity convention per one-way turnover, not a fee per dollar bought and sold or an estimate of broker or market-specific costs. Taxes, spread, slippage and market impact are not separately estimated; no terminal liquidation charge is applied."},
    {'id': 'momentum-execution-sensitivity', 'title': 'Momentum Strategy — next-day-close execution sensitivity',
     'detail': "Keep the same formation signals, top ten, targets and monthly schedule. Liquidate prior holdings at each formation close, hold non-interest-bearing cash through the next trading-day close (zero strategy return that day), enter at its adjusted closing prices, and hold fixed adjusted units for the rest of the month. This monthly cash-gap convention does not retain old holdings through execution. Missing execution quotes stop the run; invalid quotes after entry trigger the baseline write-off policy. SPY stays continuously invested on the identical daily grid; initial wealth, risk-free convention and metric estimators match the baseline. Execution costs are zero in this separate timing check. Adjusted closes are still idealized fills. Waiting can help or hurt performance; this is not a claim of executable returns."},
    {'id': 'momentum-sensitivity-limits', 'title': 'Momentum Strategy — interpreting the sensitivities',
     'detail': "These are separately labelled sensitivity analyses, not baseline replacements, parameter tuning or a combined timing-and-cost model. The original 12-month rule, including the latest month, is preserved. The surviving-company universe, survivorship and selection bias, provider limitations and absence of independent out-of-sample evidence are unchanged. These checks do not establish investability or predict future performance. CAGR differences are percentage points, not relative percentage changes."},
]


def independent_metrics(r, spy, rf, years):
    """NumPy identities independent of the production performance_summary helper."""
    r = np.asarray(r, dtype=float)
    path = np.r_[1., np.cumprod(1 + r)]
    return {
        'total_return': path[-1] - 1,
        'arithmetic_return': np.mean(r) * 252,
        'cagr': np.expm1(np.log(path[-1]) / years),
        'volatility': np.std(r, ddof=1) * np.sqrt(252),
        'sharpe': np.mean(r - rf) / np.std(r, ddof=1) * np.sqrt(252),
        'max_drawdown': np.min(path / np.maximum.accumulate(path) - 1),
        'beta': np.cov(r, spy, ddof=1)[0, 1] / np.var(spy, ddof=1),
        'correlation': np.corrcoef(r, spy)[0, 1],
    }


def verify_robustness(outputs, baseline, meta, prices, daily_rf, events):
    """Reconcile all published metrics, daily paths and every monthly endpoint."""
    r, rebalances = baseline['returns'], baseline['rebalances']
    v = meta['verification']
    initial = pd.Timestamp(v['initial_wealth_date'])
    years = (r.index[-1] - initial).days / 365.25
    rf, spy = daily_rf.loc[r.index].to_numpy(), r['SPY'].to_numpy()
    assert np.isfinite(rf).all()
    assert r.index.equals(prices.loc[r.index[0]:r.index[-1]].index)
    assert set(outputs) == set(FRAMES)
    assert outputs['transaction_cost_sensitivity'].index.tolist() == DEFINITION['costBps']
    assert outputs['execution_sensitivity'].index.tolist() == ['FORMATION_CLOSE_BASELINE', 'NEXT_DAY_CLOSE', 'SPY']
    for name in ('transaction_cost_returns', 'next_day_returns'):
        assert outputs[name].index.equals(r.index)
        assert np.isfinite(outputs[name].to_numpy()).all()
        pd.testing.assert_series_equal(outputs[name]['SPY'], r['SPY'], check_exact=True)
    pd.testing.assert_series_equal(outputs['transaction_cost_returns']['0'], r['MOMENTUM'],
                                   check_names=False, check_exact=True)
    assert outputs['next_day_diagnostics'].index.equals(rebalances.index)

    # Reconstruct baseline pretrade weights directly from the preceding raw holding path.
    previous = pd.Series(0., index=baseline['weights'].columns)
    turnovers, execution_checks, expected_events, delayed_blocks = [], [], [], []
    for i, (formation, row) in enumerate(rebalances.iterrows()):
        target = baseline['weights'].loc[formation]
        selected = target[target > 0]
        assert len(selected) == 10 and (selected == .1).all()
        turnover = .5 * ((target - previous).abs().sum() + (1. if i == 0 else 0.))
        np.testing.assert_allclose(turnover, row['turnover'], rtol=1e-12, atol=1e-14)
        turnovers.append(turnover)
        dates = r.index[r.index.to_period('M') == formation.to_period('M') + 1]
        assert str(dates[0].date()) == row['first_return']
        assert formation == prices.index[prices.index.get_loc(dates[0]) - 1]
        quotes = prices.loc[dates, selected.index]
        valid = np.isfinite(quotes.to_numpy()) & (quotes.to_numpy() > 0)
        end_values = (quotes.iloc[-1] / prices.loc[formation, selected.index] * selected).where(valid.all(axis=0), 0.)
        previous = pd.Series(0., index=target.index)
        previous.loc[selected.index] = end_values / end_values.sum()

        # Initial day is cash; thereafter value fixed units using raw entry prices.
        assert valid[0].all()
        relatives = quotes.to_numpy() / quotes.iloc[0].to_numpy()
        relatives[~np.logical_and.accumulate(valid, axis=0)] = 0.
        nav = relatives @ selected.to_numpy()
        expected_daily = np.r_[0., nav[1:] / nav[:-1] - 1]
        actual = outputs['next_day_returns'].loc[dates, 'MOMENTUM'].to_numpy()
        np.testing.assert_allclose(actual, expected_daily, rtol=1e-10, atol=1e-14)
        assert actual[0] == 0.
        endpoint = float(nav[-1] - 1)
        np.testing.assert_allclose(np.prod(1 + actual) - 1, endpoint, rtol=1e-10, atol=1e-13)
        delayed_blocks.append(expected_daily)
        diag = outputs['next_day_diagnostics'].loc[formation]
        assert diag['execution_date'] == diag['first_return'] == dates[0]
        assert diag['last_return'] == dates[-1] and diag['observations'] == len(dates)
        assert diag['holdings'] == 10
        assert bool(diag['partial_month']) == (dates[-1].to_period('M') == prices.index[-1].to_period('M'))
        for j, ticker in enumerate(selected.index):
            invalid_dates = dates[~valid[:, j]]
            if len(invalid_dates):
                expected_events.append({'formation_date': str(formation.date()),
                                        'execution_date': str(dates[0].date()), 'ticker': ticker,
                                        'first_invalid_date': str(invalid_dates[0].date()),
                                        'policy': 'Position marked to zero; no recovery within this holding month'})
        if i in (0, len(rebalances) - 1) or formation == pd.Timestamp('2020-01-31'):
            execution_checks.append({'formation_date': str(formation.date()),
                                     'execution_date': str(dates[0].date()), 'holdings': list(selected.index),
                                     'raw_endpoint_return': endpoint,
                                     'compounded_daily_return': float(np.prod(1 + actual) - 1)})
    assert events == expected_events
    gross_path = np.cumprod(1 + r['MOMENTUM'].to_numpy())
    turnover_on_grid = np.zeros(len(r))
    turnover_on_grid[r.index.get_indexer(pd.to_datetime(rebalances['first_return']))] = turnovers
    cost_checks = []
    metric_checks = 0
    for bps in DEFINITION['costBps']:
        factors = 1 - turnover_on_grid * bps / 10000
        expected_path = gross_path * np.cumprod(factors)
        net = outputs['transaction_cost_returns'][str(bps)].to_numpy()
        np.testing.assert_allclose(np.cumprod(1 + net), expected_path, rtol=1e-12, atol=1e-13)
        metrics = independent_metrics(net, spy, rf, years)
        row = outputs['transaction_cost_sensitivity'].loc[bps]
        for key, value in metrics.items():
            np.testing.assert_allclose(row[key], value, rtol=1e-11, atol=1e-13)
            metric_checks += 1
        expected_ratio = float(np.prod(1 - np.array(turnovers) * bps / 10000))
        actual_ratio = float((row['total_return'] + 1) / gross_path[-1])
        np.testing.assert_allclose(actual_ratio, expected_ratio, rtol=1e-12)
        np.testing.assert_allclose(row['ending_wealth_multiple'], expected_path[-1], rtol=1e-12)
        np.testing.assert_allclose(row['mean_recurring_cost_drag'], np.mean(turnovers[1:]) * bps / 10000, atol=1e-15)
        np.testing.assert_allclose(row['mean_recurring_cost_drag_bps'], np.mean(turnovers[1:]) * bps, atol=1e-13)
        delta = row['cagr'] - baseline['summary'].loc['MOMENTUM', 'cagr']
        np.testing.assert_allclose(row['cagr_change_vs_gross'], delta, atol=1e-14)
        np.testing.assert_allclose(row['cagr_change_vs_gross_pp'], delta * 100, atol=1e-12)
        np.testing.assert_allclose(row['total_return_change_vs_gross'], row['total_return'] - baseline['summary'].loc['MOMENTUM', 'total_return'], atol=1e-10)
        cost_checks.append({'cost_bps': bps, 'product_of_rebalance_cost_factors': expected_ratio,
                            'net_to_gross_ending_wealth': actual_ratio})
    assert outputs['transaction_cost_sensitivity']['ending_wealth_multiple'].is_monotonic_decreasing
    delayed = np.concatenate(delayed_blocks)
    for variant, raw in [('FORMATION_CLOSE_BASELINE', r['MOMENTUM'].to_numpy()),
                         ('NEXT_DAY_CLOSE', delayed), ('SPY', spy)]:
        row = outputs['execution_sensitivity'].loc[variant]
        for key, value in independent_metrics(raw, spy, rf, years).items():
            np.testing.assert_allclose(row[key], value, rtol=1e-11, atol=1e-12)
            metric_checks += 1
        delta = row['cagr'] - baseline['summary'].loc['MOMENTUM', 'cagr']
        np.testing.assert_allclose(row['cagr_change_vs_baseline'], delta, atol=1e-14)
        np.testing.assert_allclose(row['cagr_change_vs_baseline_pp'], delta * 100, atol=1e-12)
    wealth = outputs['next_day_wealth']
    assert wealth.index.equals(pd.DatetimeIndex([initial]).append(r.index))
    np.testing.assert_allclose(wealth, np.vstack([np.ones(2), np.cumprod(1 + outputs['next_day_returns'].to_numpy(), axis=0)]), rtol=1e-13)
    return {'status': 'verified', 'checked_at': datetime.now(timezone.utc).isoformat(),
            'runtime': {'python': platform.python_version(), 'numpy': np.__version__, 'pandas': pd.__version__},
            'initial_wealth_date': str(initial.date()), 'first_return': str(r.index[0].date()),
            'last_return': str(r.index[-1].date()), 'daily_observations': len(r),
            'holding_months': len(rebalances), 'independent_metric_checks': metric_checks,
            'monthly_cash_days': len(rebalances), 'missing_quote_events': events,
            'cost_identity_checks': cost_checks, 'execution_endpoint_examples': execution_checks,
            'checks': ['zero-cost daily returns exactly equal the verified baseline',
                       'all baseline turnovers independently reconstructed from raw prices',
                       'every cost daily wealth path equals gross wealth times cumulative cost factors',
                       'all delayed daily returns and monthly endpoints reconcile to raw adjusted quotes',
                       'cash on every execution day; no selection changes or missing-date removal',
                       'SPY exactly equal on the uninterrupted baseline calendar',
                       'all summary metrics independently recomputed with NumPy',
                       'initial wealth, drawdowns, cost drag and percentage-point differences reconciled']}


def write_outputs(outputs, baseline_meta, report, directory=DIRECTORY):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    for name, frame in outputs.items():
        frame.to_parquet(directory / f'{name}.parquet')
    manifest = {'verification': report, 'definition': DEFINITION, 'methodology': METHODOLOGY,
                'baseline_notebook_sha256': baseline_meta['notebook_source_sha256'],
                'baseline_manifest_sha256': sha256(ROOT / 'data/reviewed/momentum/manifest.json'),
                'baseline_frames': baseline_meta['frames'],
                'input_manifest': baseline_meta['input_manifest'],
                'research_helper_sha256': {name: sha256(ROOT / 'scripts' / name) for name in HELPERS},
                'frames': {name: sha256(directory / f'{name}.parquet') for name in outputs}}
    encoded = json.dumps(manifest, indent=2, allow_nan=False) + '\n'
    (directory / 'manifest.json').write_text(encoded)
    if directory.resolve() == DIRECTORY.resolve():
        PROVENANCE.write_text(encoded)


def load_outputs(directory=DIRECTORY):
    """Reject missing, stale, altered or unverified inputs before dashboard export."""
    directory = Path(directory)
    meta = json.loads((directory / 'manifest.json').read_text())
    _, baseline_meta = load_baseline()
    if meta.get('verification', {}).get('status') != 'verified':
        raise ValueError('Momentum robustness outputs are not verified')
    if meta.get('definition') != DEFINITION or meta.get('methodology') != METHODOLOGY:
        raise ValueError('Momentum robustness assumptions changed after verification')
    if (meta.get('baseline_manifest_sha256') != sha256(ROOT / 'data/reviewed/momentum/manifest.json')
            or meta.get('baseline_notebook_sha256') != baseline_meta['notebook_source_sha256']
            or meta.get('baseline_frames') != baseline_meta['frames']
            or meta.get('input_manifest') != baseline_meta['input_manifest']):
        raise ValueError('Momentum robustness baseline or inputs changed after verification')
    baseline_v, v = baseline_meta['verification'], meta['verification']
    for robustness_key, baseline_key in [('initial_wealth_date', 'initial_wealth_date'),
                                          ('first_return', 'first_return'), ('last_return', 'last_return'),
                                          ('daily_observations', 'return_observations'), ('holding_months', 'holding_months')]:
        if v.get(robustness_key) != baseline_v[baseline_key]:
            raise ValueError('Momentum robustness evaluation differs from baseline')
    expected_helpers = {name: sha256(ROOT / 'scripts' / name) for name in HELPERS}
    if meta.get('research_helper_sha256') != expected_helpers:
        raise ValueError('Momentum robustness helper changed after verification')
    if set(meta.get('frames', {})) != set(FRAMES):
        raise ValueError('Momentum robustness reviewed outputs are incomplete')
    if directory.resolve() == DIRECTORY.resolve() and json.loads(PROVENANCE.read_text()) != meta:
        raise ValueError('Momentum robustness provenance differs from reviewed manifest')
    frames = {}
    for name, digest in meta['frames'].items():
        path = directory / f'{name}.parquet'
        if sha256(path) != digest:
            raise ValueError(f'Momentum robustness reviewed output changed: {name}')
        frames[name] = pd.read_parquet(path)
    return frames, meta
