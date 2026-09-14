"""Acquire Yahoo inputs once; load a checksummed snapshot without network access."""
from __future__ import annotations

import argparse
import ast
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import time

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CACHE = ROOT / 'data/raw'
START = '1980-01-01'


def universe_from_notebook():
    notebook = json.loads((ROOT / 'notebooks/01_market_exploration.ipynb').read_text())
    values = {}
    for cell in notebook['cells']:
        if cell['cell_type'] != 'code':
            continue
        for node in ast.parse(''.join(cell['source'])).body:
            if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
                name = node.targets[0].id
                if name in ('companies', 'benchmarks'):
                    values[name] = ast.literal_eval(node.value)
    return values['benchmarks'] + values['companies']


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def validate_frame(frame, columns, start, end, *, positive):
    if list(frame.columns) != list(columns):
        raise ValueError('Input columns differ from the requested universe')
    if not isinstance(frame.index, pd.DatetimeIndex) or frame.index.has_duplicates or not frame.index.is_monotonic_increasing:
        raise ValueError('Input dates must be unique and increasing')
    if frame.empty or frame.index[0] < pd.Timestamp(start) or frame.index[-1] >= pd.Timestamp(end):
        raise ValueError('Input dates fall outside the requested interval')
    for symbol in columns:
        values = frame[symbol].dropna()
        if len(values) < 2 or not np.isfinite(values).all() or (positive and (values <= 0).any()):
            raise ValueError(f'Invalid or insufficient input observations: {symbol}')


def load_market_inputs(tickers, cache_dir=DEFAULT_CACHE):
    """Read only: absent, mismatched or modified caches fail rather than download."""
    cache = Path(cache_dir)
    manifest_path = cache / 'manifest.json'
    if not manifest_path.exists():
        raise FileNotFoundError('Acquire inputs first: python -m scripts.market_data --end YYYY-MM-DD')
    manifest = json.loads(manifest_path.read_text())
    if manifest['tickers'] != list(tickers) or manifest['start'] != START:
        raise ValueError('Cache universe or start date does not match notebook')
    if manifest['price_settings'] != {'field': 'Close', 'auto_adjust': True, 'repair': False, 'interval': '1d', 'rounding': False}:
        raise ValueError('Unexpected price adjustment settings')
    if manifest['risk_free_settings'] != {'symbol': '^IRX', 'field': 'Close', 'auto_adjust': False, 'repair': False, 'interval': '1d', 'rounding': False}:
        raise ValueError('Unexpected risk-free settings')
    for filename, digest in manifest['sha256'].items():
        if sha256(cache / filename) != digest:
            raise ValueError(f'Input checksum mismatch: {filename}')
    prices = pd.read_parquet(cache / 'prices.parquet')
    risk_free = pd.read_parquet(cache / 'risk_free.parquet')
    validate_frame(prices, tickers, START, manifest['end_exclusive'], positive=True)
    validate_frame(risk_free, ['^IRX'], START, manifest['end_exclusive'], positive=False)
    return prices, risk_free, manifest


def acquire(tickers, end, cache_dir=DEFAULT_CACHE, attempts=4, pause=0.6):
    import yfinance as yf
    cache = Path(cache_dir)
    cache.mkdir(parents=True, exist_ok=True)
    # Keep request metadata with partial results, so a retry resumes only this request.
    partial = cache / f'partial-{START}-{end}'
    partial.mkdir(exist_ok=True)
    yf.set_tz_cache_location(str(cache / 'yfinance'))
    downloaded = {}
    metadata = {}
    for symbol in [*tickers, '^IRX']:
        adjusted = symbol != '^IRX'
        file = partial / f'{symbol}.parquet'
        record_file = file.with_suffix('.json')
        if file.exists() and record_file.exists():
            record = json.loads(record_file.read_text())
            if record['sha256'] != sha256(file):
                raise ValueError(f'Partial cache checksum mismatch: {symbol}')
            frame = pd.read_parquet(file)
            validate_frame(frame, [symbol], START, end, positive=adjusted)
        else:
            last_error = None
            for attempt in range(attempts):
                try:
                    frame = yf.download(symbol, start=START, end=end, auto_adjust=adjusted,
                                        repair=False, rounding=False, interval='1d', progress=False,
                                        threads=False, timeout=45, keepna=True)['Close']
                    if isinstance(frame, pd.Series):
                        frame = frame.to_frame(symbol)
                    frame = frame.rename(columns={frame.columns[0]: symbol})
                    frame.index = pd.DatetimeIndex(frame.index).tz_localize(None).normalize()
                    frame = frame.dropna(how='all')
                    validate_frame(frame, [symbol], START, end, positive=adjusted)
                    frame.to_parquet(file)
                    record = {'symbol': symbol, 'downloaded_at': datetime.now(timezone.utc).isoformat(),
                              'source': 'Yahoo Finance via yfinance.download', 'start': START,
                              'end_exclusive': end, 'auto_adjust': adjusted, 'field': 'Close',
                              'observations': len(frame), 'first_date': str(frame.index[0].date()),
                              'last_date': str(frame.index[-1].date()), 'sha256': sha256(file)}
                    record_file.write_text(json.dumps(record, indent=2) + '\n')
                    break
                except Exception as error:
                    last_error = error
                    print(f'{symbol}: attempt {attempt + 1}/{attempts} failed: {error}', flush=True)
                    if attempt + 1 < attempts:
                        time.sleep(min(4 * 2 ** attempt, 30))
            else:
                raise RuntimeError(f'Yahoo acquisition failed for {symbol}; partial downloads retained') from last_error
            time.sleep(pause)
        downloaded[symbol] = frame[symbol]
        metadata[symbol] = record
        print(f'{symbol}: {record["observations"]} observations, {record["first_date"]} to {record["last_date"]}', flush=True)
    prices = pd.concat([downloaded[t] for t in tickers], axis=1).sort_index()
    risk_free = downloaded['^IRX'].to_frame()
    prices.to_parquet(cache / 'prices.parquet')
    risk_free.to_parquet(cache / 'risk_free.parquet')
    manifest = {'source': 'Yahoo Finance', 'acquired_at': datetime.now(timezone.utc).isoformat(),
                'start': START, 'end_exclusive': end, 'tickers': list(tickers),
                'price_settings': {'field': 'Close', 'auto_adjust': True, 'repair': False, 'interval': '1d', 'rounding': False},
                'risk_free_settings': {'symbol': '^IRX', 'field': 'Close', 'auto_adjust': False, 'repair': False, 'interval': '1d', 'rounding': False},
                'versions': {'yfinance': yf.__version__, 'pandas': pd.__version__, 'numpy': np.__version__},
                'sha256': {name: sha256(cache / name) for name in ('prices.parquet', 'risk_free.parquet')},
                'downloads': metadata}
    (cache / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    load_market_inputs(tickers, cache)
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--end', required=True, help='Exclusive cutoff; use a date after the last completed trading day')
    parser.add_argument('--cache-dir', type=Path, default=DEFAULT_CACHE)
    args = parser.parse_args()
    if pd.Timestamp(args.end) <= pd.Timestamp(START):
        parser.error('End must be after start')
    result = acquire(universe_from_notebook(), args.end, args.cache_dir)
    print(json.dumps({'sha256': result['sha256'], 'acquired_at': result['acquired_at']}, indent=2))
