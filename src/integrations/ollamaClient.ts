import { type AppConfig } from "../core/config";

interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

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

  async generate(
    messages: OllamaChatMessage[],
    options?: { temperature?: number; numPredict?: number }
  ): Promise<string> {
    const response = await fetch(`${this.config.ollama.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.ollama.chatModel,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature,
          num_predict: options?.numPredict,
        },
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Ollama generation failed: ${response.status} ${details}`);
    }

    const payload = (await response.json()) as {
      message?: {
        content?: string;
      };
      response?: string;
    };

    const text = payload.message?.content ?? payload.response;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error("Ollama generation response did not include message content.");
    }

    return text.trim();
  }
}
