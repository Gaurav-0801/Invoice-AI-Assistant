// In-memory store for invoices (replace with DB for persistence)

import type { Invoice } from "@/types/invoice"

let invoices: Invoice[] = []

export function getInvoices() {
  return invoices
}

export function upsertInvoice(inv: Invoice) {
  const i = invoices.findIndex((x) => x.id === inv.id)
  if (i >= 0) invoices[i] = inv
  else invoices.unshift(inv)
}

export function seedInvoices(seed: Invoice[]) {
  const key = (x: Invoice) => `${x.vendor}__${x.invoice_number}`
  const currentKeys = new Set(invoices.map(key))
  seed.forEach((inv) => {
    if (!currentKeys.has(key(inv))) invoices.push(inv)
  })
}

export function clearInvoices() {
  invoices = []
}
