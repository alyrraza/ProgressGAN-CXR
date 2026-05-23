# CLAUDE.md — Monitoring Instructions

## Your Job

Create Prometheus and Grafana configuration for ProgressGAN-CXR backend monitoring.

## Files to Create

```
monitoring/
└── prometheus.yml
```

Grafana dashboards are configured via UI after startup, not files.

## prometheus.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "progressgan-backend"
    static_configs:
      - targets: ["backend:8000"]
    metrics_path: "/metrics"
```

## Metrics That Must Be Monitored

These are already defined in backend/metrics.py. Grafana dashboard must show:

**Panel 1: Generation Request Rate**
- Metric: rate(generate_requests_total[5m])
- Split by model label
- Type: Line chart

**Panel 2: Generation Latency P95**
- Metric: histogram_quantile(0.95, rate(generate_latency_seconds_bucket[5m]))
- Split by model label
- Type: Line chart
- Alert threshold: > 2.0 seconds

**Panel 3: Classification Request Rate**
- Metric: rate(classify_requests_total[5m])
- Type: Line chart

**Panel 4: Classification Latency P95**
- Metric: histogram_quantile(0.95, rate(classify_latency_seconds_bucket[5m]))
- Type: Line chart
- Alert threshold: > 0.5 seconds

**Panel 5: Models Loaded**
- Metric: models_loaded_total
- Type: Stat panel
- Should always show 5

**Panel 6: Error Rate**
- Metric: rate(generate_requests_total{status="error"}[5m])
- Type: Line chart
- Alert threshold: > 0.01 (1% error rate)

## Grafana Setup Instructions (Manual After Docker Compose Up)

1. Open http://localhost:3001
2. Login: admin / your_grafana_password
3. Add data source: Prometheus at http://prometheus:9090
4. Create new dashboard with panels above
5. Save dashboard as "ProgressGAN-CXR Monitoring"

## Why This Matters for the Portfolio

The ImagineArt JD specifically asks for:
"Monitor model performance, latency, and reliability in production"

Prometheus + Grafana with these specific metrics directly addresses that requirement.
In the interview, you can say:
"I monitor inference latency at P95 with Prometheus, and alert when generation exceeds 2 seconds.
I track per-model request rates to understand which model is most used in production."
