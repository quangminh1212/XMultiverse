@echo off
REM XMultiverse: Stop backend server
setlocal
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

cd /d "%PROJECT_ROOT%"
call npx tsx packages\cli\src\index.ts stop
endlocal
