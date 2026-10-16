@echo off
cd /d "%~dp0"
title AURA Virtual Saree Studio - Mall Kiosk Server

echo ===================================================
echo     AURA Virtual Saree Studio - Mall Kiosk
echo ===================================================
echo Starting FastAPI Kiosk Server on http://127.0.0.1:8000 ...

start "" "http://127.0.0.1:8000"

if exist ".venv\Scripts\python.exe" (
    echo Launching FastAPI via .venv environment...
    ".venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
    goto end
)

where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Launching FastAPI via py launcher...
    py -3.12 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
    goto end
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Launching FastAPI via system Python...
    python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
    goto end
)

echo [Error] Python environment not found! Please check .venv.
pause

:end
