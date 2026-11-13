#!/bin/bash
set -e
cd -- "$(dirname -- "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [[ -x Furnish.app/Contents/MacOS/Electron ]]; then
  export ELECTRON_RUN_AS_NODE=1
  exec Furnish.app/Contents/MacOS/Electron scripts/register-codex-mcp.cjs --automatic --start-desktop
fi
if ! command -v node >/dev/null 2>&1; then
  echo '需要 Node.js 24.9+，或使用 Furnish.app 的 MCP 菜单连接。'
  read -r -p '按回车关闭…'
  exit 1
fi
exec node scripts/register-codex-mcp.cjs --automatic --start-desktop
