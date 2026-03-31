@echo off
cd /d "C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub"
echo Pulling...
"C:\Users\JasonKennedy\AppData\Local\Programs\Git\cmd\git.exe" pull
if errorlevel 1 (echo [ERROR] Pull failed & pause & exit /b 1)
echo Staging...
"C:\Users\JasonKennedy\AppData\Local\Programs\Git\cmd\git.exe" add -A
echo Committing...
"C:\Users\JasonKennedy\AppData\Local\Programs\Git\cmd\git.exe" commit -m "Update schedules 3-31-2026"
echo Pushing...
"C:\Users\JasonKennedy\AppData\Local\Programs\Git\cmd\git.exe" push
if errorlevel 1 (echo [ERROR] Push failed & pause & exit /b 1)
echo.
echo [SUCCESS] Push complete!
del "C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub\__push_tmp.bat"
pause
