// CLI: OCR local images with Tesseract and answer a question with OpenAI

import { readFile } from "node:fs/promises"
import path from "node:path"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

type Invoice = {
  vendor: string
  invoice_number: string
  invoice_date: string
  due_date: string
  total: number
}

async function ocrImage(filePath: string): Promise<string> {
  const { createWorker } = await import("tesseract.js")
  const worker = await createWorker("eng")
  try {
    const buf = await readFile(filePath)
    const { data } = await worker.recognize(buf)
    return data.text || ""
  } finally {
    await worker.terminate()
  }
}

async function structure(text: string): Promise<Invoice | null> {
  const system =
    "Extract invoice fields as strict JSON (vendor, invoice_number, invoice_date YYYY-MM-DD, due_date YYYY-MM-DD, total number). Output only JSON."
  const { text: out } = await generateText({
    model: openai("gpt-4o-mini"),
    system,
    prompt: `Raw invoice text:\n---\n${text}\n---\nReturn only JSON.`,
  })
  const match = out.match(/(\{[\s\S]*\})/)
  if (!match) return null
  return JSON.parse(match[1])
}

async function main() {
  const args = process.argv.slice(2)
  const qIndex = args.indexOf("--q")
  const files = (qIndex >= 0 ? args.slice(0, qIndex) : args).filter(Boolean)
  const question = qIndex >= 0 ? args.slice(qIndex + 1).join(" ") : "How many invoices are due in the next 7 days?"

  const parsed: Invoice[] = []
  for (const f of files) {
    const ext = path.extname(f).toLowerCase()
    if (![".png", ".jpg", ".jpeg"].includes(ext)) {
      console.log(`[v0] Skipping unsupported file: ${f}`)
      continue
    }
    const text = await ocrImage(f)
    const inv = await structure(text)
    if (inv) parsed.push(inv)
  }

  const { text: answer } = await generateText({
    model: openai("gpt-4o-mini"),
    system: "Answer using only the provided invoices JSON.",
    prompt: `Invoices JSON:\n${JSON.stringify(parsed, null, 2)}\n\nQuestion: ${question}`,
  })

  console.log("Invoices:", JSON.stringify(parsed, null, 2))
  console.log("Answer:", answer)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
