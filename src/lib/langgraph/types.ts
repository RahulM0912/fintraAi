export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

// Supported providers
export type ModelProvider = "gemini" | "openrouter";

export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: "openrouter",
  // OpenRouter free-tier model (requires :free suffix for zero-credit usage)
  modelName: "openai/gpt-oss-120b:free",
};
