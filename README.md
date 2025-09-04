Invoice AI Assistant

A small full-stack app that:

Parses invoices from images (OpenAI Vision) and PDFs (pdfjs-dist text → OpenAI structuring).

Uses OpenAI via the AI SDK to convert raw content into structured fields (vendor, invoice_number, invoice_date, due_date, total, line items).

Answers natural‑language questions grounded on your currently loaded invoices.

Persists invoices in a Neon database instead of just in-memory storage.

Tech:

Next.js App Router, shadcn/ui

pdfjs-dist for PDF text extraction

AI SDK + OpenAI (vision + text)

Neon database for persistent invoice storage

Models

Parser (images/PDF structuring): default gpt-4o (vision-capable)

Q&A (grounded answers): default gpt-4o-mini (token-efficient)

You can override via environment variables:

OPENAI_MODEL_PARSER (e.g., gpt-4o)

OPENAI_MODEL_QA (e.g., gpt-4o-mini)

Note: “GPT‑5” isn’t publicly available. This app targets OpenAI’s latest vision-capable models (gpt‑4o family).

Setup

Environment variable

Set OPENAI_API_KEY in Project Settings → Environment Variables (server-side).

Set DATABASE_URL for Neon database connection (server-side).

Seed and test

Open the app, click “Load Sample Invoices” to add two example invoices, or upload your own PNG/JPG/PDF invoices.

Ask questions

Examples:

“How many invoices are due in the next 7 days?”

“What is the total value of the invoice from Microsoft?”

“List all vendors with invoices > $2,000”

Environment Variables

In project preview:

Add OPENAI_API_KEY and DATABASE_URL in Project Settings → Environment Variables. .env files aren’t loaded in preview.

For local development after exporting/downloading:

Create .env.local with:

OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=your-neon-db-url-here


Restart the dev server. Server code reads process.env.OPENAI_API_KEY and process.env.DATABASE_URL.

Security:

Never commit real keys. Use .env.example as a template and keep .env.local out of version control.

API

POST /api/parse — multipart/form-data with file (PDF or image). Uses OpenAI Vision/LLM to extract fields and stores the invoice in Neon DB. Returns { ok, invoice | error }.

Optional: include previewDataUrl to attach a preview thumbnail/data URL.

Optional: include text to send raw text (bypasses PDF/image detection).

POST /api/query — { question: string } → { answer: string } using grounded LLM over current invoices.

POST /api/seed — seeds two sample invoices in Neon DB.

Example Q&A (with provided seed)

Q: How many invoices are due in the next 7 days?
A: 1 invoice (Amazon, due Sept 5, $2,450.00)

Q: What is the total value of the invoice from Microsoft?
A: $3,100.00

Q: List all vendors with invoices > $2,000.
A: Amazon ($2,450), Microsoft ($3,100)

How it works

Upload PNG/JPG/PDF

Images → OpenAI Vision (parser model) → structured JSON

PDFs → text extracted (pdfjs-dist) → structured by parser model

“Load Sample Invoices” briefly shows “Loaded ✓” after seeding, then returns to normal.

Q&A

Reads current invoices from the Neon database

Sends a compact CSV (vendor, invoice_number, invoice_date, due_date, total) plus small aggregates to the QA model

Strict instructions ensure answers only use provided data and respect “due in next 7 days” using Today’s date

Troubleshooting

If you hit token/TPM limits, the app already uses:

CSV context with row caps

A smaller QA model by default

Ensure OPENAI_API_KEY and DATABASE_URL are set in Project Settings or .env.local in local dev.

Notes

Invoices are now persisted in Neon DB for demo purposes. Previously, lib/store.ts used in-memory storage.

You can change the model in lib/openai.ts (e.g., gpt-4o ↔ gpt-4o-mini).