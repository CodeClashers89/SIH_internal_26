FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies including curl for docker-compose healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application files
COPY . /app/

# Expose Django server port
EXPOSE 8000

# Start server using manage.py development server for demo environment
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
