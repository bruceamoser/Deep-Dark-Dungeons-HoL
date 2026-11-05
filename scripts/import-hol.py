"""Vendor only committed standalone workshop inputs, with per-file provenance."""
import subprocess, pathlib, json, hashlib
repo='/home/bmoser/repos/heroes-of-legend-foundry'
pin='137cbd9afaf00d5e1520f920c2aadba57d7ea3d2'
out=pathlib.Path('public/vendor/hol'); out.mkdir(parents=True,exist_ok=True)
paths=subprocess.check_output(['git','-C',repo,'ls-tree','-r','--name-only',pin],text=True).splitlines()
records=[]
for path in paths:
 dest=None
 for prefix,target in [('web/',''),('src/rules/','rules/'),('static/fonts/','fonts/')]:
  if path.startswith(prefix): dest=target+path[len(prefix):]
 if path in ['static/data/'+n+'.json' for n in ['choices','inventory','wounds','creatures']]: dest='data/'+path.rsplit('/',1)[-1]
 if dest is None: continue
 data=subprocess.check_output(['git','-C',repo,'show',f'{pin}:{path}'])
 f=out/dest; f.parent.mkdir(parents=True,exist_ok=True); f.write_bytes(data)
 records.append({'source':path,'destination':dest,'sha256':hashlib.sha256(data).hexdigest()})
fixtures=json.loads(subprocess.check_output(['git','-C',repo,'show',f'{pin}:tests/fixtures/reference-heroes.json']))
(out/'data/example.json').write_text(json.dumps(fixtures['characters'][0]['draft']))
(out/'data/party.json').write_text(json.dumps([{'id':c['id'],'draft':c['draft']} for c in fixtures['characters']]))
lock=json.loads(subprocess.check_output(['git','-C',repo,'show',f'{pin}:content/source-lock.json']))
pathlib.Path('docs/hol-source-lock.json').write_text(json.dumps({'repository':'https://github.com/bruceamoser/heroes-of-legend-foundry','commit':pin,'bookCommit':lock['commit'],'records':records},indent=2)+'\n')
print(f'Imported {len(records)} committed files; book pin {lock["commit"]}')
