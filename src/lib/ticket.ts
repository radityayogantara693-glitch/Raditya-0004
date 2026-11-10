/**
 * Utilitas tiket yang aman dipakai di browser (tanpa dependensi Node).
 */

export function ticketPayload(code: string): string {
  return `IDB-TKT:${code}`;
}

export function ticketVerifyUrl(code: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/checkin?code=${encodeURIComponent(code)}`;
}

export function normalizeTicketCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/^IDB-TKT:/, "").replace(/\s+/g, "");
  const compact = cleaned.replace(/[^A-Z0-9]/g, "");
  if (compact.length === 11 && compact.startsWith("IDB")) {
    return `IDB-${compact.slice(3, 7)}-${compact.slice(7)}`;
  }
  return raw.trim().toUpperCase();
}

const TICKET_CODE_PATTERN = /^IDB-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/**
 * Ekstrak kode tiket dari hasil pindai kamera/QR.
 * Menerima payload `IDB-TKT:IDB-XXXX-XXXX`, tautan verifikasi
 * (`/checkin?code=...`), maupun kode/token mentah.
 * Jika hasilnya bukan kode tiket format IDB, teks asli dipertahankan
 * (dengan huruf aslinya) agar token tiket tetap cocok.
 */
export function extractTicketCode(raw: string): string {
  const trimmed = raw.trim();
  let candidate = trimmed;

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    try {
      const url = new URL(trimmed, "http://localhost");
      const fromUrl = url.searchParams.get("code")?.trim();
      if (fromUrl) candidate = fromUrl;
    } catch {
      // bukan URL valid — pakai teks apa adanya
    }
  }

  const normalized = normalizeTicketCode(candidate);
  return TICKET_CODE_PATTERN.test(normalized) ? normalized : candidate;
}
