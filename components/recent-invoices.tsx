"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Invoice } from "@/types/invoice"
import { cn } from "@/lib/utils"
import { FileText, Calendar, DollarSign } from "lucide-react"
import { formatDateUS } from "@/lib/date" // import deterministic formatter
import { Button } from "@/components/ui/button"

type Props = {
  invoices: Invoice[]
  className?: string
}

function formatCurrency(n: number | null | undefined) {
  const val = Number(n ?? 0)
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function displayVendorName(v?: string) {
  if (!v) return "Unknown"
  const s = v.trim().replace(/^[\s.,\-:;]+/, "")
  return s
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

export default function RecentInvoices({ invoices, className }: Props) {
  return (
    <Card className={cn("border-emerald-200/60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-balance">
          {/* small green document icon feel */}
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          Recent Invoices
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[420px] pr-2">
          <div className="flex flex-col gap-3">
            {invoices.length === 0 && (
              <div className="text-sm text-muted-foreground">No invoices yet. Upload or load samples to begin.</div>
            )}

            {invoices.map((inv) => (
              <div key={inv.id} className="rounded-xl border bg-card shadow-sm hover:shadow transition-shadow p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <FileText className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <div className="text-base font-semibold leading-tight">{displayVendorName(inv.vendor)}</div>
                      <div className="text-xs text-muted-foreground leading-tight">{inv.invoice_number}</div>
                      <div className="mt-3 flex items-center gap-6 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-foreground/70" aria-hidden />
                          <span>Total Amount</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-foreground/70" aria-hidden />
                          <span>Due Date</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {/* yellow 'pending' pill */}
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                      pending
                    </Badge>
                    <div className="text-2xl font-bold tabular-nums">{formatCurrency(inv.total)}</div>
                    <div className="text-sm text-muted-foreground">{formatDateUS(inv.due_date)}</div>
                    {inv.previewUrl ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const w = window.open()
                          if (w)
                            w.document.write(
                              `<iframe src="${inv.previewUrl}" style="width:100%;height:100%;border:0"></iframe>`,
                            )
                        }}
                        className="mt-1"
                      >
                        Preview
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
