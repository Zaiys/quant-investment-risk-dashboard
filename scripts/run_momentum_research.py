"""Execute notebook 02 in a fresh Python kernel using only the frozen cache."""
from __future__ import annotations
import os
import sys
import nbformat
from nbclient import NotebookClient
from scripts.market_data import ROOT


def main():
    os.environ.setdefault('MPLCONFIGDIR', str(ROOT/'.matplotlib'))
    os.environ['PATH'] = str(__import__('pathlib').Path(sys.executable).parent)+os.pathsep+os.environ.get('PATH','')
    path = ROOT/'notebooks/02_momentum_strategy.ipynb'
    notebook = nbformat.read(path, as_version=4)
    nbformat.validate(notebook)
    for i,cell in enumerate(notebook.cells):
        if cell.cell_type == 'code':
            compile(cell.source, f'cell {i}', 'exec')
            cell.outputs, cell.execution_count = [], None
    NotebookClient(notebook, timeout=180, kernel_name='python3',
                   resources={'metadata':{'path':str(ROOT)}}).execute()
    codes = [c for c in notebook.cells if c.cell_type == 'code']
    assert all(c.execution_count is not None for c in codes)
    assert not any(o.output_type=='error' for c in codes for o in c.outputs)
    nbformat.write(notebook,path)
    print(f'Executed {len(codes)} code cells in {len(notebook.cells)} cells without errors.')


if __name__ == '__main__':
    main()
