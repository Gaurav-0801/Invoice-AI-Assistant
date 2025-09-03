"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Props = { onParsed?: () => void }

export default function UploadCard({ onParsed }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seeding, startSeeding] = useTransition()
  const [seeded, setSeeded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const router = useRouter()

  async function ocrImageToText(file: File): Promise<string> {
    const Tesseract = await import("tesseract.js")
    const { data } = await Tesseract.recognize(file, "eng", {
      workerPath: "https://unpkg.com/tesseract.js@v5.1.0/dist/worker.min.js",
      corePath: "https://unpkg.com/tesseract.js-core@v5.0.0/tesseract-core.wasm.js",
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
    } as any)
    return (data?.text || "").trim()
  }

  async function fileToDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error("Preview failed"))
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(file)
    })
  }

  async function handleUpload() {
    const file = selectedFile || fileRef.current?.files?.[0]
    if (!file) {
      setError("Please choose a file (PDF or image).")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const isImageByType = file.type?.startsWith("image/")
      const isImageByName = /\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name || "")
      const isImage = Boolean(isImageByType || isImageByName)

      const previewDataUrl = previewUrl || (await fileToDataUrl(file))

      if (isImage) {
        const text = await ocrImageToText(file)
        if (!text) throw new Error("Could not extract text from image. Try a clearer image.")
        const fd = new FormData()
        fd.append("text", text)
        fd.append("filename", file.name)
        fd.append("previewDataUrl", previewDataUrl)
        const res = await fetch("/api/parse", { method: "POST", body: fd })
        const json = await res.json()
        if (!res.ok || !json.ok) throw new Error(json.error || "Parse failed")
      } else {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("previewDataUrl", previewDataUrl)
        const res = await fetch("/api/parse", { method: "POST", body: fd })
        const json = await res.json()
        if (!res.ok || !json.ok) throw new Error(json.error || "Parse failed")
      }

      if (fileRef.current) fileRef.current.value = ""
      setSelectedFile(null)
      setPreviewUrl(null)
      onParsed?.()
      router.refresh()
    } catch (e: any) {
      setError(e.message || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  function handleSeed() {
    startSeeding(async () => {
      setError(null)
      const res = await fetch("/api/seed", { method: "POST" })
      if (!res.ok) {
        setError("Failed to load sample invoices.")
        return
      }
      router.refresh()
      setSeeded(true)
      setTimeout(() => setSeeded(false), 2500)
    })
  }

  return (
    <Card className="border-emerald-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-balance">Upload an Invoice</CardTitle>
        <CardDescription>PNG/JPG (OpenAI Vision) or PDF (text → OpenAI). Parsed with AI.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          ref={fileRef}
          type="file"
          name="file"
          accept="image/*,.jpg,.jpeg,.png,.pdf"
          multiple={false}
          onChange={async (e) => {
            const f = e.currentTarget.files?.[0] || null
            setSelectedFile(f)
            if (error) setError(null)
            if (f) {
              try {
                const url = await fileToDataUrl(f)
                setPreviewUrl(url)
              } catch {
                /* ignore */
              }
            } else {
              setPreviewUrl(null)
            }
          }}
        />
        <div className="flex items-center gap-2">
          <Button type="button" onClick={handleUpload} disabled={loading}>
            {loading ? "Parsing..." : "Parse & Add"}
          </Button>
          <Button type="button" variant="outline" onClick={handleSeed} disabled={seeding || seeded}>
            {seeding ? "Loading..." : seeded ? "Loaded ✓" : "Load Sample Invoices"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!previewUrl}
            onClick={() => {
              if (previewUrl) {
                const w = window.open()
                if (w) w.document.write(`<iframe src="${previewUrl}" style="width:100%;height:100%;border:0"></iframe>`)
              }
            }}
          >
            Preview selected
          </Button>
        </div>
        {error && <p className={cn("text-sm text-red-600")}>{error}</p>}
        <p className="text-xs text-muted-foreground">
          Images: parsed with OpenAI Vision. PDFs: text extracted then structured by OpenAI. Q&amp;A is grounded on your
          current invoices using your OPENAI_API_KEY.
        </p>
      </CardContent>
    </Card>
  )
}
