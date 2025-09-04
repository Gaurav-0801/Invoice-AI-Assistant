// app/api/parse/route.ts
import { type NextRequest, NextResponse } from "next/server"
import type { Invoice, ParseResult } from "@/types/invoice"
import { upsertInvoice } from "@/lib/store"
import { parseInvoiceFromImageDataUrl, parseInvoiceFromText } from "@/lib/openai"
import { revalidatePath } from "next/cache"

async function pdfToText(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist")
  // @ts-ignore
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

function sanitizeDate(date?: string | null): string {
  return date?.trim() || "" // always return a string
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const previewDataUrl = form.get("previewDataUrl")?.toString()
    const filenameField = form.get("filename")?.toString()
    const textField = form.get("text")

    // Case 1: direct OCR text
    if (typeof textField === "string" && textField.trim().length > 0) {
      const parsed = await parseInvoiceFromText(textField)
      const invoice: Invoice = {
        id: `${parsed.vendor || "unknown"}__${parsed.invoice_number || Date.now()}`,
        vendor: parsed.vendor || "Unknown",
        invoice_number: parsed.invoice_number || "",
        invoice_date: sanitizeDate(parsed.invoice_date),
        due_date: sanitizeDate(parsed.due_date),
        total: Number(parsed.total ?? 0),
        subtotal: parsed.subtotal ?? null,
        tax: parsed.tax ?? null,
        currency: parsed.currency || "USD",
        line_items: Array.isArray(parsed.line_items)
          ? parsed.line_items.map((li) => ({
              description: li.description ?? "",
              qty: li.qty ?? null,
              unit_price: li.unit_price ?? null,
              amount: li.amount ?? null,
            }))
          : [],
        source: { filename: filenameField, contentType: "text/plain", kind: "text" },
        previewUrl: previewDataUrl,
      }
      await upsertInvoice(invoice)
      revalidatePath("/")
      return NextResponse.json<ParseResult>({ ok: true, invoice })
    }

    // Case 2: file upload
    const file = form.get("file") as File | null
    if (!file) {
      return NextResponse.json<ParseResult>({ ok: false, error: "No file or text provided." }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const contentType = file.type || ""
    const head = new Uint8Array(arrayBuffer.slice(0, 8))
    const ct = contentType.toLowerCase()
    const isPdf =
      ct.includes("pdf") ||
      (head.length >= 4 && head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) ||
      file.name.toLowerCase().endsWith(".pdf")

    // Case 2a: PDF
    if (isPdf) {
      const text = await pdfToText(arrayBuffer)
      if (!text.trim()) {
        return NextResponse.json<ParseResult>({ ok: false, error: "Could not extract text from PDF." }, { status: 400 })
      }
      const parsed = await parseInvoiceFromText(text)
      const invoice: Invoice = {
        id: `${parsed.vendor || "unknown"}__${parsed.invoice_number || Date.now()}`,
        vendor: parsed.vendor || "Unknown",
        invoice_number: parsed.invoice_number || "",
        invoice_date: sanitizeDate(parsed.invoice_date),
        due_date: sanitizeDate(parsed.due_date),
        total: Number(parsed.total ?? 0),
        subtotal: parsed.subtotal ?? null,
        tax: parsed.tax ?? null,
        currency: parsed.currency || "USD",
        line_items: Array.isArray(parsed.line_items)
          ? parsed.line_items.map((li) => ({
              description: li.description ?? "",
              qty: li.qty ?? null,
              unit_price: li.unit_price ?? null,
              amount: li.amount ?? null,
            }))
          : [],
        source: { filename: file.name, contentType: "application/pdf", kind: "pdf" },
        previewUrl: previewDataUrl,
      }
      await upsertInvoice(invoice)
      revalidatePath("/")
      return NextResponse.json<ParseResult>({ ok: true, invoice })
    }

    // Case 2b: Image
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const ext = file.name.toLowerCase().endsWith(".png") ? "png" : "jpeg"
    const dataUrl = `data:image/${ext};base64,${base64}`
    const parsed = await parseInvoiceFromImageDataUrl(dataUrl)
    const invoice: Invoice = {
      id: `${parsed.vendor || "unknown"}__${parsed.invoice_number || Date.now()}`,
      vendor: parsed.vendor || "Unknown",
      invoice_number: parsed.invoice_number || "",
      invoice_date: sanitizeDate(parsed.invoice_date),
      due_date: sanitizeDate(parsed.due_date),
      total: Number(parsed.total ?? 0),
      subtotal: parsed.subtotal ?? null,
      tax: parsed.tax ?? null,
      currency: parsed.currency || "USD",
      line_items: Array.isArray(parsed.line_items)
        ? parsed.line_items.map((li) => ({
            description: li.description ?? "",
            qty: li.qty ?? null,
            unit_price: li.unit_price ?? null,
            amount: li.amount ?? null,
          }))
        : [],
      source: { filename: file.name, contentType: contentType || `image/${ext}`, kind: "image" },
      previewUrl: previewDataUrl || dataUrl,
    }
    await upsertInvoice(invoice)
    revalidatePath("/")
    return NextResponse.json<ParseResult>({ ok: true, invoice })
  } catch (error: any) {
    return NextResponse.json<ParseResult>({ ok: false, error: error?.message || "Unknown error" }, { status: 500 })
  }
}
