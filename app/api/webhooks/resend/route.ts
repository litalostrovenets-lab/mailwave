import { NextResponse } from "next/server";
import { db, isDemo } from "../../../../lib/db";
import { verifyResendWebhook } from "../../../../lib/security";

// Resend שולח לכאן כל אירוע: נמסר, נפתח, נלחץ, חזר, ספאם. מזה נבנים כל המספרים בטבלה.
const TYPES: Record<string, string> = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

export async function POST(req: Request) {
  const body = await req.text();
  if (!verifyResendWebhook(body, req.headers)) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  if (isDemo()) return NextResponse.json({ ok: true });

  const evt = JSON.parse(body);
  const type = TYPES[evt?.type];
  if (!type) return NextResponse.json({ ok: true, ignored: evt?.type });

  const d = evt.data || {};
  const resendId: string | null = d.email_id || null;
  const email: string | null = Array.isArray(d.to) ? d.to[0] : d.to || null;

  // שיוך למייל ברצף: קודם לפי התגים, ואם אין, לפי השורה בטבלת השליחות
  const tags: Record<string, string> = Array.isArray(d.tags)
    ? Object.fromEntries(d.tags.map((t: { name: string; value: string }) => [t.name, t.value]))
    : d.tags || {};
  let source = tags.source || null;
  let step = tags.step || null;
  if ((!source || !step) && resendId) {
    const { data: s } = await db().from("sends").select("source_id, step_id").eq("resend_id", resendId).maybeSingle();
    source = s?.source_id || null;
    step = s?.step_id || null;
  }
  if (source === "test") return NextResponse.json({ ok: true });

  await db().from("email_events").insert({
    resend_id: resendId, type, email: email?.toLowerCase() || null,
    source_id: source, step_id: step, link: type === "clicked" ? d.click?.link || null : null,
  });

  // ספאם או כתובת שחזרה = מפסיקים לשלוח לה, כדי לשמור על המוניטין של הדומיין
  if ((type === "complained" || (type === "bounced" && d.bounce?.type !== "Transient")) && email) {
    await db().from("contacts").update({ unsubscribed_at: new Date().toISOString() }).eq("email", email.toLowerCase()).is("unsubscribed_at", null);
  }
  return NextResponse.json({ ok: true });
}
