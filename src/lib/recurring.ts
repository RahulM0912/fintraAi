// Pure date helpers for recurring rules. No DB access — safe to import anywhere.

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * The most recent occurrence of `dayOfMonth` that falls on or before `today`.
 * Used both to seed a new rule's last_run_date (so it doesn't back-post the
 * current period) and to decide whether a transaction is due.
 */
export function lastDueOnOrBefore(today: Date, dayOfMonth: number): string {
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dayOfMonth)
  const due =
    thisMonth <= today
      ? thisMonth
      : new Date(today.getFullYear(), today.getMonth() - 1, dayOfMonth)
  return ymd(due)
}

/** The next occurrence of `dayOfMonth` strictly after the given YYYY-MM-DD. */
export function nextDueAfter(dateStr: string, dayOfMonth: number): string {
  const [y, m] = dateStr.split("-").map(Number) // m is 1-based
  // new Date(y, m, dom) → month index m === (m-1)+1, i.e. the following month.
  return ymd(new Date(y, m, dayOfMonth))
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
