"use client"

import { useEffect } from "react"
// Side effect: pulls pwa-install.ts into the client bundle so its
// module-scope `beforeinstallprompt` listener is attached on first load.
import "@/lib/pwa-install"

export function PwaInit() {
  useEffect(() => {
    // Registration requires a secure context — HTTPS or localhost. On a plain
    // LAN IP (http://192.168.x.x) this no-ops and install is unavailable.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])
  return null
}
