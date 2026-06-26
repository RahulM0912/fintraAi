"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TransactionModal } from "./TransactionModal"
import { Plus } from "lucide-react"

export default function TransactionButtonGroup() {
  const [open, setOpen] = useState(false)
  const [quickInput, setQuickInput] = useState("")

  const handleQuickAdd = () => {
    if (!quickInput.trim()) return;
    // Mock fast expense creation
    console.log("Quick added expense:", quickInput);
    setQuickInput("");
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setOpen(true)}
          className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-lg px-5 shadow-sm hover:-translate-y-px transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Transaction
        </Button>
      </div>

      <TransactionModal
        open={open}
        onOpenChange={setOpen}
        type="expense"
        onSuccess={(created) => {
          console.log("created", created)
        }}
      />
    </>
  )
}
