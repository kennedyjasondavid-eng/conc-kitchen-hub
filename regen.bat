@echo off
echo.
echo ── Generating xlsx files ────────────────────
py generate_all.py --xlsx-only
if errorlevel 1 (
    echo.
    echo ERROR: Generation failed. Check output above.
    pause
    exit /b 1
)

echo.
echo ── Copying source table to outputs ──────────
copy /Y 00_Production_Source_Table.xlsx outputs\00_Production_Source_Table.xlsx >nul
echo   Done.

echo.
echo ── Staging changes ──────────────────────────
git add CONC_Production_Hub.html 00_Production_Source_Table.xlsx generate_all.py deploy.yml Renovation_4_Week_Menu5.xlsx

echo.
echo ── Commit message ───────────────────────────
set /p MSG=Enter commit message (or press Enter to skip commit): 
if "%MSG%"=="" (
    echo Skipping commit and push.
    pause
    exit /b 0
)

git commit -m "%MSG%"
if errorlevel 1 (
    echo Nothing new to commit.
) else (
    echo.
    echo ── Pushing ──────────────────────────────────
    git push
)

echo.
echo ✓ Done.
pause
