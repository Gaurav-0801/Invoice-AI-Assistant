// Types for invoices and parsing responses

export type LineItem = {
  qty: number | null
  description: string
  unit_price: number | null
  amount: number | null
}

export type Invoice = {
  id: string
  vendor: string
  invoice_number: string
  invoice_date: string // YYYY-MM-DD
  due_date: string // YYYY-MM-DD
  total: number
  subtotal?: number | null
  tax?: number | null
  currency?: string // default USD
  line_items?: LineItem[]
  source?: {
    filename?: string
    contentType?: string
    kind: "image" | "pdf" | "text"
  }
}

export type ParseResult = { ok: true; invoice: Invoice } | { ok: false; error: string }

export type QueryRequest = {
  question: string
}

export type QueryResponse = {
  answer: string
  reasoning?: string
}
