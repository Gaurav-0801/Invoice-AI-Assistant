export type Parsed = {
  vendor?: string
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  total?: number
}

const COMPANY_SUFFIX = /(inc\.?|llc|ltd\.?|co\.?|corp\.?|company|corporation)\b/i
const BAD_LINE =
  /(invoice\b|bill to\b|ship to\b|qty\b|description\b|unit price\b|amount\b|subtotal\b|total\b|sales tax\b|terms|conditions|po\b|p\.?o\.?\b|date\b)/i

function normalize(s: string) {
  return s
    .replace(/[^\p{L}\p{N}\s.\-&']/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function lettersRatio(s: string) {
  const letters = (s.match(/\p{L}/gu) || []).length
  const total = s.replace(/\s+/g, "").length || 1
  return letters / total
}

function isTitleish(s: string) {
  const words = s.split(/\s+/).filter(Boolean)
  if (!words.length) return false
  const caps = words.filter((w) => w[0] === w[0]?.toUpperCase()).length
  return caps / words.length >= 0.6
}

function scoreVendorLine(line: string, idx: number) {
  let score = 0
  if (COMPANY_SUFFIX.test(line)) score += 6
  if (isTitleish(line)) score += 2
  if (lettersRatio(line) > 0.7) score += 2
  const wc = line.split(/\s+/).length
  if (wc >= 2 && wc <= 6) score += 2
  // earlier lines better
  score += Math.max(0, 5 - Math.floor(idx / 3))
  // penalize digits and stray symbols
  const digits = (line.match(/\d/g) || []).length
  if (digits > 0) score -= 3
  if (/[@_/\\]/.test(line)) score -= 2
  if (/^[\W_]+/.test(line)) score -= 2
  return score
}

function tryMergeWithSuffix(lines: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i]
    const nxt = lines[i + 1]
    if (cur && nxt && !COMPANY_SUFFIX.test(cur) && COMPANY_SUFFIX.test(nxt) && !BAD_LINE.test(cur)) {
      out.push(normalize(`${cur} ${nxt}`))
      i++
    } else {
      out.push(cur)
    }
  }
  return out
}

export function pickVendorFromText(text: string, original?: string): string | undefined {
  let lines = text.split(/\r?\n/).map(normalize).filter(Boolean).slice(0, 80)
  // focus on header area before INVOICE/BILL TO blocks
  const cutAt = lines.findIndex((l) => /\b(invoice|bill to|ship to)\b/i.test(l))
  if (cutAt > 0) lines = lines.slice(0, Math.min(cutAt + 1, lines.length))
  lines = tryMergeWithSuffix(lines)

  const candidates = lines
    .filter((l) => !BAD_LINE.test(l))
    .filter((l) => l.length >= 3 && /[A-Za-z]/.test(l))
    .map((l) => l.replace(/^[\s.,\-:;]+/, "")) // strip leading punctuation

  let best = ""
  let bestScore = Number.NEGATIVE_INFINITY
  candidates.forEach((l, i) => {
    const s = scoreVendorLine(l, i)
    if (s > bestScore) {
      bestScore = s
      best = l
    }
  })

  // Fallback: take the line before "INVOICE"
  if ((!best || bestScore < 3) && candidates.length) {
    const i = lines.findIndex((l) => /\bINVOICE\b/i.test(l))
    if (i > 0) {
      const before = lines[i - 1]
      if (before && !BAD_LINE.test(before) && /[A-Za-z]/.test(before)) best = before.replace(/^[\s.,\-:;]+/, "")
    }
  }

  if (best) {
    best = normalize(best).replace(/[.\-:,;]+$/, "")
    // title case
    best = best
      .split(" ")
      .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ")
  }

  // If original already looks valid, keep it
  if (original) {
    const ok =
      COMPANY_SUFFIX.test(original) ||
      (isTitleish(original) && lettersRatio(original) > 0.6 && !/[@]/.test(original) && !BAD_LINE.test(original))
    if (ok && original.length >= 3) return original
  }
  return best || original
}

export function fixInvoiceNumberFromText(text: string, original?: string): string | undefined {
  const all = text.replace(/\s+/g, " ")
  const m =
    all.match(/invoice\s*(?:#|no\.?)\s*[:#]?\s*([A-Za-z]{1,6}[-\s]?\d{1,6})/i) ||
    all.match(/\b([A-Za-z]{1,6}-\d{1,6})\b/)

  let candidate = m ? m[1].replace(/\s+/g, "") : original

  if (candidate) {
    // normalize case
    candidate = candidate.toUpperCase()
    // pad trailing number to 3 digits if only 1-2 digits (common OCR drop: US-01 -> US-001)
    const m2 = candidate.match(/^([A-Z]+-)(\d{1,2})$/)
    if (m2) {
      const [, prefix, num] = m2
      candidate = `${prefix}${num.padStart(3, "0")}`
    }
  }
  return candidate || original
}

export function postProcessParsed(parsed: Parsed, rawText: string): Parsed {
  const vendor = pickVendorFromText(rawText, parsed.vendor)
  const invoice_number = fixInvoiceNumberFromText(rawText, parsed.invoice_number)
  return { ...parsed, vendor, invoice_number }
}
