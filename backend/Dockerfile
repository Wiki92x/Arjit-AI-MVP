FROM python:3.9-slim

# System deps
RUN apt-get update && apt-get install -y \
    build-essential \
    libmupdf-dev \
 && rm -rf /var/lib/apt/lists/*

# Set working dir
WORKDIR /app

# Copy files
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend .

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]