"""Builds the single-file page: python3 assemble.py [output path, default site/index.html]"""
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
read = lambda name: open(os.path.join(here, name), encoding='utf-8').read()
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'site', 'index.html')
page = (read('template.html')
        .replace('__ENGINE__', read('engine.js'))
        .replace('__SNAPSHOT__', read('snapshot.json'))
        .replace('__VALIDATION__', read('validation.json'))
        .replace('__FLPATH__', read('fl_path.txt')))
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w', encoding='utf-8').write(page)
print(f'Wrote {out} ({len(page)//1024} KB)')
