"""Small, explicit research corrections and reproducibility checks."""
from __future__ import annotations

import numpy as np
import pandas as pd


def wealth_from_returns(returns, initial_date):
    """Start at 1 before the first included return, including an immediate loss."""
    if returns.empty or returns.isna().any().any():
        raise ValueError('Wealth requires nonempty, complete return observations')
    if not np.isfinite(returns.to_numpy()).all() or (returns <= -1).any().any():
        raise ValueError('Invalid simple return')
    initial_date = pd.Timestamp(initial_date)
    if initial_date >= returns.index[0]:
        raise ValueError('Initial wealth must precede the first return')
    if isinstance(returns, pd.Series):
        initial = pd.Series([1.0], index=[initial_date], name=returns.name)
    else:
        initial = pd.DataFrame(1.0, index=[initial_date], columns=returns.columns)
    return pd.concat([initial, (1 + returns).cumprod()])


def previous_observation(index, first_return):
    preceding = index[index < first_return]
    if len(preceding) == 0:
        raise ValueError('No observation exists for initial wealth')
    return preceding[-1]


def common_observations(prices, tickers):
    """Shared levels and shared daily returns; never bridge gaps as daily returns."""
    selected = prices[tickers]
    if selected.notna().sum().min() < 2:
        raise ValueError('Insufficient asset history for common comparison')
    start = max(selected[t].first_valid_index() for t in tickers)
    end = min(selected[t].last_valid_index() for t in tickers)
    window = selected.loc[start:end]
    levels = window.dropna(how='any')
    if len(levels) < 2:
        raise ValueError('Insufficient shared price observations')
    # Calculate before dropping rows, so a missing quote cannot create a multi-day
    # return disguised as a one-day observation. First common level is the base.
    returns = window.loc[levels.index[0]:levels.index[-1]].pct_change(fill_method=None).dropna(how='any')
    if len(returns) < 2:
        raise ValueError('Insufficient shared daily returns')
    return levels, returns
