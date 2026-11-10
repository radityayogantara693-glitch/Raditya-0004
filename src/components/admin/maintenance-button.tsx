"use client";

import { useActionState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { runMaintenanceNow } from "@/app/actions/admin";
import { idleState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function MaintenanceButton({ compact = false }: { compact?: boolean }) {
  const [state, formAction, pending] = useActionState(runMaintenanceNow, idleState);

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <Button type="submit" variant={compact ? "ghost" : "outline"} size={compact ? "sm" : "md"} disabled={pending}>
          {pending ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw aria-hidden className="h-3.5 w-3.5" />}
          {pending ? "Menjalankan…" : "Jalankan pelepasan no-show"}
        </Button>
      </form>
      {state.status !== "idle" && state.message ? (
        <Alert tone={state.status === "success" ? "success" : "error"} className="max-w-md">
          {state.message}
        </Alert>
      ) : null}
    </div>
  );
}
