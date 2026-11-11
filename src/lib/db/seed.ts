import type {
  AuditLog,
  Booking,
  NotificationRecord,
  Room,
  RoomCategory,
  Ticket,
  User,
} from "@/types";
import { createHash } from "node:crypto";

import { addDaysToKey, witaDateKey, witaToInstant } from "@/lib/time";

export interface DbShape {
  version: number;
  users: User[];
  rooms: Room[];
  bookings: Booking[];
  tickets: Ticket[];
  notifications: NotificationRecord[];
  audits: AuditLog[];
}

const nowIso = () => new Date().toISOString();

/**
 * ID deterministik untuk data demo.
 *
 * Penting untuk deployment serverless: setiap instance bisa membuat seed
 * sendiri (filesystem read-only), jadi ID harus sama agar cookie sesi yang
 * menunjuk `userId` tetap valid di instance mana pun.
 */
function stableId(scope: string, key: string): string {
  const hex = createHash("sha256").update(`idb-demo:${scope}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function stableTicketCode(bookingCode: string): string {
  const hex = createHash("sha256").update(`idb-demo:ticket:${bookingCode}`).digest("hex").toUpperCase();
  return `IDB-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

function stableToken(bookingCode: string): string {
  return createHash("sha256").update(`idb-demo:token:${bookingCode}`).digest("base64url");
}

function iso(dateKey: string, time: string) {
  return witaToInstant(dateKey, time).toISOString();
}

function makeUser(input: Omit<User, "id" | "createdAt" | "noShowStrikes" | "suspendedUntil" | "isActive">): User {
  return {
    ...input,
    id: stableId("user", input.email),
    isActive: true,
    noShowStrikes: 0,
    suspendedUntil: null,
    createdAt: nowIso(),
  };
}

const DEFAULT_FACILITIES: Record<RoomCategory, string[]> = {
  STUDIO_DESAIN: ["AC", "Papan Tulis", "Wi-Fi"],
  LAB_KOMPUTER: ["AC", "Komputer", "Wi-Fi"],
  RUANG_KELAS: ["AC", "Proyektor", "Papan Tulis", "Wi-Fi"],
  AULA: ["AC", "Proyektor", "Sound System", "Wi-Fi"],
  GALERI: ["AC", "Sound System"],
};

const DEFAULT_DESCRIPTION: Record<RoomCategory, string> = {
  STUDIO_DESAIN: "Studio kerja untuk praktik, diskusi, dan presentasi karya mahasiswa.",
  LAB_KOMPUTER: "Laboratorium komputer dengan workstation untuk praktik dan tugas mata kuliah.",
  RUANG_KELAS: "Ruang kuliah dengan proyektor dan papan tulis untuk kegiatan belajar mengajar.",
  AULA: "Ruang serbaguna untuk seminar, pameran, dan kegiatan sivitas kampus.",
  GALERI: "Ruang pameran untuk display karya dan kegiatan komunitas.",
};

function makeRoom(input: {
  code: string;
  name: string;
  category: RoomCategory;
  building: string;
  floor: number;
  capacity: number;
  facilities?: string[];
  description?: string;
}): Room {
  return {
    id: stableId("room", input.code),
    code: input.code,
    name: input.name,
    category: input.category,
    building: input.building,
    floor: input.floor,
    capacity: input.capacity,
    facilities: input.facilities ?? DEFAULT_FACILITIES[input.category],
    description: input.description ?? DEFAULT_DESCRIPTION[input.category],
    isActive: true,
    createdAt: nowIso(),
  };
}

/**
 * Data awal untuk mode demo lokal. Tanggal dihitung relatif terhadap hari ini
 * (WITA) supaya alur check-in dan persetujuan selalu bisa dicoba.
 */
export function buildSeed(): DbShape {
  const today = witaDateKey(new Date());
  const hourNow = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Makassar",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  const checkInStartHour = Math.min(Math.max(hourNow, 8), 19);
  const checkInEndHour = Math.min(checkInStartHour + 2, 21);

  const rooms: Room[] = [
    makeRoom({
      code: "A11",
      name: "A.1.1 (STUDIO POLA)",
      category: "STUDIO_DESAIN",
      building: "Gedung A",
      floor: 1,
      capacity: 24,
      description: "Studio pola untuk praktik pembuatan pola, pemotongan bahan, dan kerja tekstil.",
    }),
    makeRoom({
      code: "A12",
      name: "A.1.2 (LECT 1A)",
      category: "RUANG_KELAS",
      building: "Gedung A",
      floor: 1,
      capacity: 40,
    }),
    makeRoom({
      code: "A13",
      name: "A.1.3 (LAB 1C)",
      category: "LAB_KOMPUTER",
      building: "Gedung A",
      floor: 1,
      capacity: 32,
    }),
    makeRoom({
      code: "A21",
      name: "A.2.1 (LAB 2B)",
      category: "LAB_KOMPUTER",
      building: "Gedung A",
      floor: 2,
      capacity: 32,
    }),
    makeRoom({
      code: "A22",
      name: "A.2.2 (LAB 2C)",
      category: "LAB_KOMPUTER",
      building: "Gedung A",
      floor: 2,
      capacity: 32,
    }),
    makeRoom({
      code: "A23",
      name: "A.2.3 (LECT 2D)",
      category: "RUANG_KELAS",
      building: "Gedung A",
      floor: 2,
      capacity: 40,
    }),
    makeRoom({
      code: "B21",
      name: "B.2.1 (INTERNATIONAL)",
      category: "RUANG_KELAS",
      building: "Gedung B",
      floor: 2,
      capacity: 36,
    }),
    makeRoom({
      code: "B13",
      name: "B.1.3 (STUDIO 3)",
      category: "STUDIO_DESAIN",
      building: "Gedung B",
      floor: 1,
      capacity: 24,
    }),
    makeRoom({
      code: "B14",
      name: "B.1.4 (LAB FASHION)",
      category: "STUDIO_DESAIN",
      building: "Gedung B",
      floor: 1,
      capacity: 24,
      description: "Laboratorium mode untuk praktik menjahit, fitting, dan produksi busana.",
    }),
    makeRoom({
      code: "C11",
      name: "C.1.1 (LAB 1A)",
      category: "LAB_KOMPUTER",
      building: "Gedung C",
      floor: 1,
      capacity: 32,
    }),
    makeRoom({
      code: "C12",
      name: "C.1.2 (LAB STI)",
      category: "LAB_KOMPUTER",
      building: "Gedung C",
      floor: 1,
      capacity: 32,
    }),
    makeRoom({
      code: "C13",
      name: "C.1.3 (LECT 1)",
      category: "RUANG_KELAS",
      building: "Gedung C",
      floor: 1,
      capacity: 40,
    }),
    makeRoom({
      code: "C21",
      name: "C.2.1 (LECT 2A)",
      category: "RUANG_KELAS",
      building: "Gedung C",
      floor: 2,
      capacity: 40,
    }),
    makeRoom({
      code: "C22",
      name: "C.2.2 (LECT 2B)",
      category: "RUANG_KELAS",
      building: "Gedung C",
      floor: 2,
      capacity: 40,
    }),
    makeRoom({
      code: "C23",
      name: "C.2.3 (STUDIO 2C)",
      category: "STUDIO_DESAIN",
      building: "Gedung C",
      floor: 2,
      capacity: 24,
    }),
    makeRoom({
      code: "C31",
      name: "C.3.1 (STUDIO 3A)",
      category: "STUDIO_DESAIN",
      building: "Gedung C",
      floor: 3,
      capacity: 24,
    }),
    makeRoom({
      code: "C32",
      name: "C.3.2 (STUDIO 3B)",
      category: "STUDIO_DESAIN",
      building: "Gedung C",
      floor: 3,
      capacity: 24,
    }),
    makeRoom({
      code: "C33",
      name: "C.3.3 (STUDIO 3C)",
      category: "STUDIO_DESAIN",
      building: "Gedung C",
      floor: 3,
      capacity: 24,
    }),
    makeRoom({
      code: "AULA-01",
      name: "AULA IDB BALI",
      category: "AULA",
      building: "Gedung C",
      floor: 1,
      capacity: 250,
      description: "Aula utama untuk seminar, wisuda, pameran, dan kegiatan sivitas kampus.",
    }),
    makeRoom({
      code: "FOTO-01",
      name: "STUDIO FOTO IDB BALI",
      category: "STUDIO_DESAIN",
      building: "Gedung B",
      floor: 1,
      capacity: 20,
      facilities: ["AC", "Wi-Fi"],
      description: "Studio foto dengan ruang kontrol cahaya untuk pemotretan produk dan portofolio.",
    }),
    makeRoom({
      code: "ROOF-01",
      name: "ROOFTOP IDB BALI",
      category: "AULA",
      building: "Gedung C",
      floor: 3,
      capacity: 100,
      facilities: ["Sound System", "Wi-Fi"],
      description: "Area rooftop untuk gathering, screening, dan kegiatan komunitas kampus.",
    }),
    makeRoom({
      code: "INBIS-01",
      name: "INBIS IDB BALI",
      category: "RUANG_KELAS",
      building: "Gedung B",
      floor: 2,
      capacity: 40,
      description: "Ruang inkubasi bisnis untuk mentoring, presentasi, dan kerja kolaboratif.",
    }),
    makeRoom({
      code: "HAL-A",
      name: "HALAMAN IDB BALI GEDUNG A",
      category: "AULA",
      building: "Gedung A",
      floor: 1,
      capacity: 100,
      facilities: ["Sound System"],
      description: "Area terbuka di Gedung A untuk kegiatan luar ruang, bazar, dan gathering.",
    }),
    makeRoom({
      code: "HAL-B",
      name: "HALAMAN IDB BALI GEDUNG B",
      category: "AULA",
      building: "Gedung B",
      floor: 1,
      capacity: 100,
      facilities: ["Sound System"],
      description: "Area terbuka di Gedung B untuk kegiatan luar ruang dan pameran.",
    }),
    makeRoom({
      code: "HAL-C",
      name: "HALAMAN IDB BALI GEDUNG C",
      category: "AULA",
      building: "Gedung C",
      floor: 1,
      capacity: 100,
      facilities: ["Sound System"],
      description: "Area terbuka di Gedung C untuk kegiatan luar ruang dan gathering.",
    }),
    makeRoom({
      code: "GSG-1",
      name: "GEDUNG SERBA GUNA IDB BALI - Lt.1",
      category: "AULA",
      building: "Gedung Serba Guna",
      floor: 1,
      capacity: 150,
      description: "Gedung serbaguna lantai 1 untuk kegiatan akademik dan kemahasiswaan.",
    }),
    makeRoom({
      code: "GSG-2",
      name: "GEDUNG SERBA GUNA IDB BALI - Lt.2",
      category: "AULA",
      building: "Gedung Serba Guna",
      floor: 2,
      capacity: 150,
      description: "Gedung serbaguna lantai 2 untuk kegiatan akademik dan kemahasiswaan.",
    }),
    makeRoom({
      code: "GSG-3",
      name: "GEDUNG SERBA GUNA IDB BALI - Lt.3",
      category: "AULA",
      building: "Gedung Serba Guna",
      floor: 3,
      capacity: 150,
      description: "Gedung serbaguna lantai 3 untuk kegiatan akademik dan kemahasiswaan.",
    }),
    makeRoom({
      code: "GEAR-01",
      name: "GEDUNG B (Gear inc)",
      category: "RUANG_KELAS",
      building: "Gedung B",
      floor: 1,
      capacity: 40,
      description: "Ruang kolaborasi bersama Gear Inc untuk program kemitraan dan workshop.",
    }),
  ];

  const roomByCode = (code: string): Room => {
    const room = rooms.find((item) => item.code === code);
    if (!room) throw new Error(`Ruangan seed ${code} tidak ditemukan.`);
    return room;
  };

  const putu = makeUser({
    ssoId: "246120940004",
    email: "putu@idb.ac.id",
    fullName: "Putu Anindya",
    role: "MAHASISWA",
    organization: "UKM Fotografi",
  });
  const ayu = makeUser({
    ssoId: "246120940021",
    email: "ayu@idb.ac.id",
    fullName: "Ayu Lestari",
    role: "MAHASISWA",
    organization: "UKM Musik",
  });
  const wayan = makeUser({
    ssoId: "198804122010",
    email: "wayan@idb.ac.id",
    fullName: "Wayan Sudarma, S.Ds., M.Ds.",
    role: "DOSEN",
    organization: "Program Studi Desain Interior",
  });
  const ketut = makeUser({
    ssoId: "198203102008",
    email: "ketut@idb.ac.id",
    fullName: "Ketut Ariani",
    role: "ADMIN",
    organization: "Sarana Prasarana",
  });
  const made = makeUser({
    ssoId: "199001012015",
    email: "made@idb.ac.id",
    fullName: "Made Sujana",
    role: "SATPAM",
    organization: "Keamanan & Gedung",
  });

  const booking = (input: {
    room: Room;
    user: User;
    dateKey: string;
    start: string;
    end: string;
    eventName: string;
    purpose: string;
    attendees: number;
    status: Booking["status"];
    rejectionReason?: string | null;
    checkedInAt?: string | null;
    seq: number;
  }): Booking => ({
    id: stableId("booking", `BK-${input.dateKey.replaceAll("-", "").slice(2)}-${String(input.seq).padStart(3, "0")}`),
    code: `BK-${input.dateKey.replaceAll("-", "").slice(2)}-${String(input.seq).padStart(3, "0")}`,
    roomId: input.room.id,
    userId: input.user.id,
    organization: input.user.organization,
    eventName: input.eventName,
    purpose: input.purpose,
    attendees: input.attendees,
    startAt: iso(input.dateKey, input.start),
    endAt: iso(input.dateKey, input.end),
    status: input.status,
    rejectionReason: input.rejectionReason ?? null,
    decidedBy: input.status === "pending" ? null : ketut.id,
    decidedAt: input.status === "pending" ? null : nowIso(),
    checkedInAt: input.checkedInAt ?? null,
    checkedInBy: input.checkedInAt ? made.id : null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  const bookings: Booking[] = [
    booking({
      room: roomByCode("FOTO-01"),
      user: putu,
      dateKey: today,
      start: `${String(checkInStartHour).padStart(2, "0")}:00`,
      end: `${String(checkInEndHour).padStart(2, "0")}:00`,
      eventName: "Workshop Lighting Studio",
      purpose:
        "Latihan tata cahaya untuk persiapan pameran UKM Fotografi. Peserta membawa kamera masing-masing.",
      attendees: 18,
      status: "approved",
      seq: 1,
    }),
    booking({
      room: roomByCode("AULA-01"),
      user: wayan,
      dateKey: today,
      start: "13:00",
      end: "15:00",
      eventName: "Kuliah Tamu Desain Interior",
      purpose: "Kuliah tamu bersama praktisi untuk mahasiswa semester 5 Program Studi Desain Interior.",
      attendees: 120,
      status: "approved",
      seq: 2,
    }),
    booking({
      room: roomByCode("C31"),
      user: putu,
      dateKey: addDaysToKey(today, 4),
      start: "09:00",
      end: "11:00",
      eventName: "Uji Cetak Portofolio",
      purpose: "Sesi uji cetak dan kurasi portofolio anggota sebelum dikumpulkan ke dosen pembimbing.",
      attendees: 18,
      status: "rejected",
      rejectionReason:
        "Bentrok dengan jadwal perawatan proyektor studio. Silakan ajukan ulang untuk tanggal lain.",
      seq: 3,
    }),
    booking({
      room: roomByCode("AULA-01"),
      user: ayu,
      dateKey: addDaysToKey(today, 2),
      start: "13:00",
      end: "15:00",
      eventName: "Gladi Bersih Konser Akustik",
      purpose: "Gladi bersih seluruh tim produksi sebelum konser akustik UKM Musik akhir bulan.",
      attendees: 90,
      status: "pending",
      seq: 4,
    }),
    booking({
      room: roomByCode("C12"),
      user: ayu,
      dateKey: addDaysToKey(today, 3),
      start: "10:00",
      end: "12:00",
      eventName: "Rekaman Single Akustik",
      purpose: "Sesi rekaman audio single terbaru menggunakan perangkat laboratorium STI.",
      attendees: 12,
      status: "pending",
      seq: 5,
    }),
    booking({
      room: roomByCode("C21"),
      user: wayan,
      dateKey: addDaysToKey(today, 3),
      start: "15:00",
      end: "17:00",
      eventName: "Kuliah Pengganti Sejarah Desain",
      purpose: "Kelas pengganti untuk mahasiswa yang terdampak libur nasional pekan lalu.",
      attendees: 38,
      status: "approved",
      seq: 6,
    }),
    booking({
      room: roomByCode("C23"),
      user: ayu,
      dateKey: addDaysToKey(today, -1),
      start: "10:00",
      end: "12:00",
      eventName: "Latihan Vokal Rutin",
      purpose: "Latihan vokal mingguan anggota UKM Musik.",
      attendees: 15,
      status: "completed",
      checkedInAt: iso(addDaysToKey(today, -1), "09:55"),
      seq: 7,
    }),
    booking({
      room: roomByCode("HAL-A"),
      user: ayu,
      dateKey: addDaysToKey(today, 5),
      start: "09:00",
      end: "12:00",
      eventName: "Pameran Foto Dokumenter",
      purpose: "Pemasangan dan pembukaan pameran foto dokumenter anggota UKM Fotografi.",
      attendees: 80,
      status: "pending",
      seq: 8,
    }),
  ];

  const tickets: Ticket[] = bookings
    .filter((item) => ["approved", "completed", "checked_in"].includes(item.status))
    .map((item) => ({
      id: stableId("ticket", item.code),
      bookingId: item.id,
      code: stableTicketCode(item.code),
      token: stableToken(item.code),
      status: item.status === "completed" ? "used" : "issued",
      issuedAt: item.decidedAt ?? nowIso(),
      expiresAt: item.endAt,
      usedAt: item.checkedInAt,
      usedBy: item.checkedInBy,
    }));

  return {
    version: 1,
    users: [putu, ayu, wayan, ketut, made],
    rooms,
    bookings,
    tickets,
    notifications: [],
    audits: [
      {
        id: stableId("audit", "seed.demo"),
        actorId: ketut.id,
        action: "seed.demo",
        entity: "system",
        entityId: null,
        meta: { message: "Data demo dimuat otomatis." },
        createdAt: nowIso(),
      },
    ],
  };
}
