// components/InvoiceDeleteButton.tsx
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteInvoiceAction } from '@/app/actions';

interface InvoiceDeleteButtonProps {
  invoiceId: string;
}

export function InvoiceDeleteButton({ invoiceId }: InvoiceDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDelete = async () => {
    // Show a confirmation dialog before proceeding
    const isConfirmed = window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.");
    if (!isConfirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      // Call the server action with the invoice ID
      await deleteInvoiceAction(invoiceId);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-500 hover:text-red-700 hover:bg-red-50"
    >
      {isDeleting ? (
        <span className="animate-pulse">...</span>
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      <span className="sr-only">Delete Invoice</span>
    </Button>
  );
}