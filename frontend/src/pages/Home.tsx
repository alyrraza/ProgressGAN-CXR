import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const STATS = [
  { value: "4", label: "GAN Models", sub: "KD · DCGAN · Spectral · WGAN-GP" },
  { value: "21,165", label: "Training Images", sub: "COVID-19 Radiography Dataset" },
  { value: "95.28%", label: "Classifier Accuracy", sub: "ResNet18 · 4 classes" },
];

const FEATURES = [
  {
    to: "/simulator",
    icon: "◈",
    title: "Disease Progression Simulator",
    description: "Move a severity slider from Normal to COVID-19 and watch the X-ray update in real time. Choose from 4 GAN architectures.",
    accent: "border-primary/30 hover:border-primary/60",
    badge: "Core Feature",
  },
  {
    to: "/challenge",
    icon: "⚡",
    title: "Diagnostic Challenge",
    description: "Test your diagnostic skills. The AI generates an X-ray at a hidden severity — can you diagnose it before the AI?",
    accent: "border-warning/30 hover:border-warning/60",
    badge: "Educational",
  },
  {
    to: "/compare",
    icon: "⊞",
    title: "Model Comparison",
    description: "Same noise, same severity — four different GAN outputs side by side. See exactly how FID, Spearman r, and SSIM diverge.",
    accent: "border-success/30 hover:border-success/60",
    badge: "Research",
  },
  {
    to: "/research",
    icon: "◎",
    title: "Research Dashboard",
    description: "Interactive charts from the paper: severity disentanglement, temporal consistency, downstream classification impact.",
    accent: "border-purple-500/30 hover:border-purple-500/60",
    badge: "Findings",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Medical AI Research · COVID-19 Chest X-Ray Synthesis
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary mb-4">
          Progress<span className="text-primary">GAN</span>-CXR
        </h1>

        <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed mb-8">
          Severity-Conditioned Chest X-Ray Synthesis for Medical Education and Research.
          Four GAN architectures trained on 21,165 COVID-19 radiographs.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/simulator" className="btn-primary px-6 py-2.5 text-sm">
            Launch Simulator →
          </Link>
          <Link to="/research" className="btn-secondary px-6 py-2.5 text-sm">
            View Research
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16"
      >
        {STATS.map((stat) => (
          <div key={stat.label} className="card p-6 text-center">
            <div className="stat-value text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-text-primary font-semibold">{stat.label}</div>
            <div className="text-text-secondary text-xs mt-1">{stat.sub}</div>
          </div>
        ))}
      </motion.div>

      {/* Feature cards */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">What You Can Do</h2>
        <p className="text-text-secondary text-center mb-8 text-sm">
          Four interactive tools built on top of the trained models.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.to} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <Link
                to={f.to}
                className={`card p-6 flex flex-col gap-3 border transition-all duration-200 group ${f.accent}`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl text-primary opacity-70 group-hover:opacity-100 transition-opacity">
                    {f.icon}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary border border-border rounded-full px-2 py-0.5">
                    {f.badge}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors mb-1">
                    {f.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{f.description}</p>
                </div>
                <div className="text-primary text-sm font-medium group-hover:translate-x-1 transition-transform mt-auto">
                  Open →
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="card p-6 border-border/50">
        <h2 className="text-lg font-semibold text-text-primary mb-3">About This Project</h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          ProgressGAN-CXR trains four GAN architectures — DCGAN, Spectral Normalization DCGAN, WGAN-GP,
          and a Knowledge-Distilled generator — to synthesize chest X-rays conditioned on a continuous
          severity score (0.0 = Normal → 1.0 = COVID-19). The key finding: FID alone is a poor metric
          for medical imaging. The KD Generator achieves Spearman r = 0.984 (near-perfect severity
          disentanglement) and SSIM = 0.963, while matching the lowest FID score. When used for
          downstream augmentation, it improves classifier accuracy from 87.3% to 95.28%.
        </p>
      </div>
    </div>
  );
}
