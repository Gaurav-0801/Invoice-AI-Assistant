// OpenAI client via AI SDK
// Uses OPENAI_API_KEY from environment (server-side only)

import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

const PARSER_MODEL = process.env.OPENAI_MODEL_PARSER || "gpt-4o"
const QA_MODEL = process.env.OPENAI_MODEL_QA || "gpt-4o-mini"

function extractJsonObject(output: string): any {
  const first = output.indexOf("{")
  const last = output.lastIndexOf("}")
  if (first === -1 || last === -1 || last <= first) throw new Error("No JSON object found in model output")
  const slice = output.slice(first, last + 1)
  return JSON.parse(slice)
}

export type ParsedInvoiceShape = {
  vendor?: string
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  currency?: string
  subtotal?: number | null
  tax?: number | null
  total?: number | null
  line_items?: Array<{ description?: string; qty?: number | null; unit_price?: number | null; amount?: number | null }>
}

function normalizeParsed(obj: any): ParsedInvoiceShape {
  const iso = (v?: string) => (v ? new Date(v).toISOString().slice(0, 10) : "")
  const num = (v: any) => (typeof v === "number" ? v : v ? Number(String(v).replace(/[^\d.-]/g, "")) : null)
  const up = (s?: string) => (s ? String(s).trim() : "")
  // Pad invoice numeric tail to 3 if pattern like XX-01
  let inv = up(obj?.invoice_number)
  inv = inv ? inv.toUpperCase() : inv
  inv = inv?.replace(/^(.*?-\s*)(\d{1,2})$/, (_, p1, d) => `${p1}${d.padStart(3, "0")}`) || inv

  return {
    vendor: up(obj?.vendor),
    invoice_number: inv,
    invoice_date: iso(obj?.invoice_date || obj?.date),
    due_date: iso(obj?.due_date),
    currency: up(obj?.currency) || "USD",
    subtotal: num(obj?.subtotal),
    tax: num(obj?.tax),
    total: num(obj?.total),
    line_items: Array.isArray(obj?.line_items) ? obj.line_items : [],
  }
}

const extractionSystem =
  "You are an expert invoice parser. Extract fields as strict JSON only with keys: vendor, invoice_number, invoice_date (ISO YYYY-MM-DD), due_date (ISO), currency, subtotal, tax, total, line_items[{description, qty, unit_price, amount}]. Do not include any additional text."

const imageUserInstruction =
  "Parse this invoice image and return only the JSON. Prefer the business name as vendor (e.g., 'East Repair Inc.')."

const textUserInstruction = "Given the raw text of an invoice, extract fields and return only the JSON per the schema."

export async function parseInvoiceFromImageDataUrl(dataUrl: string): Promise<ParsedInvoiceShape> {
  const { text } = await generateText({
    model: models.parser,
    messages: [
      { role: "system", content: extractionSystem },
      {
        role: "user",
        content: [
          { type: "image", image: dataUrl },
          { type: "text", text: imageUserInstruction },
        ],
      },
    ],
    maxOutputTokens: 350,
    temperature: 0,
  })
  const json = extractJsonObject(text)
  return normalizeParsed(json)
}

export async function parseInvoiceFromText(textContent: string): Promise<ParsedInvoiceShape> {
  const { text } = await generateText({
    model: models.parser,
    system: extractionSystem,
    prompt: `${textUserInstruction}\n\n---\n${textContent}\n---`,
    maxOutputTokens: 350,
    temperature: 0,
  })
  const json = extractJsonObject(text)
  return normalizeParsed(json)
}

export const models = {
  parser: openai(PARSER_MODEL),
  qa: openai(QA_MODEL),
  // Back-compat: 'text' now points to qa (previous imports continue to work)
  text: openai(QA_MODEL),
}

export { generateText }
