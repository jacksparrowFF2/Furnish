@echo off
setlocal
title Furnish - Local Server
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js and try again.
  pause
  exit /b 1
)
echo Keep this window open while using Furnish.
echo Close this window or press Ctrl+C to stop and release the port.
echo.
node scripts/serve.cjs --open
if errorlevel 1 pause
