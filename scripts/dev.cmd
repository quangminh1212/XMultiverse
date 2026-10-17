@echo off
REM XMultiverse: Start backend + frontend (dev mode)
setlocal
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

echo [XMultiverse] Starting backend + frontend...
cd /d "%PROJECT_ROOT%"
call pnpm run dev
endlocal
