"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { randomId } from "@/lib/crypto";
import { roomSchema } from "@/lib/validation";
import type { Room } from "@/types";

export interface RoomState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
}

function parseRoomForm(formData: FormData) {
  const facilities = formData
    .getAll("facilities")
    .map((value) => String(value).trim())
    .filter(Boolean);

  return roomSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    category: formData.get("category"),
    building: formData.get("building"),
    floor: formData.get("floor"),
    capacity: formData.get("capacity"),
    facilities,
    description: formData.get("description") ?? "",
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

export async function createRoomAction(_prev: RoomState, formData: FormData): Promise<RoomState> {
  await requireUser(["ADMIN"]);
  const parsed = parseRoomForm(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali data ruangan.",
      errors: Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message])),
    };
  }

  const repo = getRepository();
  const existing = await repo.getRoomByCode(parsed.data.code);
  if (existing) {
    return { status: "error", message: "Kode ruangan sudah dipakai.", errors: { code: "Kode sudah dipakai." } };
  }

  const room: Room = {
    id: randomId(),
    code: parsed.data.code,
    name: parsed.data.name,
    category: parsed.data.category,
    building: parsed.data.building,
    floor: parsed.data.floor,
    capacity: parsed.data.capacity,
    facilities: parsed.data.facilities,
    description: parsed.data.description,
    isActive: parsed.data.isActive,
    createdAt: new Date().toISOString(),
  };

  await repo.createRoom(room);
  revalidatePath("/admin/ruangan");
  revalidatePath("/ruangan");
  revalidatePath("/kalender");
  redirect("/admin/ruangan?status=created");
}

export async function updateRoomAction(roomId: string, _prev: RoomState, formData: FormData): Promise<RoomState> {
  await requireUser(["ADMIN"]);
  const parsed = parseRoomForm(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali data ruangan.",
      errors: Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message])),
    };
  }

  const repo = getRepository();
  const duplicate = await repo.getRoomByCode(parsed.data.code);
  if (duplicate && duplicate.id !== roomId) {
    return { status: "error", message: "Kode ruangan sudah dipakai.", errors: { code: "Kode sudah dipakai." } };
  }

  await repo.updateRoom(roomId, parsed.data);
  revalidatePath("/admin/ruangan");
  revalidatePath("/ruangan");
  revalidatePath(`/ruangan/${roomId}`);
  revalidatePath("/kalender");
  return { status: "success", message: "Perubahan ruangan disimpan." };
}

export async function toggleRoomAction(roomId: string, isActive: boolean): Promise<void> {
  await requireUser(["ADMIN"]);
  await getRepository().updateRoom(roomId, { isActive });
  revalidatePath("/admin/ruangan");
  revalidatePath("/ruangan");
  revalidatePath("/kalender");
}
