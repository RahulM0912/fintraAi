"use client"

import { useSyncExternalStore } from "react"
import { CheckCircle2, MonitorDown } from "lucide-react"
import { toast } from "sonner"
import {
  getInstallState,
  promptInstall,
  subscribeInstallState,
} from "@/lib/pwa-install"

// Install surface lives here and only here — a settings row the user walks
// to, never a popup. iOS has no install prompt API, so it gets instructions.
export function InstallSection() {
  const state = useSyncExternalStore(
    subscribeInstallState,
    getInstallState,
    () => "unsupported" as const
  )

  async function handleInstall() {
    const outcome = await promptInstall()
    if (outcome === "accepted") {
      toast.success("Fintra installed — find it on your home screen")
    }
  }

  return (
    <section className="border-t border-[var(--hairline)] pt-6">
      <h2 className="mb-5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
        App
      </h2>
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--ink)]">Install Fintra</p>
          <p className="mt-0.5 text-xs text-[var(--ink-3)]">
            {state === "installed" && "You're running the installed app."}
            {state === "installable" &&
              "Add it to your home screen — opens full screen, no browser chrome."}
            {state === "ios" &&
              "In Safari: tap Share, then “Add to Home Screen”."}
            {state === "unsupported" &&
              "Open Fintra in Chrome or Edge to install it as an app."}
          </p>
        </div>
        <div className="shrink-0">
          {state === "installed" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--pos)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Installed
            </span>
          ) : state === "installable" ? (
            <button
              onClick={handleInstall}
              className="cursor-pointer inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--hairline-strong)] px-4 text-sm font-medium text-[var(--ink-2)] transition-colors duration-150 ease-out hover:border-[var(--ink-3)] hover:text-[var(--ink)]"
            >
              <MonitorDown className="h-4 w-4" aria-hidden />
              Install app
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
