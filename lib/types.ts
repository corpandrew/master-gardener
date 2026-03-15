export type RecommendationStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed";

export interface IngestRequestPayload {
  image: string;
  plantId?: string;
  notes?: string;
}

export interface IngestJobPayload {
  jobId: string;
  imageData: string;
  mimeType: string;
  timestamp: string;
  plantId?: string;
  notes?: string;
}

export interface ImageAnalysis {
  summary: string;
  wateringAdvice: string;
  fertilizingAdvice: string;
  healthIssues: string[];
  pests: string[];
  nearTermTasks: string[];
  longTermTasks: string[];
  confidence: number;
  rawModelText: string;
}

export interface GardenRecommendation {
  id: string;
  jobId: string;
  createdAt: string;
  plantId?: string;
  notes?: string;
  imageDataUrl?: string;
  status: RecommendationStatus;
  summary: string;
  wateringAdvice?: string;
  fertilizingAdvice?: string;
  healthIssues: string[];
  pests: string[];
  nearTermTasks: string[];
  longTermTasks: string[];
  confidence?: number;
  rawModelText?: string;
  error?: string;
}
