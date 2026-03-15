// app/api/ingest/route.ts
import { send } from "@vercel/queue";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    await send("image-processing", {
      imageData: body.image,
      timestamp: new Date().toISOString(),
    });
    
    return Response.json({ success: true, message: "Queued" });
  } catch (error) {
    // --- CHANGE THIS PART ---
    console.error("DEBUG QUEUE ERROR:", error); 
    return Response.json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}