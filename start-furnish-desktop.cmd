@echo off
setlocal
cd /d "%~dp0"
node scripts\launch-desktop.cjs
if errorlevel 1 pause
