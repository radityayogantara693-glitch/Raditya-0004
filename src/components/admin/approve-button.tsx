"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";

import { approveBooking } from "@/app/actions/admin";
import { idleState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";

export function ApproveButton({ bookingId, bookingCode }: { bookingId: string; bookingCode: string }) {
  const [state, formAction, pending] = useActionState(approveBooking, idleState);

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button
        type="submit"
        variant="success"
        size="sm"
        disabled={pending}
        aria-label={`Setujui pengajuan ${bookingCode}`}
      >
        {pending ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <Check aria-hidden className="h-3.5 w-3.5" />}
        {pending ? "Memproses…" : "Setujui"}
      </Button>
      {state.status === "error" ? (
        <span role="alert" className="max-w-[220px] text-right text-[10.5px] leading-snug text-busy">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
