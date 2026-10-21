"""Call an installed BlenderMCP through MCP stdio; useful before client reload.

Run with a Python environment containing the official mcp SDK. This is a client,
not a replacement MCP server; scripts remain subject to server safe mode.
"""
import argparse
import asyncio
import base64
from datetime import timedelta
import json
import os
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def run(args):
    env = dict(os.environ, BLENDER_HOST=args.host, BLENDER_PORT=str(args.port),
               BLENDER_MCP_SAFE_MODE='1', BLENDER_MCP_DISABLE_TELEMETRY='1')
    params = StdioServerParameters(command=args.server, env=env)
    async with stdio_client(params) as (reader, writer):
        async with ClientSession(reader, writer, read_timeout_seconds=timedelta(seconds=240)) as session:
            await session.initialize()
            if args.list:
                result = (await session.list_tools()).model_dump(mode='json')
            else:
                values = json.loads(Path(args.arguments).read_text(encoding='utf-8-sig')) if args.arguments else {}
                response = await session.call_tool(args.tool, values)
                result = response.model_dump(mode='json', exclude_none=True)
                # Upstream execute_blender_code reports failures as text even
                # when isError is false. Do not report a rejected script as PASS.
                if args.tool == 'execute_blender_code':
                    replies = [c.get('text', '') for c in result.get('content', []) if c.get('type') == 'text']
                    result['executionSucceeded'] = any(t.startswith('Code executed successfully:') for t in replies)
                # Store image bytes separately; do not flood transcripts with base64.
                for index, block in enumerate(result.get('content', [])):
                    if block.get('type') == 'image':
                        image = args.output.with_name(args.output.stem + f'-{index}.png')
                        image.write_bytes(base64.b64decode(block.pop('data')))
                        block['file'] = str(image.resolve())
            args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
            print(str(args.output.resolve()))
            if result.get('isError') or result.get('executionSucceeded') is False:
                raise RuntimeError('MCP tool failed or script was rejected; inspect output')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server', default=str(Path.home()/'.local/bin/mcp-for-blender.exe'))
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=9876)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--list', action='store_true')
    group.add_argument('--tool')
    parser.add_argument('--arguments', type=Path, help='JSON tool arguments file')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    asyncio.run(run(args))


if __name__ == '__main__':
    main()
