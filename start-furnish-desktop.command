#!/bin/bash
set -e
cd -- "$(dirname -- "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
# A packaged app has its own Node runtime; no external Node is needed.
if [[ -x Furnish.app/Contents/MacOS/Electron ]]; then
  unset ELECTRON_RUN_AS_NODE
  exec Furnish.app/Contents/MacOS/Electron
fi
if ! command -v node >/dev/null 2>&1; then
  echo '源码入口需要 Node.js 24.9+；打包完成后可直接双击 Furnish.app。'
  read -r -p '按回车关闭…'
  exit 1
fi
exec node scripts/launch-desktop.cjs
