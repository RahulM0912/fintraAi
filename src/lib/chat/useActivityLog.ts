"use client";

import { useCallback, useState } from "react";
import type { ActivityItem } from "./types";

export function useActivityLog() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  const upsert = useCallback(
    (id: string, label: string, status: "active" | "done") => {
      setItems((prev) => {
        const idx = prev.findIndex((item) => item.id === id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { id, label, status };
          return next;
        }
        return [...prev, { id, label, status }];
      });
    },
    []
  );

  const markAllDone = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, status: "done" as const })));
  }, []);

  const markDone = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "done" as const } : item))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const seedThinking = useCallback(
    () => setItems([{ id: "thinking", label: "Thinking...", status: "active" }]),
    []
  );

  return { items, upsert, markAllDone, markDone, clear, seedThinking };
}
