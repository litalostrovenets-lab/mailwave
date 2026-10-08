import { NextResponse } from "next/server";
import { getScheduled } from "../../../lib/data";

export const dynamic = "force-dynamic";

// המיילים המתוזמנים (מתוך config/broadcasts.ts). קריאה בלבד.
export async function GET() {
  try {
    return NextResponse.json({ emails: await getScheduled() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "load failed", emails: [] }, { status: 500 });
  }
}
