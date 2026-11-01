@echo off
cd /d "%~dp0"
title HTML Presentation Studio
echo ================================================
echo  HTML Presentation Studio  -  http://localhost:8080
echo ================================================
where node >nul 2>nul
if errorlevel 1 goto nonode
echo [LIVE] Node.js server - Claude skill live sync ON
echo Stop: Ctrl+C or close this window
start "" http://localhost:8080/index.html
node server.js 8080
goto end
:nonode
echo [BASIC] Node.js not found - Claude live sync OFF
echo Install Node.js from https://nodejs.org for live sync
start "" http://localhost:8080/index.html
python -m http.server 8080
if errorlevel 1 py -m http.server 8080
:end
pause
