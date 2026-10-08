import { NextResponse } from "next/server";
import { getStepContacts } from "../../../lib/data";

export const dynamic = "force-dynamic";

const TYPES = ["sent", "notdelivered", "opened", "bounced", "clicked"];

// מי קיבל / פתח / לחץ / חזר במייל מסוים. קריאה בלבד.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") || "";
  if (!TYPES.includes(type)) return NextResponse.json({ error: "bad type", contacts: [] }, { status: 400 });
  try {
    const contacts = await getStepContacts(sp.get("seq") || "", sp.get("step") || "", type);
    return NextResponse.json({ contacts });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "load failed", contacts: [] }, { status: 500 });
  }
}
