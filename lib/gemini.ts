import type { ImageAnalysis } from "@/lib/types";

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_ENDPOINT =
  process.env.GEMINI_ENDPOINT ??
  `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`;

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0.5;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function extractTextResponse(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const candidates = (payload as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return "";
  }

  const firstCandidate = candidates[0] as {
    content?: { parts?: Array<{ text?: string }> };
  };
  const parts = firstCandidate.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  const joined = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("\n")
    .trim();

  return joined;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // Fall through and attempt fenced JSON extraction.
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeAnalysis(
  parsed: Record<string, unknown> | null,
  rawModelText: string,
): ImageAnalysis {
  return {
    summary:
      typeof parsed?.summary === "string"
        ? parsed.summary
        : "No summary returned by the model.",
    wateringAdvice:
      typeof parsed?.wateringAdvice === "string"
        ? parsed.wateringAdvice
        : "No watering advice returned.",
    fertilizingAdvice:
      typeof parsed?.fertilizingAdvice === "string"
        ? parsed.fertilizingAdvice
        : "No fertilizing advice returned.",
    healthIssues: safeStringArray(parsed?.healthIssues),
    pests: safeStringArray(parsed?.pests),
    nearTermTasks: safeStringArray(parsed?.nearTermTasks),
    longTermTasks: safeStringArray(parsed?.longTermTasks),
    confidence: clampConfidence(parsed?.confidence),
    rawModelText,
  };
}

export async function analyzeGardenImage(params: {
  imageData: string;
  mimeType: string;
  plantId?: string;
  notes?: string;
}): Promise<ImageAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const prompt = [
    "You are an expert gardening assistant.",
    "Analyze the plant image and provide practical next steps.",
    "Focus on watering, fertilizing, plant health issues, pests, and tasks.",
    "Return strict JSON with this exact schema:",
    "{",
    '  "summary": string,',
    '  "wateringAdvice": string,',
    '  "fertilizingAdvice": string,',
    '  "healthIssues": string[],',
    '  "pests": string[],',
    '  "nearTermTasks": string[],',
    '  "longTermTasks": string[],',
    '  "confidence": number',
    "}",
    "Do not include markdown or prose outside JSON.",
    `Plant ID: ${params.plantId ?? "unknown"}`,
    `User notes: ${params.notes ?? "none"}`,
  ].join("\n");

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: params.mimeType,
                data: params.imageData,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API request failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as unknown;
  const rawModelText = extractTextResponse(payload);
  const parsed = extractJsonObject(rawModelText);
  return normalizeAnalysis(parsed, rawModelText);
}
