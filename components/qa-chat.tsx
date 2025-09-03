"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function QAChat() {
  const [q, setQ] = useState("")
  const [a, setA] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ask() {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setA(null)
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.answer || "Error")
      setA(json.answer)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-sky-200">
      <CardHeader>
        <CardTitle className="text-balance">Ask about your invoices</CardTitle>
        <CardDescription>
          Examples: “How many invoices are due in the next 7 days?” “What is the total value of the invoice from
          Amazon?”
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a question..."
            onKeyDown={(e) => e.key === "Enter" && ask()}
          />
          <Button onClick={ask} disabled={loading}>
            {loading ? "Answering..." : "Ask"}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {a && <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{a}</div>}
      </CardContent>
    </Card>
  )
}
