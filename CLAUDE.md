# CLAUDE.md — ProgressGAN-CXR: Root Instructions

## Project Overview

This is a production deployment of ProgressGAN-CXR, a medical AI research project that trains
severity-conditioned GANs for COVID-19 chest X-ray disease progression simulation.

The project has three goals that must ALL be met:
1. Research showcase (GitHub README already written, results already generated)
2. Real product for medical students to practice chest X-ray diagnosis
3. MLOps portfolio piece that matches ImagineArt Associate MLOps Engineer JD

## What Already Exists (Do NOT recreate these)

- README.md (research README, already written)
- models/ folder with 5 .pth checkpoint files
- results/ folder with all evaluation plots and generated images
- notebook/ folder with the full Kaggle training notebook

## What Claude Code Must Build

Read the CLAUDE.md in each subfolder and build in this exact order:

1. backend/     — FastAPI inference API with ONNX quantization
2. frontend/    — React + Tailwind impressive UI
3. docker/      — Dockerfile + docker-compose
4. monitoring/  — Prometheus + Grafana config
5. .github/     — GitHub Actions CI/CD

## Architecture Overview

```
User Browser
     |
React Frontend (Vercel)
     |
FastAPI Backend (AWS EC2 or local Docker)
     |
     |--- ONNX Quantized Models (loaded from Hugging Face Hub)
     |--- ResNet18 Classifier (loaded from Hugging Face Hub)
     |
Prometheus (metrics scraping)
     |
Grafana (dashboard)
```

## Tech Stack (Non-Negotiable, Must Use All)

- FastAPI: inference endpoints
- ONNX Runtime: quantized model inference
- Docker: containerization
- GitHub Actions: CI/CD
- Prometheus: metrics
- Grafana: monitoring dashboard
- MLflow: model versioning
- React + Tailwind: frontend
- Hugging Face Hub: model hosting
- Vercel: frontend deployment

## Models Available

All models share the same Generator architecture:
- Input: noise vector (100-dim) concatenated with severity score (1-dim) = 101-dim
- Output: 128x128 grayscale chest X-ray

Models:
1. kd_checkpoint_epoch_50.pth       — KD Generator (BEST: FID 143, Spearman r 0.984, SSIM 0.963)
2. dcgan_checkpoint_epoch_50.pth    — DCGAN (best FID: 142.14)
3. spectral_dcgan_checkpoint_epoch_50.pth — Spectral DCGAN (best Spearman r: 0.996)
4. wgan_checkpoint_epoch_50.pth     — WGAN-GP (FID 237, Spearman r 0.748)
5. classifier_real_only.pth         — ResNet18 classifier (95.28% accuracy, 4 classes)

## Product Features (Must All Be in Frontend)

### Feature 1: Disease Progression Simulator
- User moves severity slider from 0.0 to 1.0
- X-ray generates in real-time as slider moves
- Labels: Normal (0.0), Lung Opacity (0.33), Viral Pneumonia (0.66), COVID (1.0)
- Model selector: user picks which GAN to use

### Feature 2: Diagnostic Challenge
- System generates X-ray at random severity
- User selects diagnosis: Normal / Lung Opacity / Viral Pneumonia / COVID
- AI classifier also evaluates the same X-ray
- Result shows: user answer vs AI answer vs actual severity used

### Feature 3: Model Comparison
- Same noise + same severity fed to all 4 models simultaneously
- 4 images shown side by side
- FID / Spearman r / SSIM scores shown below each image

### Feature 4: Research Dashboard
- Show the four-model comparison bar chart (already generated as PNG)
- Show severity progression plot
- Show temporal consistency plot
- Brief explanation of each finding

## Deployment Target

- Backend: Docker container, runs on AWS EC2 or any cloud VM
- Frontend: Vercel (free tier)
- Models: Hugging Face Hub (free, public repo)
- Monitoring: Prometheus + Grafana on same EC2 instance

## Rules for Claude Code

1. Never recreate existing files (README.md, .pth files, result images)
2. Always use async FastAPI endpoints
3. Always add Prometheus metrics to every endpoint
4. Frontend must look professional and medical — clean, dark theme, clinical aesthetic
5. All model loading must come from Hugging Face Hub, not local paths
6. Every Docker image must have health check
7. GitHub Actions must run tests before deploy
8. Never hardcode API keys or secrets — use environment variables
