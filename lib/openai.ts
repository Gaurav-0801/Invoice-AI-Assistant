// OpenAI client via AI SDK
// Uses OPENAI_API_KEY from environment (server-side only)

import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

export const models = {
  text: openai("gpt-4o-mini"),
}

export { generateText }
