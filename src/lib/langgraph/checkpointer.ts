import { MemorySaver } from "@langchain/langgraph";

// Single in-process checkpointer used by the compiled graph.
// Sufficient for development and single-instance deployments — for horizontal
// scaling, swap for a Postgres / Redis checkpointer.
let _checkpointer: MemorySaver | null = null;

export function getCheckpointer(): MemorySaver {
  if (!_checkpointer) _checkpointer = new MemorySaver();
  return _checkpointer;
}
