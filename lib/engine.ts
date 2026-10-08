// ===== מנוע השליחה =====
// רץ מהקרונים (/api/cron/sequences, /api/cron/broadcasts) ומהרשמה חדשה (/api/subscribe).
// כלל הברזל: כל מייל "נתפס" בטבלת sends לפני שהוא יוצא. אם הוא כבר נתפס, הוא לא יוצא שוב,
// גם אם השליחה הקודמת נכשלה. עדיף שמייל אחד לא יגיע מאשר שכל הרשימה תקבל אותו פעמיים.

import { SEQUENCES } from "../config/sequences";
import { BROADCASTS } from "../config/broadcasts";
import { db, selectAll } from "./db";
import { renderEmail } from "./emailTemplate";
import { sendBatch } from "./resend";
import { unsubscribeUrl } from "./security";
import { israelTime, DAY_MS } from "./time";

const MAX_PER_RUN = 400;          // תקרה לריצה אחת (שלא ייגמר הזמן של השרת). השאר יוצאים בריצה הבאה
const NEW_JOINER_DAYS = 3;        // מצטרף ותיק שלא קיבל את המייל הראשון לא נכנס לרצף מאפס
const GRACE_MS = 2 * 3600 * 1000; // מרווח ביטחון כדי שקרון יומי לא יפספס מייל בכמה שניות
const BROADCAST_STALE_DAYS = 2;   // שידור שהתאריך שלו עבר מזמן לא יוצא (הגנה מהעלאה מאוחרת)

type ContactRow = { id: string; email: string; name: string | null; unsubscribed_at: string | null };
type MemberRow = { contact_id: string; joined_at: string; contacts: ContactRow };
type Job = {
  contact: ContactRow;
  kind: "sequence" | "broadcast";
  source: string;
  step: { id: string; subject: string; body: string; ps?: string; offers?: boolean; button?: { text: string; url: string } };
};

export type RunResult = { sent: number; failed: number; skipped: number; errors: string[] };

async function listMembers(listId: string, onlyContact?: string): Promise<MemberRow[]> {
  return selectAll<MemberRow>((from, to) => {
    let q = db()
      .from("list_members")
      .select("contact_id, joined_at, contacts!inner(id, email, name, unsubscribed_at)")
      .eq("list_id", listId)
      .is("contacts.unsubscribed_at", null)
      .order("joined_at")
      .range(from, to);
    if (onlyContact) q = q.eq("contact_id", onlyContact);
    return q as unknown as PromiseLike<{ data: MemberRow[] | null; error: unknown }>;
  });
}

async function sentFor(source: string, onlyContact?: string) {
  const rows = await selectAll<{ contact_id: string; step_id: string; created_at: string }>((from, to) => {
    let q = db().from("sends").select("contact_id, step_id, created_at").eq("source_id", source).range(from, to);
    if (onlyContact) q = q.eq("contact_id", onlyContact);
    return q;
  });
  const map = new Map<string, Map<string, string>>();
  for (const r of rows) {
    if (!map.has(r.contact_id)) map.set(r.contact_id, new Map());
    map.get(r.contact_id)!.set(r.step_id, r.created_at);
  }
  return map;
}

// אוסף את מיילי הרצף שהגיע זמנם. onlyContact = רק לאדם אחד (מיד אחרי הרשמה)
export async function collectSequenceJobs(onlyContact?: string, onlyList?: string): Promise<Job[]> {
  const now = Date.now();
  const jobs: Job[] = [];
  for (const seq of SEQUENCES) {
    if (onlyList && seq.listId !== onlyList) continue;
    const members = await listMembers(seq.listId, onlyContact);
    if (members.length === 0) continue;
    const sent = await sentFor(seq.id, onlyContact);
    for (const m of members) {
      const c = m.contacts;
      if (!c || c.unsubscribed_at) continue;
      const done = sent.get(c.id) || new Map<string, string>();
      const idx = seq.steps.findIndex((st) => !done.has(st.id));
      if (idx === -1) continue;
      let dueAt: number;
      if (idx === 0) {
        const joined = Date.parse(m.joined_at);
        if (now - joined > NEW_JOINER_DAYS * DAY_MS) continue;
        dueAt = joined;
      } else {
        const prev = done.get(seq.steps[idx - 1].id);
        if (!prev) continue;
        dueAt = Date.parse(prev) + seq.steps[idx].delayDays * DAY_MS;
      }
      if (dueAt <= now + GRACE_MS) jobs.push({ contact: c, kind: "sequence", source: seq.id, step: seq.steps[idx] });
    }
  }
  return jobs;
}

export async function collectBroadcastJobs(): Promise<Job[]> {
  const now = Date.now();
  const jobs: Job[] = [];
  for (const b of BROADCASTS) {
    const due = israelTime(b.dueAt).getTime();
    if (due > now || now - due > BROADCAST_STALE_DAYS * DAY_MS) continue;
    const members = await listMembers(b.listId);
    const sent = await sentFor(b.id);
    for (const m of members) {
      // מי שהצטרף אחרי מועד השידור לא מקבל אותו בדיעבד
      if (Date.parse(m.joined_at) > due) continue;
      if (sent.has(m.contact_id)) continue;
      jobs.push({ contact: m.contacts, kind: "broadcast", source: b.id, step: { id: b.id, subject: b.subject, body: b.body, ps: b.ps, offers: b.offers, button: b.button } });
    }
  }
  return jobs;
}

// תופס ושולח. כל חבילה של עד 100 מיילים: קודם תפיסה, אחר כך שליחה, אחר כך עדכון סטטוס.
export async function deliver(all: Job[]): Promise<RunResult> {
  const res: RunResult = { sent: 0, failed: 0, skipped: 0, errors: [] };
  const jobs = all.slice(0, MAX_PER_RUN);
  res.skipped += all.length - jobs.length;

  for (let i = 0; i < jobs.length; i += 100) {
    const chunk = jobs.slice(i, i + 100);
    const { data: claimed, error } = await db()
      .from("sends")
      .upsert(
        chunk.map((j) => ({ contact_id: j.contact.id, email: j.contact.email, kind: j.kind, source_id: j.source, step_id: j.step.id, status: "claimed" })),
        { onConflict: "contact_id,source_id,step_id", ignoreDuplicates: true }
      )
      .select("id, contact_id, email, kind, source_id, step_id");
    if (error) { res.errors.push(`claim: ${(error as { message?: string }).message}`); break; }

    const key = (c: string, s: string, st: string) => `${c}|${s}|${st}`;
    const byKey = new Map((claimed || []).map((r) => [key(r.contact_id, r.source_id, r.step_id), r]));
    const mine = chunk.filter((j) => byKey.has(key(j.contact.id, j.source, j.step.id)));
    res.skipped += chunk.length - mine.length;
    if (mine.length === 0) continue;

    const emails = mine.map((j) => {
      const unsub = unsubscribeUrl(j.contact.id, j.source, j.step.id);
      return {
        to: j.contact.email,
        subject: j.step.subject,
        html: renderEmail({ body: j.step.body, ps: j.step.ps, offers: j.step.offers, name: j.contact.name, email: j.contact.email, button: j.step.button, unsubscribeUrl: unsub }),
        tags: { source: j.source, step: j.step.id },
        unsubscribeUrl: unsub,
      };
    });
    const out = await sendBatch(emails);
    const rows = mine.map((j, k) => {
      const r = byKey.get(key(j.contact.id, j.source, j.step.id))!;
      return out.ok
        ? { ...r, status: "sent", resend_id: out.ids[k] || null, error: null }
        : { ...r, status: "failed", resend_id: null, error: out.error };
    });
    await db().from("sends").upsert(rows, { onConflict: "id" });
    if (out.ok) res.sent += mine.length;
    else { res.failed += mine.length; res.errors.push(out.error); break; }
  }
  return res;
}
