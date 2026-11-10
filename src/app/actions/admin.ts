"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import type { ActionState } from "@/lib/action-state";
import {
  approveBookingAction,
  rejectBookingAction,
  runMaintenance,
} from "@/lib/services/bookings";

export async function approveBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireUser(["ADMIN"]);
  return approveBookingAction(admin, formData);
}

export async function rejectBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireUser(["ADMIN"]);
  return rejectBookingAction(admin, formData);
}

export async function runMaintenanceNow(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const admin = await requireUser(["ADMIN"]);
  const result = await runMaintenance(admin);
  revalidatePath("/admin");
  revalidatePath("/admin/laporan");
  return {
    status: "success",
    message: `Pembersihan selesai: ${result.released} slot no-show dilepas, ${result.completed} sesi ditutup.`,
  };
}
