# CLAUDE.md — Docker Instructions

## Your Job

Create Docker configuration for the ProgressGAN-CXR backend.
The backend must run in a container that can be deployed on any cloud VM.

## Files to Create

```
docker/
├── Dockerfile
└── docker-compose.yml
```

Also create at root level:
```
.env.example
```

## Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## docker-compose.yml

```yaml
version: "3.9"

services:
  backend:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - HF_REPO=${HF_REPO:-alyrraza/progressgan-cxr}
      - ENVIRONMENT=${ENVIRONMENT:-production}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped
    depends_on:
      - prometheus

volumes:
  grafana_data:
```

## .env.example

```
HF_REPO=alyrraza/progressgan-cxr
ENVIRONMENT=production
GRAFANA_PASSWORD=your_secure_password_here
```

## Important Notes

1. Models are NOT copied into the Docker image. They are downloaded from Hugging Face Hub at runtime.
2. First startup will be slow (model download). Subsequent starts use HF cache.
3. The container needs internet access to download models from HF.
4. Do NOT put .pth files in the Docker image — they are too large.
