import type { GardenRecommendation } from "@/lib/types";

const recommendationsByJobId = new Map<string, GardenRecommendation>();

export function saveRecommendation(
  recommendation: GardenRecommendation,
): GardenRecommendation {
  recommendationsByJobId.set(recommendation.jobId, recommendation);
  return recommendation;
}

export function getRecommendationById(id: string): GardenRecommendation | null {
  for (const recommendation of recommendationsByJobId.values()) {
    if (recommendation.id === id || recommendation.jobId === id) {
      return recommendation;
    }
  }

  return null;
}

export function getRecommendationByJobId(
  jobId: string,
): GardenRecommendation | null {
  return recommendationsByJobId.get(jobId) ?? null;
}

export function listRecentRecommendations(limit = 25): GardenRecommendation[] {
  return [...recommendationsByJobId.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
