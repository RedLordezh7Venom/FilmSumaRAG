@echo off

REM Change directory to mv02
cd mv02

REM Check if the directory change was successful
if errorlevel 1 (
    echo Directory mv02 not found
    pause
    exit /b 1
)

REM Run npm run dev
npm run dev

REM Pause to keep the window open (optional)
pause