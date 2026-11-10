/**
 * Bentuk state bersama untuk server action yang dipakai form klien.
 * File ini bebas dari dependensi server agar aman diimpor komponen klien.
 */
export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  alternatives?: Array<{ id: string; name: string; code: string }>;
  bookingId?: string;
  ticketCode?: string;
  values?: Record<string, string>;
}

export const idleState: ActionState = { status: "idle" };
