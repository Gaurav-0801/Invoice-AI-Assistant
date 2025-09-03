"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Invoice } from "@/types/invoice"

export default function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  const totalAll = useMemo(() => invoices.reduce((s, x) => s + (Number(x.total) || 0), 0), [invoices])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-balance">Invoices ({invoices.length})</CardTitle>
        <div className="text-sm text-muted-foreground">Total: ${totalAll.toFixed(2)}</div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.vendor}</TableCell>
                <TableCell>{inv.invoice_number}</TableCell>
                <TableCell>{inv.invoice_date}</TableCell>
                <TableCell>{inv.due_date}</TableCell>
                <TableCell className="text-right">${Number(inv.total).toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No invoices yet. Upload one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
