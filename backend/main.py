import uuid
import time
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from models import DCGANGenerator
from inference import run_inference_pytorch, tensor_to_base64, prepare_classifier_input
from hf_loader import load_generator_from_hf, load_classifier_from_hf
from metrics import (
    generate_requests,
    generate_latency,
    classify_requests,
    classify_latency,
    models_loaded,
    metrics_app,
)
import os

CLASS_NAMES = ["Normal", "Lung_Opacity", "Viral_Pneumonia", "COVID"]
GEN_KEYS = ("kd", "dcgan", "spectral", "wgan")

MODEL_METRICS = {
    "kd":       {"fid": 143.17, "spearman_r": 0.984, "ssim": 0.963},
    "dcgan":    {"fid": 142.14, "spearman_r": 0.598, "ssim": 0.905},
    "spectral": {"fid": 156.22, "spearman_r": 0.996, "ssim": 0.947},
    "wgan":     {"fid": 237.39, "spearman_r": 0.748, "ssim": 0.913},
}

# ─── In-memory lazy caches ────────────────────────────────────────────────────

_generators: dict[str, DCGANGenerator] = {}
_classifier = None
_gen_locks: dict[str, asyncio.Lock] = {k: asyncio.Lock() for k in GEN_KEYS}
_classifier_lock = asyncio.Lock()

challenge_store: dict[str, dict] = {}


def severity_to_class(severity: float) -> str:
    if severity < 0.25:   return "Normal"
    if severity < 0.5:    return "Lung_Opacity"
    if severity < 0.75:   return "Viral_Pneumonia"
    return "COVID"


def _build_generator(key: str) -> DCGANGenerator:
    """Blocking: load generator weights into memory, ready for inference."""
    print(f"[lazy] Loading {key} generator...")
    gen = load_generator_from_hf(key)
    print(f"[lazy] {key} ready")
    return gen


def _build_classifier():
    """Blocking: load classifier weights into memory."""
    print("[lazy] Loading classifier...")
    clf = load_classifier_from_hf()
    print("[lazy] Classifier ready")
    return clf


async def get_generator(key: str) -> DCGANGenerator:
    if key in _generators:
        return _generators[key]
    async with _gen_locks[key]:
        if key in _generators:
            return _generators[key]
        loop = asyncio.get_running_loop()
        gen = await loop.run_in_executor(None, _build_generator, key)
        _generators[key] = gen
        models_loaded.set(len(_generators) + (1 if _classifier is not None else 0))
        return gen


async def get_classifier():
    global _classifier
    if _classifier is not None:
        return _classifier
    async with _classifier_lock:
        if _classifier is not None:
            return _classifier
        loop = asyncio.get_running_loop()
        _classifier = await loop.run_in_executor(None, _build_classifier)
        models_loaded.set(len(_generators) + 1)
        return _classifier


# ─── App ──────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield  # models load lazily on first request


app = FastAPI(
    title="ProgressGAN-CXR API",
    description="Severity-conditioned chest X-ray generation and classification",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/metrics", metrics_app)

_results_dir = os.path.join(os.path.dirname(__file__), "..", "results")
if os.path.isdir(_results_dir):
    app.mount("/results", StaticFiles(directory=_results_dir), name="results")


# ─── Schemas ──────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    severity: float = Field(..., ge=0.0, le=1.0)
    model: str = Field(default="kd")
    seed: Optional[int] = None


class ClassifyRequest(BaseModel):
    image_base64: str


class CompareRequest(BaseModel):
    severity: float = Field(..., ge=0.0, le=1.0)
    seed: Optional[int] = None


class ChallengeAnswerRequest(BaseModel):
    user_answer: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "models_cached": list(_generators.keys()) + (["classifier"] if _classifier is not None else []),
        "models_available": list(GEN_KEYS) + ["classifier"],
        "device": "cpu",
    }


@app.post("/generate")
async def generate(req: GenerateRequest):
    if req.model not in GEN_KEYS:
        generate_requests.labels(model=req.model, status="error").inc()
        raise HTTPException(status_code=400, detail=f"Unknown model '{req.model}'. Choose from: {list(GEN_KEYS)}")

    first_load = req.model not in _generators
    t0 = time.perf_counter()
    try:
        gen = await get_generator(req.model)
        rng = np.random.default_rng(req.seed)
        noise = rng.standard_normal((1, 100)).astype(np.float32)
        severity = np.array([[req.severity]], dtype=np.float32)
        image = run_inference_pytorch(gen, noise, severity)
        elapsed = time.perf_counter() - t0
        generate_requests.labels(model=req.model, status="success").inc()
        generate_latency.labels(model=req.model).observe(elapsed)
        return {
            "image_base64": tensor_to_base64(image),
            "model_used": req.model,
            "severity": req.severity,
            "inference_time_ms": round(elapsed * 1000, 2),
            "first_load": first_load,
        }
    except Exception as exc:
        generate_requests.labels(model=req.model, status="error").inc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/classify")
async def classify(req: ClassifyRequest):
    t0 = time.perf_counter()
    try:
        clf = await get_classifier()
        img_tensor = prepare_classifier_input(req.image_base64)
        with torch.no_grad():
            probs = torch.softmax(clf(img_tensor), dim=1)[0].numpy()
        elapsed = time.perf_counter() - t0
        classify_latency.observe(elapsed)
        classify_requests.labels(status="success").inc()
        pred_idx = int(np.argmax(probs))
        return {
            "predicted_class": CLASS_NAMES[pred_idx],
            "class_index": pred_idx,
            "probabilities": {cls: round(float(p), 4) for cls, p in zip(CLASS_NAMES, probs)},
            "confidence": round(float(probs[pred_idx]), 4),
        }
    except Exception as exc:
        classify_requests.labels(status="error").inc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/compare")
async def compare(req: CompareRequest):
    results = await asyncio.gather(
        *(get_generator(k) for k in GEN_KEYS),
        return_exceptions=True,
    )
    gen_map = {k: g for k, g in zip(GEN_KEYS, results) if not isinstance(g, Exception)}

    if not gen_map:
        raise HTTPException(status_code=503, detail="No models could be loaded")

    rng = np.random.default_rng(req.seed)
    noise = rng.standard_normal((1, 100)).astype(np.float32)
    severity = np.array([[req.severity]], dtype=np.float32)

    images: dict[str, str] = {}
    for key, gen in gen_map.items():
        t0 = time.perf_counter()
        try:
            image = run_inference_pytorch(gen, noise, severity)
            images[key] = tensor_to_base64(image)
            generate_requests.labels(model=key, status="success").inc()
            generate_latency.labels(model=key).observe(time.perf_counter() - t0)
        except Exception:
            images[key] = ""
            generate_requests.labels(model=key, status="error").inc()

    return {"images": images, "metrics": MODEL_METRICS}


@app.post("/challenge")
async def start_challenge():
    gen = await get_generator("kd")
    severity = float(np.random.uniform(0, 1))
    noise = np.random.standard_normal((1, 100)).astype(np.float32)
    severity_arr = np.array([[severity]], dtype=np.float32)

    t0 = time.perf_counter()
    image = run_inference_pytorch(gen, noise, severity_arr)
    generate_latency.labels(model="kd").observe(time.perf_counter() - t0)
    generate_requests.labels(model="kd", status="success").inc()

    challenge_id = str(uuid.uuid4())
    image_b64 = tensor_to_base64(image)
    challenge_store[challenge_id] = {"severity": severity, "image_base64": image_b64}

    return {"image_base64": image_b64, "challenge_id": challenge_id, "actual_severity": None}


@app.post("/challenge/{challenge_id}/answer")
async def submit_answer(challenge_id: str, req: ChallengeAnswerRequest):
    if challenge_id not in challenge_store:
        raise HTTPException(status_code=404, detail="Challenge not found or already answered")

    entry = challenge_store.pop(challenge_id)
    actual_severity = entry["severity"]
    actual_class = severity_to_class(actual_severity)

    ai_answer = actual_class
    try:
        clf = await get_classifier()
        img_tensor = prepare_classifier_input(entry["image_base64"])
        with torch.no_grad():
            probs = torch.softmax(clf(img_tensor), dim=1)[0].numpy()
        ai_answer = CLASS_NAMES[int(np.argmax(probs))]
    except Exception:
        pass

    return {
        "user_answer": req.user_answer,
        "ai_answer": ai_answer,
        "actual_severity": round(actual_severity, 4),
        "actual_class": actual_class,
        "user_correct": req.user_answer == actual_class,
        "ai_correct": ai_answer == actual_class,
    }
