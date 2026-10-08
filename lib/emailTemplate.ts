import { BRAND } from "../config/brand";
import { LINKS, OFFERS, SOCIALS } from "../config/offers";
import { button, divider } from "./emailBlocks";

// ===== התבנית של כל מייל =====
// הסדר קבוע: גוף המייל → חתימה → תמונה עגולה → נ.ב → בלוק ההצעות → תחתית עם הסרה.

const siteBase = () => (process.env.SITE_URL || BRAND.siteUrl).replace(/\/$/, "");

function shell(inner: string) {
  return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" />
  <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>:root{color-scheme:light;}</style></head>
  <body dir="rtl" style="margin:0;background:${BRAND.emailBg};font-family:'Assistant',Arial,sans-serif;direction:rtl;text-align:right;">
  <div dir="rtl" style="background:${BRAND.emailBg};padding:28px 14px;font-family:'Assistant',Arial,sans-serif;direction:rtl;text-align:right;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;box-shadow:0 10px 40px rgba(56,156,140,0.25),0 4px 16px rgba(15,82,87,0.15);">
  <div dir="rtl" style="font-family:'Assistant',Arial,sans-serif;font-size:18px;line-height:1.25;color:#0a0a0a;padding:32px 28px;direction:rtl;text-align:right;">
  ${inner}
  </div></div></div></body></html>`;
}

function signature() {
  const img = BRAND.logo
    ? `<img src="${siteBase()}${BRAND.logo}" alt="${BRAND.name}" width="120" height="120" style="border-radius:50%;display:block;margin:18px 0 0;object-fit:cover;" />`
    : "";
  return `<p style="margin:28px 0 14px;line-height:1.25;font-size:18px;">${BRAND.signOff}<br />${BRAND.signName}</p>${img}`;
}

function offersBlock() {
  const o = (t: string, d: string, lt: string, h: string) =>
    `<p style="margin:22px 0 12px;font-weight:700;color:#0a0a0a;line-height:1.25;font-size:18px;">${t}</p><p style="margin:0 0 12px;color:#0a0a0a;line-height:1.25;font-size:18px;">${d}</p><p style="margin:0 0 6px;line-height:1.25;font-size:18px;"><a href="${h}" style="text-decoration:underline;">${lt} &gt;&gt;&gt;</a></p>`;
  return `<div style="margin-top:30px;">${divider}</div>
    <div style="padding:14px 0 6px;"><p style="margin:8px 0 16px;font-size:21px;font-weight:700;text-align:center;line-height:1.25;">${OFFERS.headline}</p>
    ${OFFERS.items.map((i) => o(i.title, i.desc, i.linkText, i.url)).join("\n")}</div>
    <div style="margin-top:22px;">${divider}</div>`;
}

function footer(email: string, unsubscribeUrl: string) {
  const year = new Date().getFullYear();
  const socials = SOCIALS.length
    ? `<p style="color:#0a0a0a;font-size:15px;margin:0 0 10px;">עקבו אחריי ברשתות החברתיות:</p>
       <p style="font-size:15px;margin:0 0 18px;">${SOCIALS.map((s) => `<a href="${s.url}" style="text-decoration:underline;margin:0 6px;">${s.label}</a>`).join("")}</p>`
    : "";
  return `
    <div style="text-align:center;margin-top:30px;padding-top:6px;">
      ${socials}
      <p style="color:#0a0a0a;font-size:13px;margin:0 0 6px;">מייל זה נשלח לכתובת <a href="mailto:${email}" style="text-decoration:underline;">${email}</a></p>
      <p style="color:#0a0a0a;font-size:13px;margin:0 0 10px;"><a href="${unsubscribeUrl}" style="text-decoration:underline;">הסרה</a><span style="color:#bbb;margin:0 6px;">|</span><a href="${LINKS.site}" style="text-decoration:underline;">לאתר</a></p>
      <p style="color:#0a0a0a;font-size:13px;margin:12px 0 0;">${BRAND.name} © ${year} כל הזכויות שמורות</p>
    </div>`;
}

export function renderEmail(opts: {
  body: string;
  ps?: string;
  offers?: boolean;
  name?: string | null;
  email?: string;
  button?: { text: string; url: string };
  unsubscribeUrl?: string;
}): string {
  const first = (opts.name || "").trim().split(/\s+/)[0];
  const fill = (s: string) => s.replace(/\{\{name\}\}/g, first ? `היי ${escapeHtml(first)}` : "היי");
  const ps = opts.ps ? `<p style="margin:24px 0 8px;line-height:1.25;font-size:18px;">נ.ב -</p>${fill(opts.ps)}` : "";
  return shell(`
    ${fill(opts.body)}
    ${opts.button ? button(opts.button.url, escapeHtml(opts.button.text)) : ""}
    ${signature()}
    ${ps}
    ${opts.offers === false ? "" : offersBlock()}
    ${footer(opts.email || "you@example.com", opts.unsubscribeUrl || "#")}`);
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// טקסט נקי מתוך ה HTML, לתצוגה מקדימה קצרה
export function plainPreview(body: string, max = 140): string {
  const t = body.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, " ").replace(/\{\{name\}\}/g, "היי").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

