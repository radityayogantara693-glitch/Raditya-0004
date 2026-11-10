"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, XCircle } from "lucide-react";

import { cancelBooking } from "@/app/actions/bookings";
import { idleState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

export function CancelBookingButton({
  bookingId,
  bookingCode,
  size = "sm",
}: {
  bookingId: string;
  bookingCode: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(cancelBooking, idleState);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state.status]);

  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)} aria-label={`Batalkan pengajuan ${bookingCode}`}>
        <XCircle aria-hidden className="h-3.5 w-3.5" />
        Batalkan
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Batalkan peminjaman"
        description={`Pengajuan ${bookingCode} akan dibatalkan dan slotnya langsung dibuka untuk sivitas lain.`}
      >
        <form action={formAction} className="space-y-3.5">
          <input type="hidden" name="bookingId" value={bookingId} />
          <Field label="Alasan pembatalan" htmlFor={`cancel-${bookingId}`} required hint="Minimal 5 karakter">
            <Textarea
              id={`cancel-${bookingId}`}
              name="reason"
              required
              minLength={5}
              maxLength={300}
              placeholder="Contoh: kegiatan UKM dijadwalkan ulang ke pekan depan."
            />
          </Field>

          {state.status === "error" ? (
            <Alert tone="error" title="Pembatalan gagal">
              {state.message}
            </Alert>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Kembali
            </Button>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              {pending ? "Membatalkan…" : "Ya, batalkan"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
