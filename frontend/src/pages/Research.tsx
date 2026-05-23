import { lazy, Suspense } from "react";
import { getResultImageUrl } from "../api";

const ResearchCharts = lazy(() => import("../components/ResearchCharts"));

export default function Research() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="section-title text-2xl">Research Findings</h1>
        <p className="section-subtitle">
          ProgressGAN-CXR: Severity-Conditioned GAN for COVID-19 Disease Progression Simulation
        </p>
      </div>

      <Suspense
        fallback={
          <div className="text-text-secondary text-sm text-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading charts...
          </div>
        }
      >
        <ResearchCharts resultImageUrl={getResultImageUrl("severity_progression.png")} />
      </Suspense>
    </div>
  );
}
