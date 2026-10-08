import { NextResponse } from "next/server";
import { SEQUENCES } from "../../../config/sequences";
import { BROADCASTS } from "../../../config/broadcasts";
import { isDemo } from "../../../lib/db";
import { renderEmail } from "../../../lib/emailTemplate";
import { sendOne } from "../../../lib/resend";

// שליחת מייל בדיקה לכתובת אחת בלבד. לא נרשם בנתונים ולא נוגע ברשימות.
export async function POST(req: Request) {
  if (isDemo() || !process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "במצב דמו אין שליחה אמיתית. אחרי חיבור Resend הכפתור ישלח באמת" }, { status: 400 });
  }
  const { email, seqId, stepId } = await req.json().catch(() => ({}));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "כתובת מייל לא תקינה" }, { status: 400 });

  const seqStep = SEQUENCES.find((s) => s.id === seqId)?.steps.find((s) => s.id === stepId);
  const b = BROADCASTS.find((x) => x.id === stepId);
  const step = seqStep || b || null;
  if (!step) return NextResponse.json({ error: "המייל לא נמצא" }, { status: 404 });

  const r = await sendOne({
    to: email,
    subject: `[בדיקה] ${step.subject}`,
    html: renderEmail({ ...step, name: "", email }),
    tags: { source: "test", step: "test" },
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true });
}
