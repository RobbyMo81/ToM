import { AppConfig } from "../core/config";

export interface BraveResult {
  title: string;
  url: string;
  description: string;
}

export class BraveClient {
  constructor(private readonly config: AppConfig) {}

  async search(query: string, count = 5): Promise<BraveResult[]> {
    if (!this.config.braveApiKey) {
      return [];
    }

    const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("count", String(count));

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": this.config.braveApiKey,
      },
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Brave search failed: ${response.status} ${details}`);
    }

    const payload = (await response.json()) as {
      web?: {
        results?: Array<{
          title?: string;
          url?: string;
          description?: string;
        }>;
      };
    };

    const results = payload.web?.results ?? [];
    return results
      .filter((result) => result.title && result.url)
      .map((result) => ({
        title: result.title as string,
        url: result.url as string,
        description: result.description ?? "",
      }));
  }
}
