@echo off
setlocal
cd /d "%~dp0"
set "FURNISH_DESKTOP=%~dp0output\desktop\Furnish-win32-x64\Furnish.exe"
if not exist "%FURNISH_DESKTOP%" (
  echo Desktop package not found. Build it with:
  echo npm ci
  echo node node_modules/electron/install.js
  echo npm run desktop:package
  pause
  exit /b 1
)
start "" "%FURNISH_DESKTOP%"
