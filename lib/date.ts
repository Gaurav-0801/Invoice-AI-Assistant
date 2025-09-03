export function toISODate(input: string): string | null {
  // Normalize a variety of date formats to YYYY-MM-DD
  const d = new Date(input)
  if (isNaN(d.getTime())) return null
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function isDueWithinDays(dateISO: string, days: number): boolean {
  const now = new Date()
  const due = new Date(dateISO)
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= days
}

export function formatDateUS(input: string | Date | null | undefined): string {
  if (!input) return "-"
  const d = typeof input === "string" ? new Date(input) : input
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
}
