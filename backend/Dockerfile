FROM python:3.9-slim

# System deps
RUN apt-get update && apt-get install -y \
    build-essential \
    libmupdf-dev \
 && rm -rf /var/lib/apt/lists/*

# Set working dir
WORKDIR /app

# Copy requirements first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY . .

# Use shell form to properly expand environment variables
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}