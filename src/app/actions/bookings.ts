"use server";

import { requireUser } from "@/lib/auth/session";
import type { ActionState } from "@/lib/action-state";
import {
  cancelBookingAction,
  checkInAction,
  submitBookingAction,
} from "@/lib/services/bookings";

export async function submitBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  return submitBookingAction(user, formData);
}

export async function cancelBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  return cancelBookingAction(user, formData);
}

export async function checkIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(["SATPAM", "ADMIN"]);
  return checkInAction(user, formData);
}
