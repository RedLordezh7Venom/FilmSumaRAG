# Use Python 3.10 slim for smaller footprint and stability
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Set work directory
WORKDIR /app

# Install system dependencies (build-essential for some python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install UV for faster dependency management (optional but fast)
RUN pip install --no-cache-dir uv

# Copy requirements file first for layer caching
COPY requirements.txt .

# Install dependencies using UV
RUN uv pip install --system -r requirements.txt

# Copy project files
COPY . .

# Expose the API port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
