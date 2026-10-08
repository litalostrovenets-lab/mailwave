import { BRAND } from "../config/brand";

export type OutEmail = {
  to: string;
  subject: string;
  html: string;
  tags: { source: string; step: string };
  unsubscribeUrl?: string;
};

const from = () => `${BRAND.fromName} <${BRAND.fromEmail}>`;

function toResend(e: OutEmail) {
  return {
    from: from(),
    to: [e.to],
    subject: e.subject,
    html: e.html,
    ...(BRAND.replyTo ? { reply_to: BRAND.replyTo } : {}),
    // התגים מאפשרים לשייך כל פתיחה/לחיצה למייל הנכון ברצף
    tags: [
      { name: "source", value: e.tags.source },
      { name: "step", value: e.tags.step },
    ],
    ...(e.unsubscribeUrl
      ? { headers: { "List-Unsubscribe": `<${e.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }
      : {}),
  };
}

// שליחה של עד 100 מיילים בקריאה אחת. מחזיר מזהה Resend לכל מייל לפי הסדר.
export async function sendBatch(emails: OutEmail[]): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY missing" };
  if (emails.length === 0) return { ok: true, ids: [] };
  try {
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(emails.map(toResend)),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: d?.message || `Resend ${r.status}` };
    const ids: string[] = (d?.data || []).map((x: { id: string }) => x.id);
    return { ok: true, ids };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

export async function sendOne(email: OutEmail) {
  const r = await sendBatch([email]);
  return r.ok ? { ok: true as const, id: r.ids[0] } : r;
}
