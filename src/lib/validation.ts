import { z } from "zod";

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid.");
const timeKey = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam tidak valid.");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Masukkan email kampus yang valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
  next: z.string().optional(),
});

export const bookingSchema = z
  .object({
    roomId: z.string().uuid("Pilih ruangan terlebih dahulu."),
    date: dateKey,
    startTime: timeKey,
    endTime: timeKey,
    eventName: z
      .string()
      .trim()
      .min(5, "Nama kegiatan minimal 5 karakter.")
      .max(120, "Nama kegiatan maksimal 120 karakter."),
    attendees: z.coerce
      .number({ invalid_type_error: "Estimasi peserta harus berupa angka." })
      .int("Estimasi peserta harus bilangan bulat.")
      .min(1, "Estimasi peserta minimal 1 orang.")
      .max(500, "Estimasi peserta maksimal 500 orang."),
    purpose: z
      .string()
      .trim()
      .min(10, "Uraikan keperluan minimal 10 karakter.")
      .max(1000, "Uraian keperluan maksimal 1000 karakter."),
    organization: z.string().trim().max(80).optional(),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "Jam selesai harus lebih lambat dari jam mulai.",
    path: ["endTime"],
  });

export const rejectSchema = z.object({
  bookingId: z.string().uuid("ID pengajuan tidak valid."),
  reason: z
    .string()
    .trim()
    .min(10, "Alasan penolakan minimal 10 karakter agar pemohon paham.")
    .max(500, "Alasan penolakan maksimal 500 karakter."),
});

export const cancelSchema = z.object({
  bookingId: z.string().uuid("ID pengajuan tidak valid."),
  reason: z
    .string()
    .trim()
    .min(5, "Sertakan alasan pembatalan minimal 5 karakter.")
    .max(300, "Alasan pembatalan maksimal 300 karakter."),
});

export const checkInSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6, "Masukkan kode tiket yang tertera pada QR.")
    .max(64, "Kode tiket terlalu panjang."),
});

export const roomSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,12}$/, "Kode ruangan 3–12 karakter (huruf, angka, tanda hubung)."),
  name: z.string().trim().min(3, "Nama ruangan minimal 3 karakter.").max(80),
  category: z.enum(["STUDIO_DESAIN", "LAB_KOMPUTER", "RUANG_KELAS", "AULA", "GALERI"]),
  building: z.string().trim().min(2, "Nama gedung wajib diisi.").max(60),
  floor: z.coerce.number().int().min(1, "Lantai minimal 1.").max(10, "Lantai maksimal 10."),
  capacity: z.coerce.number().int().min(1, "Kapasitas minimal 1.").max(500, "Kapasitas maksimal 500."),
  facilities: z.array(z.string().trim().min(1)).default([]),
  description: z.string().trim().max(500).default(""),
  isActive: z.coerce.boolean().default(true),
});

export type BookingFormValues = z.infer<typeof bookingSchema>;
export type RoomFormValues = z.infer<typeof roomSchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
