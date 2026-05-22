@echo off
set PROJECT_ROOT=%~dp0
wt new-tab --title "Frontend" cmd /k "cd /d %PROJECT_ROOT%frontend && npm run dev -- --host 0.0.0.0" ; new-tab --title "Backend" powershell -NoExit -ExecutionPolicy Bypass -File "%PROJECT_ROOT%start-backend.ps1" -ProjectRoot "%PROJECT_ROOT:~0,-1%"
