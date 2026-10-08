import { NextResponse } from "next/server";
import { getUnsubscribers } from "../../../lib/data";

export const dynamic = "force-dynamic";

// מי ביקש הסרה (מרשימה או ממייל מסוים). קריאה בלבד.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  try {
    const contacts = await getUnsubscribers(sp.get("seq") || "", sp.get("step") || undefined);
    return NextResponse.json({ contacts });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "load failed", contacts: [] }, { status: 500 });
  }
}
