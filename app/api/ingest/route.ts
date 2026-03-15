// app/api/ingest/route.ts
import { send } from "@vercel/queue";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Send the image data (or a reference to it) to the 'image-processing' topic
    await send("image-processing", {
      imageData: body.image, // Ensure your Python script sends this key
      timestamp: new Date().toISOString(),
    });
    
    return Response.json({ success: true, message: "Queued" });
  } catch (error) {
    return Response.json({ success: false, error: "Failed to queue" }, { status: 500 });
  }
}