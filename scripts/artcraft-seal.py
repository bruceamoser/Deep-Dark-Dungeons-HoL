"""Round-trip the authored vector seal through VectorCraft's local MCP server."""
import subprocess,json,pathlib,shutil
root=pathlib.Path(__file__).resolve().parents[1]
p=subprocess.Popen(['/home/bmoser/.local/bin/vectorcraft-cli','mcp','--headless','--automation-read-root',str(root/'art'),'--automation-write-root',str(root/'art')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
def call(i,method,params):
 p.stdin.write(json.dumps({'jsonrpc':'2.0','id':i,'method':method,'params':params})+'\n');p.stdin.flush();r=json.loads(p.stdout.readline());
 if r.get('error') or r.get('result',{}).get('isError'):raise RuntimeError(str(r))
 return r
try:
 call(1,'initialize',{'protocolVersion':'2025-06-18','capabilities':{},'clientInfo':{'name':'ddd-art-pipeline','version':'1'}})
 p.stdin.write(json.dumps({'jsonrpc':'2.0','method':'notifications/initialized'})+'\n');p.stdin.flush()
 for i,cmd,params in [(2,'file.open',{'path':str(root/'art/source/greyhaven-seal.svg')}),(3,'file.saveAs',{'path':str(root/'art/source/greyhaven-seal.vectorcraft')}),(4,'file.export',{'path':str(root/'art/exports/greyhaven-seal.png'),'scale':2})]:
  call(i,'tools/call',{'name':'command_run','arguments':{'id':cmd,'params':params}});print(cmd,'succeeded')
 (root/'public/art').mkdir(exist_ok=True);shutil.copyfile(root/'art/exports/greyhaven-seal.png',root/'public/art/greyhaven-seal.png')
finally:p.terminate();p.wait(timeout=5)
