import { NextResponse } from "next/server";
import { getSequences } from "../../../lib/data";
import { isDemo } from "../../../lib/db";

export const dynamic = "force-dynamic";

// כל הרצפים והשידורים, עם הנתונים של כל מייל. קריאה בלבד.
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    const all = await getSequences();
    return NextResponse.json({ demo: isDemo(), sequences: id ? all.filter((s) => s.id === id) : all });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "load failed", sequences: [] }, { status: 500 });
  }
}
