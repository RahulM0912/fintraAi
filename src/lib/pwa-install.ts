// PWA install plumbing. This module lives at module scope on purpose:
// `beforeinstallprompt` fires once, shortly after the first page load —
// long before the settings UI mounts. PwaInit (root layout) imports this
// file so the listener is attached from the very first load, whichever
// route that is. SPA navigations never re-fire the event.

export type InstallState = "installed" | "installable" | "ios" | "unsupported"

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Chrome would otherwise show its own mini-infobar on mobile
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener("appinstalled", () => {
    installed = true
    deferredPrompt = null
    notify()
  })
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's non-standard flag
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    // iPadOS reports itself as Macintosh but is the only "Mac" with touch
    (ua.includes("Macintosh") && window.navigator.maxTouchPoints > 1)
  )
}

export function getInstallState(): InstallState {
  if (installed || isStandalone()) return "installed"
  if (deferredPrompt) return "installable"
  if (isIOS()) return "ios"
  return "unsupported"
}

export function subscribeInstallState(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const ev = deferredPrompt
  if (!ev) return "unavailable"
  await ev.prompt()
  const { outcome } = await ev.userChoice
  // The event is single-use; on accept, `appinstalled` follows and flips state
  if (outcome === "accepted") deferredPrompt = null
  notify()
  return outcome
}
