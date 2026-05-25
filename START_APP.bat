@echo off
title Distech Training Application
color 0A

echo.
echo ========================================================
echo           DISTECH CONTROLS - TRAINING APP
echo ========================================================
echo.
echo [*] Starting server...
echo.

REM Check if node.exe exists
if not exist node.exe (
    echo [ERROR] node.exe not found!
    echo Please download portable Node.js from:
    echo https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip
    echo Extract node.exe to this folder.
    echo.
    pause
    exit
)

REM Check if app folder exists
if not exist app\server.js (
    echo [ERROR] Application files not found!
    echo Please make sure your app is in the 'app' subfolder.
    echo.
    pause
    exit
)

REM Start the application
echo [*] Server starting on http://localhost:3001
echo.
echo ========================================================
echo   Your browser will open automatically in 3 seconds...
echo   If not, open: http://localhost:80
echo ========================================================
echo.
echo [!] Keep this window open while using the app
echo [!] Press Ctrl+C to stop the server
echo.

REM Wait 3 seconds then open browser
timeout /t 3 /nobreak >nul
start http://localhost:80

REM Start Node.js server
node.exe app\server.js

REM If server stops, pause so user can see any errors
echo.
echo ========================================================
echo Server stopped.
pause
