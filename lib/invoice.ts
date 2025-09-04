import { sql } from "./db"
import type { Invoice } from "@/types/invoice"

export async function getInvoices(): Promise<Invoice[]> {
  const rows = await sql`
    SELECT *
    FROM invoices
    ORDER BY created_at DESC
  `
  return rows as unknown as Invoice[]
}

export async function upsertInvoice(inv: Invoice) {
  await sql`
    INSERT INTO invoices (
      id, vendor, invoice_number, invoice_date, due_date, total,
      subtotal, tax, currency, line_items, source, preview_url
    )
    VALUES (
      ${inv.id}, ${inv.vendor}, ${inv.invoice_number}, ${inv.invoice_date}, ${inv.due_date}, ${inv.total},
      ${inv.subtotal}, ${inv.tax}, ${inv.currency},
      ${JSON.stringify(inv.line_items ?? [])}::jsonb,
      ${JSON.stringify(inv.source ?? {})}::jsonb,
      ${inv.previewUrl}
    )
    ON CONFLICT (id) DO UPDATE SET
      vendor = EXCLUDED.vendor,
      invoice_number = EXCLUDED.invoice_number,
      invoice_date = EXCLUDED.invoice_date,
      due_date = EXCLUDED.due_date,
      total = EXCLUDED.total,
      subtotal = EXCLUDED.subtotal,
      tax = EXCLUDED.tax,
      currency = EXCLUDED.currency,
      line_items = EXCLUDED.line_items,
      source = EXCLUDED.source,
      preview_url = EXCLUDED.preview_url
  `
}
