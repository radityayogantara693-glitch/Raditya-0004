import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("idb_session")?.value);

  // Hanya alihkan pengguna TANPA sesi ke halaman login, kecuali path publik (/ dan /login).
  // Jangan alihkan pengguna dengan sesi (baik valid maupun tidak) dari /login ke /dashboard
  // di sini, karena pengecekan validitas sesi sepenuhnya dihalaman /login dan /dashboard sendiri.
  // Melakukannya di middleware akan menyebabkan loop pengalihan bila cookie ada tetapi tidak valid.
  if (!hasSession && pathname !== "/login" && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
