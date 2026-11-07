"""Probe installed Craft MCP servers without changing application documents.

Binaries resolve through PATH first, then a few known install locations, so the same
script works whether the apps came from a distro package (/usr/bin) or a per-user
install (~/.local/bin). Apps that are not installed are reported, not fatal.
"""
import shutil
import subprocess
import json
import select
import pathlib

root = str(pathlib.Path(__file__).resolve().parents[1])
art = root + '/art'

SEARCH = ['/usr/bin', '/usr/local/bin', '/home/bmoser/.local/bin',
          str(pathlib.Path.home() / '.local/bin')]


def resolve(name):
    found = shutil.which(name)
    if found:
        return found
    for d in SEARCH:
        candidate = pathlib.Path(d) / name
        if candidate.is_file() and candidate.stat().st_mode & 0o111:
            return str(candidate)
    return None


configs = {
    'photocraft': ['mcp', '--automation-read-root', root, '--automation-write-root', art],
    'vectorcraft': ['mcp', '--headless', '--automation-read-root', root,
                    '--automation-write-root', art],
    'solidcraft': ['mcp', '--headless', '--allow-path', art],
    'texturecraft': ['mcp', '--read-root', root, '--write-root', art],
}

missing = []
failed = False

for name, args in configs.items():
    command = resolve(name + '-cli')
    if not command:
        missing.append(name + '-cli')
        print(name, 'NOT INSTALLED')
        continue

    p = subprocess.Popen([command, *args], stdin=subprocess.PIPE,
                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)

    def send(obj):
        p.stdin.write(json.dumps(obj) + '\n')
        p.stdin.flush()

    def receive():
        if not select.select([p.stdout], [], [], 15)[0]:
            raise TimeoutError(name)
        return json.loads(p.stdout.readline())

    try:
        send({'jsonrpc': '2.0', 'id': 1, 'method': 'initialize',
              'params': {'protocolVersion': '2025-06-18', 'capabilities': {},
                         'clientInfo': {'name': 'ddd-integration-check', 'version': '1.0'}}})
        init = receive()
        send({'jsonrpc': '2.0', 'method': 'notifications/initialized'})
        send({'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list', 'params': {}})
        listing = receive()
        tools = listing.get('result', {}).get('tools', [])
        if not tools:
            raise RuntimeError(str(listing))
        pathlib.Path('/tmp/ddd-' + name + '-tools.json').write_text(json.dumps(tools, indent=2))
        print(name, init.get('result', {}).get('serverInfo'), len(tools), 'tools',
              [t['name'] for t in tools[:6]])
    except Exception as exc:
        failed = True
        print(name, 'FAILED', type(exc).__name__, exc)
    finally:
        p.terminate()
        p.wait(timeout=5)

if missing:
    print('Missing apps:', ', '.join(missing))

raise SystemExit(1 if failed else 0)
