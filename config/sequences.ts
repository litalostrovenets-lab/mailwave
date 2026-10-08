// ===== רצפי מיילים אוטומטיים =====
// רצף = כמה מיילים שיוצאים לבד לכל מי שמצטרף לרשימה, לפי מספר ימים מההצטרפות.
// delayDays = כמה ימים אחרי המייל הקודם (במייל הראשון 0 = מיד בהצטרפות).
// body = תוכן המייל, בנוי מ P() / BB() / cta() שב lib/emailBlocks.ts. החתימה, ההצעות וההסרה נוספים לבד.
// {{name}} מוחלף בשם הפרטי של הנמען (או "היי" כשאין שם).
// id של רצף ושל מייל: באנגלית בלבד, ואסור לשנות אחרי שהתחילו לצאת מיילים.

import { MAIN_LIST_STEPS } from "./emails/main-list";

export type SequenceStep = {
  id: string;
  subject: string;
  delayDays: number;
  body: string;
  // ה"נ.ב -" שאחרי החתימה (לא חובה)
  ps?: string;
  // בלוק ההצעות בסוף המייל. ברירת מחדל: מופיע. במייל הראשון בדרך כלל false
  offers?: boolean;
  // כפתור בסוף המייל (לא חובה)
  button?: { text: string; url: string };
};

export type SequenceDef = {
  id: string;
  listId: string;
  name: string;
  description: string;
  steps: SequenceStep[];
};

export const SEQUENCES: SequenceDef[] = [
  {
    id: "main_nurture",
    listId: "main",
    name: "רצף רשימה ראשית",
    description: "יוצא לכל מי שמצטרפת לרשימה הראשית",
    steps: MAIN_LIST_STEPS,
  },
  // עוד אין רצפים. דוגמה למבנה (להעתיק, לבטל את ההערה ולשנות):
  // {
  //   id: "welcome",
  //   listId: "lm_ingredients",
  //   name: "רצף ברוכים הבאים",
  //   description: "יוצא לכל מי שהוריד את המדריך החינמי",
  //   steps: [
  //     {
  //       id: "w1",
  //       subject: "המדריך שלך מחכה כאן",
  //       delayDays: 0,
  //       body: `<p>{{name}},</p>
  // <p>איזה כיף שהצטרפת.</p>
  // <p>הנה המדריך שביקשת. שווה לפתוח אותו עוד היום, כל עוד ההתלהבות חמה.</p>`,
  //       button: { text: "להורדת המדריך", url: "https://example.com/guide" },
  //     },
  //     {
  //       id: "w2",
  //       subject: "הטעות שכמעט כולם עושים בהתחלה",
  //       delayDays: 2,
  //       body: `<p>{{name}},</p>
  // <p>רוב האנשים מנסים לשנות הכל בבת אחת.</p>
  // <p>זה עובד יומיים, ואז נגמר.</p>
  // <p>הסוד הוא צעד אחד קטן בכל יום. רק אחד.</p>`,
  //     },
  //     {
  //       id: "w3",
  //       subject: "רציתי לשאול אותך משהו",
  //       delayDays: 3,
  //       body: `<p>{{name}},</p>
  // <p>מה הדבר האחד שהכי היית רוצה לשפר החודש?</p>
  // <p>פשוט תעני למייל הזה. אני קוראת הכל.</p>`,
  //     },
  //   ],
  // },
];
