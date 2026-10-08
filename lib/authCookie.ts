// הערך של עוגיית הכניסה = טביעת אצבע של הסיסמה (לא הסיסמה עצמה)
export async function authToken(password: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`mail-v1::${password}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const AUTH_COOKIE = "mail_auth";
