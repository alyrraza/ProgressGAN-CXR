# CLAUDE.md — GitHub Actions CI/CD Instructions

## Your Job

Create GitHub Actions workflow for ProgressGAN-CXR.
This is for the ImagineArt JD requirement: CI/CD pipelines and automation workflows.

## Files to Create

```
.github/
└── workflows/
    └── deploy.yml
```

## deploy.yml

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Cache pip dependencies
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('backend/requirements.txt') }}

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v --tb=short

  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/progressgan-cxr:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/progressgan-cxr:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to EC2
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/progressgan-cxr
            docker pull ${{ secrets.DOCKERHUB_USERNAME }}/progressgan-cxr:latest
            docker-compose down
            docker-compose up -d
            echo "Deployment complete at $(date)"
```

## GitHub Secrets Required

Set these in GitHub repo Settings > Secrets > Actions:

```
DOCKERHUB_USERNAME    — your Docker Hub username
DOCKERHUB_TOKEN       — Docker Hub access token (not password)
EC2_HOST              — EC2 public IP address
EC2_USER              — EC2 username (usually ubuntu or ec2-user)
EC2_SSH_KEY           — EC2 private key (full contents of .pem file)
```

## What This Pipeline Does

1. On every PR: runs tests only (no deploy)
2. On push to main: runs tests, builds Docker image, pushes to Docker Hub, deploys to EC2

This covers the ImagineArt JD requirement:
"Set up CI/CD pipelines and automation workflows for model deployment"

In the interview you say:
"My GitHub Actions pipeline runs pytest on every PR, builds and pushes a Docker image on merge to main,
and SSHs into EC2 to pull the new image and restart the container automatically."
