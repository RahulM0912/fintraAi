"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { CommandPalette } from "@/components/common/CommandPalette"
import { TransactionModal } from "@/components/common/TransactionModal"

type QuickAddType = "income" | "expense"
type Prefill = { amount?: number; description?: string }

interface QuickAddContextValue {
  /** Open the Cmd/Ctrl+K command palette */
  openPalette: () => void
  /** Open the add-transaction modal directly, optionally prefilled */
  openAdd: (type?: QuickAddType, prefill?: Prefill) => void
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null)

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext)
  if (!ctx) throw new Error("useQuickAdd must be used within QuickAddProvider")
  return ctx
}

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addType, setAddType] = useState<QuickAddType>("expense")
  const [prefill, setPrefill] = useState<Prefill | undefined>(undefined)

  const openPalette = useCallback(() => setPaletteOpen(true), [])

  const openAdd = useCallback((type: QuickAddType = "expense", pf?: Prefill) => {
    setAddType(type)
    setPrefill(pf)
    setPaletteOpen(false)
    // Let the palette dialog finish closing before the modal opens so Radix
    // focus management doesn't fight over two dialogs at once.
    setTimeout(() => setAddOpen(true), 70)
  }, [])

  // Global Cmd/Ctrl+K toggles the palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <QuickAddContext.Provider value={{ openPalette, openAdd }}>
      {children}

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onQuickAdd={openAdd}
      />

      <TransactionModal
        open={addOpen}
        onOpenChange={setAddOpen}
        type={addType}
        prefill={prefill}
        onSuccess={() => setAddOpen(false)}
      />
    </QuickAddContext.Provider>
  )
}
