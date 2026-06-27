export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export type ModelProvider = "gemini" | "openrouter" | "openai";

export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
}

// OpenRouter per-model pricing (USD per million tokens)
// Source: https://openrouter.ai/models — update when prices change
export const OPENROUTER_MODEL_PRICING: Record<
  string,
  { inputPerMillion: number; outputPerMillion: number }
> = {
  // GPT-4o family (OpenRouter ids)
  "openai/gpt-4o-mini":                    { inputPerMillion: 0.15,  outputPerMillion: 0.60  },
  "openai/gpt-4o":                         { inputPerMillion: 2.50,  outputPerMillion: 10.00 },
  "openai/gpt-oss-20b":                    { inputPerMillion: 0.03,  outputPerMillion: 0.14  },
  // Direct OpenAI ids (BYO openai provider)
  "gpt-4o-mini":                           { inputPerMillion: 0.15,  outputPerMillion: 0.60  },
  "gpt-4o":                                { inputPerMillion: 2.50,  outputPerMillion: 10.00 },
  "gpt-4.1-mini":                          { inputPerMillion: 0.40,  outputPerMillion: 1.60  },
  "gpt-4.1":                               { inputPerMillion: 2.00,  outputPerMillion: 8.00  },
  // Claude family
  "anthropic/claude-haiku-4-5":            { inputPerMillion: 0.80,  outputPerMillion: 4.00  },
  "anthropic/claude-sonnet-4-5":           { inputPerMillion: 3.00,  outputPerMillion: 15.00 },
  "anthropic/claude-opus-4":               { inputPerMillion: 15.00, outputPerMillion: 75.00 },
  // Gemini family
  "google/gemini-flash-1.5":               { inputPerMillion: 0.075, outputPerMillion: 0.30  },
  "google/gemini-2.0-flash-001":           { inputPerMillion: 0.10,  outputPerMillion: 0.40  },
  // Llama
  "meta-llama/llama-3.3-70b-instruct":     { inputPerMillion: 0.12,  outputPerMillion: 0.30  },
};

export function calculateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = OPENROUTER_MODEL_PRICING[modelName];
  if (!pricing) return 0;
  return (
    (inputTokens / 1_000_000) * pricing.inputPerMillion +
    (outputTokens / 1_000_000) * pricing.outputPerMillion
  );
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: "openrouter",
  modelName: "openai/gpt-oss-120b",
};
