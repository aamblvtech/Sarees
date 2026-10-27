# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend Runtime
FROM python:3.10-slim
WORKDIR /app

# System dependencies for OpenCV, PIL, and networking
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend and root files
COPY backend/ ./backend/
COPY .env.example ./.env.example

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose server port
EXPOSE 8000

ENV HOST=0.0.0.0
ENV PORT=8000

# Start FastAPI application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
