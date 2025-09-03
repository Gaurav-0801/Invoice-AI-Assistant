"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function InvoicePreviewDialog({
  previewUrl,
  fileName = "invoice",
  triggerClassName,
}: {
  previewUrl?: string
  fileName?: string
  triggerClassName?: string
}) {
  if (!previewUrl) return null
  const isPdf = previewUrl.startsWith("data:application/pdf") || /\.pdf($|\?)/i.test(previewUrl)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName}>
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-pretty">{fileName}</DialogTitle>
        </DialogHeader>
        <div className="w-full h-[70vh] rounded-md overflow-hidden bg-muted/20">
          {isPdf ? (
            <iframe src={previewUrl} title="Invoice preview pdf" className="w-full h-full border-0" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl || "/placeholder.svg"}
              alt="Invoice preview"
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
