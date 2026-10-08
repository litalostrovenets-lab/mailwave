import { NextResponse } from "next/server";
import { isDemo } from "../../../../lib/db";
import { collectBroadcastJobs, deliver } from "../../../../lib/engine";
import { cronAuthorized } from "../../../../lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// שולח שידורים מתוזמנים שהגיע זמנם. מוגן ב CRON_SECRET.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (isDemo()) return NextResponse.json({ ok: true, demo: true });
  try {
    const result = await deliver(await collectBroadcastJobs());
    return NextResponse.json({ ok: result.errors.length === 0, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "run failed" }, { status: 500 });
  }
}
