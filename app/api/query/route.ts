// Answer questions grounded on current invoices

import { type NextRequest, NextResponse } from "next/server"
import { getInvoices } from "@/lib/store"
import { generateText, models } from "@/lib/openai"
import type { QueryRequest, QueryResponse } from "@/types/invoice"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QueryRequest
    const question = (body.question || "").trim()
    if (!question) {
      return NextResponse.json<QueryResponse>({ answer: "Please provide a question." }, { status: 400 })
    }

    const invoices = getInvoices()
    if (!Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json<QueryResponse>(
        {
          answer:
            "No invoices are stored yet. Upload a PDF or image, or click “Load Sample Invoices”, then ask your question again.",
        },
        { status: 200 },
      )
    }

    const header = ["vendor", "invoice_number", "invoice_date", "due_date", "total"] as const
    const rows = invoices.map((inv) => [
      inv.vendor ?? "",
      inv.invoice_number ?? "",
      inv.invoice_date ?? "",
      inv.due_date ?? "",
      typeof inv.total === "number" ? inv.total : Number(inv.total || 0),
    ])
    // cap to 500 rows to keep prompt small
    const MAX_ROWS = 500
    const csvLines = [
      header.join(","),
      ...rows.slice(0, MAX_ROWS).map((r) => r.map((v) => String(v).replace(/,/g, " ")).join(",")),
    ]
    const csv = csvLines.join("\n")

    // Derived facts
    const todayISO = new Date().toISOString().slice(0, 10)
    const today = new Date(todayISO + "T00:00:00Z")
    const toUSD = (n: number) => `$${n.toFixed(2)}`
    const dayDiff = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / 86400000)

    const totalsByVendor: Record<string, number> = {}
    const dueNext7: Array<{ vendor: string; invoice_number: string; due_date: string; total: number }> = []
    const overdue: Array<{ vendor: string; invoice_number: string; due_date: string; total: number }> = []

    for (const inv of invoices) {
      const vend = inv.vendor || "Unknown"
      const tot = Number(inv.total || 0)
      totalsByVendor[vend] = (totalsByVendor[vend] || 0) + tot
      if (inv.due_date) {
        const dd = new Date(inv.due_date + "T00:00:00Z")
        const delta = dayDiff(today, dd)
        if (delta >= 0 && delta <= 7) {
          dueNext7.push({ vendor: vend, invoice_number: inv.invoice_number || "?", due_date: inv.due_date, total: tot })
        } else if (dd.getTime() < today.getTime()) {
          overdue.push({ vendor: vend, invoice_number: inv.invoice_number || "?", due_date: inv.due_date, total: tot })
        }
      }
    }

    const aggregates = {
      count: invoices.length,
      totals_by_vendor: Object.fromEntries(Object.entries(totalsByVendor).map(([k, v]) => [k, Number(v.toFixed(2))])),
      due_in_next_7_days: dueNext7,
      overdue,
      note: `Totals are USD. Today is ${todayISO}.`,
    }

    const system = `You answer questions ONLY using the provided CSV and aggregates.
Rules:
- Never claim data is missing if rows exist.
- Treat totals as USD and format as $1,234.56.
- For "due in next 7 days", use Today=${todayISO}.
- Be concise and factual. If a value truly isn't present, say so.`

    const prompt = `Context CSV (first ${Math.min(rows.length, MAX_ROWS)} rows):
${csv}

Aggregates (JSON):
${JSON.stringify(aggregates)}

Question: ${question}

Answer using only the CSV/Aggregates above.`

    const { text } = await generateText({
      model: models.qa,
      system,
      prompt,
      maxOutputTokens: 400,
      temperature: 0.2,
    })

    return NextResponse.json<QueryResponse>({ answer: text })
  } catch (error: any) {
    return NextResponse.json<QueryResponse>({ answer: `Error: ${error?.message || "Unknown error"}` }, { status: 500 })
  }
}
