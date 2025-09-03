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

    const system = `You are a precise analyst answering questions using ONLY the provided invoices JSON.
- Compute dates based on today's date.
- Use $ for USD if currency missing.
- Keep answers concise and include a short breakdown when useful.`

    const { text } = await generateText({
      model: models.text,
      system,
      prompt: `Invoices JSON:\n${JSON.stringify(invoices, null, 2)}\n\nQuestion: ${question}\nAnswer carefully and, when listing invoices, include vendor and invoice_number.`,
    })

    return NextResponse.json<QueryResponse>({ answer: text })
  } catch (error: any) {
    return NextResponse.json<QueryResponse>({ answer: `Error: ${error?.message || "Unknown error"}` }, { status: 500 })
  }
}
