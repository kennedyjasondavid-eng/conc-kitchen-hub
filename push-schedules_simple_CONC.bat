@echo off
REM ============================================================================
REM CONC Kitchen Hub - Push to GitHub (SIMPLE) — OneDrive
REM Double-click and go. Auto-timestamp, no prompts, no logging.
REM ============================================================================

setlocal enabledelayedexpansion

REM --- Adjust this path to match your OneDrive sync folder ---
set REPO_DIR=C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub

cd /d "%REPO_DIR%"
if errorlevel 1 (
    echo [ERROR] Failed to navigate to repo directory: %REPO_DIR%
    pause
    exit /b 1
)

REM Get current date for timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)

cls
echo.
echo [CONC Kitchen Hub - Git Push - SIMPLE / OneDrive]
echo.
echo Pulling latest changes...
git pull
if errorlevel 1 (
    echo [ERROR] Pull failed
    pause
    exit /b 1
)

echo Staging changes...
git add -A

set COMMIT_MSG=Update schedules %mydate%
echo Committing: "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"

echo Pushing to GitHub...
git push
if errorlevel 1 (
    echo [ERROR] Push failed
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Push complete!
echo.

endlocal
exit /b 0
