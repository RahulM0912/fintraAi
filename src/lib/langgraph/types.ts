export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

// Extensible for future providers: "openai" | "anthropic"
export type ModelProvider = "gemini";

export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: "gemini",
  modelName: "gemini-2.5-flash",
};
