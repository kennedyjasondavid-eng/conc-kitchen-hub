@echo off
REM ============================================================================
REM CONC Kitchen Hub - Push to GitHub (COMPLEX) — OneDrive
REM Custom commit messages + full logging + error details
REM ============================================================================

setlocal enabledelayedexpansion

REM --- Adjust this path to match your OneDrive sync folder ---
set REPO_DIR=C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub
set LOG_FILE=%REPO_DIR%\push-log.txt

cd /d "%REPO_DIR%"
if errorlevel 1 (
    echo [ERROR] Failed to navigate to repo directory: %REPO_DIR%
    pause
    exit /b 1
)

REM Get current date and time for logging
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)

REM Append to log file
echo. >> "%LOG_FILE%"
echo ======================================== >> "%LOG_FILE%"
echo Push attempt: %mydate% %mytime% >> "%LOG_FILE%"
echo ======================================== >> "%LOG_FILE%"

cls
echo.
echo [CONC Kitchen Hub - Git Push - COMPLEX / OneDrive]
echo Log file: %LOG_FILE%
echo.

REM Prompt for commit message
set /p COMMIT_MSG="Enter commit message: "

if "%COMMIT_MSG%"=="" (
    echo [ERROR] Commit message cannot be empty
    echo Cancelled at %mydate% %mytime% >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo. >> "%LOG_FILE%"
echo Commit message: %COMMIT_MSG% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo.
echo Pulling latest changes...
git pull >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [ERROR] Pull failed - check the log file for details
    echo [ERROR] Pull failed >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo Staging changes...
git add -A >> "%LOG_FILE%" 2>&1

echo Committing: "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [WARNING] Commit failed - no changes to commit?
    echo [WARNING] Commit had no changes >> "%LOG_FILE%"
)

echo Pushing to GitHub...
git push >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [ERROR] Push failed - check the log file for details
    echo [ERROR] Push failed at %mydate% %mytime% >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Push complete!
echo Log updated: %LOG_FILE%
echo.
echo Push succeeded at %mydate% %mytime% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

endlocal
exit /b 0
