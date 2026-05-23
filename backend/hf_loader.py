import io
import os

import requests
import torch
from huggingface_hub import hf_hub_url

from models import DCGANGenerator, build_classifier

HF_REPO = os.getenv("HF_REPO", "alyrraza/progressgan-cxr")

# Absolute path so it works regardless of working directory
LOCAL_MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")

MODEL_FILES = {
    "kd":         "kd_checkpoint_epoch_50.pth",
    "dcgan":      "dcgan_checkpoint_epoch_50.pth",
    "spectral":   "spectral_dcgan_checkpoint_epoch_50.pth",
    "wgan":       "wgan_checkpoint_epoch_50.pth",
    "classifier": "classifier_real_only.pth",
}


def _strip_module_prefix(state_dict: dict) -> dict:
    """Remove 'module.' prefix left by nn.DataParallel training."""
    return {k.removeprefix("module."): v for k, v in state_dict.items()}


def _extract_generator_state_dict(checkpoint) -> dict:
    """Pull G_state_dict from the training checkpoint format."""
    if isinstance(checkpoint, dict):
        for key in ("G_state_dict", "generator_state_dict", "state_dict"):
            if key in checkpoint:
                return _strip_module_prefix(checkpoint[key])
    # checkpoint is already a bare state dict
    return _strip_module_prefix(checkpoint)


def _extract_classifier_state_dict(checkpoint) -> dict:
    if isinstance(checkpoint, dict):
        for key in ("model_state_dict", "state_dict"):
            if key in checkpoint:
                return _strip_module_prefix(checkpoint[key])
    return _strip_module_prefix(checkpoint)


def _load_checkpoint(model_key: str):
    """
    Load a .pth checkpoint either from the local models/ folder or by
    streaming from HF Hub, depending on the LOCAL_MODELS env var.
    """
    if os.getenv("LOCAL_MODELS", "false").lower() == "true":
        local_path = os.path.join(LOCAL_MODELS_DIR, MODEL_FILES[model_key])
        if not os.path.exists(local_path):
            raise FileNotFoundError(
                f"LOCAL_MODELS=true but file not found: {local_path}"
            )
        print(f"[loader] Reading {MODEL_FILES[model_key]} from local disk")
        return torch.load(local_path, map_location="cpu", weights_only=False)

    print(f"[loader] Streaming {MODEL_FILES[model_key]} from HF Hub into memory")
    url = hf_hub_url(repo_id=HF_REPO, filename=MODEL_FILES[model_key])
    response = requests.get(url, stream=True, timeout=180)
    response.raise_for_status()
    buffer = io.BytesIO()
    for chunk in response.iter_content(chunk_size=65536):
        buffer.write(chunk)
    buffer.seek(0)
    return torch.load(buffer, map_location="cpu", weights_only=False)


def load_generator_from_hf(model_key: str) -> DCGANGenerator:
    checkpoint = _load_checkpoint(model_key)
    model = DCGANGenerator()
    model.load_state_dict(_extract_generator_state_dict(checkpoint))
    model.eval()
    return model


def load_classifier_from_hf():
    checkpoint = _load_checkpoint("classifier")
    model = build_classifier()
    model.load_state_dict(_extract_classifier_state_dict(checkpoint))
    model.eval()
    return model
