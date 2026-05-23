from prometheus_client import Counter, Histogram, Gauge, make_asgi_app

generate_requests = Counter(
    "generate_requests_total",
    "Total generation requests",
    ["model", "status"],
)
generate_latency = Histogram(
    "generate_latency_seconds",
    "Generation inference latency",
    ["model"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
)
classify_requests = Counter(
    "classify_requests_total",
    "Total classification requests",
    ["status"],
)
classify_latency = Histogram(
    "classify_latency_seconds",
    "Classification inference latency",
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5],
)
models_loaded = Gauge(
    "models_loaded_total",
    "Number of models successfully loaded",
)

metrics_app = make_asgi_app()
