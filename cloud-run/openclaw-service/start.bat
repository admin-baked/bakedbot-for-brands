@echo off
echo Starting OpenClaw REST Wrapper...
echo.
echo Installing dependencies...
call npm install
echo.
echo Starting server on port 3001...
echo API Key: dev-key-12345
echo.
node server.js
