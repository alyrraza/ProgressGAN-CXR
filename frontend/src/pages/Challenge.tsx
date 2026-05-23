import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import XrayDisplay from "../components/XrayDisplay";
import SeverityBadge from "../components/SeverityBadge";
import ErrorCard from "../components/ErrorCard";
import { startChallenge, submitAnswer } from "../api";
import { CLASS_LABELS, type DiagnosisClass, type ChallengeAnswerResponse } from "../types";

type Phase = "idle" | "challenge" | "result";

const CLASSES: DiagnosisClass[] = ["Normal", "Lung_Opacity", "Viral_Pneumonia", "COVID"];

const CLASS_COLORS: Record<DiagnosisClass, string> = {
  Normal:          "border-success/40 hover:border-success text-success",
  Lung_Opacity:    "border-warning/40 hover:border-warning text-warning",
  Viral_Pneumonia: "border-orange-400/40 hover:border-orange-400 text-orange-400",
  COVID:           "border-error/40 hover:border-error text-error",
};

export default function Challenge() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChallengeAnswerResponse | null>(null);

  // Session score
  const [score, setScore] = useState({ you: 0, ai: 0, total: 0 });

  async function handleStart() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await startChallenge();
      setImageBase64(res.image_base64);
      setChallengeId(res.challenge_id);
      setPhase("challenge");
    } catch {
      setError("Failed to start challenge. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(cls: DiagnosisClass) {
    if (!challengeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await submitAnswer(challengeId, cls);
      setResult(res);
      setScore((s) => ({
        you: s.you + (res.user_correct ? 1 : 0),
        ai: s.ai + (res.ai_correct ? 1 : 0),
        total: s.total + 1,
      }));
      setPhase("result");
    } catch {
      setError("Failed to submit answer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="section-title text-2xl">Diagnostic Challenge</h1>
        <p className="section-subtitle">
          The AI generates an X-ray at a hidden severity. Diagnose it before revealing the answer.
        </p>
      </div>

      {/* Score */}
      {score.total > 0 && (
        <div className="card p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="font-mono font-bold text-primary text-xl">{score.you}/{score.total}</div>
              <div className="text-xs text-text-secondary">Your Score</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="font-mono font-bold text-warning text-xl">{score.ai}/{score.total}</div>
              <div className="text-xs text-text-secondary">AI Score</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-secondary mb-1">Accuracy</div>
            <div className="font-mono text-sm text-text-primary">
              You: {((score.you / score.total) * 100).toFixed(0)}% |
              AI: {((score.ai / score.total) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {error && <div className="mb-4"><ErrorCard message={error} /></div>}

      {/* Idle */}
      {phase === "idle" && (
        <div className="card p-12 flex flex-col items-center justify-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl">
            ⚡
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Ready to test your skills?</h2>
            <p className="text-text-secondary text-sm max-w-xs">
              You'll see a generated chest X-ray. Diagnose it as Normal, Lung Opacity, Viral Pneumonia, or COVID-19.
            </p>
          </div>
          <button className="btn-primary px-8 py-2.5" onClick={handleStart} disabled={loading}>
            {loading ? "Loading..." : "Start Challenge"}
          </button>
        </div>
      )}

      {/* Active challenge */}
      {phase === "challenge" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="challenge"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5"
          >
            <div className="card p-5">
              <XrayDisplay imageBase64={imageBase64} loading={loading} size="lg" />
            </div>

            <div className="card p-5">
              <p className="text-sm text-text-secondary mb-3 text-center">
                What is your diagnosis?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CLASSES.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => handleAnswer(cls)}
                    disabled={loading}
                    className={`border rounded-xl p-3 text-sm font-semibold transition-all ${CLASS_COLORS[cls]} bg-surface hover:bg-surface-2 disabled:opacity-50`}
                  >
                    {CLASS_LABELS[cls]}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Result */}
      {phase === "result" && result && (
        <AnimatePresence mode="wait">
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="card p-5">
              <XrayDisplay imageBase64={imageBase64} size="lg" />
            </div>

            <div className="card p-5 flex flex-col gap-4">
              <h3 className="font-semibold text-text-primary text-center mb-2">Results</h3>

              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                <span className="text-text-secondary text-sm">Actual Condition</span>
                <SeverityBadge severity={result.actual_severity} showScore />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg border text-center ${result.user_correct ? "border-success/40 bg-success/5" : "border-error/40 bg-error/5"}`}>
                  <div className="text-xs text-text-secondary mb-1">Your Answer</div>
                  <div className={`font-semibold text-sm ${result.user_correct ? "text-success" : "text-error"}`}>
                    {CLASS_LABELS[result.user_answer as DiagnosisClass] || result.user_answer}
                  </div>
                  <div className="text-lg mt-1">{result.user_correct ? "✓" : "✗"}</div>
                </div>
                <div className={`p-3 rounded-lg border text-center ${result.ai_correct ? "border-success/40 bg-success/5" : "border-error/40 bg-error/5"}`}>
                  <div className="text-xs text-text-secondary mb-1">AI Answer</div>
                  <div className={`font-semibold text-sm ${result.ai_correct ? "text-success" : "text-error"}`}>
                    {CLASS_LABELS[result.ai_answer as DiagnosisClass] || result.ai_answer}
                  </div>
                  <div className="text-lg mt-1">{result.ai_correct ? "✓" : "✗"}</div>
                </div>
              </div>

              <div className="text-center text-sm text-text-secondary">
                Actual severity: <span className="font-mono text-primary">{result.actual_severity.toFixed(3)}</span>
                {" · "}
                Class: <span className="text-text-primary">{CLASS_LABELS[result.actual_class] || result.actual_class}</span>
              </div>
            </div>

            <button className="btn-primary w-full py-2.5" onClick={handleStart} disabled={loading}>
              {loading ? "Loading..." : "Next Challenge →"}
            </button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
