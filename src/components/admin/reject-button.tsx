"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import { rejectBooking } from "@/app/actions/admin";
import { idleState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

export function RejectButton({
  bookingId,
  bookingCode,
  eventName,
}: {
  bookingId: string;
  bookingCode: string;
  eventName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(rejectBooking, idleState);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state.status]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={`Tolak pengajuan ${bookingCode}`}>
        <X aria-hidden className="h-3.5 w-3.5" />
        Tolak
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tolak pengajuan"
        description={`${eventName} · ${bookingCode}. Alasan akan dikirim ke pemohon melalui email.`}
      >
        <form action={formAction} className="space-y-3.5">
          <input type="hidden" name="bookingId" value={bookingId} />
          <Field
            label="Alasan penolakan"
            htmlFor={`reason-${bookingId}`}
            required
            hint="Minimal 10 karakter"
          >
            <Textarea
              id={`reason-${bookingId}`}
              name="reason"
              required
              minLength={10}
              maxLength={500}
              placeholder="Contoh: ruangan sudah diblokir untuk perawatan proyektor pada jam tersebut."
            />
          </Field>

          {state.status === "error" ? (
            <Alert tone="error" title="Penolakan belum tersimpan">
              {state.message}
            </Alert>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              {pending ? "Menyimpan…" : "Tolak pengajuan"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
