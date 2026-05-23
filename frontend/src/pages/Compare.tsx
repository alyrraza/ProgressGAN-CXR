import { useState } from "react";
import { motion } from "framer-motion";
import XrayDisplay from "../components/XrayDisplay";
import SeverityBadge from "../components/SeverityBadge";
import MetricBadge from "../components/MetricBadge";
import ErrorCard from "../components/ErrorCard";
import { compareModels } from "../api";
import { MODEL_META, type ModelKey, type CompareResponse } from "../types";

const MODEL_ORDER: ModelKey[] = ["kd", "dcgan", "spectral", "wgan"];

export default function Compare() {
  const [severity, setSeverity] = useState(0.7);
  const [seed, setSeed] = useState<string>("42");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  async function handleCompare() {
    setLoading(true);
    setError(null);
    try {
      const s = seed.trim() ? parseInt(seed) : undefined;
      const res = await compareModels(severity, s);
      setResult(res);
    } catch {
      setError("Comparison failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  // Determine best per metric
  const bestFid     = result ? Math.min(...MODEL_ORDER.map((k) => result.metrics[k].fid)) : null;
  const bestSpearman = result ? Math.max(...MODEL_ORDER.map((k) => result.metrics[k].spearman_r)) : null;
  const bestSsim    = result ? Math.max(...MODEL_ORDER.map((k) => result.metrics[k].ssim)) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="section-title text-2xl">Model Comparison</h1>
        <p className="section-subtitle">
          Same noise vector, same severity — four different GAN architectures side by side.
        </p>
      </div>

      {/* Controls */}
      <div className="card p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Severity
              </label>
              <SeverityBadge severity={severity} showScore />
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
          </div>

          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                Seed
              </label>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="optional"
                className="w-28 bg-surface-2 border border-border text-text-primary text-sm rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-primary"
              />
            </div>
            <button
              className="btn-primary px-6 py-2"
              onClick={handleCompare}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate All"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mb-5"><ErrorCard message={error} onRetry={handleCompare} /></div>}

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {MODEL_ORDER.map((key) => {
          const meta = MODEL_META[key];
          const img = result?.images[key] ?? null;
          const metrics = result?.metrics[key];

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="card p-5 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text-primary">{meta.label}</h3>
                {key === "kd" && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    RECOMMENDED
                  </span>
                )}
              </div>

              <XrayDisplay imageBase64={img} loading={loading} size="md" />

              <div className="grid grid-cols-3 gap-2">
                <MetricBadge
                  label="FID ↓"
                  value={meta.fid}
                  lowerIsBetter
                  best={bestFid !== null && meta.fid === bestFid}
                />
                <MetricBadge
                  label="Spearman ↑"
                  value={meta.spearman_r}
                  best={bestSpearman !== null && meta.spearman_r === bestSpearman}
                />
                <MetricBadge
                  label="SSIM ↑"
                  value={meta.ssim}
                  best={bestSsim !== null && meta.ssim === bestSsim}
                />
              </div>

              {metrics && (
                <p className="text-[10px] text-text-secondary font-mono">
                  FID: {metrics.fid} · r: {metrics.spearman_r} · SSIM: {metrics.ssim}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card p-4 mt-5 text-sm text-text-secondary"
        >
          <span className="text-primary font-semibold">Summary: </span>
          DCGAN achieves the lowest FID (142.14) but poor severity disentanglement (r=0.598).
          Spectral DCGAN leads on Spearman r (0.996). The KD Generator balances all three metrics —
          competitive FID, strong r=0.984, and the best SSIM=0.963 — making it the best overall
          for severity-conditioned synthesis.
        </motion.div>
      )}
    </div>
  );
}
