import { listRecentRecommendations } from "@/lib/recommendationStore";

export async function GET() {
  const recommendations = listRecentRecommendations(50);
  return Response.json({
    success: true,
    count: recommendations.length,
    recommendations,
  });
}
