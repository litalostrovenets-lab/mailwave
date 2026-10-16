// ===== ההצעות והקישורים שבמיילים =====
// הקישורים כאן הם זמניים (example.com). בהקמה מחליפים אותם בכתובות האמיתיות.

export const LINKS = {
  challenge: "https://litalosshealthcoach.com/30daychallenge/#offer",       // אתגר 30 יום
  coaching: "https://litalosshealthcoach.com/#contact", // ליווי אישי 1:1 (הטופס באתר של ליטל)
  ingredientsGuide: "https://example.com/ingredients", // מדריך לקריאת רכיבים בסופר
  periodGuide: "https://example.com/period",         // מדריך לכאבי ווסת
  bloatingGuide: "https://example.com/bloating",     // מדריך להפחתת נפיחות בטנית
  site: "https://litalosshealthcoach.com",
};

// הבלוק שבסוף כל מייל (חוץ מהראשון)
export const OFFERS = {
  headline: "ואם בא לך שנעשה את הדרך יחד,<br />הנה איך אפשר להתחיל:",
  items: [
    {
      title: "1) אתגר ניקוי אנטי דלקתי",
      desc: "תוכנית פשוטה, יום אחרי יום,<br />עם תפריט מסודר שעוזר לך<br />להרגיש קלה יותר, עם פחות<br />נפיחות והרבה יותר אנרגיה",
      linkText: "מכאן מצטרפות לאתגר",
      url: LINKS.challenge,
    },
    {
      title: "2) ליווי אישי 1:1",
      desc: "תכנית אישית עם תפריט,<br />בלי ספירת קלוריות ובלי הרעבה,<br />וליווי צמוד שלי כל יום,<br />לכל שאלה",
      linkText: "מכאן משאירות פרטים",
      url: LINKS.coaching,
    },
    {
      title: "3) המדריכים הטבעיים שלי",
      desc: "המדריך הטבעי לטיפול<br />בבעיות עיכול, והמדריך הטבעי<br />להפחתת כאבי ווסת",
      linkText: "מכאן מקבלות את המדריכים",
      url: LINKS.bloatingGuide,
    },
  ],
};

// רשתות חברתיות לתחתית המייל. ריק = השורה לא מוצגת
export const SOCIALS: { label: string; url: string }[] = [
  // { label: "Instagram", url: "https://www.instagram.com/..." },
  // { label: "TikTok", url: "https://www.tiktok.com/@..." },
];
