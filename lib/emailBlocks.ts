// ===== אבני הבניין של כל מייל =====
// P = פסקה רגילה · BB = שורה גדולה ומודגשת לרגע חשוב · cta = קישור עם >>> · button = כפתור
// שבירת שורה בתוך פסקה: <br />. כל שורה 3 עד 7 מילים.

export const P = (h: string) => `<p style="margin:0 0 22px;line-height:1.25;font-size:18px;">${h}</p>`;

export const BB = (h: string, px = 24, mb = 22) =>
  `<p style="margin:0 0 ${mb}px;font-size:${px}px;font-weight:700;line-height:1.2;">${h}</p>`;

export const cta = (href: string, t: string) =>
  `<p style="margin:22px 0;line-height:1.25;font-size:18px;"><a href="${href}" style="text-decoration:underline;">${t} &gt;&gt;&gt;</a></p>`;

// כפתור שנראה ככפתור גם כשהתמונות חסומות
export const button = (href: string, t: string, color = "#0f5257") =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:26px auto;"><tr><td align="center" bgcolor="${color}" style="border-radius:12px;"><a href="${href}" style="display:inline-block;padding:16px 40px;font-family:'Assistant',Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${t}</a></td></tr></table>`;

// קו מפריד שנעלם לשני הצדדים
export const divider = `<div style="height:2px;background:#000;background:linear-gradient(to right, rgba(0,0,0,0) 0%, #000 50%, rgba(0,0,0,0) 100%);line-height:2px;font-size:1px;">&nbsp;</div>`;
