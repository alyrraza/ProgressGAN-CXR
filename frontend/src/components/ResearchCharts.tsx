import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";

interface Props {
  resultImageUrl: string;
}

const MODELS = ["KD Gen", "DCGAN", "Spectral", "WGAN-GP"];
const COLORS = ["#00D4FF", "#3B82F6", "#8B5CF6", "#EC4899"];

const FID_DATA = [
  { model: "KD Gen",   fid: 143.17 },
  { model: "DCGAN",    fid: 142.14 },
  { model: "Spectral", fid: 156.22 },
  { model: "WGAN-GP",  fid: 237.39 },
];

const SPEARMAN_DATA = [
  { model: "KD Gen",   r: 0.984 },
  { model: "DCGAN",    r: 0.598 },
  { model: "Spectral", r: 0.996 },
  { model: "WGAN-GP",  r: 0.748 },
];

const SSIM_DATA = [
  { model: "KD Gen",   ssim: 0.963 },
  { model: "DCGAN",    ssim: 0.905 },
  { model: "Spectral", ssim: 0.947 },
  { model: "WGAN-GP",  ssim: 0.913 },
];

const DOWNSTREAM_DATA = [
  { condition: "No Augmentation",       accuracy: 87.3,  f1: 0.871 },
  { condition: "GAN Augmentation",      accuracy: 93.1,  f1: 0.929 },
  { condition: "Real + GAN (Full)",     accuracy: 95.28, f1: 0.951 },
];

const CONTRIBUTIONS = [
  {
    num: "01",
    title: "FID is Insufficient",
    body: "DCGAN achieves the lowest FID (142.14) yet has the worst severity correlation (r=0.598). FID measures distribution similarity, not clinical utility. For severity-conditioned synthesis, Spearman r is the critical metric.",
  },
  {
    num: "02",
    title: "Knowledge Distillation Wins Overall",
    body: "The KD Generator achieves competitive FID=143.17, near-perfect severity correlation r=0.984, and the best SSIM=0.963. Knowledge distillation from a teacher ensemble transfers both visual quality and semantic conditioning.",
  },
  {
    num: "03",
    title: "Spectral Normalization Best for Disentanglement",
    body: "Spectral DCGAN achieves the highest Spearman r=0.996 — nearly perfect severity-to-image mapping. Spectral normalization stabilizes training and enforces smoother latent-to-image mappings.",
  },
  {
    num: "04",
    title: "GAN Augmentation Improves Downstream Accuracy",
    body: "Adding GAN-generated images to real training data improves ResNet18 classifier accuracy from 87.3% to 95.28% — an 8pp improvement. Generated X-rays provide rare-class examples the model otherwise undersees.",
  },
];

const chartStyle = {
  tooltip: { contentStyle: { background: "#111827", border: "1px solid #1F2937", borderRadius: 8, color: "#F9FAFB" } },
  axisStyle: { fill: "#9CA3AF", fontSize: 11 },
};

export default function ResearchCharts({ resultImageUrl }: Props) {
  return (
    <div className="flex flex-col gap-10">
      {/* Section 1: FID */}
      <section>
        <h2 className="section-title">The Problem with FID</h2>
        <p className="section-subtitle">
          Fréchet Inception Distance measures distribution similarity — but for severity-conditioned synthesis,
          it fails to capture whether the model actually encodes severity information. DCGAN achieves the best FID
          yet is clinically useless (Spearman r = 0.598).
        </p>
        <div className="card p-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={FID_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="model" tick={chartStyle.axisStyle} />
              <YAxis tick={chartStyle.axisStyle} domain={[0, 260]} />
              <Tooltip {...chartStyle.tooltip} formatter={(v: number) => [v.toFixed(2), "FID ↓"]} />
              <Bar dataKey="fid" radius={[4, 4, 0, 0]}>
                {FID_DATA.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section 2: Spearman r */}
      <section>
        <h2 className="section-title">Severity Disentanglement</h2>
        <p className="section-subtitle">
          Spearman rank correlation between input severity score and predicted classifier severity.
          A value near 1.0 means the model perfectly encodes disease progression.
        </p>
        <div className="card p-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SPEARMAN_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="model" tick={chartStyle.axisStyle} />
              <YAxis tick={chartStyle.axisStyle} domain={[0, 1.1]} />
              <Tooltip {...chartStyle.tooltip} formatter={(v: number) => [v.toFixed(3), "Spearman r ↑"]} />
              <Bar dataKey="r" radius={[4, 4, 0, 0]}>
                {SPEARMAN_DATA.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section 3: SSIM */}
      <section>
        <h2 className="section-title">Temporal Consistency</h2>
        <p className="section-subtitle">
          SSIM (Structural Similarity Index) measures how smoothly images transition as severity increases.
          High SSIM means the model produces a coherent disease progression, not random jumps.
        </p>
        <div className="card p-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SSIM_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="model" tick={chartStyle.axisStyle} />
              <YAxis tick={chartStyle.axisStyle} domain={[0.85, 1.0]} />
              <Tooltip {...chartStyle.tooltip} formatter={(v: number) => [v.toFixed(3), "SSIM ↑"]} />
              <Bar dataKey="ssim" radius={[4, 4, 0, 0]}>
                {SSIM_DATA.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section 4: Downstream */}
      <section>
        <h2 className="section-title">Downstream Classification</h2>
        <p className="section-subtitle">
          ResNet18 classifier accuracy under three data augmentation conditions.
        </p>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-text-secondary font-medium">Condition</th>
                <th className="text-right px-5 py-3 text-text-secondary font-medium">Accuracy</th>
                <th className="text-right px-5 py-3 text-text-secondary font-medium">F1 Score</th>
              </tr>
            </thead>
            <tbody>
              {DOWNSTREAM_DATA.map((row, i) => (
                <tr key={i} className={`border-b border-border last:border-0 ${i === 2 ? "bg-primary/5" : ""}`}>
                  <td className="px-5 py-3 text-text-primary">
                    {row.condition}
                    {i === 2 && <span className="ml-2 text-[10px] text-primary font-bold">BEST</span>}
                  </td>
                  <td className={`px-5 py-3 text-right font-mono ${i === 2 ? "text-primary font-bold" : "text-text-primary"}`}>
                    {row.accuracy.toFixed(2)}%
                  </td>
                  <td className={`px-5 py-3 text-right font-mono ${i === 2 ? "text-primary font-bold" : "text-text-primary"}`}>
                    {row.f1.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5: Key Contributions */}
      <section>
        <h2 className="section-title">Key Contributions</h2>
        <p className="section-subtitle">Four findings from the ProgressGAN-CXR paper.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONTRIBUTIONS.map((c) => (
            <div key={c.num} className="card p-5">
              <div className="font-mono text-primary text-xs font-bold mb-2">{c.num}</div>
              <h3 className="font-semibold text-text-primary mb-2">{c.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 6: Severity Progression image */}
      <section>
        <h2 className="section-title">Severity Progression</h2>
        <p className="section-subtitle">
          Generated X-rays at increasing severity scores (0.0 → 1.0) using the KD Generator.
          Note the progressive appearance of bilateral infiltrates and consolidation.
        </p>
        <div className="card p-4">
          <img
            src={resultImageUrl}
            alt="Severity progression from Normal to COVID-19"
            className="w-full rounded-lg"
            style={{ filter: "brightness(1.05) contrast(1.05)" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <p className="text-xs text-text-secondary text-center mt-2">
            Figure: Synthesized chest X-ray progression across severity scores 0.0 – 1.0
          </p>
        </div>
      </section>
    </div>
  );
}
