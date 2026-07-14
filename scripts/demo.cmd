@echo off
REM XMultiverse: Full automated workflow demo
REM Creates a world, a player, runs an action, adds an event — all via CLI
setlocal enabledelayedexpansion
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

cd /d "%PROJECT_ROOT%"

echo ========================================
echo  XMultiverse — Automated Workflow Demo
echo ========================================
echo.

echo [1/6] Starting backend...
call npx tsx packages\cli\src\index.ts start
if errorlevel 1 (
    echo [FAIL] Cannot start backend.
    exit /b 1
)
echo.

echo [2/6] Checking health...
call npx tsx packages\cli\src\index.ts health
echo.

echo [3/6] Creating world from story...
call npx tsx packages\cli\src\index.ts world create --story "Mot hiep si tim kiem thanh kiem than de danh bai quy vuong"
echo.

echo [4/6] Listing worlds...
call npx tsx packages\cli\src\index.ts world list
echo.

echo [5/6] Done. Backend is still running.
echo       Use "scripts\xmv.cmd" to run more commands.
echo       Run "scripts\stop.cmd" to stop backend.
echo.

echo [6/6] Stopping backend...
call npx tsx packages\cli\src\index.ts stop
echo.
echo ========================================
echo  Demo complete.
echo ========================================
endlocal
