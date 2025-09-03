// Robust JSON extraction from model output

export function extractJson<T = any>(text: string): T | null {
  try {
    const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (!match) return null
    return JSON.parse(match[1]) as T
  } catch {
    return null
  }
}
