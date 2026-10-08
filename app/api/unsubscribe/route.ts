import { NextResponse } from "next/server";
import { BRAND } from "../../../config/brand";
import { db, isDemo } from "../../../lib/db";
import { verifyUnsubscribe } from "../../../lib/security";

// הסרה מהרשימה. GET = לחיצה על הקישור במייל. POST = הסרה בלחיצה אחת מתוך Gmail.
async function unsubscribe(req: Request): Promise<boolean> {
  const sp = new URL(req.url).searchParams;
  const c = sp.get("c") || "", s = sp.get("s") || "", st = sp.get("st") || "", t = sp.get("t") || "";
  if (isDemo() || !c || !t || !verifyUnsubscribe(c, s, st, t)) return false;

  const { data: contact } = await db().from("contacts").select("id, email, unsubscribed_at").eq("id", c).maybeSingle();
  if (!contact) return false;
  if (!contact.unsubscribed_at) {
    await db().from("contacts").update({ unsubscribed_at: new Date().toISOString() }).eq("id", c);
    await db().from("unsubscribes").insert({ contact_id: c, email: contact.email, source_id: s, step_id: st });
  }
  return true;
}

const page = (ok: boolean) => `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ok ? "הוסרת מהרשימה" : "הקישור לא תקין"}</title></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#f6f7f8;color:#1a1a1e;display:grid;place-items:center;min-height:100vh;padding:16px">
<div style="background:#fff;border:1px solid #e6e7ea;border-radius:16px;padding:36px 28px;max-width:420px;text-align:center">
<h1 style="font-size:24px;margin:0 0 10px">${ok ? "הוסרת מהרשימה" : "הקישור לא תקין"}</h1>
<p style="color:#5e5e66;font-size:16px;line-height:1.6;margin:0">${ok ? `לא יגיעו אלייך יותר מיילים מ${BRAND.name}.` : "אפשר פשוט לענות למייל ולבקש הסרה."}</p>
</div></body></html>`;

export async function GET(req: Request) {
  const ok = await unsubscribe(req);
  return new NextResponse(page(ok), { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(req: Request) {
  const ok = await unsubscribe(req);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
