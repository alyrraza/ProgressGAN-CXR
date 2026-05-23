import io
import sys
import base64

import numpy as np
import pytest
from PIL import Image

sys.path.insert(0, ".")


def _fake_generator():
    from models import DCGANGenerator
    m = DCGANGenerator()
    m.eval()
    return m


def _fake_classifier():
    from models import build_classifier
    m = build_classifier()
    m.eval()
    return m


def _png_b64() -> str:
    img = Image.new("L", (128, 128), color=128)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


@pytest.fixture(scope="module")
def client():
    import main

    # Pre-populate lazy caches — get_session/get_classifier will return these
    # immediately without hitting HF Hub.
    main._generators.update({k: _fake_generator() for k in ("kd", "dcgan", "spectral", "wgan")})
    main._classifier = _fake_classifier()
    main.models_loaded.set(5)

    from fastapi.testclient import TestClient
    with TestClient(main.app) as c:
        yield c

    main._generators.clear()
    main._classifier = None


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_generate_valid(client):
    r = client.post("/generate", json={"severity": 0.5, "model": "kd"})
    assert r.status_code == 200
    data = r.json()
    assert "image_base64" in data
    base64.b64decode(data["image_base64"])  # must not raise


def test_generate_invalid_severity(client):
    r = client.post("/generate", json={"severity": 1.5, "model": "kd"})
    assert r.status_code == 422


def test_classify_sums_to_one(client):
    r = client.post("/classify", json={"image_base64": _png_b64()})
    assert r.status_code == 200
    probs = list(r.json()["probabilities"].values())
    assert abs(sum(probs) - 1.0) < 0.01


def test_compare_all_models(client):
    r = client.post("/compare", json={"severity": 0.5, "seed": 42})
    assert r.status_code == 200
    assert set(r.json()["images"].keys()) == {"kd", "dcgan", "spectral", "wgan"}
