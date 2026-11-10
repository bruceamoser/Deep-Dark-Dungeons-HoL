"""Run with the mcp-for-blender tool environment's Python. Read-only bridge probe."""
import asyncio
import json
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    params = StdioServerParameters(command=os.path.expanduser('~/.local/bin/mcp-for-blender'), args=['--host', '127.0.0.1', '--port', '9876'], env={**os.environ, 'DISABLE_TELEMETRY': 'true'})
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            listed = await session.list_tools()
            names = [tool.name for tool in listed.tools]
            print('MCP initialized;', len(names), 'tools;', 'get_scene_info' in names, 'scene inspection available')
            result = await session.call_tool('get_scene_info', {})
            if result.isError:
                raise RuntimeError('Blender scene inspection failed: ' + str(result.content))
            for content in result.content:
                if getattr(content, 'type', None) == 'text':
                    print(content.text[:2000])

asyncio.run(main())
