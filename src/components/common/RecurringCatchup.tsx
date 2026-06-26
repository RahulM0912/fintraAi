"use client"

import { useEffect, useRef } from "react"

/**
 * Fires once per app load: asks the server to materialize any due recurring
 * transactions, then signals a data refresh if anything was created. Renders
 * nothing. Keeps recurring "auto-post" working without a cron.
 */
export function RecurringCatchup() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    fetch("/api/recurring/run", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.created > 0) window.dispatchEvent(new Event("transaction-added"))
      })
      .catch(() => {})
  }, [])

  return null
}
