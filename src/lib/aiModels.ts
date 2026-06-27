// Shared, secret-free AI config: the free managed quota and the catalog of
// models a user can pick when they bring their own key. Safe to import on the
// client (the BYO key modal) and the server (validation).

import type { ModelProvider } from "@/lib/langgraph/types";

/** Free managed chat messages per calendar month (no BYO key). */
export const FREE_CHAT_QUOTA = 50;

export interface ByoModel {
  /** Model id passed to the provider SDK. */
  id: string;
  /** Human label shown in the picker. */
  label: string;
}

export interface ByoProvider {
  id: ModelProvider;
  label: string;
  /** Where to get a key + what it looks like. */
  help: string;
  keyUrl: string;
  keyPlaceholder: string;
  models: ByoModel[];
}

export const BYO_PROVIDERS: ByoProvider[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    help: "One key, any model — GPT, Claude, Llama, Gemini.",
    keyUrl: "https://openrouter.ai/keys",
    keyPlaceholder: "sk-or-v1-...",
    models: [
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
      { id: "openai/gpt-4o", label: "GPT-4o" },
      { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5" },
      { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    help: "A platform.openai.com key. Direct, no router.",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-...",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    help: "A Google AI Studio key. Generous free tier.",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyPlaceholder: "AIza...",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
];

export function findProvider(id: string): ByoProvider | undefined {
  return BYO_PROVIDERS.find((p) => p.id === id);
}

/** True if `modelId` is a valid model for `providerId`. */
export function isValidModel(providerId: string, modelId: string): boolean {
  return !!findProvider(providerId)?.models.some((m) => m.id === modelId);
}
