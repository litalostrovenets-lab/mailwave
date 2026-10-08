import { createHmac, timingSafeEqual } from "crypto";
import { BRAND } from "../config/brand";

const secret = () => process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || "";

// קישור הסרה חתום, כך שאי אפשר להסיר מישהו אחר על ידי שינוי הכתובת
export function unsubscribeUrl(contactId: string, source: string, step: string): string {
  const sig = sign(`${contactId}|${source}|${step}`);
  const base = (process.env.SITE_URL || BRAND.siteUrl).replace(/\/$/, "");
  return `${base}/api/unsubscribe?c=${encodeURIComponent(contactId)}&s=${encodeURIComponent(source)}&st=${encodeURIComponent(step)}&t=${sig}`;
}

export function verifyUnsubscribe(contactId: string, source: string, step: string, token: string): boolean {
  return safeEqual(sign(`${contactId}|${source}|${step}`), token);
}

function sign(v: string): string {
  return createHmac("sha256", secret()).update(v).digest("hex").slice(0, 32);
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// הקרונים מוגנים בסוד: Vercel שולח אותו לבד, ושירות קרון חיצוני צריך לשלוח אותו בכותרת
export function cronAuthorized(req: Request): boolean {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  const h = req.headers.get("authorization") || "";
  const q = new URL(req.url).searchParams.get("secret") || "";
  return safeEqual(h, `Bearer ${s}`) || (q !== "" && safeEqual(q, s));
}

// אימות חתימה של Resend (Svix). בלי זה כל אחד יכול לשלוח אירועים מזויפים.
export function verifyResendWebhook(body: string, headers: Headers): boolean {
  const secretRaw = process.env.RESEND_WEBHOOK_SECRET;
  if (!secretRaw) return false;
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigs = headers.get("svix-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secretRaw.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  return sigs.split(" ").some((s) => safeEqual(s.split(",")[1] || "", expected));
}
