// ===== רשימות התפוצה =====
// כל רשימה = קבוצת אנשים. מצטרפים אליה דרך טופס באתר (POST ל /api/subscribe עם list=<id>).
// id באנגלית בלבד (אותיות, מספרים, מקף תחתון). label = מה שרואים במסך.

export type MailingList = { id: string; label: string };

export const LISTS: MailingList[] = [
  { id: "main", label: "רשימה ראשית" },
  { id: "coaching", label: "ליווי אישי 1:1" },
  { id: "front_challenge", label: "מוצר פרונט - אתגר ניקוי אנטי דלקטי" },
  { id: "lm_ingredients", label: "ליד מגנט 1 - מדריך לקריאת רכיבים בסופר" },
  { id: "guide_period_pain", label: "מדריך לכאבי ווסת" },
  { id: "guide_bloating", label: "מדריך להפחתת נפיחות בטנית" },
];

export const listLabel = (id: string) => LISTS.find((l) => l.id === id)?.label || id;
