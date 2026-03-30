@echo off
setlocal
call "%~dp0set-workspace-node-home.cmd"
if "%~1"=="" (
    echo Usage: %~nx0 ^<node-args^>
    exit /b 64
)
node %*
exit /b %ERRORLEVEL%
