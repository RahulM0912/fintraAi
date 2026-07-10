"use client"

import { useEffect, useRef, useState } from "react"

// ─── Tap-to-confirm for destructive buttons ─────────────────────────────────────
//
// First tap arms the button (it changes to a "tap to confirm" state), second
// tap fires. Arms for a few seconds, then quietly reverts — accidental taps
// die out on their own. Lighter than a confirm dialog and consistent with the
// app's other inline confirmations (chat HITL cards, toast Undo).

export function useTapConfirm(onConfirm: () => void, timeoutMs = 3000) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  function disarm() {
    setArmed(false)
    if (timer.current) clearTimeout(timer.current)
  }

  function trigger() {
    if (armed) {
      disarm()
      onConfirm()
    } else {
      setArmed(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setArmed(false), timeoutMs)
    }
  }

  return { armed, trigger, disarm }
}
