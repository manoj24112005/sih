@echo off
setlocal
echo ===================================================
echo  VeriCore — Push to GitHub Repository
echo ===================================================

set REPO_NAME=%1
if "%REPO_NAME%"=="" (
    set /p REPO_NAME="Enter your GitHub repository name (e.g. vericore-sih): "
)

if "%REPO_NAME%"=="" (
    echo Error: Repository name cannot be empty.
    pause
    exit /b 1
)

echo.
echo Setting remote to: https://github.com/manoj24112005/%REPO_NAME%.git ...
git remote remove origin 2>nul
git remote add origin https://github.com/manoj24112005/%REPO_NAME%.git

echo.
echo Pushing branch 'main' to GitHub...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo  SUCCESS! Your project is live on GitHub:
    echo  https://github.com/manoj24112005/%REPO_NAME%
    echo ===================================================
) else (
    echo.
    echo If push failed with 'Repository not found':
    echo Please make sure you have created the empty repo at:
    echo https://github.com/new (Name: %REPO_NAME%)
    echo and then re-run this script.
)

pause
