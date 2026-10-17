@echo off
REM XMultiverse CLI wrapper for Windows
REM Usage: xmv.cmd <command> [options]
REM Example: xmv.cmd world create --story "..."
REM Example: xmv.cmd world create --story "..." --json

REM Find project root (where package.json is)
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

REM Run via pnpm dlx tsx (dev mode) — no build needed
pnpm dlx tsx "%PROJECT_ROOT%\packages\cli\src\index.ts" %*
