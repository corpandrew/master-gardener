import { listRecentRecommendations } from "@/lib/recommendationStore";

function taskListOrFallback(tasks: string[], keyPrefix: string) {
  if (tasks.length === 0) {
    return <li className="text-sm text-zinc-500">No tasks yet.</li>;
  }

  return tasks.map((task, index) => (
    <li key={`${keyPrefix}-${index}`} className="text-sm">
      {task}
    </li>
  ));
}

export default function Home() {
  const recommendations = listRecentRecommendations(20);

  return (
    <div className="min-h-screen bg-linear-to-b from-emerald-50 to-white px-6 py-10 text-zinc-900 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-100 sm:px-10">
      <main className="mx-auto w-full max-w-5xl">
        <header className="mb-8 rounded-2xl border border-emerald-100 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Master Gardener Assistant
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300 sm:text-base">
            Raspberry Pi images are queued on Vercel and analyzed by Gemini Flash.
            Review plant health signals and next actions below.
          </p>
        </header>

        {recommendations.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-xl font-semibold">No recommendations yet</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Send your first image from the Raspberry Pi to `POST /api/ingest` and
              refresh this page.
            </p>
          </section>
        ) : (
          <section className="grid gap-4">
            {recommendations.map((recommendation) => (
              <article
                key={recommendation.jobId}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Job {recommendation.jobId}
                    </p>
                    <h2 className="text-lg font-semibold">{recommendation.summary}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase dark:bg-zinc-800">
                      {recommendation.status}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(recommendation.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {recommendation.imageDataUrl ? (
                  <img
                    src={recommendation.imageDataUrl}
                    alt={`Plant capture ${recommendation.jobId}`}
                    className="mt-4 h-48 w-full rounded-xl object-cover"
                  />
                ) : null}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      Watering
                    </h3>
                    <p className="mt-1 text-sm">
                      {recommendation.wateringAdvice ?? "Pending analysis."}
                    </p>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      Fertilizing
                    </h3>
                    <p className="mt-1 text-sm">
                      {recommendation.fertilizingAdvice ?? "Pending analysis."}
                    </p>
                  </section>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      Near-term tasks
                    </h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {taskListOrFallback(
                        recommendation.nearTermTasks,
                        `${recommendation.jobId}-near`,
                      )}
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      Long-term tasks
                    </h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {taskListOrFallback(
                        recommendation.longTermTasks,
                        `${recommendation.jobId}-long`,
                      )}
                    </ul>
                  </section>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      Health issues
                    </h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {taskListOrFallback(
                        recommendation.healthIssues,
                        `${recommendation.jobId}-health`,
                      )}
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      Pests
                    </h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {taskListOrFallback(
                        recommendation.pests,
                        `${recommendation.jobId}-pests`,
                      )}
                    </ul>
                  </section>
                </div>

                {recommendation.error ? (
                  <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                    Processing error: {recommendation.error}
                  </p>
                ) : null}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
