export type ParsedInvoice = {
  vendor: string
  invoice_number?: string
  invoice_date?: string // ISO
  due_date?: string // ISO
  total?: number
}

const DATE_RE =
  /(?:(?:invoice\s*date|inv\s*date|date)\s*[:-]?\s*)?(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
const DUE_RE = /(?:due\s*date|due)\s*[:-]?\s*(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
const INV_NUM_RE = /(invoice\s*(?:no\.?|number|#)?\s*[:-]?\s*([A-Z]{0,4}-?\d{2,}))/i
const INV_FALLBACK_RE = /(INV[\s-]?\d{2,})/i

// Match lines containing 'Total' but not 'Subtotal' or 'Tax'
const TOTAL_LINE_RE = /^(?!.*sub\s*total)(?=.*total)(?!.*tax).*$/i
const MONEY_RE = /(?:\$|USD\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/g

function toISO(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined
  const s = dateStr.replace(/\./g, "/").replace(/-/g, "/")
  const parts = s.split("/")
  // YYYY/MM/DD
  if (parts[0].length === 4) {
    const [y, m, d] = parts.map((p) => Number.parseInt(p, 10))
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(Date.UTC(y, m - 1, d)).toISOString()
    }
  }
  // MM/DD/YYYY vs DD/MM/YYYY (prefer MM/DD unless unambiguous DD>12)
  if (parts.length === 3) {
    const [a, b, c] = parts
    const A = Number.parseInt(a, 10)
    const B = Number.parseInt(b, 10)
    const C = Number.parseInt(c, 10)
    if (!isNaN(A) && !isNaN(B) && !isNaN(C)) {
      const year = C < 100 ? 2000 + C : C
      let mm = A
      let dd = B
      if (A > 12 && B <= 12) {
        mm = B
        dd = A
      }
      return new Date(Date.UTC(year, mm - 1, dd)).toISOString()
    }
  }
  const t = Date.parse(s)
  return isNaN(t) ? undefined : new Date(t).toISOString()
}

const VENDOR_SUFFIX_RE =
  /([A-Z][A-Za-z&'.-]+(?:\s+[A-Z][A-Za-z&'.-]+){0,5})\s+(Inc\.?|LLC|L\.?L\.?C\.?|Ltd\.?|Co\.?|Company|Corp\.?|Corporation)\b/i

function normalizeCompanySuffix(s: string) {
  const t = s.replace(/\s+/g, "").toLowerCase()
  if (t === "inc" || t === "inc.") return "Inc."
  if (t === "llc" || t === "l.l.c." || t === "llc.") return "LLC"
  if (t === "ltd" || t === "ltd.") return "Ltd."
  if (t === "co" || t === "co.") return "Co."
  if (t === "corp" || t === "corp.") return "Corp."
  if (t === "company") return "Company"
  if (t === "corporation") return "Corporation"
  return s
}

function titleCaseName(s: string) {
  return s
    .split(/\s+/)
    .map((w) => {
      const u = w.toUpperCase()
      if (["LLC", "L.L.C.", "INC", "INC.", "LTD", "CO.", "CO", "CORP", "USA"].includes(u)) return u
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(" ")
}

function isHeaderNoise(line: string) {
  return (
    /^(invoice|total|subtotal|tax|amount|balance|bill\s*to|ship\s*to|date|due|p\.?o\.?)/i.test(line) || /\d/.test(line) // skip address/numbered lines
  )
}

function cleanLine(line: string) {
  // Remove stray symbols from OCR (e.g., ". vos @ R")
  return line
    .replace(/[^A-Za-z0-9&'.\-()\s]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function pickLikelyVendor(lines: string[], fullText: string): string {
  // 1) Prefer "Company Suffix" pattern before 'Bill To'/'Ship To'
  const headerSlice = fullText.split(/Bill\s*To|Ship\s*To/i)[0] || fullText
  const m = headerSlice.match(VENDOR_SUFFIX_RE)
  if (m) {
    const name = titleCaseName(cleanLine(m[1]))
    const suffix = normalizeCompanySuffix(m[2])
    return `${name} ${suffix}`.trim()
  }

  // 2) Score top lines (first 12) excluding obvious noise
  const top = lines
    .slice(0, 12)
    .map((l) => cleanLine(l))
    .filter((l) => l.length >= 3 && !isHeaderNoise(l))

  // direct suffix in line
  const weighted = top.find((l) => /(inc\.?|llc|ltd|company|co\.?|corp\.?|corporation)\b/i.test(l))
  if (weighted) {
    // Ensure decent casing
    const parts = weighted.match(/^(.*?)(\s+(Inc\.?|LLC|L\.?L\.?C\.?|Ltd\.?|Co\.?|Company|Corp\.?|Corporation))\b/i)
    if (parts) {
      return `${titleCaseName(parts[1].trim())} ${normalizeCompanySuffix(parts[3])}`
    }
    return titleCaseName(weighted)
  }

  // 3) Fallback: choose the most "title-cased" line before any "INVOICE"
  const invoiceIdx = top.findIndex((l) => /invoice\b/i.test(l))
  const pool = invoiceIdx > 0 ? top.slice(0, Math.max(1, invoiceIdx)) : top

  let best = pool[0] || "Unknown Vendor"
  let bestScore = -1
  for (const l of pool) {
    const words = l.split(/\s+/)
    const titleish = words.filter((w) => /^[A-Z][a-z]+$/.test(w)).length
    const score = titleish * 2 + (/[A-Z]{3,}/.test(l) ? 1 : 0) - (/\d/.test(l) ? 2 : 0)
    if (score > bestScore) {
      bestScore = score
      best = l
    }
  }
  return titleCaseName(best)
}

function parseTotal(lines: string[]): number | undefined {
  // Placeholder for parseTotal implementation
  return undefined
}

export function parseInvoiceText(raw: string): ParsedInvoice {
  const text = raw.replace(/\r/g, "")
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  const vendor = pickLikelyVendor(lines, text)

  let invoice_number: string | undefined
  const m1 = text.match(INV_NUM_RE)
  if (m1?.[2]) invoice_number = m1[2].toUpperCase()
  if (!invoice_number) {
    const m2 = text.match(INV_FALLBACK_RE)
    if (m2) invoice_number = m2[1].toUpperCase().replace(/\s+/g, "")
  }

  const due = text.match(DUE_RE)
  const invd = text.match(DATE_RE)
  const due_date = due ? toISO(due[1]) : undefined
  const invoice_date = invd ? toISO(invd[1]) : undefined

  const total = parseTotal(lines)

  return { vendor, invoice_number, invoice_date, due_date, total }
}
