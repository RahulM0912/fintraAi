"use client"

import { useCallback, useEffect, useState } from "react"
import { KeyRound, Infinity as InfinityIcon } from "lucide-react"
import { toast } from "sonner"
import { findProvider } from "@/lib/aiModels"
import type { ModelProvider } from "@/lib/langgraph/types"
import { AiKeyModal } from "@/components/settings/AiKeyModal"

interface AiState {
  managed: boolean
  provider: ModelProvider
  modelName: string
  keyLast4: string | null
}
interface Quota {
  used: number
  limit: number
  remaining: number
}
interface SettingsResponse {
  ai: AiState
  quota: Quota
}

function modelLabel(provider: string, modelName: string): string {
  const m = findProvider(provider)?.models.find((x) => x.id === modelName)
  if (m) return m.label
  // Managed default / unknown id → prettify the tail.
  return modelName.split("/").pop() ?? modelName
}

// Fine under 80% (evergreen); clay from 80% up — the caption carries the words.
function meterColor(pct: number): string {
  if (pct >= 80) return "var(--neg)"
  return "var(--brand)"
}

export function AiSettingsSection() {
  const [data, setData] = useState<SettingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings")
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  async function removeKey() {
    setRemoving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeKey: true }),
      })
      if (!res.ok) throw new Error()
      toast.success("Key removed — back to the free managed model")
      fetchSettings()
    } catch {
      toast.error("Couldn't remove the key")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <section className="border-t border-[var(--hairline)] pt-6">
      <h2 className="mb-5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
        AI assistant
      </h2>

      {loading ? (
        <div className="space-y-3">
          <div className="h-10 rounded-xl bg-[var(--surface-2)] animate-pulse" />
          <div className="h-10 rounded-xl bg-[var(--surface-2)] animate-pulse" />
        </div>
      ) : !data ? (
        <p className="py-2 text-sm text-[var(--ink-3)]">Couldn&apos;t load AI settings.</p>
      ) : data.ai.managed ? (
        <>
          {/* Managed tier — quota meter */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--ink)]">Managed model</p>
              <p className="text-xs text-[var(--ink-3)] mt-0.5">
                Free tier, no setup. {data.quota.remaining} of {data.quota.limit} messages left this month.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--ink-2)]">
              {modelLabel(data.ai.provider, data.ai.modelName)}
            </span>
          </div>

          <QuotaMeter used={data.quota.used} limit={data.quota.limit} />

          <div className="my-4 h-px bg-[var(--hairline)]" />

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--ink)]">Bring your own key</p>
              <p className="text-xs text-[var(--ink-3)] mt-0.5">
                Use your own OpenRouter or Gemini key for unlimited usage on any model.
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="cursor-pointer shrink-0 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--hairline-strong)] px-4 text-[13px] font-medium text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--ink-3)]"
            >
              <KeyRound className="h-3.5 w-3.5" /> Add key
            </button>
          </div>
        </>
      ) : (
        <>
          {/* BYO tier */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--ink)]">
                <InfinityIcon className="h-4 w-4 text-[var(--brand)]" /> Unlimited — your key
              </p>
              <p className="text-xs text-[var(--ink-3)] mt-0.5">
                {findProvider(data.ai.provider)?.label ?? data.ai.provider} ·{" "}
                {modelLabel(data.ai.provider, data.ai.modelName)} · key ••••{data.ai.keyLast4}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--brand-bg)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
              Active
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="cursor-pointer rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Change key or model
            </button>
            <button
              onClick={removeKey}
              disabled={removing}
              className="cursor-pointer rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-3)] hover:text-[var(--neg)] hover:border-[var(--neg)] transition-colors disabled:opacity-60"
            >
              {removing ? "Removing..." : "Remove"}
            </button>
          </div>
        </>
      )}

      <AiKeyModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={fetchSettings}
        current={data && !data.ai.managed ? { provider: data.ai.provider, modelName: data.ai.modelName } : null}
      />
    </section>
  )
}

function QuotaMeter({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="mt-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: meterColor(pct) }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--ink-3)]">
        {used} / {limit} used · resets monthly
      </p>
    </div>
  )
}
