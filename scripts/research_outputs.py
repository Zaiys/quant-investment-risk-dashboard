"""Verify notebook results and persist computed tables for the presentation adapter."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

from scripts.market_data import ROOT, sha256


def notebook_source_hash():
    notebook = json.loads((ROOT / 'notebooks/01_market_exploration.ipynb').read_text())
    sources = [(c['cell_type'], ''.join(c['source'])) for c in notebook['cells']]
    return hashlib.sha256(json.dumps(sources).encode()).hexdigest()


def verify_research(ns):
    """Independent identities and aligned-sample checks, before any publication."""
    p, r, rf = ns['prices'], ns['daily_returns'], ns['daily_rf']
    np.testing.assert_allclose(r, p / p.shift(1) - 1, equal_nan=True, rtol=1e-13, atol=1e-14)
    assert len(ns['companies']) == 50 and len(ns['benchmarks']) == 5 and len(p.columns) == 55
    assert np.isclose(ns['manual_return'], ns['calculated_return'])
    expected_rf = ((1 + ns['risk_free'] / 100) ** (1 / 252) - 1).reindex(r.index).ffill()
    pd.testing.assert_series_equal(rf, expected_rf)
    raw_yield = ns['risk_free'].reindex(r.index)
    missing_internal = {}
    asset_samples = {}
    for t in p:
        s = p[t].dropna()
        missing_internal[t] = int(p.loc[s.index[0]:s.index[-1],t].isna().sum())
        row = ns['full_asset_metrics'].loc[t]
        years = (s.index[-1] - s.index[0]).days / 365.25
        np.testing.assert_allclose(row['total_return'], s.iloc[-1] / s.iloc[0] - 1, rtol=1e-13)
        np.testing.assert_allclose(row['cagr'], np.expm1(np.log(s.iloc[-1]/s.iloc[0])/years), rtol=1e-12)
        np.testing.assert_allclose(row['volatility'], np.std(r[t].dropna(), ddof=1)*np.sqrt(252), rtol=1e-13)
        paired_rf = pd.concat([r[t], rf], axis=1).dropna()
        expected_sharpe = (paired_rf.iloc[:,0]-paired_rf.iloc[:,1]).mean()/paired_rf.iloc[:,0].std()*np.sqrt(252)
        np.testing.assert_allclose(row['sharpe'], expected_sharpe, rtol=1e-13)
        paired_spy = pd.concat([r[t],r['SPY']],axis=1).dropna()
        if t != 'SPY':
            covariance = np.cov(paired_spy.to_numpy().T, ddof=1)
            np.testing.assert_allclose(row['beta'], covariance[0,1]/covariance[1,1], rtol=1e-13)
        np.testing.assert_allclose(row['max_drawdown'], np.min(s.to_numpy()/np.maximum.accumulate(s.to_numpy())-1), rtol=1e-13)
        np.testing.assert_array_equal(ns['indexed_history'][t].dropna().to_numpy(), (100*s/s.iloc[0]).to_numpy())
        asset_samples[t] = {'prices': len(s), 'returns': int(r[t].notna().sum()),
                            'sharpe': len(paired_rf), 'sharpe_start': str(paired_rf.index[0].date()),
                            'beta': len(paired_spy), 'beta_start': str(paired_spy.index[0].date())}
    cp, cr = ns['common_prices'], ns['common_returns']
    assert list(cp.columns) == ns['companies'] and list(cr.columns) == ns['companies']
    assert not cp.isna().any().any() and not cr.isna().any().any()
    expected_common = p[ns['companies']].loc[cp.index[0]:cp.index[-1]].pct_change(fill_method=None).dropna(how='any')
    pd.testing.assert_frame_equal(cr, expected_common)
    assert cr.count().nunique() == 1 and ns['common_rf'].notna().all()
    for t in cp:
        s = cp[t]
        row = ns['common_metrics'].loc[t]
        years = (s.index[-1]-s.index[0]).days/365.25
        np.testing.assert_allclose(row['cagr'], (s.iloc[-1]/s.iloc[0])**(1/years)-1, rtol=1e-13)
        np.testing.assert_allclose(row['volatility'], cr[t].std()*np.sqrt(252), rtol=1e-13)
        np.testing.assert_allclose(row['sharpe'], (cr[t]-rf.loc[cr.index]).mean()/cr[t].std()*np.sqrt(252), rtol=1e-13)
    np.testing.assert_array_equal(ns['indexed_common'].to_numpy(), (100*cp/cp.iloc[0]).to_numpy())
    np.testing.assert_allclose(ns['correlation_matrix'], r.corr(), equal_nan=True, atol=1e-14)
    np.testing.assert_allclose(ns['common_correlation'], cr.corr(), equal_nan=True, atol=1e-14)
    pr, w = ns['portfolio_returns'], ns['weights']
    np.testing.assert_allclose(w.sum(),1,atol=1e-15)
    np.testing.assert_allclose(ns['portfolio_daily_returns'], pr.to_numpy()@w.to_numpy(), rtol=1e-12,atol=1e-15)
    pd.testing.assert_series_equal(ns['spy_same_period'],pr['SPY'])
    assert ns['portfolio_growth'].iloc[0] == ns['spy_growth'].iloc[0] == 1.0
    for entity, returns in [('PORTFOLIO',ns['portfolio_daily_returns']),('SPY',ns['spy_same_period'])]:
        row=ns['portfolio_metrics'].loc[entity]
        wealth=np.r_[1.0,np.cumprod(1+returns.to_numpy())]
        np.testing.assert_allclose(row['arithmetic_return'], returns.mean()*252,rtol=1e-13)
        np.testing.assert_allclose(row['volatility'],returns.std()*np.sqrt(252),rtol=1e-13)
        combined=pd.concat([returns,rf],axis=1).dropna()
        np.testing.assert_allclose(row['sharpe'],(combined.iloc[:,0]-combined.iloc[:,1]).mean()/combined.iloc[:,0].std()*np.sqrt(252),rtol=1e-13)
        np.testing.assert_allclose(row['max_drawdown'],(wealth/np.maximum.accumulate(wealth)-1).min(),rtol=1e-13)
    np.testing.assert_allclose(ns['component_risk'].sum(),ns['portfolio_annual_volatility'],rtol=1e-13)
    np.testing.assert_allclose(ns['risk_contribution'].sum(),100,rtol=1e-13)
    np.testing.assert_allclose(ns['portfolio_vol'],ns['portfolio_annual_volatility'],rtol=1e-13)
    scenario_checks={}
    for i,(name,(start,end)) in enumerate(ns['stress_periods'].items()):
        returns=pr.loc[start:end].copy()
        returns['PORTFOLIO']=ns['portfolio_daily_returns'].loc[start:end]
        assert not returns.empty and not returns.isna().any().any()
        expected=np.vstack([np.ones(len(returns.columns)),np.cumprod(1+returns.to_numpy(),axis=0)])
        outcomes=ns['stress_metrics'][i].loc[returns.columns]
        np.testing.assert_allclose(outcomes['total_return'],expected[-1]-1,rtol=1e-13,atol=1e-14)
        np.testing.assert_allclose(outcomes['max_drawdown'],(expected/np.maximum.accumulate(expected,axis=0)-1).min(axis=0),rtol=1e-13,atol=1e-14)
        np.testing.assert_allclose(ns['stress_growth'][i][returns.columns],expected,rtol=1e-13)
        scenario_checks[name]={'requested_start':start,'requested_end':end,'first_return':str(returns.index[0].date()),
                               'last_return':str(returns.index[-1].date()),'initial_wealth_date':str(ns['stress_growth'][i].index[0].date()),
                               'return_observations':len(returns)}
    return {'status':'verified','checked_at':datetime.now(timezone.utc).isoformat(),
            'price_period':{'start':str(p.index[0].date()),'end':str(p.index[-1].date())},
            'common_price_period':{'start':str(cp.index[0].date()),'end':str(cp.index[-1].date())},
            'common_price_observations':len(cp),'common_return_observations':len(cr),
            'common_omitted_price_rows':len(p.loc[cp.index[0]:cp.index[-1]])-len(cp),
            'common_omitted_return_rows':len(p.loc[cp.index[0]:cp.index[-1]])-1-len(cr),
            'portfolio_initial_wealth_date':str(ns['portfolio_initial_date'].date()),
            'portfolio_first_return':str(pr.index[0].date()),'portfolio_return_observations':len(pr),
            'rf_forward_filled_dates':int((raw_yield.isna() & rf.notna()).sum()),
            'rf_unavailable_dates':int(rf.isna().sum()),'asset_samples':asset_samples,
            'interior_missing_prices':{t:n for t,n in missing_internal.items() if n},
            'stress_windows':scenario_checks,
            'identities':['manual simple return','55-asset universe','calendar-year CAGR','252-day sample volatility',
                          'aligned risk-free transformation and Sharpe','aligned covariance beta vs SPY',
                          'identical common observations','indexed price levels','initial wealth drawdowns',
                          'constant-weight portfolio','risk contribution reconciliation','all stress outcomes']}


def write_reviewed_outputs(ns, directory=ROOT/'data/reviewed'):
    report=verify_research(ns)
    directory=Path(directory)
    directory.mkdir(parents=True,exist_ok=True)
    frames={k:ns[k] for k in ['full_asset_metrics','asset_history','common_metrics','indexed_history','indexed_common',
                              'correlation_matrix','common_correlation','spy_relationships','portfolio_metrics',
                              'portfolio_indexed','portfolio_drawdowns','portfolio_risk_contributions']}
    for i in range(len(ns['stress_periods'])):
        frames[f'stress_metrics_{i}']=ns['stress_metrics'][i]
        frames[f'stress_growth_{i}']=ns['stress_growth'][i]
    for name,frame in frames.items():
        frame.to_parquet(directory/f'{name}.parquet')
    metadata={'verification':report,'input_manifest':ns['input_manifest'],
              'companies':ns['companies'],'benchmarks':ns['benchmarks'],'portfolio_weights':ns['portfolio_weights'],
              'stress_periods':ns['stress_periods'],'notebook_source_sha256':notebook_source_hash(),
              'research_helper_sha256':{name:sha256(ROOT/'scripts'/name) for name in ['market_data.py','research_checks.py','research_outputs.py']},
              'frames':{name:sha256(directory/f'{name}.parquet') for name in frames}}
    (directory/'manifest.json').write_text(json.dumps(metadata,indent=2,allow_nan=False)+'\n')
    (ROOT/'data/provenance/research-verification.json').write_text(json.dumps(metadata,indent=2,allow_nan=False)+'\n')
    return report


def load_reviewed_outputs(directory=ROOT/'data/reviewed'):
    directory=Path(directory)
    metadata=json.loads((directory/'manifest.json').read_text())
    if metadata['notebook_source_sha256'] != notebook_source_hash():
        raise ValueError('Notebook source changed after verification; execute it again')
    for name,digest in metadata['research_helper_sha256'].items():
        if sha256(ROOT/'scripts'/name)!=digest:
            raise ValueError(f'Research helper changed after verification: {name}')
    frames={}
    for name,digest in metadata['frames'].items():
        path=directory/f'{name}.parquet'
        if sha256(path)!=digest:
            raise ValueError(f'Reviewed output changed after verification: {name}')
        frames[name]=pd.read_parquet(path)
    return frames,metadata
