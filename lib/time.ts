// "2026-10-12T19:00" לפי שעון ישראל → Date אמיתי (כולל שעון קיץ/חורף)
export function israelTime(local: string): Date {
  const [d, t = "00:00"] = local.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, day, hh, mm);
  return new Date(guess - tzOffsetMs(new Date(guess)));
}

function tzOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const p = (k: string) => Number(parts.find((x) => x.type === k)?.value);
  const asUtc = Date.UTC(p("year"), p("month") - 1, p("day"), p("hour"), p("minute"), p("second"));
  return asUtc - at.getTime();
}

export const DAY_MS = 86400000;
