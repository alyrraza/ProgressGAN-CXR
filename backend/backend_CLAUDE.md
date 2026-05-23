# CLAUDE.md — Backend Instructions

## Your Job

Build a production-grade FastAPI backend for ProgressGAN-CXR.
This backend serves inference for 4 GAN models and 1 classifier.
It must be quantized, monitored, and containerizable.

## Files to Create

```
backend/
├── main.py           # FastAPI app, all endpoints
├── models.py         # Model architecture definitions (PyTorch)
├── inference.py      # ONNX export, quantization, inference logic
├── hf_loader.py      # Hugging Face Hub model download and cache
├── metrics.py        # Prometheus metrics definitions
├── requirements.txt  # All dependencies
└── tests/
    └── test_api.py   # Basic endpoint tests for CI/CD
```

## Model Architecture (Copy This Exactly)

```python
import torch
import torch.nn as nn

class DCGANGenerator(nn.Module):
    def __init__(self, z_dim=100, img_channels=1):
        super(DCGANGenerator, self).__init__()
        self.input_dim = z_dim + 1
        self.fc = nn.Sequential(
            nn.Linear(self.input_dim, 1024 * 4 * 4),
            nn.ReLU(True)
        )
        self.conv_blocks = nn.Sequential(
            nn.ConvTranspose2d(1024, 512, 4, 2, 1, bias=False),
            nn.BatchNorm2d(512), nn.ReLU(True),
            nn.ConvTranspose2d(512, 256, 4, 2, 1, bias=False),
            nn.BatchNorm2d(256), nn.ReLU(True),
            nn.ConvTranspose2d(256, 128, 4, 2, 1, bias=False),
            nn.BatchNorm2d(128), nn.ReLU(True),
            nn.ConvTranspose2d(128, 64, 4, 2, 1, bias=False),
            nn.BatchNorm2d(64), nn.ReLU(True),
            nn.ConvTranspose2d(64, img_channels, 4, 2, 1, bias=False),
            nn.Tanh()
        )

    def forward(self, z, severity):
        x = torch.cat([z, severity], dim=1)
        x = self.fc(x)
        x = x.view(-1, 1024, 4, 4)
        return self.conv_blocks(x)


class ResNet18Classifier(nn.Module):
    # Standard torchvision ResNet18 with fc replaced for 4 classes
    # Load via: torchvision.models.resnet18()
    # Replace model.fc with nn.Linear(512, 4)
    pass
```

## Model Loading from Hugging Face Hub

```python
# hf_loader.py
from huggingface_hub import hf_hub_download
import torch

HF_REPO = "alyrraza/progressgan-cxr"  # This is the HF repo to create

MODEL_FILES = {
    "kd":       "kd_checkpoint_epoch_50.pth",
    "dcgan":    "dcgan_checkpoint_epoch_50.pth",
    "spectral": "spectral_dcgan_checkpoint_epoch_50.pth",
    "wgan":     "wgan_checkpoint_epoch_50.pth",
    "classifier": "classifier_real_only.pth",
}

def load_model_from_hf(model_key: str):
    path = hf_hub_download(repo_id=HF_REPO, filename=MODEL_FILES[model_key])
    checkpoint = torch.load(path, map_location="cpu")
    return checkpoint
```

## ONNX Export and Quantization (Critical for JD)

```python
# inference.py
import torch
import onnx
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType

def export_to_onnx(model, output_path: str, z_dim: int = 100):
    model.eval()
    dummy_z   = torch.randn(1, z_dim)
    dummy_sev = torch.tensor([[0.5]])
    torch.onnx.export(
        model,
        (dummy_z, dummy_sev),
        output_path,
        input_names=["noise", "severity"],
        output_names=["generated_image"],
        dynamic_axes={
            "noise": {0: "batch_size"},
            "severity": {0: "batch_size"},
        },
        opset_version=11,
    )

def quantize_model(onnx_path: str, quantized_path: str):
    quantize_dynamic(
        onnx_path,
        quantized_path,
        weight_type=QuantType.QInt8,
    )

def run_inference(session: ort.InferenceSession, noise, severity):
    outputs = session.run(
        None,
        {"noise": noise, "severity": severity}
    )
    return outputs[0]
```

## FastAPI Endpoints

Build these exact endpoints:

### POST /generate
Request body:
```json
{
  "severity": 0.5,
  "model": "kd",
  "seed": null
}
```
Response:
```json
{
  "image_base64": "...",
  "model_used": "kd",
  "severity": 0.5,
  "inference_time_ms": 45.2
}
```

### POST /classify
Request body:
```json
{
  "image_base64": "..."
}
```
Response:
```json
{
  "predicted_class": "COVID",
  "class_index": 3,
  "probabilities": {
    "Normal": 0.02,
    "Lung_Opacity": 0.05,
    "Viral_Pneumonia": 0.08,
    "COVID": 0.85
  },
  "confidence": 0.85
}
```

### POST /compare
Request body:
```json
{
  "severity": 0.7,
  "seed": 42
}
```
Response:
```json
{
  "images": {
    "kd": "base64...",
    "dcgan": "base64...",
    "spectral": "base64...",
    "wgan": "base64..."
  },
  "metrics": {
    "kd":       {"fid": 143.17, "spearman_r": 0.984, "ssim": 0.963},
    "dcgan":    {"fid": 142.14, "spearman_r": 0.598, "ssim": 0.905},
    "spectral": {"fid": 156.22, "spearman_r": 0.996, "ssim": 0.947},
    "wgan":     {"fid": 237.39, "spearman_r": 0.748, "ssim": 0.913}
  }
}
```

### POST /challenge
Request: empty body
Response:
```json
{
  "image_base64": "...",
  "challenge_id": "uuid-here",
  "actual_severity": null
}
```

### POST /challenge/{challenge_id}/answer
Request body:
```json
{
  "user_answer": "COVID"
}
```
Response:
```json
{
  "user_answer": "COVID",
  "ai_answer": "COVID",
  "actual_severity": 0.87,
  "actual_class": "COVID",
  "user_correct": true,
  "ai_correct": true
}
```

### GET /health
Response:
```json
{
  "status": "healthy",
  "models_loaded": ["kd", "dcgan", "spectral", "wgan", "classifier"],
  "device": "cpu"
}
```

### GET /metrics
Prometheus metrics endpoint. Must expose:
- `generate_requests_total` (counter)
- `generate_latency_seconds` (histogram)
- `classify_requests_total` (counter)
- `classify_latency_seconds` (histogram)
- `model_load_success` (gauge)

## Prometheus Metrics Setup

```python
# metrics.py
from prometheus_client import Counter, Histogram, Gauge, make_asgi_app

generate_requests = Counter(
    "generate_requests_total",
    "Total generation requests",
    ["model", "status"]
)
generate_latency = Histogram(
    "generate_latency_seconds",
    "Generation inference latency",
    ["model"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)
classify_requests = Counter(
    "classify_requests_total",
    "Total classification requests",
    ["status"]
)
classify_latency = Histogram(
    "classify_latency_seconds",
    "Classification inference latency",
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5]
)
models_loaded = Gauge(
    "models_loaded_total",
    "Number of models successfully loaded"
)
```

## CORS Configuration

Allow all origins for development. In production allow only Vercel frontend URL.

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Model Loading Strategy

Load all models at startup using FastAPI lifespan. Cache ONNX sessions in memory. Do NOT reload on every request.

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load all models
    load_all_models()
    yield
    # Shutdown: cleanup

app = FastAPI(lifespan=lifespan)
```

## Requirements

```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
torch>=2.0.0
torchvision>=0.15.0
onnx>=1.15.0
onnxruntime>=1.17.0
huggingface_hub>=0.20.0
prometheus-client>=0.19.0
pillow>=9.0.0
numpy>=1.24.0
python-multipart>=0.0.9
pytest>=7.0.0
httpx>=0.27.0
```

## Tests Required

Write tests in tests/test_api.py:
1. Test /health returns 200
2. Test /generate with valid severity returns base64 image
3. Test /classify with valid image returns probabilities that sum to 1
4. Test /compare returns all 4 model images
5. Test /generate with invalid severity (>1.0) returns 422
