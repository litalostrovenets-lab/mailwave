// ===== מיילים מתוזמנים (שידור חד פעמי לרשימה) =====
// כל מייל כאן יוצא פעם אחת לכל מי שברשימה, בתאריך ובשעה שנקבעו.
// dueAt בפורמט "YYYY-MM-DDTHH:MM" לפי שעון ישראל.
// כדי לבטל מייל: למחוק אותו מהרשימה לפני שהגיע הזמן שלו.
// id באנגלית בלבד, ואסור לשנות אחרי שהמייל יצא.

export type BroadcastDef = {
  id: string;
  listId: string;
  subject: string;
  dueAt: string;
  body: string;
  ps?: string;
  offers?: boolean;
  button?: { text: string; url: string };
};

export const BROADCASTS: BroadcastDef[] = [
  // דוגמה (תמחקי או תשני):
  // {
  //   id: "tip-oct-1",
  //   listId: "main",
  //   subject: "הטיפ של השבוע",
  //   dueAt: "2026-10-12T19:00",
  //   body: `<p>{{name}},</p><p>תוכן המייל כאן.</p>`,
  // },
];
