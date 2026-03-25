@echo off
setlocal

for %%I in ("%~dp0..") do set "REPO_ROOT=%%~fI"
set "WORKSPACE_HOME=%REPO_ROOT%\.codex-jest-home"
set "APPDATA_ROAMING=%WORKSPACE_HOME%\AppData\Roaming"
set "APPDATA_LOCAL=%WORKSPACE_HOME%\AppData\Local"
set "TEMP_DIR=%APPDATA_LOCAL%\Temp"
set "NPM_CACHE_DIR=%APPDATA_LOCAL%\npm-cache"
set "WORKSPACE_NODE_OPTIONS=--preserve-symlinks --preserve-symlinks-main"
set "EXISTING_NODE_OPTIONS=%NODE_OPTIONS%"

for %%I in ("%WORKSPACE_HOME%" "%APPDATA_ROAMING%" "%APPDATA_LOCAL%" "%TEMP_DIR%" "%NPM_CACHE_DIR%") do (
    if not exist "%%~I" mkdir "%%~I" >nul 2>nul
)

endlocal & (
    set "HOME=%WORKSPACE_HOME%"
    set "USERPROFILE=%WORKSPACE_HOME%"
    set "APPDATA=%APPDATA_ROAMING%"
    set "LOCALAPPDATA=%APPDATA_LOCAL%"
    set "TEMP=%TEMP_DIR%"
    set "TMP=%TEMP_DIR%"
    set "npm_config_cache=%NPM_CACHE_DIR%"
    set "NODE_OPTIONS=%WORKSPACE_NODE_OPTIONS%"
    if not "%EXISTING_NODE_OPTIONS%"=="" set "NODE_OPTIONS=%WORKSPACE_NODE_OPTIONS% %EXISTING_NODE_OPTIONS%"
)
