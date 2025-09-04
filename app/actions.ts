// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { deleteInvoice } from "@/lib/store"

/**
 * Server Action to delete an invoice and revalidate the page.
 */
export async function deleteInvoiceAction(id: string) {
  try {
    await deleteInvoice(id)
    // Revalidate the path to update the UI on both tables.
    revalidatePath('/') 
  } catch (error) {
    console.error("Failed to delete invoice:", error)
    // You can add error handling logic here, e.g., using a toast library.
  }
}