// Generates and persists a per-tab thread ID. The langgraph checkpointer keys
// graph state on this — a fresh thread = fresh conversation.

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newThreadId(): string {
  return randomId();
}
