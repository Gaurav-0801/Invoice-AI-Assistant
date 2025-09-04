import UploadCard from "@/components/upload-card"
import InvoiceTable from "@/components/invoice-table"
import QAChat from "@/components/qa-chat"
import { getInvoices, seedInvoices } from "@/lib/store"
import RecentInvoices from "@/components/recent-invoices"
import type { Invoice } from "@/types/invoice"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const samples: Invoice[] = [
    {
      id: "Amazon__INV-001",
      vendor: "Amazon",
      invoice_number: "INV-001",
      invoice_date: "2025-08-20",
      due_date: "2025-09-05",
      total: 2450.0,
      subtotal: null,
      tax: null,
      currency: "USD",
      line_items: [],
      source: { filename: "blue-invoice.png", contentType: "image/png", kind: "image" },
    },
    {
      id: "Microsoft__INV-0043",
      vendor: "Microsoft",
      invoice_number: "INV-0043",
      invoice_date: "2025-08-25",
      due_date: "2025-09-10",
      total: 3100.0,
      subtotal: null,
      tax: null,
      currency: "USD",
      line_items: [],
      source: { filename: "green-invoice.png", contentType: "image/png", kind: "image" },
    },
  ]

  // ✅ Await DB calls
  await seedInvoices(samples)
  const invoices = await getInvoices()

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-balance">
            Invoice AI Assistant
          </h1>
          <p className="text-muted-foreground">
            Upload invoices (PDF or image), extract fields, and ask natural-language questions.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadCard />
        <QAChat />
      </div>

      <RecentInvoices invoices={invoices} />

      <InvoiceTable invoices={invoices} />
    </main>
  )
}
