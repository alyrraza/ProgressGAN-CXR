import io
import base64

import numpy as np
import torch
from PIL import Image


def run_inference_pytorch(model, noise: np.ndarray, severity: np.ndarray) -> np.ndarray:
    """Run generator inference directly with PyTorch (no ONNX)."""
    with torch.no_grad():
        output = model(
            torch.from_numpy(noise),
            torch.from_numpy(severity),
        )
    return output.numpy()


def tensor_to_base64(image_tensor: np.ndarray) -> str:
    img = image_tensor[0, 0]
    img = (img + 1.0) / 2.0
    img = (img * 255.0).clip(0, 255).astype(np.uint8)
    pil_img = Image.fromarray(img, mode="L")
    buffer = io.BytesIO()
    pil_img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def prepare_classifier_input(image_base64: str) -> torch.Tensor:
    img_bytes = base64.b64decode(image_base64)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB").resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    arr = (arr - mean) / std
    return torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0)
