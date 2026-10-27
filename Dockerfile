# ==========================================
# Multi-Stage Dockerfile for PRAMITI Platform
# Stage 1: Build React + Vite Frontend
# Stage 2: Python 3.11 FastAPI Backend + System Libs
# ==========================================

# Stage 1: Frontend Build
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Backend & Runtime
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install Linux system dependencies (zbar for QR scanning, graphics & fonts)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libzbar0 \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy application files
COPY backend ./backend
COPY aicte_handbook ./aicte_handbook
COPY sample_documents ./sample_documents

# Copy built frontend dist from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose default HTTP port
EXPOSE 8000

# Run Uvicorn (supports dynamic $PORT from cloud platforms like Render/Railway)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --app-dir backend"]
