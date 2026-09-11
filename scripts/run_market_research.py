"""Execute only the market notebook, in a fresh kernel, using local cached inputs."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import nbformat
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parents[1]


def main():
    os.environ.setdefault('MPLCONFIGDIR', str(ROOT / '.matplotlib'))
    os.environ['PATH'] = str(Path(sys.executable).parent) + os.pathsep + os.environ.get('PATH', '')
    path = ROOT / 'notebooks/01_market_exploration.ipynb'
    notebook = nbformat.read(path, as_version=4)
    nbformat.validate(notebook)
    for i, cell in enumerate(notebook.cells):
        if cell.cell_type == 'code':
            compile(cell.source, f'cell {i}', 'exec')
            cell.outputs = []
            cell.execution_count = None
    client = NotebookClient(notebook, timeout=180, kernel_name='python3',
                            resources={'metadata': {'path': str(ROOT)}})
    client.execute()
    codes = [c for c in notebook.cells if c.cell_type == 'code']
    assert all(c.execution_count is not None for c in codes)
    assert not any(o.output_type == 'error' for c in codes for o in c.outputs)
    nbformat.write(notebook, path)
    print(f'Executed {len(codes)} code cells in {len(notebook.cells)} cells, with no errors.')


if __name__ == '__main__':
    main()
