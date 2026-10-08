import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authToken } from "./lib/authCookie";

// כל הדשבורד מוגן בסיסמה (ADMIN_PASSWORD). פתוחים רק: טופס ההרשמה, קישור ההסרה,
// האירועים מ Resend והקרונים (שמוגנים בסוד משלהם).
const PUBLIC = ["/login", "/api/login", "/api/subscribe", "/api/unsubscribe", "/api/webhooks/", "/api/cron/"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    // בלי סיסמה: פתוח רק במחשב שלך. באוויר הכל נעול עד שמגדירים סיסמה.
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("ADMIN_PASSWORD is not set", { status: 503 });
  }
  if (req.cookies.get(AUTH_COOKIE)?.value === (await authToken(pw))) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?from=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon|icon|logo|apple-touch-icon|manifest\.webmanifest|.*\.(?:png|jpg|svg|ico|webp)$).*)"],
};
