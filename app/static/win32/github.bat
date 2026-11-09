@echo off
setlocal

set ELECTRON_RUN_AS_NODE=1
if exist "%~dp0..\..\..\Usagi.exe" (
  call "%~dp0..\..\..\Usagi.exe" "%~dp0..\cli.js" %*
) else (
  call "%~dp0..\..\..\GitHubDesktop.exe" "%~dp0..\cli.js" %*
)

endlocal
