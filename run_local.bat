@echo off
cd /d "%~dp0"
title AURA Virtual Dressing Room - Server

echo =========================================================
echo       AURA Virtual Dressing Room Atelier Server
echo =========================================================
echo Starting FastAPI Studio Server on http://127.0.0.1:8000 ...

start "" "http://127.0.0.1:8000"

where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    py -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
    goto end
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
    goto end
)

echo [Error] Python launcher was not found on PATH.
pause

:end
