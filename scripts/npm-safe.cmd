@echo off
setlocal
call "%~dp0set-workspace-node-home.cmd"
call npm %*
exit /b %ERRORLEVEL%
