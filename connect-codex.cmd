@echo off
setlocal
cd /d "%~dp0"
if exist "%~dp0Furnish.exe" (
  set "ELECTRON_RUN_AS_NODE=1"
  "%~dp0Furnish.exe" "%~dp0scripts\register-codex-mcp.cjs" --automatic --start-desktop %*
) else (
  node "%~dp0scripts\register-codex-mcp.cjs" --automatic --start-desktop %*
)
if errorlevel 1 (
  echo.
  echo Codex MCP setup failed. See the message above.
  pause
  exit /b 1
)
echo.
echo Furnish MCP is ready. Reload MCP in Codex if an existing chat shows old tools.
pause
