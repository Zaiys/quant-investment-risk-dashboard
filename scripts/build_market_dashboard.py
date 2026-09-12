"""Adapt verified notebook tables to dashboard v3. No financial estimators here."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path

import numpy as np
import pandas as pd

from scripts.export_dashboard import publish_snapshot, validate_dashboard, MOMENTUM
from scripts.market_data import ROOT, sha256
from scripts.research_outputs import load_reviewed_outputs

LABELS = {'PORTFOLIO': 'Hypothetical portfolio'}


def scalar(value):
    if pd.isna(value):
        return None
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    return value


def period(start, end):
    return {'start': str(pd.Timestamp(start).date()), 'end': str(pd.Timestamp(end).date())}


def source(meta, context, dates=None, notes=()):
    verified = meta['verification']
    return {'path': 'notebooks/01_market_exploration.ipynb', 'label': 'Verified market exploration',
            'asOf': verified['price_period']['end'], 'period': dates or verified['price_period'],
            'methodology': context, 'notes': list(notes)}


def entities(ids):
    return [{'id': i, 'label': LABELS.get(i,i)} for i in ids]


def table(identifier, title, description, frame, columns, *, scenario=None, tag=True):
    result={'id':identifier,'title':title,'description':description,
            'columns':[{'key':'entity','label':'Asset / portfolio','unit':'text'},
                       *[{'key':key,'label':label,'unit':unit} for key,label,unit in columns]],
            'rows':[{'id':str(index),'cells':[LABELS.get(index,str(index)),*[scalar(row[key]) for key,_,_ in columns]],
                     **({'entityId':str(index)} if tag else {})} for index,row in frame.iterrows()]}
    if scenario:
        result['scenarioId']=scenario
    return result


def observed_chart_sample(frame):
    """Select observed quarter ends plus all first/last valid points; no rescaling."""
    groups=frame.index.to_period('Q')
    dates=set(frame.groupby(groups).tail(1).index)
    for column in frame:
        valid=frame[column].dropna()
        if not valid.empty:
            dates.update([valid.index[0],valid.index[-1]])
    # Preserve gaps and adjacent observations if a future reviewed series has them.
    gaps=frame.isna() & frame.ffill().notna() & frame.bfill().notna()
    mask=gaps.any(axis=1)
    mask=mask | mask.shift(1,fill_value=False) | mask.shift(-1,fill_value=False)
    dates.update(frame.index[mask])
    return frame.loc[sorted(dates)]


def line_chart(identifier, title, description, frame, *, unit='number', scenario=None, sample=True):
    selected=observed_chart_sample(frame) if sample else frame
    result={'id':identifier,'title':title,'description':description,'kind':'line',
            'xLabel':'Observation date','yLabel':'Index (initial value 100)' if unit=='number' else 'Drawdown',
            'xUnit':'text','unit':unit,'series':[{'id':t,'label':LABELS.get(t,t),'entityId':t,
                'points':[{'x':str(date.date()),'y':scalar(value)} for date,value in selected[t].items()]} for t in selected]}
    if scenario:
        result['scenarioId']=scenario
    return result


def scatter(identifier,title,description,frame):
    return {'id':identifier,'title':title,'description':description,'kind':'scatter',
            'xLabel':'Annualised volatility (252 days)','yLabel':'Calendar-year CAGR',
            'xUnit':'percent','unit':'percent','series':[{'id':t,'label':t,'entityId':t,
                'points':[{'x':scalar(row['volatility']),'y':scalar(row['cagr'])}]} for t,row in frame.iterrows()]}


def matrix(identifier,title,description,frame):
    return {'id':identifier,'title':title,'description':description,
            'labels':entities(frame.columns),'values':[[scalar(v) for v in row] for row in frame.to_numpy()]}


def methodology_items(meta):
    v=meta['verification']; inputs=meta['input_manifest']; weights=meta['portfolio_weights']
    full=v['price_period']; common=v['common_price_period']
    return [
        {'id':'source','title':'Yahoo Finance and adjusted prices','detail':
         f"Yahoo Finance via yfinance {inputs['versions']['yfinance']}. Asset field: Close with auto_adjust=True, repair=False, interval=1d and rounding=False. The installed yfinance implementation renames Yahoo Adj Close to Close; these are split/distribution-adjusted prices, not unadjusted share prices. ^IRX uses Close with auto_adjust=False. Inputs were downloaded {inputs['acquired_at']} and are frozen locally with SHA-256 checksums; acquisition details are recorded in data/provenance/market-inputs.json."},
        {'id':'period','title':'Requested and actual observations','detail':
         f"Requested from {inputs['start']} inclusive to {inputs['end_exclusive']} exclusive. Actual full coverage: {full['start']} to {full['end']}; the last observation is {full['end']} for every asset and ^IRX. The 1980 start follows the recovered code and its pre-1990 investigation. Every asset retains its own first observation, shown in the history table."},
        {'id':'universe','title':'Universe','detail':
         '50 selected companies plus five benchmark ETFs: '+', '.join(meta['benchmarks'])+'. Companies: '+', '.join(meta['companies'])+'. Ticker symbols are the identifiers supplied by the research; fund/company names are not inferred.'},
        {'id':'returns','title':'Daily returns and CAGR','detail':
         'Simple daily return r[t] = P[t] / P[t-1] - 1, using pct_change(fill_method=None). Missing prices are not filled. Full-history total return = last adjusted price / first adjusted price - 1. CAGR = (last / first) ** (1 / years) - 1, with years = elapsed calendar days / 365.25. CAGR differs from arithmetic annualised return.'},
        {'id':'volatility','title':'Annualisation and Sharpe','detail':
         'Volatility = sample standard deviation of daily asset returns (ddof=1) × sqrt(252). Sharpe = mean(aligned asset return minus daily risk-free proxy) / sample standard deviation of those same aligned asset returns × sqrt(252). The denominator is asset-return volatility, not excess-return volatility. Each full-history Sharpe uses its own valid asset/risk-free overlap.'},
        {'id':'risk-free','title':'Treasury bill proxy and alignment','detail':
         f"Preserved approximation: daily_rf = (1 + ^IRX Close / 100) ** (1 / 252) - 1. The percentage yield is treated as an effective annual rate; this is not an exact conversion of a Treasury bill bank-discount quote into holding-period returns. Align to price dates, forward fill only, then use shared nonmissing return/rate dates. The snapshot forward fills {v['rf_forward_filled_dates']} dates and leaves {v['rf_unavailable_dates']} dates unavailable. It uses same-date yields without a lag; this is descriptive historical analysis, not an implementable risk-free trading strategy."},
        {'id':'beta','title':'Beta and correlations','detail':
         'Beta = sample covariance(asset daily return, SPY daily return) / sample variance(SPY), using identical pairwise valid observations. The original beta table excludes SPY itself; its asset-level beta is null. The full-history Pearson correlation matrix uses pairwise available daily returns, so estimation periods differ by pair; the SPY relationships table gives exact overlap dates/counts. The separate common-company matrix uses the shared company return sample. Correlations are not assumed stable across regimes.'},
        {'id':'common','title':'Full histories and common observations','detail':
         f"Full-history metrics use each asset's available history. The fair company-only comparison uses all 50 companies from {common['start']} to {common['end']}: {v['common_price_observations']} shared prices and {v['common_return_observations']} identical daily returns per company. The exploratory 2012 eligibility count is not the final sample. Levels are restricted to dates valid for every company; daily returns are computed on the original date grid before removing incomplete rows, so gaps cannot become multi-day returns labelled daily. This snapshot omits {v['common_omitted_price_rows']} internal price rows and {v['common_omitted_return_rows']} daily return rows. Common Sharpe uses the same aligned risk-free dates for every company."},
        {'id':'indexed','title':'Indexed performance and chart sampling','detail':
         'Full-history index = 100 × adjusted price / that asset’s first valid adjusted price; these individual starts differ. Common-period index = 100 × adjusted price / adjusted price at the shared start. Portfolio and SPY paths start at 100 on the same initial date. Long-history website charts select existing quarter-end observations plus initial/final observations and any gap boundaries in Python; no financial values are averaged or recomputed. Stress charts retain every daily observation. Full daily indexed outputs remain in the local reviewed tables; all metrics use daily data.'},
        {'id':'drawdown','title':'Maximum drawdown','detail':
         'Drawdown = wealth / running maximum wealth - 1; maximum drawdown is its minimum, reported as a negative fraction. Full-history asset drawdown uses the adjusted price path from its first valid price. Portfolio and every stress evaluation explicitly prepend wealth 1.0 before the first included return, so an immediate decline is counted. The baseline date is the preceding observed price date, which can precede the requested stress window; it contributes no extra return.'},
        {'id':'portfolio','title':'Portfolio construction and comparison','detail':
         'Weights: '+', '.join(f'{t} {w*100:g}%' for t,w in weights.items())+'. Weights sum to 100%. Daily portfolio return is the weighted sum of constituent simple daily returns on complete shared observations. Constant weights imply daily rebalancing, without costs, taxes, slippage or cash flows. Arithmetic annualised portfolio/SPY return = daily mean × 252, not CAGR. '+f"The portfolio and SPY share {v['portfolio_return_observations']} returns from {v['portfolio_first_return']} to {full['end']}, with wealth initially 1 on {v['portfolio_initial_wealth_date']}."},
        {'id':'risk-contributions','title':'Component risk contributions','detail':
         'Annual covariance matrix = sample daily covariance × 252. Portfolio volatility = sqrt(wᵀΣw). Marginal volatility contribution = Σw / portfolio volatility; component contribution = weight × marginal contribution. Components sum to portfolio volatility; each component divided by total volatility gives its risk share, summing to 100%. Negative shares are allowed and reflect this sample.'},
        {'id':'stress','title':'Historical stress windows','detail':
         '; '.join(f'{name}: {start} through {end}' for name,(start,end) in meta['stress_periods'].items())+'. Returns whose dates fall inside each inclusive window are compounded from initial wealth 1. Portfolio, SPY and constituent outcomes use identical dates; tables report compounded period return and minimum drawdown, not annualised returns. Actual first/last return dates and counts accompany each scenario.'},
        {'id':'limitations','title':'Limitations and uncertainty','detail':
         'The selected surviving companies introduce survivorship and selection bias; delisted/failed companies are not represented. Listing dates and available histories differ. Yahoo adjustments, corporate actions, ticker histories and later data revisions can affect results; downloads were checked for structure and internal identities, not independently reconciled against exchange records. Unusually large historical moves are retained without automatic repair. Correlations and beta can change across regimes. The risk-free transformation and constant-weight frictionless portfolio are simplifying assumptions. Historical performance does not predict future results.'},
        {'id':'momentum','title':'Strategy research remains pending','detail':
         'Quantitative Strategy / Momentum awaits the user-authored notebooks/02_momentum_strategy.ipynb and review of its signals, timing, portfolio rules, costs and backtest outputs. No momentum results are included in the version 2 snapshot.'},
    ]


def build_dashboard(frames, meta):
    v=meta['verification']; full=v['price_period']; common=v['common_price_period']
    history=frames['asset_history']; all_ids=list(history.index)
    common_ids=meta['companies']; portfolio_ids=['PORTFOLIO',*meta['portfolio_weights']]
    full_note=f"Each asset's own available history, ending {full['end']}; not a common-period ranking."
    common_note=f"50 companies; {common['start']} to {common['end']}; {v['common_return_observations']} shared daily returns per company."
    sample_note='Observed quarter-end samples plus first/last observations; all calculations use full daily data.'
    section=lambda context,dates=None,ids=None: {'status':'available','source':source(meta,context,dates),
                                              'metrics':[],'charts':[],'tables':[],**({'entities':entities(ids)} if ids else {})}
    market=section('Adjusted-price indexed performance. '+full_note+' '+common_note,ids=all_ids)
    market['metrics']=[{'id':'asset-count','label':'Assets in research universe','value':len(all_ids),'unit':'number',
                        'note':'50 selected companies and 5 benchmark ETFs.'},
                       {'id':'common-observations','label':'Shared daily company returns','value':v['common_return_observations'],
                        'unit':'number','note':common_note}]
    market['charts']=[line_chart('full-index','Indexed performance — individual histories',full_note+' Each series starts at 100 on its own first date. '+sample_note,frames['indexed_history']),
                      line_chart('common-index','Indexed performance — common company period',common_note+' All series start together at 100. '+sample_note,frames['indexed_common'])]
    market['tables']=[table('history','Available histories and sample counts','Price coverage differs by asset. Beta samples overlap SPY; Sharpe samples overlap ^IRX.',history,
                           [('first_date','First price','text'),('last_date','Last price','text'),('price_observations','Prices','number'),
                            ('return_observations','Daily returns','number'),('sharpe_observations','Sharpe pairs','number'),('beta_observations','SPY pairs','number')])]
    risk=section(full_note+' '+common_note+' Volatility and Sharpe use 252 trading days.',ids=all_ids)
    risk['charts']=[scatter('risk-full','Risk and return — individual histories',full_note,frames['full_asset_metrics']),
                    scatter('risk-common','Risk and return — common company period',common_note,frames['common_metrics'])]
    risk['tables']=[table('full-metrics','Risk and return — individual histories',full_note+' SPY beta is null because the original table excludes the benchmark itself.',frames['full_asset_metrics'],
                         [('total_return','Total return','percent'),('cagr','CAGR','percent'),('volatility','Annualised volatility','percent'),
                          ('sharpe','Sharpe','ratio'),('max_drawdown','Maximum drawdown','percent'),('beta','Beta vs SPY','ratio')]),
                    table('common-metrics','Risk and return — common company period',common_note,frames['common_metrics'],
                         [('cagr','CAGR','percent'),('volatility','Annualised volatility','percent'),('sharpe','Sharpe','ratio')])]
    correlation=section('Pearson daily-return correlations; full history is pairwise overlap, common companies share all observations. '+common_note,ids=all_ids)
    correlation['matrices']=[matrix('full-correlation','Correlations — pairwise available histories','Each pair uses its own shared valid daily returns, ending '+full['end']+'. Periods differ across pairs.',frames['correlation_matrix']),
                             matrix('common-correlation','Correlations — common company period',common_note,frames['common_correlation'])]
    correlation['tables']=[table('spy-relationships','Relationships with SPY','Sorted by Python-computed full-history correlation. Pair-specific observation windows are shown; a low historical correlation is not a forecast.',frames['spy_relationships'],
                               [('correlation','Correlation','ratio'),('beta','Beta','ratio'),('first_return','First shared return','text'),
                                ('last_return','Last shared return','text'),('observations','Shared returns','number')])]
    portfolio_period=period(v['portfolio_initial_wealth_date'],full['end'])
    portfolio_note=f"Identical {v['portfolio_return_observations']} daily returns from {v['portfolio_first_return']} to {full['end']}; initial wealth date {v['portfolio_initial_wealth_date']}. Constant weights imply daily rebalancing, without costs."
    portfolio=section(portfolio_note,portfolio_period,portfolio_ids)
    labels=[('arithmetic_return','Arithmetic annualised return','percent'),('volatility','Annualised volatility','percent'),('sharpe','Sharpe','ratio'),('max_drawdown','Maximum drawdown','percent')]
    portfolio['tables']=[table('portfolio-comparison','Portfolio versus SPY',portfolio_note+' Return = daily mean × 252; it is not CAGR.',frames['portfolio_metrics'],labels),
                         table('risk-contributions','Capital weights and risk contributions','Component volatility contributions sum to portfolio volatility; risk shares sum to 100%.',frames['portfolio_risk_contributions'],
                               [('weight','Capital weight','percent'),('component_volatility','Component volatility','percent'),('risk_share','Share of volatility','percent')])]
    portfolio['charts']=[line_chart('portfolio-index','Portfolio and SPY indexed wealth',portfolio_note+' '+sample_note,frames['portfolio_indexed']),
                         line_chart('portfolio-dd','Portfolio and SPY drawdown',portfolio_note+' '+sample_note+' Minimum drawdown is calculated from every daily observation, not this sampled line.',frames['portfolio_drawdowns'],unit='percent')]
    stress=section('Compounded return and drawdown for the unchanged three historical windows, each starting from explicit wealth 1.0.',
                   period(min(x[0] for x in meta['stress_periods'].values()),max(x[1] for x in meta['stress_periods'].values())),portfolio_ids)
    stress['scenarios']=[]
    for i,(name,(start,end)) in enumerate(meta['stress_periods'].items()):
        identifier=f'stress-{i}'; context=v['stress_windows'][name]
        note=f"{context['return_observations']} shared daily returns, {context['first_return']} through {context['last_return']}; initial wealth 1 on preceding observation {context['initial_wealth_date']}."
        stress['scenarios'].append({'id':identifier,'label':name,'period':period(start,end),'notes':note})
        stress['tables'].append(table(identifier+'-outcomes',name+' — returns and drawdowns',note+' Compounded period returns; no annualisation.',frames[f'stress_metrics_{i}'],
                                      [('total_return','Period total return','percent'),('max_drawdown','Maximum drawdown','percent')],scenario=identifier))
        chart=line_chart(identifier+'-wealth',name+' — wealth path',note+' Every daily observation is retained.',frames[f'stress_growth_{i}'],scenario=identifier,sample=False)
        chart['yLabel']='Wealth (initial value 1.0)'
        stress['charts'].append(chart)
    return {'schemaVersion':3,'generatedAt':v['checked_at'],'research':{'updatedAt':v['checked_at'][:10],'period':full,
            'universe':[{'id':t,'name':t,'availableFrom':history.loc[t,'first_date'],'availableTo':history.loc[t,'last_date']} for t in history.index]},
            'methodology':{'status':'available','source':source(meta,'Verified notebook definitions; see METHODOLOGY.md and data/provenance/research-verification.json.'),
                           'items':methodology_items(meta)},
            'sections':{'market':market,'risk-return':risk,'correlation':correlation,'portfolio':portfolio,'stress':stress,'momentum':MOMENTUM}}


def count_values(value):
    if isinstance(value,dict): return sum(count_values(v) for v in value.values())
    if isinstance(value,list): return sum(count_values(v) for v in value)
    return int(isinstance(value,(int,float)) and not isinstance(value,bool))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Require exact equality with the reviewed Python export')
    args=parser.parse_args()
    frames,meta=load_reviewed_outputs()
    payload=build_dashboard(frames,meta)
    from scripts.momentum_outputs import load_outputs
    from scripts.build_momentum_dashboard import attach_momentum, attach_sensitivities
    from scripts.momentum_robustness_outputs import load_outputs as load_robustness
    momentum_frames, momentum_meta = load_outputs()
    payload = attach_momentum(payload, momentum_frames, momentum_meta)
    robustness_frames, robustness_meta = load_robustness()
    payload = attach_sensitivities(payload, robustness_frames, robustness_meta)
    validate_dashboard(payload)
    output=ROOT/'web/src/data/dashboard.json'
    if args.check:
        assert json.loads(output.read_text()) == payload, 'Snapshot differs from reviewed Python outputs'
    else:
        publish_snapshot(payload,output)
        assert json.loads(output.read_text()) == payload
        text='# Research methodology\n\nMarket research verified from `notebooks/01_market_exploration.ipynb`; the separate Momentum Strategy sections come from `notebooks/02_momentum_strategy.ipynb`.\n\n'
        text+='\n\n'.join('## '+item['title']+'\n\n'+item['detail'] for item in payload['methodology']['items'])+'\n'
        (ROOT/'METHODOLOGY.md').write_text(text)
    report={'checked_at':datetime.now(timezone.utc).isoformat(),'status':'exact agreement',
            'numeric_values':count_values(payload),'snapshot_sha256':sha256(output),
            'notebook_source_sha256':meta['notebook_source_sha256'],
            'momentum_notebook_source_sha256':momentum_meta['notebook_source_sha256'],
            'momentum_robustness_manifest_sha256':sha256(ROOT/'data/reviewed/momentum_robustness/manifest.json'),
            'sections':{key:value['status'] for key,value in payload['sections'].items()},
            'chart_sampling':'Observed quarter ends plus first/last points and gap boundaries; stress daily. Momentum uses observed month ends plus initial/final dates and annual daily drawdown troughs. No interpolation or financial recomputation.'}
    (ROOT/'data/provenance/dashboard-crosscheck.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    main()
