# Use official Playwright image to ensure browsers are installed
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

# Copy requirements first for cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Cloud Run expects the container to listen on $PORT (default 8080)
ENV PORT=8080
ENV PYTHONUNBUFFERED=True

# Run the web server
CMD ["python", "main.py"]
