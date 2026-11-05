"""Probe installed Craft MCP servers without changing application documents."""
import subprocess,json,select,pathlib
root=str(pathlib.Path(__file__).resolve().parents[1])
configs={
 'photocraft':{'command':'/home/bmoser/.local/bin/photocraft-cli','args':['mcp','--automation-read-root',root,'--automation-write-root',root+'/art']},
 'vectorcraft':{'command':'/home/bmoser/.local/bin/vectorcraft-cli','args':['mcp','--headless','--automation-read-root',root,'--automation-write-root',root+'/art']},
 'solidcraft':{'command':'/home/bmoser/.local/bin/solidcraft-cli','args':['mcp','--headless','--allow-path',root+'/art']}}
for name,c in configs.items():
 p=subprocess.Popen([c['command'],*c['args']],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
 def send(obj):p.stdin.write(json.dumps(obj)+'\n');p.stdin.flush()
 def receive():
  if not select.select([p.stdout],[],[],15)[0]:raise TimeoutError(name)
  return json.loads(p.stdout.readline())
 try:
  send({'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-06-18','capabilities':{},'clientInfo':{'name':'ddd-integration-check','version':'1.0'}}});init=receive()
  send({'jsonrpc':'2.0','method':'notifications/initialized'});send({'jsonrpc':'2.0','id':2,'method':'tools/list','params':{}});listing=receive()
  tools=listing.get('result',{}).get('tools',[])
  if not tools:raise RuntimeError(str(listing))
  pathlib.Path('/tmp/ddd-'+name+'-tools.json').write_text(json.dumps(tools,indent=2))
  print(name,init.get('result',{}).get('serverInfo'),len(tools),'tools', [t['name'] for t in tools[:6]])
 finally:p.terminate();p.wait(timeout=5)
