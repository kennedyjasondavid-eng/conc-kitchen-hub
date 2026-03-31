@echo off
cd /d "C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub"
echo ======================================== >> "C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub\push-log.txt"
echo Push: %DATE% %TIME% >> "C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub\push-log.txt"
echo Msg:  Reference docs download buttons >> "C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub\push-log.txt"
echo ======================================== >> "C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub\push-log.txt"
echo Pulling...
"C:\Users\JasonKennedy\AppData\Local\Programs\Git\cmd\git.exe" pull
if errorlevel 1 (echo [ERROR] Pull failed & pause & exit /b 1)
echo Staging...
"C:\Users\JasonKennedy\AppData\Local\Programs\Git\cmd\git.exe" add -A
echo Committing...
"C:\Users\JasonKennedy\AppData\Local\Programs\Git\cmd\git.exe" commit -m "Reference docs download buttons"
echo Pushing...
"C:\Users\JasonKennedy\AppData\Local\Programs\Git\cmd\git.exe" push
if errorlevel 1 (echo [ERROR] Push failed & pause & exit /b 1)
echo.
echo [SUCCESS] Push complete!
del "C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub\__push_tmp.bat"
pause
