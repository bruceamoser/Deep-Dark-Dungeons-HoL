#!/usr/bin/env python3
"""Local credential input/helper. Never pass a credential as a command argument."""
import argparse
import getpass
import os
from pathlib import Path
import stat
import sys
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('action', choices=['set', 'status', 'print'])
parser.add_argument('service', choices=['deepseek', 'meshy'])
args = parser.parse_args()
root = Path.home() / '.config' / 'four-lanterns-tools' / 'credentials'
location = root / (args.service + '.key')
if args.action == 'set':
    if not sys.stdin.isatty():
        parser.exit(1, 'Run this command in your own terminal for hidden key entry.\n')
    value = getpass.getpass(args.service + ' API key (hidden): ').strip()
    if not value or any(c.isspace() for c in value):
        parser.exit(1, 'Key was empty or contained whitespace; nothing saved.\n')
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    root.chmod(0o700)
    fd, temporary = tempfile.mkstemp(prefix='.key-', dir=root)
    try:
        with os.fdopen(fd, 'w') as output:
            os.fchmod(output.fileno(), 0o600)
            output.write(value + '\n')
        os.replace(temporary, location)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print('Saved locally with owner-only permissions. Key was not displayed.')
elif args.action == 'status':
    print(args.service + ': ' + ('configured' if location.is_file() else 'not configured'))
else:
    # For Codex command-backed authentication only; do not run this in a chat tool.
    try:
        info = location.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
            parser.exit(1, 'Credential must be an owner-only regular file.\n')
        value = location.read_text().strip()
        if not value or any(c.isspace() for c in value):
            parser.exit(1, 'Invalid credential file.\n')
    except FileNotFoundError:
        parser.exit(1, 'Run fld-credentials set ' + args.service + ' in your own terminal first.\n')
    sys.stdout.write(value)
