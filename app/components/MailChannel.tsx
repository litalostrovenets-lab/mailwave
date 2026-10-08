"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChannelHeader from "./ChannelHeader";
import { BRAND } from "../../config/brand";
import { LISTS } from "../../config/lists";

// read/failed/replied קיימים רק בצעדי וואטסאפ (שמורים כאן לעתיד, המערכת שולחת כרגע מייל בלבד).
type StepStats = { sent: number; delivered: number; opened: number; clicked: number; bounced: number; complained: number; unsubscribed: number; read?: number; failed?: number; replied?: number };
type SeqStep = {
  id: string;
  channel: "email" | "whatsapp" | "sms";
  subject: string;
  delay: string;
  trigger: string;
  preview: string;
  sent: number | null;
  html?: string | null;
  stats?: StepStats | null;
  unsubReq?: number;
};
type Sequence = {
  id: string;
  kind: "sequence" | "broadcast";
  name: string;
  audienceLabel: string;
  description: string;
  steps: SeqStep[];
  totalLeads: number;
  pendingLeads: number;
};

// מייל מתוזמן (מתוך config/broadcasts.ts)
type NewsletterEmail = {
  id: string;
  subject: string;
  dueAt: string;
  status?: string;
  preview?: string;
  html?: string | null;
  audienceLabel?: string;
};

// כל רשימות התפוצה מתוך config/lists.ts, כך שגם רשימה בלי רצף מופיעה (כ"אין רצף מוגדר").
const STATIC_LISTS = LISTS.map((l) => l.label);

function delayToDays(delay: string): number {
  const s = delay || "";
  if (/יומיים/.test(s)) return 2;
  const m = s.match(/(\d+)\s*(ימים|יום)/);
  if (m) return parseInt(m[1], 10);
  if (/\bיום\b/.test(s)) return 1;
  return 0;
}

const COLS = ["יום משלוח", "ימים מהקודם", "נושא", "נשלחו", "לא נשלחו", "נפתחו", "חזרו", "בקשו הסרה", "ספאם", "אחוז פתיחה", "קישורים שנלחצו"];
// כשיש בסדרה גם צעד וואטסאפ, הכותרות מציגות גם את המקבילה שלו. בוואטסאפ אין "נפתח" —
// יש "נקרא" (הוי הכחול), והנמען יכול לכבות אותו, ולכן המספר הוא רצפה ולא אמת מלאה.
// בעמודת הספאם אין לוואטסאפ מקבילה (מטא לא מדווחת), ולכן היא מציגה שם את "השיבו" —
// המדד החזק ביותר שיש בערוץ הזה, ושאין לו בכלל מקבילה במייל.
const COLS_WA = ["יום משלוח", "ימים מהקודם", "נושא", "נשלחו", "לא נשלחו / לא נמסרו", "נפתחו / נקראו", "חזרו / נכשלו", "בקשו הסרה", "ספאם / השיבו", "אחוז פתיחה / קריאה", "קישורים שנלחצו"];
const colsFor = (seq: { steps: SeqStep[] }) => (seq.steps.some((s) => s.channel === "whatsapp") ? COLS_WA : COLS);

type UnsubContact = { email: string; name?: string | null; phone?: string | null; at: string | null; link?: string | null };

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("he-IL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
}

type View = "menu" | "agent" | "agent-schedule" | "agent-analytics" | "lists";

export default function MailChannel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ה-View מגיע מה-URL כדי שרענון ישמור את המסך שבחרת (?view=agent / ?view=lists וכו')
  const urlView = searchParams.get("view");
  const VALID_VIEWS: View[] = ["agent", "agent-schedule", "agent-analytics", "lists"];
  const [view, setView] = useState<View>(VALID_VIEWS.includes(urlView as View) ? (urlView as View) : "menu");

  // מחליף מסך + מעדכן את ה-URL, כך שרענון או שיתוף קישור נופלים על אותו מסך
  function changeView(v: View) {
    setView(v);
    if (v === "menu") setOpenList(null);
    router.replace(v === "menu" ? "/mail" : `/mail?view=${v}`, { scroll: false });
  }
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [, setErr] = useState<string | null>(null);
  const [openList, setOpenList] = useState<string | null>(null);
  const [previewStep, setPreviewStep] = useState<SeqStep | null>(null);
  // הרצף שממנו נפתחה התצוגה המקדימה (בשביל שליחת הבדיקה)
  const [previewSeqId, setPreviewSeqId] = useState<string>("");
  const [testEmail, setTestEmail] = useState(BRAND.testEmail);
  const [testStatus, setTestStatus] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [unsubOpen, setUnsubOpen] = useState(false);
  const [unsubLoading, setUnsubLoading] = useState(false);
  const [unsubList, setUnsubList] = useState<UnsubContact[]>([]);
  const [unsubTitle, setUnsubTitle] = useState("ביקשו הסרה מהרשימה");
  // סוכן הניוזלטר
  const [nlEmails, setNlEmails] = useState<NewsletterEmail[]>([]);
  const [nlLoading, setNlLoading] = useState(true);
  const [nlPreview, setNlPreview] = useState<NewsletterEmail | null>(null);
  // Gentle fade-out before unmounting each layer (list detail / modals).
  const [listClosing, setListClosing] = useState(false);
  const [unsubClosing, setUnsubClosing] = useState(false);
  const [previewClosing, setPreviewClosing] = useState(false);
  const FADE_MS = 180;

  function closeList() {
    setListClosing(true);
    setTimeout(() => { setOpenList(null); setListClosing(false); }, FADE_MS);
  }
  function closeUnsub() {
    setUnsubClosing(true);
    setTimeout(() => { setUnsubOpen(false); setUnsubClosing(false); }, FADE_MS);
  }
  function closePreview() {
    setPreviewClosing(true);
    setTimeout(() => { setPreviewStep(null); setPreviewClosing(false); }, FADE_MS);
  }
  function closeNlPreview() {
    setNlPreview(null);
    setTestStatus("");
  }

  function openPreview(seqId: string, step: SeqStep) {
    setPreviewSeqId(seqId);
    setTestStatus("");
    setPreviewStep(step);
  }

  function openMailingList(name: string) {
    setOpenList(name);
  }

  // שליחת בדיקה לכתובת אחת בלבד, לפני שמשהו יוצא לרשימה
  async function sendTest(seqId: string, stepId: string) {
    if (!testEmail.trim()) return;
    setTestSending(true);
    setTestStatus("");
    try {
      const r = await fetch("/api/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail.trim(), seqId, stepId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "שליחת הבדיקה נכשלה");
      setTestStatus(`נשלח לבדיקה אל ${testEmail.trim()}`);
    } catch (e) {
      setTestStatus(e instanceof Error ? e.message : "שליחת הבדיקה נכשלה");
    } finally {
      setTestSending(false);
    }
  }

  const testRow = (seqId: string, stepId: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
      <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="כתובת מייל לבדיקה" aria-label="כתובת מייל לבדיקה" dir="rtl" style={{ flex: 1, minWidth: 220, padding: "10px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", direction: "rtl", textAlign: "right" }} />
      <button onClick={() => sendTest(seqId, stepId)} disabled={testSending} style={{ padding: "10px 16px", borderRadius: 9, border: "none", background: "var(--badge-text)", color: "var(--card)", fontWeight: 700, cursor: testSending ? "wait" : "pointer", opacity: testSending ? 0.7 : 1 }}>{testSending ? "שולח..." : "שלח מייל בדיקה"}</button>
      {testStatus && <span role="status" style={{ width: "100%", fontSize: 13, color: "var(--text-dim)" }}>{testStatus}</span>}
    </div>
  );

  async function openPeople(title: string, url: string) {
    setUnsubOpen(true);
    setUnsubLoading(true);
    setUnsubList([]);
    setUnsubTitle(title);
    try {
      const r = await fetch(url, { cache: "no-store" });
      const d = await r.json();
      setUnsubList(d.contacts || []);
    } catch {
      setUnsubList([]);
    }
    setUnsubLoading(false);
  }

  function openUnsub(seqId: string, step?: { id: string; subject: string }) {
    const qs = `seq=${encodeURIComponent(seqId)}${step ? `&step=${encodeURIComponent(step.id)}` : ""}`;
    openPeople(step ? `הסירו מהמייל: ${step.subject}` : "ביקשו הסרה מהרשימה", `/api/mail-unsubscribers?${qs}`);
  }

  function openStepContacts(seqId: string, step: { id: string; subject: string }, type: string, label: string) {
    const qs = `seq=${encodeURIComponent(seqId)}&step=${encodeURIComponent(step.id)}&type=${encodeURIComponent(type)}`;
    openPeople(`${label}: ${step.subject}`, `/api/mail-step-contacts?${qs}`);
  }

  useEffect(() => {
    fetch("/api/mail-sequences", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setSequences(d.sequences || []);
        setDemo(!!d.demo);
        if (d.error) setErr(d.error);
      })
      .catch(() => setErr("הטעינה נכשלה"))
      .finally(() => setLoading(false));
    fetch("/api/newsletter-schedule", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setNlEmails((d.emails || []).filter((e: NewsletterEmail) => e.status !== "sent" && e.dueAt && new Date(e.dueAt).getTime() > Date.now())))
      .catch(() => setNlEmails([]))
      .finally(() => setNlLoading(false));
  }, []);

  // רשימה מציגה את הרצף האוטומטי שלה; אם אין לה רצף, את השידורים שיצאו אליה
  const seqForList = (label: string) =>
    sequences.find((s) => s.audienceLabel === label && s.kind === "sequence") || sequences.find((s) => s.audienceLabel === label);
  const activeSeq = openList ? seqForList(openList) : null;

  const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 };

  // טבלת הנתונים של רצף. משמשת גם את פירוט הרשימות וגם את מסך האנליטיקה של הסוכן
  const renderSeqTable = (seq: Sequence) => (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, whiteSpace: "nowrap", color: "var(--text)" }}>
        <thead>
          <tr style={{ color: "var(--text-dim)", borderBottom: "2px solid var(--border)", background: "var(--bg)" }}>
            {colsFor(seq).map((h, i) => (
              <th key={i} style={{ padding: "11px 12px", fontWeight: 600, fontSize: 13, textAlign: i === 2 ? "right" : "center" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(() => {
            let cum = 0;
            return seq.steps.map((step, i) => {
              const gap = delayToDays(step.delay);
              cum += gap;
              const td: React.CSSProperties = { padding: "13px 12px", textAlign: "center", color: "var(--text)", borderBottom: i < seq.steps.length - 1 ? "1px solid var(--border)" : "none" };
              const dash = <span style={{ color: "var(--text-faint)" }}>·</span>;
              const s = step.stats;
              const sent = s?.sent || step.sent || 0;
              const delivered = s?.delivered ?? 0;
              const opened = s?.opened ?? 0;
              const bounced = s?.bounced ?? 0;
              const complained = s?.complained ?? 0;
              const unsubs = step.unsubReq ?? 0;
              const clicked = s?.clicked ?? 0;
              // נתוני מסירה אמינים רק אם המסירות מכסות את הפתיחות (פתיחה היא תמיד תת-קבוצה של מסירה).
              // בשידור גדול שחלק ממסירותיו לא תויגו, delivered קטן מלאכותית — ואז נופלים ל"נשלחו"
              // כבסיס, אחרת אחוז הפתיחה מתפוצץ (למשל 999÷4 = 24950%).
              const reliableDelivery = delivered > 0 && delivered >= opened;
              const openBase = reliableDelivery ? delivered : sent;
              const openRate = openBase > 0 ? Math.min(100, (opened / openBase) * 100) : 0;
              // "לא נשלחו" מוצג רק כשיש נתוני מסירה אמינים; אחרת 0 (לא להציג כישלון מדומה).
              const notSent = reliableDelivery ? Math.max(0, sent - delivered) : 0;
              const cell = (n: number, color = "var(--text)") => (n > 0 ? <span style={{ color }}>{n}</span> : dash);
              const linkBtn = (color: string): React.CSSProperties => ({ color, fontWeight: 700, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 14, textDecoration: "underline" });
              const st = { id: step.id, subject: step.subject };
              const clickNum = (n: number, type: string, label: string, color = "var(--text)") =>
                n > 0 ? <button onClick={() => openStepContacts(seq.id, st, type, label)} style={linkBtn(color)}>{n}</button> : dash;
              // וואטסאפ הוא ערוץ אחר: אין פיקסל פתיחה, מטא לא מדווחת על דיווחי ספאם ולא על
              // לחיצות בכפתור התבנית, ואין כותרת הסרה. עמודה בלי מקור אמיתי מציגה נקודה עם
              // הסבר במקום 0 שנראה כמו נתון. המספרים מוצגים כטקסט ולא כקישור, כי הפירוט
              // לפי אנשים (step-contacts) עדיין מכיר רק אירועי מייל.
              const isWa = step.channel === "whatsapp";
              const waDash = (why: string) => <span title={why} style={{ color: "var(--text-faint)", cursor: "help" }}>·</span>;
              const waRead = s?.read ?? 0;
              const waReplied = s?.replied ?? 0;
              const waFailed = s?.failed ?? bounced;
              const waNotDelivered = delivered > 0 ? Math.max(0, sent - delivered) : 0;
              const waReadRate = delivered > 0 ? Math.min(100, (waRead / delivered) * 100) : 0;
              return (
                <tr key={step.id}>
                  <td style={td}>{cum}</td>
                  <td style={td}>{i === 0 ? 0 : gap}</td>
                  <td style={{ ...td, textAlign: "right", maxWidth: 320, whiteSpace: "normal" }}>
                    {step.html ? (
                      <button onClick={() => openPreview(seq.id, step)} style={{ color: "var(--green-dim)", textDecoration: "underline", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: 0, textAlign: "right" }}>{step.subject}</button>
                    ) : (
                      <span style={{ fontWeight: 700 }}>{step.subject}</span>
                    )}
                    {step.channel === "whatsapp" && (
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 99, background: "rgba(37,211,102,0.15)", color: "#128a3e", fontWeight: 700, marginRight: 8 }}>וואטסאפ</span>
                    )}
                    {step.channel === "sms" && (
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 99, background: "rgba(59,130,246,0.15)", color: "#2563eb", fontWeight: 700, marginRight: 8 }}>SMS</span>
                    )}
                  </td>
                  <td style={td}>{isWa ? cell(sent) : clickNum(sent, "sent", "נשלחו")}</td>
                  <td style={td}>{isWa ? (waNotDelivered > 0 ? cell(waNotDelivered, "#d1493f") : waDash("אין עדיין הזנת סטטוסי מסירה מהספק")) : clickNum(notSent, "notdelivered", "לא נשלחו", "#d1493f")}</td>
                  <td style={td}>{isWa ? (waRead > 0 ? cell(waRead, "var(--green-dim)") : waDash("נקרא = הוי הכחול. אין עדיין הזנת סטטוסים מהספק, והנמען יכול לכבות אישורי קריאה")) : clickNum(opened, "opened", "נפתחו", "var(--green-dim)")}</td>
                  <td style={td}>{isWa ? (waFailed > 0 ? cell(waFailed, "#d1493f") : dash) : clickNum(bounced, "bounced", "חזרו", "#d1493f")}</td>
                  <td style={td}>
                    {isWa ? waDash("בוואטסאפ אין כפתור הסרה. נדרש סורק שמזהה בקשות הסרה בתשובות הנכנסות") : unsubs > 0 ? (
                      <button onClick={() => openUnsub(seq.id, st)} style={linkBtn("#976b1d")}>{unsubs}</button>
                    ) : dash}
                  </td>
                  <td style={td}>{isWa ? (waReplied > 0 ? <span title="מספר האנשים שהשיבו להודעה תוך 72 שעות. אין דיווחי ספאם בוואטסאפ, ולכן העמודה הזאת מציגה את השיעור הזה במקום" style={{ color: "var(--green-dim)", fontWeight: 700 }}>{waReplied}</span> : waDash("מטא לא מדווחת על דיווחי ספאם. כאן יוצג מספר מי שהשיבו להודעה")) : cell(complained, "#d1493f")}</td>
                  <td style={td}>{isWa ? (waRead > 0 ? <span style={{ color: waReadRate >= 40 ? "var(--green-dim)" : "var(--text)", fontWeight: 700 }}>{waReadRate.toFixed(1)}%</span> : waDash("יתמלא כשיהיו סטטוסי קריאה")) : opened > 0 ? <span style={{ color: openRate >= 40 ? "var(--green-dim)" : "var(--text)", fontWeight: 700 }}>{openRate.toFixed(1)}%</span> : dash}</td>
                  <td style={td}>{isWa ? (clicked > 0 ? cell(clicked, "var(--green-dim)") : waDash("מטא לא מדווחת על לחיצות בכפתור התבנית. נדרש קישור מעקב משלנו")) : clickNum(clicked, "clicked", "קישורים שנלחצו", "var(--green-dim)")}</td>
                </tr>
              );
            });
          })()}
        </tbody>
      </table>
    </div>
  );

  // יעד החזרה של כל מסך. מסכי המשנה של הסוכן חוזרים לבורר שלו, השאר לתפריט הראשי
  const BACK_TO: Record<View, View | null> = {
    menu: null,
    agent: "menu",
    "agent-schedule": "agent",
    "agent-analytics": "agent",
    lists: "menu",
  };
  const backTo = BACK_TO[view];

  return (
    <div className="min-h-screen flex flex-col" style={{ direction: "rtl" }}>
      <style>{`
        @keyframes mcFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes mcFadeOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(6px); } }
        .mc-fade-in { animation: mcFadeIn 0.22s ease; }
        .mc-fade-out { animation: mcFadeOut 0.18s ease forwards; }
      `}</style>

      {/* כותרת ממותגת. כמו בשאר הערוצים, עם כפתור החזרה על אותו קו */}
      <ChannelHeader
        net="mail"
        title={BRAND.teamName}
        subtitle="ניוזלטר ורשימות התפוצה של המותג"
        onBack={backTo ? () => changeView(backTo) : undefined}
        extra={demo ? (
          <span title="המערכת עוד לא מחוברת ל Supabase ול Resend, ולכן שום מייל לא יוצא" className="rounded-full px-3 py-1.5 text-[13px] font-bold" style={{ background: "var(--warn-bg)", color: "var(--warn-text)", border: "1px solid var(--warn-border)" }}>עוד לא מחובר</span>
        ) : undefined}
      />

      <div className="flex-1 overflow-auto px-7 py-6">
        <div className="mx-auto" style={{ maxWidth: 1400 }}>

          {/* ===== מסך בחירה ===== */}
          {view === "menu" && (
            <div className="mc-fade-in" style={{ maxWidth: 900, margin: "40px auto 0" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", textAlign: "center", marginBottom: 28 }}>מה תרצי לנהל?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
                <button onClick={() => changeView("agent")}
                  style={{ ...card, padding: 30, textAlign: "center", cursor: "pointer", color: "var(--text)", fontFamily: "inherit", boxShadow: "var(--card-glow)", transition: "transform .12s, box-shadow .12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}>
                  <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: 16, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#3ac97d,#0f5257)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.5L18.5 9l-4.6 1.5L12 15l-1.9-4.5L5.5 9l4.6-1.5L12 3ZM18 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" /></svg>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>סוכן AI לניוזלטר</h2>
                  <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.5 }}>המיילים המתוזמנים לשבוע הבא, שהסוכן כותב ושולח אוטומטית.</p>
                </button>

                <button onClick={() => changeView("lists")}
                  style={{ ...card, padding: 30, textAlign: "center", cursor: "pointer", color: "var(--text)", fontFamily: "inherit", boxShadow: "var(--card-glow)", transition: "transform .12s, box-shadow .12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}>
                  <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: 16, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#3ac97d,#0f5257)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>רשימות התפוצה של {BRAND.name}</h2>
                  <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.5 }}>כל רשימות התפוצה, הרצפים והנתונים החיים.</p>
                </button>
              </div>
            </div>
          )}

          {/* ===== סוכן AI לניוזלטר. בורר: תזמון או אנליטיקה ===== */}
          {view === "agent" && (
            <div className="mc-fade-in" style={{ maxWidth: 900, margin: "40px auto 0" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", textAlign: "center", marginBottom: 28 }}>סוכן AI לניוזלטר</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
                <button onClick={() => changeView("agent-schedule")}
                  style={{ ...card, padding: 30, textAlign: "center", cursor: "pointer", color: "var(--text)", fontFamily: "inherit", boxShadow: "var(--card-glow)", transition: "transform .12s, box-shadow .12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}>
                  <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: 16, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#3ac97d,#0f5257)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>תזמון מייל + תצוגה מקדימה</h2>
                  <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.5 }}>המיילים שעומדים לצאת לרשימה הראשית, כולל תצוגה מקדימה מלאה.</p>
                </button>

                <button onClick={() => changeView("agent-analytics")}
                  style={{ ...card, padding: 30, textAlign: "center", cursor: "pointer", color: "var(--text)", fontFamily: "inherit", boxShadow: "var(--card-glow)", transition: "transform .12s, box-shadow .12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}>
                  <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: 16, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#3ac97d,#0f5257)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-6M22 20H2" /></svg>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>מיילים ואנליטיקה</h2>
                  <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.5 }}>כל מייל שנשלח, עם נתוני אמת: נשלחו, נפתחו, קליקים והסרות.</p>
                </button>
              </div>
            </div>
          )}

          {/* ===== תזמון מייל + תצוגה מקדימה ===== */}
          {view === "agent-schedule" && (
            <div className="mc-fade-in">
              <div style={{ ...card, padding: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: "center" }}>תזמון מייל + תצוגה מקדימה</h2>
                <p style={{ fontSize: 15, color: "var(--text-dim)", textAlign: "center", marginTop: 4, marginBottom: 18 }}>המיילים המתוזמנים לשבועות הקרובים</p>

                {/* באנר קצב קבוע */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--badge-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--badge-text)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--badge-text)" }}>{BRAND.scheduleNote}</span>
                </div>

                {nlLoading ? (
                  <p style={{ color: "var(--text-dim)", textAlign: "center", padding: "30px 0" }}>טוען...</p>
                ) : nlEmails.length === 0 ? (
                  <div style={{ border: "1px dashed var(--border)", borderRadius: 12, padding: "38px 24px", textAlign: "center" }}>
                    <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>אין כרגע מיילים מתוזמנים</p>
                    <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.6 }}>כאן יופיעו המיילים שתזמנת לשבועות הקרובים,<br />כל אחד עם תצוגה מקדימה מלאה.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {nlEmails.map((m) => (
                      <div key={m.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, background: "var(--bg)" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--badge-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--badge-text)" }}>{fmtDateTime(m.dueAt)}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 99, padding: "2px 9px", background: "var(--badge-bg)", color: "var(--badge-text)", border: "1px solid var(--border)" }}>{m.status === "sent" ? "נשלח" : "מתוזמן"}</span>
                            {m.audienceLabel && (
                              <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 99, padding: "2px 9px", background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border)" }}>{m.audienceLabel}</span>
                            )}
                          </div>
                          <button onClick={() => setNlPreview(m)} title="לתצוגה מקדימה"
                            style={{ display: "block", maxWidth: "100%", marginTop: 16, fontSize: 17, fontWeight: 700, color: "var(--text)", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "right", textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject}</button>
                        </div>
                        {(m.html || m.preview) && (
                          <button onClick={() => setNlPreview(m)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 14px", color: "var(--green-dim)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14, whiteSpace: "nowrap" }}>תצוגה מקדימה</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== מיילים ואנליטיקה. נתוני אמת של שידורים שנשלחו ===== */}
          {view === "agent-analytics" && (
            <div className="mc-fade-in">
              <div style={{ ...card, padding: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: "center" }}>מיילים ואנליטיקה</h2>
                <p style={{ fontSize: 15, color: "var(--text-dim)", textAlign: "center", marginTop: 4, marginBottom: 18 }}>נתוני אמת של כל מייל שנשלח מהסוכן לרשימות התפוצה</p>
                {loading ? (
                  <p style={{ color: "var(--text-dim)", textAlign: "center", padding: "30px 0" }}>טוען נתונים...</p>
                ) : (() => {
                  // כל הרשימות שנשלחות דרך סוכן השידור — הרשימה הראשית + קמפיינים חד-פעמיים
                  // (כמו וובינר בן לביא). כל קמפיין מוצג בטבלה נפרדת עם ה-sequence id שלו,
                  // כדי שהקליקים על המספרים (נמענים/הסרות) יפנו לרשימה הנכונה.
                  const broadcastSeqs = sequences.filter((s) => s.kind === "broadcast");
                  const withData = broadcastSeqs
                    .map((s) => ({ seq: s, sentSteps: s.steps.filter((st) => (st.stats?.sent || st.sent || 0) > 0) }))
                    .filter((x) => x.sentSteps.length > 0);
                  if (withData.length === 0) return (
                    <div style={{ border: "1px dashed var(--border)", borderRadius: 12, padding: "38px 24px", textAlign: "center" }}>
                      <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>עוד לא נשלחו מיילים</p>
                      <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.6 }}>אחרי השליחה הראשונה, כל מייל יופיע כאן<br />עם הנתונים המלאים שלו: נשלחו, נפתחו, קליקים והסרות.</p>
                    </div>
                  );
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                      {withData.map(({ seq, sentSteps }) => (
                        <div key={seq.id}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{seq.audienceLabel}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 99, padding: "2px 10px", background: "var(--badge-bg)", color: "var(--badge-text)", border: "1px solid var(--border)" }}>{sentSteps.length === 1 ? "מייל אחד" : `${sentSteps.length} מיילים`}</span>
                          </div>
                          {renderSeqTable({ ...seq, steps: sentSteps })}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ===== רשימת תפוצה של המותג ===== */}
          {view === "lists" && (
            <div className="mc-fade-in">
              {/* Mailing lists grid */}
              <div style={{ ...card, padding: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 18, textAlign: "center" }}>רשימות התפוצה של {BRAND.name}</h2>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {STATIC_LISTS.map((name) => {
                    const seq = seqForList(name);
                    const connected = !!seq;
                    const selected = openList === name;
                    const listLoading = loading;
                    return (
                      <button
                        key={name}
                        onClick={() => openMailingList(name)}
                        style={{
                          textAlign: "right",
                          background: "var(--bg)",
                          border: selected ? "2px solid var(--green)" : "1px solid var(--border)",
                          borderRadius: 12,
                          padding: selected ? 17 : 18,
                          cursor: "pointer",
                          color: "var(--text)",
                          fontFamily: "inherit",
                        }}
                      >
                        <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{name}</p>
                        <p style={{ fontSize: 14, color: connected ? "var(--green-dim)" : "var(--text-faint)" }}>
                          {listLoading ? "טוען..." : connected ? (seq!.kind === "broadcast" ? `שידורים - ${seq!.steps.length} מיילים` : `אימייל סיקוונס - ${seq!.steps.length} מיילים`) : "אין רצף מוגדר"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* List detail */}
              {openList && (
                <div key={openList} className={listClosing ? "mc-fade-out" : "mc-fade-in"} style={{ ...card, padding: 24, marginTop: 18 }}>
                  <div style={{ position: "relative", marginBottom: 18 }}>
                    <h3 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", paddingBottom: 6 }}>{openList}</h3>
                    <button onClick={closeList} style={{ position: "absolute", top: 0, left: 0, background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 26, lineHeight: 1 }}>×</button>
                  </div>

                  {loading ? (
                    <p style={{ color: "var(--text-dim)", textAlign: "center", padding: "30px 0" }}>טוען נתונים...</p>
                  ) : !activeSeq ? (
                    <div style={{ border: "1px dashed var(--border)", borderRadius: 12, padding: 30, textAlign: "center" }}>
                      <p style={{ fontSize: 16, color: "var(--text-dim)", marginBottom: 6 }}>אין רצף מסרים מוגדר לרשימה זו</p>
                      <p style={{ fontSize: 13, color: "var(--text-faint)" }}>יוגדר כשנחבר לרשימה מיילים אוטומטיים</p>
                    </div>
                  ) : (
                    renderSeqTable(activeSeq)
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Unsubscribers modal. read-only list of who left the list */}
      {unsubOpen && (
        <div onClick={closeUnsub} className={unsubClosing ? "mc-fade-out" : "mc-fade-in"} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "82vh", overflow: "hidden", display: "flex", flexDirection: "column", direction: "rtl" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 19, fontWeight: 800 }}>{unsubTitle}</h3>
                <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                  {unsubLoading ? "טוען..." : `${unsubList.length} כתובות`}
                </p>
              </div>
              <button onClick={closeUnsub} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 26, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ overflowY: "auto", padding: "8px 0" }}>
              {unsubLoading ? (
                <p style={{ textAlign: "center", color: "var(--text-dim)", padding: "26px 0" }}>טוען...</p>
              ) : unsubList.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-faint)", padding: "26px 0" }}>אין נתונים להצגה</p>
              ) : (
                unsubList.map((c, i) => (
                  <div key={c.email + i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 22px", borderBottom: i < unsubList.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: c.name ? "var(--text)" : "var(--text-faint)" }}>{c.name || "ללא שם"}</p>
                      <p style={{ fontSize: 13, color: "var(--text-dim)", direction: "ltr", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</p>
                      {c.phone ? (
                        <p style={{ fontSize: 13, color: "var(--green-dim)", direction: "ltr", textAlign: "right" }}>{c.phone}</p>
                      ) : (
                        <p style={{ fontSize: 12, color: "var(--text-faint)" }}>ללא טלפון</p>
                      )}
                      {c.link && <p style={{ fontSize: 11, color: "var(--text-faint)", direction: "ltr", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>{c.link}</p>}
                    </div>
                    {c.at && <span style={{ fontSize: 12, color: "var(--text-faint)", whiteSpace: "nowrap" }}>{fmtDate(c.at)}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email preview modal (sequence step). read-only */}
      {previewStep && (
        <div onClick={closePreview} className={previewClosing ? "mc-fade-out" : "mc-fade-in"} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", direction: "rtl" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 4 }}>תצוגה מקדימה · {previewStep.delay}</p>
                <h3 style={{ fontSize: 20, fontWeight: 800 }}>{previewStep.subject}</h3>
              </div>
              <button onClick={closePreview} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 26, lineHeight: 1 }}>×</button>
            </div>
            {previewStep.html ? (
              <div style={{ background: "#fff", borderRadius: 10, flex: 1, overflow: "hidden" }}>
                <iframe srcDoc={previewStep.html} style={{ width: "100%", height: "70vh", border: "none" }} title="email preview" />
              </div>
            ) : (
              <p style={{ background: "var(--bg)", padding: 16, borderRadius: 10, color: "var(--text-dim)" }}>{previewStep.preview}</p>
            )}
            {previewStep.channel === "email" && previewSeqId && testRow(previewSeqId, previewStep.id)}
          </div>
        </div>
      )}

      {/* Newsletter agent email preview */}
      {nlPreview && (
        <div onClick={closeNlPreview} className="mc-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", direction: "rtl" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 4 }}>{fmtDateTime(nlPreview.dueAt)}</p>
                <h3 style={{ fontSize: 20, fontWeight: 800 }}>{nlPreview.subject}</h3>
              </div>
              <button onClick={closeNlPreview} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 26, lineHeight: 1 }}>×</button>
            </div>
            {nlPreview.html ? (
              <div style={{ background: "#fff", borderRadius: 10, flex: 1, overflow: "hidden" }}>
                <iframe srcDoc={nlPreview.html} style={{ width: "100%", height: "70vh", border: "none" }} title="newsletter preview" />
              </div>
            ) : (
              <p style={{ background: "var(--bg)", padding: 16, borderRadius: 10, color: "var(--text-dim)", whiteSpace: "pre-line", lineHeight: 1.7 }}>{nlPreview.preview}</p>
            )}
            {testRow("broadcast", nlPreview.id)}
          </div>
        </div>
      )}
    </div>
  );
}
