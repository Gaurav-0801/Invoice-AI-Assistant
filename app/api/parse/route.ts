// Parse endpoint: Use OpenAI Vision for images; extract text from PDFs with pdfjs-dist,
// then use OpenAI to structure fields into an Invoice.

import { type NextRequest, NextResponse } from "next/server"
import type { Invoice, ParseResult } from "@/types/invoice"
import { upsertInvoice } from "@/lib/store"
import { parseInvoiceText } from "@/lib/parser"

async function pdfToText(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist")
  // @ts-ignore - disable worker in this environment
  const loadingTask = (pdfjs as any).getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  let text = ""
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text +=
      "\n" +
      content.items
        .map((it: any) => (typeof it.str === "string" ? it.str : ""))
        .filter(Boolean)
        .join(" ")
  }
  return text
}

function detectKind(
  filename: string | undefined,
  contentType: string | undefined,
  head: Uint8Array,
): "pdf" | "image" | "unknown" {
  const ct = (contentType || "").toLowerCase()
  const name = (filename || "").toLowerCase()
  if (ct.includes("pdf")) return "pdf"
  if (ct.startsWith("image/")) return "image"
  if (head.length >= 4) {
    if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) return "pdf" // %PDF
    if (head[0] === 0xff && head[1] === 0xd8) return "image" // JPEG
    if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return "image" // PNG
  }
  if (name.endsWith(".pdf")) return "pdf"
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image"
  return "unknown"
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()

    // Allow direct text ingestion (from client-side OCR)
    const textField = form.get("text")
    const filenameField = form.get("filename")?.toString()

    if (typeof textField === "string" && textField.trim().length > 0) {
      const parsed = parseInvoiceText(textField)
      const invoice: Invoice = {
        id: `${parsed.vendor || "unknown"}__${parsed.invoice_number || Date.now()}`,
        vendor: parsed.vendor || "Unknown",
        invoice_number: parsed.invoice_number || "",
        invoice_date: parsed.invoice_date ? parsed.invoice_date.slice(0, 10) : "",
        due_date: parsed.due_date ? parsed.due_date.slice(0, 10) : "",
        total: Number(parsed.total ?? 0),
        subtotal: null,
        tax: null,
        currency: "USD",
        line_items: [],
        source: { filename: filenameField, contentType: "text/plain", kind: "text" },
      }
      upsertInvoice(invoice)
      return NextResponse.json<ParseResult>({ ok: true, invoice })
    }

    const file = form.get("file") as File | null
    if (!file) {
      return NextResponse.json<ParseResult>({ ok: false, error: "No file or text provided." }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const contentType = file.type || ""
    const head = new Uint8Array(arrayBuffer.slice(0, 8))
    const kind = detectKind(file.name, contentType, head)

    if (kind === "pdf") {
      const text = await pdfToText(arrayBuffer)
      if (!text.trim()) {
        return NextResponse.json<ParseResult>({ ok: false, error: "Could not extract text from PDF." }, { status: 400 })
      }
      const parsed = parseInvoiceText(text)
      const invoice: Invoice = {
        id: `${parsed.vendor || "unknown"}__${parsed.invoice_number || Date.now()}`,
        vendor: parsed.vendor || "Unknown",
        invoice_number: parsed.invoice_number || "",
        invoice_date: parsed.invoice_date ? parsed.invoice_date.slice(0, 10) : "",
        due_date: parsed.due_date ? parsed.due_date.slice(0, 10) : "",
        total: Number(parsed.total ?? 0),
        subtotal: null,
        tax: null,
        currency: "USD",
        line_items: [],
        source: { filename: file.name, contentType: "application/pdf", kind: "pdf" },
      }
      upsertInvoice(invoice)
      return NextResponse.json<ParseResult>({ ok: true, invoice })
    }

    if (kind === "image") {
      // Server no longer runs OCR; expect client-side OCR to POST "text"
      return NextResponse.json<ParseResult>(
        { ok: false, error: "For images, run OCR in browser and POST as 'text'." },
        { status: 415 },
      )
    }

    return NextResponse.json<ParseResult>(
      { ok: false, error: `Unsupported file type. name=${file.name} contentType=${contentType || "n/a"}` },
      { status: 400 },
    )
  } catch (error: any) {
    return NextResponse.json<ParseResult>({ ok: false, error: error?.message || "Unknown error" }, { status: 500 })
  }
}
