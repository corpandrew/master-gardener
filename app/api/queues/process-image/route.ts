import { analyzeGardenImage } from "@/lib/gemini";
import {
  getRecommendationByJobId,
  saveRecommendation,
} from "@/lib/recommendationStore";
import type { IngestJobPayload } from "@/lib/types";

type QueueEnvelope = {
  records?: Array<{
    id?: string;
    body?: unknown;
  }>;
};

function toJobPayload(input: unknown): IngestJobPayload | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<IngestJobPayload>;
  if (
    typeof candidate.jobId !== "string" ||
    typeof candidate.imageData !== "string" ||
    typeof candidate.mimeType !== "string" ||
    typeof candidate.timestamp !== "string"
  ) {
    return null;
  }

  return {
    jobId: candidate.jobId,
    imageData: candidate.imageData,
    mimeType: candidate.mimeType,
    timestamp: candidate.timestamp,
    plantId: candidate.plantId,
    notes: candidate.notes,
  };
}

function extractJobs(body: unknown): IngestJobPayload[] {
  const envelope = body as QueueEnvelope;
  if (Array.isArray(envelope?.records)) {
    return envelope.records
      .map((record) => toJobPayload(record.body))
      .filter((job): job is IngestJobPayload => Boolean(job));
  }

  const single = toJobPayload(body);
  return single ? [single] : [];
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!rawBody.trim()) {
    console.warn("Queue consumer invoked with empty body.");
    return Response.json({ success: true, processed: 0, skipped: "empty-body" });
  }

  let requestBody: unknown;
  try {
    requestBody = JSON.parse(rawBody) as unknown;
  } catch (error) {
    console.error("Queue consumer received invalid JSON payload.", {
      error: error instanceof Error ? error.message : "Unknown parse error.",
      preview: rawBody.slice(0, 200),
    });
    return Response.json({ success: true, processed: 0, skipped: "invalid-json" });
  }

  const jobs = extractJobs(requestBody);

  if (jobs.length === 0) {
    console.warn("Queue consumer invoked with no valid jobs.");
    return Response.json({ success: true, processed: 0 });
  }

  for (const job of jobs) {
    const existing = getRecommendationByJobId(job.jobId);
    saveRecommendation({
      id: existing?.id ?? job.jobId,
      jobId: job.jobId,
      createdAt: existing?.createdAt ?? job.timestamp,
      plantId: job.plantId,
      notes: job.notes,
      imageDataUrl:
        existing?.imageDataUrl ?? `data:${job.mimeType};base64,${job.imageData}`,
      status: "processing",
      summary: "Analyzing image with Gemini.",
      healthIssues: existing?.healthIssues ?? [],
      pests: existing?.pests ?? [],
      nearTermTasks: existing?.nearTermTasks ?? [],
      longTermTasks: existing?.longTermTasks ?? [],
    });

    console.info("Queue consumer processing job:", {
      jobId: job.jobId,
      plantId: job.plantId ?? null,
      timestamp: job.timestamp,
    });

    try {
      const analysis = await analyzeGardenImage({
        imageData: job.imageData,
        mimeType: job.mimeType,
        plantId: job.plantId,
        notes: job.notes,
      });

      saveRecommendation({
        id: existing?.id ?? job.jobId,
        jobId: job.jobId,
        createdAt: existing?.createdAt ?? job.timestamp,
        plantId: job.plantId,
        notes: job.notes,
        imageDataUrl:
          existing?.imageDataUrl ?? `data:${job.mimeType};base64,${job.imageData}`,
        status: "succeeded",
        summary: analysis.summary,
        wateringAdvice: analysis.wateringAdvice,
        fertilizingAdvice: analysis.fertilizingAdvice,
        healthIssues: analysis.healthIssues,
        pests: analysis.pests,
        nearTermTasks: analysis.nearTermTasks,
        longTermTasks: analysis.longTermTasks,
        confidence: analysis.confidence,
        rawModelText: analysis.rawModelText,
      });

      console.info("Queue consumer completed job:", { jobId: job.jobId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown processing error.";

      saveRecommendation({
        id: existing?.id ?? job.jobId,
        jobId: job.jobId,
        createdAt: existing?.createdAt ?? job.timestamp,
        plantId: job.plantId,
        notes: job.notes,
        imageDataUrl:
          existing?.imageDataUrl ?? `data:${job.mimeType};base64,${job.imageData}`,
        status: "failed",
        summary: "Image analysis failed.",
        healthIssues: [],
        pests: [],
        nearTermTasks: [],
        longTermTasks: [],
        error: errorMessage,
      });

      console.error("Queue consumer failed job:", {
        jobId: job.jobId,
        error: errorMessage,
      });

      throw error;
    }
  }

  return Response.json({ success: true, processed: jobs.length });
}