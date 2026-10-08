import { NextResponse } from "next/server";
import { AUTH_COOKIE, authToken } from "../../../lib/authCookie";
import { safeEqual } from "../../../lib/security";

export async function POST(req: Request) {
  const pw = process.env.ADMIN_PASSWORD || "";
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!pw || !safeEqual(String(password || ""), pw)) return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await authToken(pw), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
