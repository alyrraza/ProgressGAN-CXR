export type ModelKey = "kd" | "dcgan" | "spectral" | "wgan";

export interface ModelMeta {
  label: string;
  fid: number;
  spearman_r: number;
  ssim: number;
}

export const MODEL_META: Record<ModelKey, ModelMeta> = {
  kd:       { label: "KD Generator",    fid: 143.17, spearman_r: 0.984, ssim: 0.963 },
  dcgan:    { label: "DCGAN",           fid: 142.14, spearman_r: 0.598, ssim: 0.905 },
  spectral: { label: "Spectral DCGAN",  fid: 156.22, spearman_r: 0.996, ssim: 0.947 },
  wgan:     { label: "WGAN-GP",         fid: 237.39, spearman_r: 0.748, ssim: 0.913 },
};

export type DiagnosisClass = "Normal" | "Lung_Opacity" | "Viral_Pneumonia" | "COVID";

export const CLASS_LABELS: Record<DiagnosisClass, string> = {
  Normal:           "Normal",
  Lung_Opacity:     "Lung Opacity",
  Viral_Pneumonia:  "Viral Pneumonia",
  COVID:            "COVID-19",
};

export interface GenerateResponse {
  image_base64: string;
  model_used: string;
  severity: number;
  inference_time_ms: number;
}

export interface ClassifyResponse {
  predicted_class: DiagnosisClass;
  class_index: number;
  probabilities: Record<DiagnosisClass, number>;
  confidence: number;
}

export interface CompareResponse {
  images: Record<ModelKey, string>;
  metrics: Record<ModelKey, { fid: number; spearman_r: number; ssim: number }>;
}

export interface ChallengeStartResponse {
  image_base64: string;
  challenge_id: string;
  actual_severity: null;
}

export interface ChallengeAnswerResponse {
  user_answer: string;
  ai_answer: string;
  actual_severity: number;
  actual_class: DiagnosisClass;
  user_correct: boolean;
  ai_correct: boolean;
}
