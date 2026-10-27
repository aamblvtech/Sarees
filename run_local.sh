#!/usr/bin/env bash
set -e

echo "========================================================="
echo "      AURA Virtual Dressing Room Atelier Server"
echo "========================================================="
echo "Starting FastAPI Studio Server on http://127.0.0.1:8000 ..."

# Activate virtual environment if present
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
