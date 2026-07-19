// Minimal service worker — exists for installability, not offline.
// Fintra deliberately caches nothing: a finance dashboard serving stale
// numbers from cache is worse than an honest network error. Modern Chrome
// no longer requires a SW to install, but several browsers and audit tools
// still gate "installable" on a registered SW with a fetch listener.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Intentionally never calls respondWith(): every request hits the network
// through the browser's native path (keeps SSE chat streaming untouched),
// while the listener's presence satisfies installability checks.
self.addEventListener("fetch", () => {});
