# Use Python slim - Chrome/Selenium is optional (notebooklm-mcp handles webdriver-manager)
FROM python:3.11-slim

WORKDIR /app

# Install minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

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
