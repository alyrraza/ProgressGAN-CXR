import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import XrayDisplay from "../components/XrayDisplay";
import SeverityBadge from "../components/SeverityBadge";
import MetricBadge from "../components/MetricBadge";
import ErrorCard from "../components/ErrorCard";
import { generateXray } from "../api";
import { MODEL_META, type ModelKey } from "../types";

const MODELS: { key: ModelKey; label: string }[] = [
  { key: "kd",       label: "KD Generator (Best)" },
  { key: "dcgan",    label: "DCGAN" },
  { key: "spectral", label: "Spectral DCGAN" },
  { key: "wgan",     label: "WGAN-GP" },
];

const CLINICAL_DESC: Record<string, string> = {
  normal:   "Clear lung fields. No consolidation, infiltrates, or effusion. Normal cardiac silhouette.",
  opacity:  "Bilateral ground-glass opacities in peripheral and lower zones. Early inflammatory response.",
  pneumonia:"Diffuse bilateral infiltrates. Patchy consolidation pattern. Consistent with viral pneumonia.",
  covid:    "Extensive bilateral consolidation. Peripheral and posterior distribution. Classic COVID-19 pattern.",
};

function getClinicalDesc(severity: number): string {
  if (severity <= 0.15) return CLINICAL_DESC.normal;
  if (severity <= 0.45) return CLINICAL_DESC.opacity;
  if (severity <= 0.75) return CLINICAL_DESC.pneumonia;
  return CLINICAL_DESC.covid;
}

export default function Simulator() {
  const [model, setModel] = useState<ModelKey>("kd");
  const [severity, setSeverity] = useState(0.5);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 9999));
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);

  const generate = useCallback(async (sev: number, mdl: ModelKey, sd: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateXray(sev, mdl, sd);
      setImageBase64(res.image_base64);
      setInferenceMs(res.inference_time_ms);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Generation failed. Is the backend running?";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-generate on slider move with 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => generate(severity, model, seed), 300);
    return () => clearTimeout(t);
  }, [severity, model, seed, generate]);

  const meta = MODEL_META[model];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="section-title text-2xl">Disease Progression Simulator</h1>
        <p className="section-subtitle">
          Adjust the severity slider to simulate chest X-ray appearance across disease stages.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_280px] gap-6">
        {/* Left: Controls */}
        <div className="card p-5 flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              GAN Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ModelKey)}
              className="w-full bg-surface-2 border border-border text-text-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary transition-colors"
            >
              {MODELS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Severity
              </label>
              <span className="font-mono text-primary text-sm">{severity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={severity}
              onChange={(e) => setSeverity(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00D4FF ${severity * 100}%, #1F2937 ${severity * 100}%)`,
              }}
            />
            <div className="flex justify-between text-[10px] text-text-secondary mt-1 font-mono">
              <span>0.00</span>
              <span>0.50</span>
              <span>1.00</span>
            </div>

            {/* Severity stage markers */}
            <div className="flex justify-between mt-2">
              {[
                { label: "Normal",    color: "text-success",     at: "0%" },
                { label: "Opacity",   color: "text-warning",     at: "33%" },
                { label: "Pneumonia", color: "text-orange-400",  at: "66%" },
                { label: "COVID",     color: "text-error",       at: "100%" },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSeverity(parseFloat(s.at) / 100)}
                  className={`text-[9px] font-semibold ${s.color} hover:opacity-80 transition-opacity`}
                  title={`Set to ${s.at}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              className="btn-secondary w-full text-sm"
              onClick={() => setSeed(Math.floor(Math.random() * 99999))}
            >
              🎲 Random Noise
            </button>
            <button
              className="btn-primary w-full text-sm"
              onClick={() => generate(severity, model, seed)}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>

          {inferenceMs !== null && (
            <div className="text-center">
              <span className="text-[10px] text-text-secondary font-mono">
                {inferenceMs.toFixed(1)}ms inference
              </span>
            </div>
          )}
        </div>

        {/* Center: X-ray display */}
        <div className="card p-5 flex flex-col items-center justify-center gap-4">
          <XrayDisplay imageBase64={imageBase64} loading={loading} size="lg" />
          {error && <ErrorCard message={error} onRetry={() => generate(severity, model, seed)} />}
          <div className="flex items-center gap-2">
            <SeverityBadge severity={severity} showScore />
          </div>
        </div>

        {/* Right: Info panel */}
        <div className="card p-5 flex flex-col gap-5">
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Model Performance
            </h3>
            <div className="font-semibold text-text-primary mb-3">{meta.label}</div>
            <div className="grid grid-cols-3 gap-2">
              <MetricBadge
                label="FID"
                value={meta.fid}
                lowerIsBetter
                best={meta.fid === 142.14}
              />
              <MetricBadge
                label="Spearman r"
                value={meta.spearman_r}
                best={meta.spearman_r === 0.984}
              />
              <MetricBadge
                label="SSIM"
                value={meta.ssim}
                best={meta.ssim === 0.963}
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Clinical Interpretation
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {getClinicalDesc(severity)}
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Seed
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                className="flex-1 bg-surface-2 border border-border text-text-primary text-sm rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:border-primary"
              />
            </div>
            <p className="text-[10px] text-text-secondary mt-1">
              Same seed + same severity = reproducible image
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
