import { send } from "@vercel/queue";
import { saveRecommendation } from "@/lib/recommendationStore";
import type { IngestRequestPayload } from "@/lib/types";

const MAX_IMAGE_CHARS = Number(process.env.MAX_IMAGE_BASE64_CHARS ?? 7_000_000);

function sanitizeBase64Image(imageValue: string): {
  mimeType: string;
  base64Data: string;
  imageDataUrl: string;
} {
  const trimmed = imageValue.trim();
  const dataUrlMatch = trimmed.match(/^data:([\w.+/-]+);base64,(.+)$/i);

  if (dataUrlMatch && dataUrlMatch[2]) {
    const mimeType = dataUrlMatch[1] || "image/jpeg";
    const base64Data = dataUrlMatch[2];
    return {
      mimeType,
      base64Data,
      imageDataUrl: `data:${mimeType};base64,${base64Data}`,
    };
  }

  return {
    mimeType: "image/jpeg",
    base64Data: trimmed,
    imageDataUrl: `data:image/jpeg;base64,${trimmed}`,
  };
}

function isLikelyBase64(value: string): boolean {
  return /^[A-Za-z0-9+/=\r\n]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const expectedToken = process.env.INGEST_SHARED_TOKEN;
    if (expectedToken) {
      const token = request.headers.get("x-ingest-token");
      if (token !== expectedToken) {
        return Response.json(
          { success: false, error: "Unauthorized ingest token." },
          { status: 401 },
        );
      }
    }

    const body = (await request.json()) as Partial<IngestRequestPayload>;
    if (typeof body.image !== "string" || !body.image.trim()) {
      return Response.json(
        { success: false, error: "Request must include a non-empty 'image' string." },
        { status: 400 },
      );
    }

    const { base64Data, mimeType, imageDataUrl } = sanitizeBase64Image(body.image);
    if (!isLikelyBase64(base64Data)) {
      return Response.json(
        { success: false, error: "Image data must be base64 encoded." },
        { status: 400 },
      );
    }

    if (base64Data.length > MAX_IMAGE_CHARS) {
      return Response.json(
        {
          success: false,
          error: `Image too large. Max base64 size is ${MAX_IMAGE_CHARS} characters.`,
        },
        { status: 413 },
      );
    }

    const timestamp = new Date().toISOString();
    const jobId = crypto.randomUUID();

    saveRecommendation({
      id: jobId,
      jobId,
      createdAt: timestamp,
      plantId: body.plantId,
      notes: body.notes,
      imageDataUrl,
      status: "queued",
      summary: "Image queued for analysis.",
      healthIssues: [],
      pests: [],
      nearTermTasks: [],
      longTermTasks: [],
    });

    await send("image-processing", {
      jobId,
      imageData: base64Data,
      mimeType,
      timestamp,
      plantId: body.plantId,
      notes: body.notes,
    });

    return Response.json({
      success: true,
      message: "Image queued for processing.",
      jobId,
      timestamp,
    });
  } catch (error) {
    console.error("Ingest queue error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to queue image.",
      },
      { status: 500 },
    );
  }
}