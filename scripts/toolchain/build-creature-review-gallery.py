"""Assemble private review media from hash-matched captures; never export source meshes."""
import json, html, shutil, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
repo=Path(__file__).resolve().parents[2]
root=Path.home()/'.local/share/four-lanterns-creature-production'
pilot=Path.home()/'.local/share/four-lanterns-modular-pilot/2026-11-11'
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
manifest=json.loads((repo/'config/approved-creature-assets.json').read_text())['assets']
queue=json.loads((repo/'docs/creature-production/queue.json').read_text())['creatures'];names={r['id']:r['name'] for r in queue}
captures={}
for p in root.rglob('capture.json'):
    d=json.loads(p.read_text());captures[d['sha256']]=p.parent
anchors={'GoblinSpearhand':pilot/'goblin-spearhand/presentation','AirElementalSculpted':pilot/'air-elemental/review-v3','WolfPilot':pilot/'wolf/review-v2'}
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
rows=[];sheets=[]
for i,a in enumerate(manifest):
    folder=captures.get(a['sha256'],anchors.get(a['model']));assert folder and (folder/'front.png').is_file(),a['model']
    name=names[a['creatureId']];dest=out/a['creatureId'];dest.mkdir(exist_ok=True)
    reference=repo/'public/vendor/hol/assets/bestiary'/f'{a["creatureId"]}.webp'
    assert reference.is_file(), reference
    shutil.copyfile(reference,dest/'reference.webp')
    files=['reference.webp']
    for filename in ('front.png','side.png','back.png','motion-sheet.jpg'):
        p=folder/filename
        if p.is_file():shutil.copyfile(p,dest/filename);files.append(filename)
    rows.append({'id':a['creatureId'],'name':name,'sha256':a['sha256'],'source':str(folder),'files':files})
    if i%12==0:sheets.append(Image.new('RGB',(1280,1100),'#152121'))
    sheet=sheets[-1];x=(i%4)*320;y=((i%12)//4)*355
    im=Image.open(folder/'front.png').convert('RGB');im.thumbnail((320,320));sheet.paste(im,(x+(320-im.width)//2,y))
    ImageDraw.Draw(sheet).text((x+10,y+323),name,font=font,fill='#eed79b')
for i,sheet in enumerate(sheets):sheet.save(out/f'roster-{i+1}.jpg',quality=93)
(out/'provenance.json').write_text(json.dumps(rows,indent=2))
body=''.join(f'<article><h2>{html.escape(r["name"])}</h2><div class="pair"><a href="{r["id"]}/reference.webp"><img loading="lazy" alt="Book reference" src="{r["id"]}/reference.webp"></a><a href="{r["id"]}/front.png"><img loading="lazy" alt="Reviewed model" src="{r["id"]}/front.png"></a></div><p>'+ ' · '.join(f'<a href="{r["id"]}/{f}">{f.split(".")[0]}</a>' for f in r['files'])+'</p></article>' for r in rows)
(out/'index.html').write_text('''<!doctype html><meta charset="utf-8"><title>Four Lanterns Deep — Creature review</title><style>body{background:#152121;color:#eee;font:16px system-ui;margin:32px}h1,h2{color:#eed79b}h2{font-size:20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}article{background:#233131;padding:16px}.pair{display:grid;grid-template-columns:1fr 1fr;align-items:center}img{width:100%}a{color:#aacfd2}</style><h1>Four Lanterns Deep — 58 creatures</h1><p>Local author-reviewed roster. Open the installed game's Bestiary for interactive animation and book-art comparison. These stills do not replace your final art review.</p><main>'''+body+'</main>')
print(out/'index.html')
