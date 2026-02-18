import { AppConfig } from "../core/config";

export class OllamaClient {
  constructor(private readonly config: AppConfig) {}

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.config.ollama.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.ollama.embedModel,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Ollama embedding failed: ${response.status} ${details}`);
    }

    const payload = (await response.json()) as { embedding?: number[] };
    if (!Array.isArray(payload.embedding)) {
      throw new Error("Ollama embedding response did not include 'embedding'.");
    }

    return payload.embedding;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ollama.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
