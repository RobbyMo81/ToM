interface LineageRunsResponse {
  count: number;
  page?: {
    hasMore?: boolean;
    nextCursor?: string | null;
  };
  runs?: Array<{
    startedAt?: string;
  }>;
}

function ensure(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${body}`);
  }

  return (body ? JSON.parse(body) : {}) as T;
}

async function run(): Promise<void> {
  const baseUrl = (process.env.TOM_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");

  const first = await fetchJson<LineageRunsResponse>(`${baseUrl}/lineage/runs?limit=1&order=desc`);
  ensure(first.count <= 1, "Expected first page count to be <= 1.");
  ensure(Array.isArray(first.runs), "Expected first page to include runs array.");

  const nextCursor = first.page?.nextCursor ?? null;
  const hasMore = first.page?.hasMore ?? false;

  if (!hasMore || !nextCursor) {
    console.log("lineage:smoke PASS (single page available)");
    return;
  }

  const second = await fetchJson<LineageRunsResponse>(
    `${baseUrl}/lineage/runs?limit=1&order=desc&cursor=${encodeURIComponent(nextCursor)}`
  );

  ensure(second.count <= 1, "Expected second page count to be <= 1.");
  ensure(Array.isArray(second.runs), "Expected second page to include runs array.");

  const firstStartedAt = first.runs?.[0]?.startedAt;
  const secondStartedAt = second.runs?.[0]?.startedAt;

  if (firstStartedAt && secondStartedAt) {
    ensure(
      firstStartedAt >= secondStartedAt,
      `Expected descending order across pages. first=${firstStartedAt}, second=${secondStartedAt}`
    );
  }

  console.log("lineage:smoke PASS");
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`lineage:smoke FAIL: ${message}`);
  process.exitCode = 1;
});
