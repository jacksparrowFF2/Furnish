#!/bin/bash
set -e
cd -- "$(dirname -- "$0")"
# Finder does not read the user's interactive shell configuration.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo '需要 Node.js 24.9+。安装后重试，或使用已打包的 Furnish.app。'
  read -r -p '按回车关闭…'
  exit 1
fi
exec node scripts/serve.cjs --open
