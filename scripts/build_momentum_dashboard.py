"""Present reviewed notebook 02 tables through the dedicated v3 momentum contract."""
from scripts.build_market_dashboard import table, line_chart, scalar, period

LABEL = 'Momentum'
MEASURES = [('total_return','Cumulative total return','percent'),
            ('arithmetic_return','Arithmetic annualised return','percent'),('cagr','CAGR','percent'),
            ('volatility','Annualised volatility','percent'),('sharpe','Sharpe','ratio'),
            ('max_drawdown','Maximum drawdown','percent'),('beta','Beta vs SPY','ratio'),
            ('correlation','Correlation with SPY','ratio')]


def attach_momentum(payload, frames, meta):
    v = meta['verification']
    date_note = (f"{v['return_observations']} shared daily returns, {v['first_return']} through {v['last_return']}; "
                 f"initial wealth 1 on {v['initial_wealth_date']}. Final month and first/final years are partial.")
    method = meta['methodology']
    section = {'status':'available',
               'definition':{'lookbackMonths':12,'topN':10,'rebalance':'monthly',
                             'weighting':'equal at formation; drift within month','transactionCosts':0,'skipMonth':False,
                             'initialWealthDate':v['initial_wealth_date'],'firstReturnDate':v['first_return'],
                             'lastReturnDate':v['last_return'],'dailyObservations':v['return_observations'],
                             'holdingMonths':v['holding_months']},
               'source':{'path':'notebooks/02_momentum_strategy.ipynb','label':'Verified momentum research',
                         'asOf':v['last_return'],'period':period(v['initial_wealth_date'],v['last_return']),
                         'methodology':method[0]['detail']+' '+date_note,
                         'notes':[item['detail'] for item in method[1:]]},
               'entities':[{'id':'MOMENTUM','label':LABEL},{'id':'SPY','label':'SPY'}],
               'metrics':[], 'charts':[], 'tables':[]}
    for entity in ['MOMENTUM','SPY']:
        for key,label,unit in MEASURES[1:6]:
            section['metrics'].append({'id':entity+'-'+key, 'label':(LABEL if entity=='MOMENTUM' else entity)+' · '+label,
                                       'value':scalar(frames['summary'].loc[entity,key]),'unit':unit,'entityId':entity,
                                       'note':date_note+' Gross of costs; selected surviving-company universe.'})
    sample_note = 'Observed month ends, initial/final observations and each year’s daily drawdown troughs; full daily data determine metrics.'
    section['charts'] = [line_chart('momentum-index','Momentum and SPY indexed wealth',date_note+' '+sample_note,frames['chart_indexed'],sample=False),
                         line_chart('momentum-dd','Momentum and SPY drawdown',date_note+' '+sample_note,frames['chart_drawdowns'],sample=False,unit='percent')]
    annual = frames['annual']
    section['charts'].append({'id':'momentum-annual','title':'Calendar-year returns','description':'Compounded daily returns within each year. First and final years are partial; see the coverage column below.',
                              'kind':'bar','xLabel':'Calendar year (first and final partial)','yLabel':'Total return','xUnit':'text','unit':'percent',
                              'series':[{'id':entity,'label':LABEL if entity=='MOMENTUM' else entity,'entityId':entity,
                                         'points':[{'x':year,'y':scalar(row[entity])} for year,row in annual.iterrows()]} for entity in ['MOMENTUM','SPY']]})
    def tab(identifier,title,description,frame,columns,tag=False):
        result=table(identifier,title,description,frame,columns,tag=tag)
        result['columns'][0]['label']='Record'
        result['columns'][0]['key']='record'
        return result
    section['tables'] = [tab('momentum-summary','Strategy and benchmark — full comparison',date_note,frames['summary'],MEASURES,tag=True),
        tab('momentum-calendar','Calendar returns and coverage','Partial years are retained and labelled; they do not compete for best/worst year.',annual,
            [('MOMENTUM','Momentum','percent'),('SPY','SPY','percent'),('coverage','Coverage','text'),('first_return','First return','text'),('last_return','Last return','text')]),
        tab('momentum-best-worst','Best and worst full calendar years','First and final partial years excluded.',frames['best_worst'],
            [('best_year','Best year','text'),('best_year_return','Best-year return','percent'),('worst_year','Worst year','text'),('worst_year_return','Worst-year return','percent')],tag=True),
        tab('momentum-diagnostics','Turnover and holdings diagnostics','One-way turnover = half absolute changes from drifted pretrade weights to target weights, including cash. Recurring mean excludes initial allocation.',frames['diagnostics'],
            [('holding_months','Holding months','number'),('recurring_rebalances','Recurring rebalances','number'),('mean_turnover','Mean one-way turnover','percent'),
             ('median_turnover','Median turnover','percent'),('max_turnover','Maximum turnover','percent'),('initial_turnover','Initial allocation','percent'),
             ('mean_entrants','Mean new names','number'),('unique_selected','Unique companies held','number'),('min_eligible','Minimum eligible','number'),
             ('max_eligible','Maximum eligible','number'),('missing_quote_events','Missing held quotes','number')]),
        tab('momentum-frequency','Company selection frequency','Counts of evaluated holding months; all historical selections are retained in the research tables.',frames['holding_frequency'],
            [('months_selected','Months selected','number'),('fraction_of_months','Share of holding months','percent')]),
        tab('momentum-walkthrough','First rebalance — raw prices, ranks and next-month outcomes','Formation date is chosen by position, not performance. All eligible companies shown. Next-month outcomes are audit data attached after selection.',frames['walkthrough'],
            [('lookback_date','Lookback date','text'),('rebalance_date','Formation date','text'),('holding_end','Holding end','text'),
             ('lookback_price','Lookback adjusted price','number'),('formation_price','Formation adjusted price','number'),('signal','12-month signal','percent'),
             ('rank','Rank','number'),('weight','Target weight','percent'),('next_period_return','Next-period return','percent'),('contribution','Portfolio contribution','percent')]),
        tab('momentum-stress','Difficult-period comparison','The three existing stress windows. Each starts from wealth 1 before its first shared daily return; results are not annualised.',frames['stress'],
            [('scenario','Scenario','text'),('entity','Entity','text'),('first_return','First return','text'),('last_return','Last return','text'),
             ('observations','Daily observations','number'),('total_return','Period return','percent'),('max_drawdown','Maximum drawdown','percent')])]
    recent = frames['rebalances'].tail(12).copy()
    recent.index = recent.index.strftime('%Y-%m-%d')
    section['tables'].append(tab('momentum-rebalances','Recent rebalance history','Last twelve formation dates; full history remains in reviewed research outputs. The last holding month is partial.',recent,
        [('first_return','First return','text'),('last_return','Last return','text'),('observations','Daily observations','number'),('holdings','Holdings','number'),
         ('eligible_companies','Eligible companies','number'),('turnover','One-way turnover','percent'),('entrants','New names','number')]))
    latest = frames['holdings'].loc[frames['holdings']['rebalance_date']==frames['rebalances'].index[-1]].set_index('ticker')
    section['tables'].append(tab('momentum-latest','Latest historical allocation',f"Formation {v['last_evaluated_signal']}. A historical record, not a current recommendation.",latest,
        [('rank','Rank','number'),('signal','12-month signal','percent'),('weight','Target weight','percent')]))
    payload['schemaVersion']=3
    payload['generatedAt']=v['checked_at']
    payload['sections']['momentum']=section
    payload['methodology']['items']=[item for item in payload['methodology']['items'] if item['id']!='momentum']+method
    return payload


def attach_sensitivities(payload, frames, meta):
    """Attach separately sourced sensitivity tables; preserve all baseline widgets."""
    v = meta['verification']
    date_note = (f"{v['daily_observations']} shared daily returns, {v['first_return']} through {v['last_return']}; "
                 f"initial wealth 1 on {v['initial_wealth_date']}. Same frozen data and selected surviving-company universe as the baseline.")
    measures = [('cagr', 'CAGR', 'percent'), ('volatility', 'Volatility', 'percent'),
                ('sharpe', 'Sharpe', 'ratio'), ('max_drawdown', 'Maximum drawdown', 'percent')]
    costs = table('momentum-cost-sensitivity', 'Transaction-cost sensitivity',
                  '0 / 5 / 10 / 20 bps per unit of one-way turnover, including initial allocation. '
                  '10 bps at 25% turnover costs 2.5 bps of portfolio value. Formation-close timing is unchanged. '
                  'CAGR change is in percentage points (pp) versus the gross baseline.',
                  frames['transaction_cost_sensitivity'],
                  [*measures, ('mean_recurring_cost_drag_bps', 'Mean recurring drag (bps)', 'number'),
                   ('cagr_change_vs_gross_pp', 'CAGR change (pp)', 'number')], tag=False)
    costs['columns'][0].update(key='assumption', label='Cost assumption')
    for row in costs['rows']:
        bps = int(float(row['id']))
        row['cells'][0] = '0 bps · gross baseline' if bps == 0 else f'{bps} bps'
    timing = table('momentum-execution-sensitivity', 'Next-day-close execution sensitivity',
                   'At every formation close, liquidate prior holdings and hold cash through the next trading-day close. '
                   'Earn zero on that day, then enter the same selected names. SPY remains continuously invested. '
                   'All timing variants are gross of costs; CAGR change is in percentage points (pp) versus the baseline.',
                   frames['execution_sensitivity'],
                   [*measures, ('beta', 'Beta vs SPY', 'ratio'), ('correlation', 'Correlation with SPY', 'ratio'),
                    ('cagr_change_vs_baseline_pp', 'CAGR change (pp)', 'number')], tag=False)
    timing['columns'][0].update(key='variant', label='Execution convention')
    labels = {'FORMATION_CLOSE_BASELINE': 'Formation close · gross baseline',
              'NEXT_DAY_CLOSE': 'Next-day close · monthly cash gap', 'SPY': 'SPY · continuously invested'}
    for row in timing['rows']:
        row['cells'][0] = labels[row['id']]
    payload['sections']['momentum']['sensitivities'] = {
        'definition': {**meta['definition'], 'firstReturnDate': v['first_return'],
                       'dailyObservations': v['daily_observations']},
        'source': {'path': 'scripts/momentum_robustness.py', 'label': 'Verified momentum sensitivity analyses',
                   'asOf': v['last_return'], 'period': period(v['initial_wealth_date'], v['last_return']),
                   'methodology': date_note,
                   'notes': [item['detail'] for item in meta['methodology']]},
        'tables': [costs, timing],
    }
    payload['methodology']['items'].extend(meta['methodology'])
    payload['generatedAt'] = v['checked_at']
    return payload
