import axios from "axios";
import type {
  GenerateResponse,
  ClassifyResponse,
  CompareResponse,
  ChallengeStartResponse,
  ChallengeAnswerResponse,
  ModelKey,
} from "./types";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE, timeout: 30000 });

export const generateXray = async (
  severity: number,
  model: ModelKey,
  seed?: number
): Promise<GenerateResponse> => {
  const { data } = await client.post("/generate", { severity, model, seed: seed ?? null });
  return data;
};

export const classifyXray = async (imageBase64: string): Promise<ClassifyResponse> => {
  const { data } = await client.post("/classify", { image_base64: imageBase64 });
  return data;
};

export const compareModels = async (
  severity: number,
  seed?: number
): Promise<CompareResponse> => {
  const { data } = await client.post("/compare", { severity, seed: seed ?? null });
  return data;
};

export const startChallenge = async (): Promise<ChallengeStartResponse> => {
  const { data } = await client.post("/challenge");
  return data;
};

export const submitAnswer = async (
  challengeId: string,
  userAnswer: string
): Promise<ChallengeAnswerResponse> => {
  const { data } = await client.post(`/challenge/${challengeId}/answer`, {
    user_answer: userAnswer,
  });
  return data;
};

export const getResultImageUrl = (filename: string): string =>
  `${API_BASE}/results/${filename}`;
