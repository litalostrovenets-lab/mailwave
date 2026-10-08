import { NextResponse } from "next/server";
import { LISTS } from "../../../config/lists";
import { db, isDemo } from "../../../lib/db";
import { collectSequenceJobs, deliver } from "../../../lib/engine";

// הצטרפות לרשימה. זה מה שהטופס באתר שולח אליו.
// JSON או טופס רגיל: email (חובה), list (חובה, מזהה מ config/lists.ts), name, phone, redirect.
// המייל הראשון ברצף של הרשימה יוצא מיד.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  let f: Record<string, string> = {};
  if (ct.includes("application/json")) f = await req.json().catch(() => ({}));
  else {
    const form = await req.formData().catch(() => null);
    form?.forEach((v, k) => { f[k] = String(v); });
  }

  const email = String(f.email || "").trim().toLowerCase();
  const list = String(f.list || "").trim();
  const name = String(f.name || "").trim().slice(0, 120) || null;
  const phone = String(f.phone || "").trim().slice(0, 30) || null;
  const redirect = String(f.redirect || "");
  const fail = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status, headers: CORS });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return fail("invalid email");
  if (!LISTS.some((l) => l.id === list)) return fail("unknown list");
  if (isDemo()) return fail("demo mode: connect Supabase first", 503);

  const { data: contact, error } = await db()
    .from("contacts")
    .upsert({ email, ...(name ? { name } : {}), ...(phone ? { phone } : {}), unsubscribed_at: null }, { onConflict: "email" })
    .select("id")
    .single();
  if (error || !contact) return fail("save failed", 500);

  await db().from("list_members").upsert({ contact_id: contact.id, list_id: list }, { onConflict: "contact_id,list_id", ignoreDuplicates: true });

  // מייל ברוכים הבאים מיד, בלי לחכות לקרון
  try {
    const jobs = await collectSequenceJobs(contact.id, list);
    if (jobs.length) await deliver(jobs);
  } catch { /* הקרון ישלים */ }

  if (redirect && /^https?:\/\//.test(redirect)) return NextResponse.redirect(redirect, 303);
  return NextResponse.json({ ok: true }, { headers: CORS });
}
