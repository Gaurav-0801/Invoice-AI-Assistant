// Seed the in-memory store with sample invoices

import { NextResponse } from "next/server"
import { seedInvoices } from "@/lib/store"
import seedData from "@/data/sample-invoices.json"

export async function POST() {
  seedInvoices(seedData as any)
  return NextResponse.json({ ok: true, count: (seedData as any[]).length })
}
