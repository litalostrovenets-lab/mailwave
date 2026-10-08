// ===== הנתונים שהמסך מציג =====
// לפני חיבור Supabase הכל מוצג נקי ובאפס (אין נתונים מזויפים). אחרי החיבור: נתוני אמת.

import { SEQUENCES } from "../config/sequences";
import { BROADCASTS } from "../config/broadcasts";
import { LISTS, listLabel } from "../config/lists";
import { db, isDemo, selectAll } from "./db";
import { renderEmail, plainPreview } from "./emailTemplate";
import { israelTime } from "./time";
import type { Contact, ScheduledEmail, Sequence, SeqStep, StepStats } from "./types";

const delayLabel = (d: number, i: number) =>
  i === 0 ? "מיד בהצטרפות" : d === 1 ? "יום אחרי הקודם" : d === 2 ? "יומיים אחרי הקודם" : `${d} ימים אחרי הקודם`;

type Count = { source_id: string; step_id: string; n: number };
type EvCount = Count & { type: string };

export async function getSequences(): Promise<Sequence[]> {
  const empty = Promise.resolve([]);
  const [sends, events, unsubs, lists] = isDemo() ? await Promise.all([empty, empty, empty, empty]) as [Count[], EvCount[], Count[], { list_id: string; n: number }[]] : await Promise.all([
    selectAll<Count>((f, t) => db().from("step_send_counts").select("*").range(f, t)),
    selectAll<EvCount>((f, t) => db().from("step_event_counts").select("*").range(f, t)),
    selectAll<Count>((f, t) => db().from("step_unsub_counts").select("*").range(f, t)),
    selectAll<{ list_id: string; n: number }>((f, t) => db().from("list_counts").select("*").range(f, t)),
  ]);
  const k = (s: string, st: string) => `${s}|${st}`;
  const sentMap = new Map(sends.map((r) => [k(r.source_id, r.step_id), r.n]));
  const unsubMap = new Map(unsubs.map((r) => [k(r.source_id, r.step_id), r.n]));
  const evMap = new Map<string, Record<string, number>>();
  for (const e of events) {
    const key = k(e.source_id, e.step_id);
    evMap.set(key, { ...(evMap.get(key) || {}), [e.type]: e.n });
  }
  const listSize = new Map(lists.map((l) => [l.list_id, l.n]));

  const statsFor = (source: string, step: string): StepStats => {
    const ev = evMap.get(k(source, step)) || {};
    return {
      sent: sentMap.get(k(source, step)) || 0,
      delivered: ev.delivered || 0, opened: ev.opened || 0, clicked: ev.clicked || 0,
      bounced: ev.bounced || 0, complained: ev.complained || 0, unsubscribed: unsubMap.get(k(source, step)) || 0,
    };
  };
  type Src = { body: string; ps?: string; offers?: boolean; button?: { text: string; url: string } };
  const step = (source: string, id: string, subject: string, delay: string, src: Src): SeqStep => {
    const stats = statsFor(source, id);
    return {
      id, channel: "email", subject, delay, trigger: "", preview: plainPreview(src.body), sent: stats.sent,
      html: renderEmail({ ...src, name: "" }), stats, unsubReq: stats.unsubscribed,
    };
  };

  const out: Sequence[] = SEQUENCES.map((seq) => ({
    id: seq.id, kind: "sequence", name: seq.name, audienceLabel: listLabel(seq.listId), description: seq.description,
    totalLeads: listSize.get(seq.listId) || 0, pendingLeads: 0,
    steps: seq.steps.map((st, i) => step(seq.id, st.id, st.subject, delayLabel(st.delayDays, i), st)),
  }));

  // שידורים חד פעמיים: טבלה אחת לכל רשימה. כל שידור = שורה (המזהה שלו משמש גם כרצף וגם כצעד)
  for (const l of LISTS) {
    const bs = BROADCASTS.filter((b) => b.listId === l.id).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    if (bs.length === 0) continue;
    out.push({
      id: `broadcast:${l.id}`, kind: "broadcast", name: "שידורים", audienceLabel: l.label, description: "",
      totalLeads: listSize.get(l.id) || 0, pendingLeads: 0,
      steps: bs.map((b, i) => {
        const gap = i === 0 ? 0 : Math.round((israelTime(b.dueAt).getTime() - israelTime(bs[i - 1].dueAt).getTime()) / 86400000);
        return step(b.id, b.id, b.subject, delayLabel(gap, i), b);
      }),
    });
  }
  return out;
}

export async function getScheduled(): Promise<ScheduledEmail[]> {
  const now = Date.now();
  return BROADCASTS.map((b) => {
    const due = israelTime(b.dueAt);
    return {
      id: b.id, subject: b.subject, dueAt: due.toISOString(),
      status: due.getTime() <= now ? "sent" : "scheduled",
      audienceLabel: listLabel(b.listId), preview: plainPreview(b.body),
      html: renderEmail({ ...b, name: "" }),
    } as ScheduledEmail;
  }).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

// בשידור, מזהה הרצף במסך הוא broadcast:<list> אבל בנתונים כל שידור הוא מקור בפני עצמו
const sourceOf = (seq: string, step: string) => (seq.startsWith("broadcast:") ? step : seq);

async function withNames(rows: { email: string; at: string | null; link?: string | null }[]): Promise<Contact[]> {
  const emails = [...new Set(rows.map((r) => r.email))];
  const info = new Map<string, { name: string | null; phone: string | null }>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data } = await db().from("contacts").select("email, name, phone").in("email", emails.slice(i, i + 200));
    for (const c of data || []) info.set(c.email, { name: c.name, phone: c.phone });
  }
  return rows.map((r) => ({ ...r, name: info.get(r.email)?.name ?? null, phone: info.get(r.email)?.phone ?? null }));
}

export async function getStepContacts(seq: string, step: string, type: string): Promise<Contact[]> {
  if (isDemo()) return [];
  const source = sourceOf(seq, step);

  const sentRows = async () =>
    selectAll<{ email: string; created_at: string }>((f, t) =>
      db().from("sends").select("email, created_at").eq("source_id", source).eq("step_id", step).eq("status", "sent").range(f, t));
  const eventRows = async (type: string) =>
    selectAll<{ email: string; created_at: string; link: string | null }>((f, t) =>
      db().from("email_events").select("email, created_at, link").eq("source_id", source).eq("step_id", step).eq("type", type).order("created_at", { ascending: false }).range(f, t));

  if (type === "sent") return withNames((await sentRows()).map((r) => ({ email: r.email, at: r.created_at })));
  if (type === "notdelivered") {
    const delivered = new Set((await eventRows("delivered")).map((r) => r.email));
    return withNames((await sentRows()).filter((r) => !delivered.has(r.email)).map((r) => ({ email: r.email, at: r.created_at })));
  }
  const seen = new Set<string>();
  const rows = (await eventRows(type)).filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));
  return withNames(rows.map((r) => ({ email: r.email, at: r.created_at, link: type === "clicked" ? r.link : null })));
}

export async function getUnsubscribers(seq: string, step?: string): Promise<Contact[]> {
  if (isDemo()) return [];
  let q = db().from("unsubscribes").select("email, created_at").order("created_at", { ascending: false }).limit(2000);
  if (seq.startsWith("broadcast:")) {
    q = step ? q.eq("source_id", step) : q.in("source_id", BROADCASTS.filter((b) => `broadcast:${b.listId}` === seq).map((b) => b.id));
  } else {
    q = q.eq("source_id", seq);
    if (step) q = q.eq("step_id", step);
  }
  const { data } = await q;
  return withNames((data || []).map((r) => ({ email: r.email, at: r.created_at })));
}
