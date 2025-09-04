// lib/store.ts
import { sql } from "./db"
import type { Invoice } from "@/types/invoice"

/**
 * Fetch all invoices, newest first
 */
export async function getInvoices(): Promise<Invoice[]> {
  const rows = await sql`SELECT * FROM invoices ORDER BY invoice_date DESC`

  // ✅ Convert DB Date objects into strings
  return rows.map((r: any) => ({
    ...r,
    invoice_date:
      r.invoice_date instanceof Date
        ? r.invoice_date.toISOString().slice(0, 10)
        : r.invoice_date,
    due_date:
      r.due_date instanceof Date
        ? r.due_date.toISOString().slice(0, 10)
        : r.due_date,
  }))
}

/**
 * Insert or update an invoice
 */
export async function upsertInvoice(inv: Invoice) {
  await sql`
    INSERT INTO invoices (
      id,
      vendor,
      invoice_number,
      invoice_date,
      due_date,
      total,
      subtotal,
      tax,
      currency,
      source,
      preview_url
    )
    VALUES (
      ${inv.id},
      ${inv.vendor},
      ${inv.invoice_number},
      ${inv.invoice_date},
      ${inv.due_date},
      ${inv.total},
      ${inv.subtotal ?? null},
      ${inv.tax ?? null},
      ${inv.currency ?? "USD"},
      ${JSON.stringify(inv.source)},
      ${inv.previewUrl ?? null}
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
      source = EXCLUDED.source,
      preview_url = EXCLUDED.preview_url
  `
}

/**
 * Remove all invoices (useful for testing)
 */
export async function clearInvoices() {
  await sql`DELETE FROM invoices`
}

/**
 * Seed invoices with an array of samples.
 * Uses upsert so running it multiple times is safe.
 */
export async function seedInvoices(invoices: Invoice[]) {
  for (const inv of invoices) {
    await upsertInvoice(inv)
  }
}
