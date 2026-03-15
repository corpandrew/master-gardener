# Master Gardener Assistant

An AI gardening assistant built with Next.js, Vercel Queues, and Gemini Flash.
It accepts images from a Raspberry Pi, processes them asynchronously, and shows recommended next steps in a responsive dashboard.

## Architecture

1. Raspberry Pi captures a plant image.
2. Pi sends `POST /api/ingest` with base64 image payload.
3. Ingest route validates input and enqueues to Vercel queue topic `image-processing`.
4. Queue consumer (`app/api/queues/process-image/route.ts`) calls Gemini for vision analysis.
5. Structured recommendation is stored and shown on the dashboard (`app/page.tsx`).

## API Endpoints

### `POST /api/ingest`

Queues a new image-processing job.

Request JSON:

```json
{
  "image": "<base64-image-or-data-url>",
  "plantId": "front-yard-bed-1",
  "notes": "Leaves look pale after heavy rain"
}
```

Headers:
- `Content-Type: application/json`
- `x-ingest-token: <token>` (required only if `INGEST_SHARED_TOKEN` is configured)

Response:

```json
{
  "success": true,
  "message": "Image queued for processing.",
  "jobId": "uuid",
  "timestamp": "2026-03-15T00:00:00.000Z"
}
```

### `GET /api/recommendations`

Returns recent recommendations for dashboard or client integrations.

## Environment Variables

Copy `.env.example` to `.env.local` and set values:

- `GEMINI_API_KEY`: required for model calls.
- `GEMINI_MODEL`: optional model name, defaults to `gemini-2.0-flash`.
- `GEMINI_ENDPOINT`: optional override for Gemini endpoint.
- `INGEST_SHARED_TOKEN`: optional shared secret for Pi ingest auth.
- `MAX_IMAGE_BASE64_CHARS`: optional safety limit for payload size.

## Local Development

Install dependencies and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to view the gardening dashboard.

## Raspberry Pi Script

Use `pi_capture_and_send.py` to capture a camera image and queue a job.

Requirements on Pi:
- `libcamera-still` available (Raspberry Pi OS camera stack).
- Python package `requests` installed.

Example:

```bash
python3 pi_capture_and_send.py \
  --endpoint https://your-app.vercel.app/api/ingest \
  --plant-id tomato-bed-1 \
  --notes "Lower leaves turning yellow" \
  --token your_shared_token
```

The script captures an image, base64-encodes it, sends it to your endpoint, and retries on network failures with exponential backoff.

## Queue Consumer Notes

- `vercel.json` maps `app/api/queues/process-image/route.ts` to queue topic `image-processing` using trigger `queue/v2beta`.
- The consumer throws on processing failures so queue retries can occur.
- Current recommendation storage is in-memory for development; replace with persistent DB storage for production.
