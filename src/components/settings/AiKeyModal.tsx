"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { BYO_PROVIDERS, findProvider, type ByoProvider } from "@/lib/aiModels"
import type { ModelProvider } from "@/lib/langgraph/types"
import { ChevronDown, Eye, EyeOff, ExternalLink } from "lucide-react"
import { toast } from "sonner"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  /** Prefill when changing an existing key's provider/model. */
  current?: { provider: ModelProvider; modelName: string } | null
}

export function AiKeyModal({ open, onOpenChange, onSaved, current }: Props) {
  const [provider, setProvider] = useState<ByoProvider>(BYO_PROVIDERS[0])
  const [modelId, setModelId] = useState<string>(BYO_PROVIDERS[0].models[0].id)
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [providerOpen, setProviderOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const p = (current && findProvider(current.provider)) || BYO_PROVIDERS[0]
    setProvider(p)
    setModelId(
      current && p.models.some((m) => m.id === current.modelName)
        ? current.modelName
        : p.models[0].id
    )
    setApiKey("")
    setShowKey(false)
  }, [open, current])

  function pickProvider(p: ByoProvider) {
    setProvider(p)
    setModelId(p.models[0].id)
    setProviderOpen(false)
  }

  async function save() {
    const key = apiKey.trim()
    if (key.length < 8) return toast.error("Enter a valid API key")

    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: provider.id, modelName: modelId, apiKey: key }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to save key")
      }
      toast.success("Key saved — unlimited chat unlocked")
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save key")
    } finally {
      setSaving(false)
    }
  }

  const selectedModel = provider.models.find((m) => m.id === modelId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-md rounded-xl bg-[var(--surface)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Bring your own key</DialogTitle>
          <p className="text-sm text-[var(--ink-3)]">
            Use your own provider key for unlimited chat on any model. Your key is
            encrypted and never shown again.
          </p>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Provider */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Provider
            </Label>
            <Popover open={providerOpen} onOpenChange={setProviderOpen}>
              <PopoverTrigger asChild>
                <button className="cursor-pointer flex items-center gap-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-left hover:bg-muted/40 transition-colors">
                  <span>{provider.label}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                {BYO_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pickProvider(p)}
                    className={`cursor-pointer w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors ${
                      provider.id === p.id ? "bg-muted font-medium" : ""
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-[var(--ink-3)]">{provider.help}</p>
          </div>

          {/* Model */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Model
            </Label>
            <Popover open={modelOpen} onOpenChange={setModelOpen}>
              <PopoverTrigger asChild>
                <button className="cursor-pointer flex items-center gap-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-left hover:bg-muted/40 transition-colors">
                  <span>{selectedModel?.label ?? "Select a model"}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                <div className="max-h-52 overflow-y-auto">
                  {provider.models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setModelId(m.id); setModelOpen(false) }}
                      className={`cursor-pointer w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors ${
                        modelId === m.id ? "bg-muted font-medium" : ""
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* API key */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              API key
            </Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider.keyPlaceholder}
                autoComplete="off"
                className="pr-10 rounded-xl font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                aria-label={showKey ? "Hide key" : "Show key"}
                className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <a
              href={provider.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[var(--brand)] hover:underline"
            >
              Get a {provider.label} key <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6"
          >
            {saving ? "Saving..." : "Save key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
