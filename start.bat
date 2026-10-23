@echo off
setlocal
title W17 Website
cd /d "%~dp02026-mercedes-w17\cinematic"
if errorlevel 1 goto missing_project

set "W17_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined W17_NODE set "W17_NODE=%%N"
if not defined W17_NODE set "W17_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%W17_NODE%" goto missing_node
if not exist "node_modules\vite\bin\vite.js" goto missing_dependencies
if /i "%~1"=="--check" goto check

rem Reuse an already-running W17 preview instead of starting a second server.
powershell.exe -NoProfile -NonInteractive -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173/' -TimeoutSec 2; if ($r.StatusCode -eq 200 -and $r.Content -match 'W17') { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 (
  start "" "http://127.0.0.1:5173/"
  exit /b 0
)

echo Starting W17 at http://127.0.0.1:5173/
echo Keep this window open while using the website. Press Ctrl+C to stop.
echo.
"%W17_NODE%" "node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 5173 --strictPort --open
set "W17_EXIT=%ERRORLEVEL%"
if "%W17_EXIT%"=="0" exit /b 0
echo.
echo The server stopped. Check the message above; port 5173 may be in use.
pause
exit /b %W17_EXIT%

:check
"%W17_NODE%" --version
exit /b %ERRORLEVEL%

:missing_project
echo Cannot find the cinematic project. Keep start.bat in the project root.
pause
exit /b 1

:missing_node
echo Node.js was not found. Install Node.js 22.12 or newer, then try again.
pause
exit /b 1

:missing_dependencies
echo Dependencies are missing. Run pnpm install in 2026-mercedes-w17\cinematic.
pause
exit /b 1
