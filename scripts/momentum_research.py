"""One pre-specified monthly momentum rule; functions used by notebook 02."""
from __future__ import annotations

import numpy as np
import pandas as pd

LOOKBACK = 12
TOP_N = 10
STRATEGY = 'MOMENTUM'


def month_end_prices(prices):
    """Exact final observed row of each completed month; never skip missing quotes.

    The month containing the last cached date is excluded from signal formation.
    It can still contribute a partial holding period using the prior signal.
    """
    months = prices.index.to_period('M')
    completed = prices.loc[months < months[-1]]
    return completed.groupby(completed.index.to_period('M')).tail(1)


def momentum_signals(monthly, daily):
    """P[t]/P[t-12]-1, with 13 valid endpoints and complete trailing daily quotes."""
    if not monthly.index.to_period('M').equals(pd.period_range(
            monthly.index[0].to_period('M'), monthly.index[-1].to_period('M'), freq='M')):
        raise ValueError('Month grid is not contiguous')
    signals = monthly / monthly.shift(LOOKBACK) - 1
    eligible = monthly.notna().rolling(LOOKBACK + 1).sum().eq(LOOKBACK + 1)
    for i in range(LOOKBACK, len(monthly)):
        history = daily.loc[monthly.index[i-LOOKBACK]:monthly.index[i], monthly.columns]
        eligible.iloc[i] &= history.notna().all() & history.gt(0).all()
    return signals.where(eligible)


def select_weights(signals):
    """Rank by descending signal; alphabetical ticker breaks exact ties."""
    weights = pd.DataFrame(0.0, index=signals.index, columns=signals.columns)
    rows = []
    for date, signal in signals.iterrows():
        ranked = signal.dropna().sort_index().sort_values(ascending=False, kind='stable')
        if len(ranked) < TOP_N:
            continue  # no partially invested substitute rule
        selected = ranked.iloc[:TOP_N]
        weights.loc[date, selected.index] = 1 / TOP_N
        for rank, (ticker, value) in enumerate(selected.items(), start=1):
            rows.append({'rebalance_date': date, 'ticker': ticker, 'rank': rank,
                         'signal': value, 'weight': 1 / TOP_N})
    return weights, pd.DataFrame(rows)


def backtest(prices, weights):
    """Buy at formation close and hold fixed adjusted units until the next close.

    Closing signal / closing execution is a frictionless timing approximation.
    No formation-date return is earned. If a held quote becomes invalid, mark
    that position to zero at its first invalid date and keep it at zero for the
    rest of the holding month. Never replace it using future return availability.
    A missing benchmark quote stops the run instead of changing the sample.
    """
    companies = list(weights.columns)
    blocks, diagnostics, ending_weights, events = [], [], [], []
    previous = pd.Series(0.0, index=companies)
    previous_cash = 1.0
    started = False
    for date, target in weights.iterrows():
        if target.sum() == 0:
            if started:
                raise ValueError('Fewer than ten eligible stocks after strategy inception')
            continue
        if not started and pd.isna(prices.loc[date, 'SPY']):
            continue  # SPY availability is known at the formation close
        holding_month = date.to_period('M') + 1
        dates = prices.index[prices.index.to_period('M') == holding_month]
        if len(dates) == 0:
            continue
        selected = target[target > 0]
        base = prices.loc[date, selected.index]
        if base.isna().any() or (base <= 0).any():
            raise ValueError('Invalid known formation quote')
        quotes = prices.loc[dates, selected.index]
        invalid = quotes.isna() | ~np.isfinite(quotes) | quotes.le(0)
        failed = invalid.cummax()
        relative = quotes.div(base).mask(failed, 0.0)
        for ticker in selected.index:
            if invalid[ticker].any():
                events.append({'rebalance_date': str(date.date()), 'ticker': ticker,
                               'first_invalid_date': str(invalid.index[invalid[ticker]][0].date()),
                               'policy': 'Position marked to zero; no recovery within this holding month'})
        position_values = relative.mul(selected)
        nav = position_values.sum(axis=1)
        if nav.le(0).any():
            raise ValueError('Complete portfolio loss; cannot continue a rebalanced backtest')
        prior_nav = nav.shift(1)
        prior_nav.iloc[0] = 1.0
        strategy_return = nav / prior_nav - 1
        spy_prices = prices.loc[pd.DatetimeIndex([date]).append(dates), 'SPY']
        if spy_prices.isna().any() or spy_prices.le(0).any():
            raise ValueError('Missing benchmark quote inside the evaluation sample')
        spy_return = spy_prices.pct_change(fill_method=None).iloc[1:]
        blocks.append(pd.DataFrame({STRATEGY: strategy_return, 'SPY': spy_return}))
        turnover = 0.5 * ((target - previous).abs().sum() + abs(previous_cash))
        end = pd.Series(0.0, index=companies)
        end.loc[selected.index] = position_values.iloc[-1] / nav.iloc[-1]
        end.name = date
        ending_weights.append(end)
        diagnostics.append({'rebalance_date': date, 'first_return': str(dates[0].date()),
                            'last_return': str(dates[-1].date()), 'observations': len(dates),
                            'holdings': len(selected), 'turnover': turnover,
                            'entrants': int(((target > 0) & (previous == 0)).sum()),
                            'initial_allocation': not started,
                            'partial_month': holding_month == prices.index[-1].to_period('M')})
        previous, previous_cash, started = end, 0.0, True
    if not blocks:
        raise ValueError('No strategy / SPY evaluation sample')
    returns = pd.concat(blocks)
    if returns.index.has_duplicates or returns.isna().any().any():
        raise ValueError('Invalid common return grid')
    return returns, pd.DataFrame(diagnostics).set_index('rebalance_date'), pd.DataFrame(ending_weights), events


def performance_summary(returns, wealth, daily_rf):
    """Notebook 01 estimators on identical daily observations; CAGR uses calendar time."""
    rf = daily_rf.reindex(returns.index)
    if rf.isna().any() or returns.isna().any().any():
        raise ValueError('Metrics require complete identical return / risk-free dates')
    years = (wealth.index[-1] - wealth.index[0]).days / 365.25
    rows = {}
    for name in returns:
        r = returns[name]
        rows[name] = {
            'total_return': wealth[name].iloc[-1] - 1,
            'arithmetic_return': r.mean() * 252,
            'cagr': wealth[name].iloc[-1] ** (1 / years) - 1,
            'volatility': r.std(ddof=1) * np.sqrt(252),
            'sharpe': (r - rf).mean() / r.std(ddof=1) * np.sqrt(252),
            'max_drawdown': (wealth[name] / wealth[name].cummax() - 1).min(),
            'beta': r.cov(returns['SPY']) / returns['SPY'].var(ddof=1),
            'correlation': r.corr(returns['SPY']),
        }
    return pd.DataFrame.from_dict(rows, orient='index')


def calendar_returns(returns, initial_date):
    """Include partial first/final years but flag them; extrema use full years only."""
    annual = (1 + returns).groupby(returns.index.year).prod() - 1
    annual.index = annual.index.astype(str)
    annual['coverage'] = 'Full calendar year'
    annual.loc[str(returns.index[0].year), 'coverage'] = 'Partial first year'
    annual.loc[str(returns.index[-1].year), 'coverage'] = 'Partial final year'
    annual['first_return'] = [str(g.index[0].date()) for _, g in returns.groupby(returns.index.year)]
    annual['last_return'] = [str(g.index[-1].date()) for _, g in returns.groupby(returns.index.year)]
    return annual
