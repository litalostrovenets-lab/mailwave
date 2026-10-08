import { createClient, SupabaseClient } from "@supabase/supabase-js";

// לפני חיבור Supabase: המסך מוצג נקי (הכל באפס) ושום דבר לא נשלח.
export const isDemo = () => !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

// חיבור צד שרת בלבד (מפתח service role). אף פעם לא נחשף לדפדפן.
export function db(): SupabaseClient {
  if (isDemo()) throw new Error("Supabase is not configured (demo mode)");
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

// מושך את כל השורות של שאילתה בדפים של 1000 (ברירת המחדל של Supabase חותכת ב 1000)
export async function selectAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
