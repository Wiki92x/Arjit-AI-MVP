FROM python:3.9-slim

# Install OS deps
RUN apt-get update && apt-get install -y \
    build-essential \
    libmupdf-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend .

# Change from exec form to shell form to allow variable substitution
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}