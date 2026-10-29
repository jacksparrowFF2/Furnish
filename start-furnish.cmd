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
echo Checking Furnish backend updates and recovery, then starting or opening the page...
echo.
node scripts/serve.cjs --open
if errorlevel 1 pause
