import struct,json,io,collections
from PIL import Image
from pathlib import Path
b=Path('public/assets/licensed/dungeon-mason/hero.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binary=b[28+n:]
v=j['bufferViews'][j['images'][0]['bufferView']];img=Image.open(io.BytesIO(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGB')
catalog=json.loads(Path('public/assets/licensed/dungeon-mason/catalog.json').read_text());names=set(catalog['parts']+catalog['bodies']);parents={c:i for i,node in enumerate(j['nodes']) for c in node.get('children',[])};out={}
for i,node in enumerate(j['nodes']):
 if 'mesh' not in node:continue
 k=i
 while k in parents and j['nodes'][k].get('name') not in names:k=parents[k]
 name=j['nodes'][k].get('name');
 if name not in names:continue
 for pr in j['meshes'][node['mesh']]['primitives']:
  mat=j['materials'][pr['material']]['name'];ch=int(mat.replace('MasonChannel',''))
  if ch>8:continue
  a=j['accessors'][pr['attributes']['TEXCOORD_0']];v=j['bufferViews'][a['bufferView']];cnt=collections.Counter()
  for ix in range(a['count']):
   u,w=struct.unpack_from('<ff',binary,v.get('byteOffset',0)+a.get('byteOffset',0)+ix*v.get('byteStride',8));cnt[img.getpixel((max(0,min(img.width-1,int(u*img.width))),max(0,min(img.height-1,int(w*img.height)))))]+=1
  rgb=cnt.most_common(1)[0][0];out.setdefault(name,{})[str(ch)]='#%02x%02x%02x'%rgb
Path('src/core/mason-palette-regions.mjs').write_text('// Original colour facts per part/region, sampled from the purchased palette. No geometry or textures.\nexport const MASON_PALETTE_REGIONS = '+json.dumps(out,separators=(',',':'))+';\n')
