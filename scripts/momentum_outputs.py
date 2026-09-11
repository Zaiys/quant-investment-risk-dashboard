"""Verify and retain notebook 02 outputs, bound to frozen inputs and source hashes."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

from scripts.market_data import ROOT, sha256, load_market_inputs, universe_from_notebook

HELPERS = ['momentum_research.py', 'momentum_outputs.py', 'research_checks.py', 'market_data.py']
NOTEBOOK = ROOT / 'notebooks/02_momentum_strategy.ipynb'


def source_hash():
    notebook = json.loads(NOTEBOOK.read_text())
    cells = [(c['cell_type'], ''.join(c['source'])) for c in notebook['cells']]
    return hashlib.sha256(json.dumps(cells).encode()).hexdigest()


def verify_momentum(ns):
    p, monthly, signals, weights = [ns[k] for k in ['prices', 'monthly', 'signals', 'weights']]
    returns, wealth, rf = [ns[k] for k in ['returns', 'wealth', 'daily_rf']]
    rebalances, summary = ns['rebalances'], ns['summary']
    companies = ns['companies']
    assert len(companies) == len(set(companies)) == 50
    assert signals.iloc[:12].isna().all().all()
    assert not weights.iloc[:12].to_numpy().any()
    assert monthly.index[-1].to_period('M') < p.index[-1].to_period('M')
    # Verify all eligible signal values and selected rankings from raw cached quotes.
    for i, date in enumerate(monthly.index):
        actual = signals.loc[date].dropna()
        if i < 12:
            assert actual.empty
            continue
        history = p.loc[monthly.index[i-12]:date, companies]
        eligible = history.notna().all() & history.gt(0).all()
        expected = (p.loc[date, companies] / p.loc[monthly.index[i-12], companies] - 1).where(eligible).dropna()
        pd.testing.assert_series_equal(actual, expected, check_names=False)
        ranked = sorted(expected.index, key=lambda ticker: (-expected[ticker], ticker))
        selected = weights.loc[date][weights.loc[date] > 0]
        assert set(selected.index) == set(ranked[:10]) if len(ranked) >= 10 else selected.empty
        if len(ranked) >= 10:
            assert len(selected) == len(set(selected.index)) == 10
            np.testing.assert_allclose(selected, 0.1, rtol=0, atol=0)
            np.testing.assert_allclose(selected.sum(), 1, atol=1e-14)
    assert returns.index.equals(p.loc[returns.index[0]:returns.index[-1]].index)
    assert not returns.isna().any().any()
    pd.testing.assert_series_equal(returns['SPY'], p['SPY'].pct_change(fill_method=None).loc[returns.index], check_names=False)
    expected_rf = ((1 + ns['cached_rf'].squeeze() / 100) ** (1/252) - 1).reindex(p.index).ffill()
    pd.testing.assert_series_equal(rf, expected_rf)
    assert rf.loc[returns.index].notna().all()
    assert (wealth.iloc[0] == 1).all()
    assert (ns['drawdowns'].iloc[0] == 0).all()
    assert wealth.index[0] == rebalances.index[0] < returns.index[0]
    np.testing.assert_allclose(wealth.iloc[1:], np.cumprod(1 + returns.to_numpy(), axis=0), rtol=1e-13)
    manual_checks = []
    for date, row in rebalances.iterrows():
        selected = weights.loc[date][weights.loc[date] > 0]
        dates = returns.index[returns.index.to_period('M') == date.to_period('M') + 1]
        assert date < dates[0] and str(dates[0].date()) == row['first_return']
        # Independent buy-and-hold endpoint identity (no future filtering).
        quotes = p.loc[dates, selected.index]
        valid_path = (quotes.notna() & quotes.gt(0)).cummin()
        end_relative = (quotes.iloc[-1] / p.loc[date, selected.index]).where(valid_path.iloc[-1], 0)
        expected = float(np.dot(selected, end_relative) - 1)
        np.testing.assert_allclose((1+returns.loc[dates, 'MOMENTUM']).prod()-1, expected, rtol=1e-10, atol=1e-13)
        if date == rebalances.index[0] or date == pd.Timestamp('2020-01-31'):
            manual_checks.append({'rebalance_date': str(date.date()), 'holdings': list(selected.index),
                                  'raw_endpoint_portfolio_return': expected,
                                  'compounded_daily_portfolio_return': float((1+returns.loc[dates,'MOMENTUM']).prod()-1)})
    years = (wealth.index[-1]-wealth.index[0]).days/365.25
    for name in returns:
        r = returns[name].to_numpy()
        path = np.r_[1.0, np.cumprod(1+r)]
        row = summary.loc[name]
        estimates = {'total_return':path[-1]-1, 'arithmetic_return':np.mean(r)*252,
                     'cagr':np.expm1(np.log(path[-1])/years), 'volatility':np.std(r,ddof=1)*np.sqrt(252),
                     'sharpe':np.mean(r-rf.loc[returns.index].to_numpy())/np.std(r,ddof=1)*np.sqrt(252),
                     'max_drawdown':np.min(path/np.maximum.accumulate(path)-1),
                     'beta':np.cov(r,returns['SPY'],ddof=1)[0,1]/np.var(returns['SPY'],ddof=1),
                     'correlation':np.corrcoef(r,returns['SPY'])[0,1]}
        for key,value in estimates.items():
            np.testing.assert_allclose(row[key],value,rtol=1e-11,atol=1e-13)
    return {'status':'verified','checked_at':datetime.now(timezone.utc).isoformat(),
            'initial_wealth_date':str(wealth.index[0].date()),
            'first_return':str(returns.index[0].date()), 'last_return':str(returns.index[-1].date()),
            'return_observations':len(returns), 'holding_months':len(rebalances),
            'first_signal_with_ten_eligible':str(weights.index[weights.sum(axis=1)>0][0].date()),
            'first_evaluated_signal':str(rebalances.index[0].date()),
            'last_evaluated_signal':str(rebalances.index[-1].date()),
            'missing_selected_quote_events':ns['missing_events'],
            'risk_free_forward_fills_in_evaluation':int(ns['cached_rf'].reindex(returns.index).isna().sum().iloc[0]),
            'manual_checks':manual_checks,
            'checks':['all eligible signals independently recalculated from raw prices',
                      '12 complete months before first signal', 'top ten, deterministic ranks, unique holdings and unit weights',
                      'formation close strictly precedes every earned return', 'every monthly buy-and-hold endpoint reconciles',
                      'identical uninterrupted strategy and SPY daily grid', 'notebook 01 risk-free transformation and alignment',
                      'explicit initial wealth and first-return drawdown', 'independent NumPy performance identities']}


def write_outputs(ns):
    report = verify_momentum(ns)
    directory = ROOT/'data/reviewed/momentum'
    directory.mkdir(parents=True, exist_ok=True)
    names = ['monthly','signals','weights','holdings','returns','monthly_returns','wealth','indexed',
             'drawdowns','summary','annual','best_worst','rebalances','end_weights','diagnostics',
             'holding_frequency','walkthrough','stress','chart_indexed','chart_drawdowns']
    for name in names:
        ns[name].to_parquet(directory/f'{name}.parquet')
    meta = {'verification':report,'notebook_source_sha256':source_hash(),
            'research_helper_sha256':{name:sha256(ROOT/'scripts'/name) for name in HELPERS},
            'input_manifest':ns['input_manifest'], 'companies':ns['companies'],
            'strategy':{'lookback_months':12,'top_n':10,'rebalance':'monthly','transaction_costs':0,
                        'skip_month':False,'within_month':'fixed adjusted units; weights drift'},
            'methodology':ns['momentum_methodology'],
            'frames':{name:sha256(directory/f'{name}.parquet') for name in names}}
    encoded = json.dumps(meta,indent=2,allow_nan=False)+'\n'
    (directory/'manifest.json').write_text(encoded)
    (ROOT/'data/provenance/momentum-verification.json').write_text(encoded)
    return report


def load_outputs(directory=ROOT/'data/reviewed/momentum'):
    directory = Path(directory)
    meta = json.loads((directory/'manifest.json').read_text())
    if meta['notebook_source_sha256'] != source_hash():
        raise ValueError('Momentum notebook source changed after verification')
    for name,digest in meta['research_helper_sha256'].items():
        if sha256(ROOT/'scripts'/name) != digest:
            raise ValueError(f'Momentum helper changed after verification: {name}')
    _,_,inputs = load_market_inputs(universe_from_notebook())
    if inputs != meta['input_manifest']:
        raise ValueError('Momentum inputs differ from verified snapshot')
    frames = {}
    for name,digest in meta['frames'].items():
        path = directory/f'{name}.parquet'
        if sha256(path) != digest:
            raise ValueError(f'Momentum reviewed output changed after verification: {name}')
        frames[name] = pd.read_parquet(path)
    return frames,meta
