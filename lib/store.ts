// lib/store.ts
import type { Invoice } from "@/types/invoice"

const STORAGE_KEY = "invoices"

function load(): Invoice[] {
  if (typeof window === "undefined") return [] // SSR safety
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  } catch {
    return []
  }
}

function save(data: Invoice[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}

let invoices: Invoice[] = load()

export function getInvoices() {
  return invoices
}

export function upsertInvoice(inv: Invoice) {
  const i = invoices.findIndex((x) => x.id === inv.id)
  if (i >= 0) invoices[i] = inv
  else invoices.unshift(inv)
  save(invoices)
}

export function seedInvoices(seed: Invoice[]) {
  const key = (x: Invoice) => `${x.vendor}__${x.invoice_number}`
  const currentKeys = new Set(invoices.map(key))
  seed.forEach((inv) => {
    if (!currentKeys.has(key(inv))) invoices.push(inv)
  })
  save(invoices)
}

export function clearInvoices() {
  invoices = []
  save(invoices)
}
