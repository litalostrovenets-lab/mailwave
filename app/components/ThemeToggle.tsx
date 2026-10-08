"use client";

import { useEffect, useState } from "react";

// כפתור צף בפינה השמאלית-תחתונה שמחליף בין מצב בהיר לכהה.
// הבחירה נשמרת ב-localStorage ומוחלת על <html data-theme>.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mail-theme") === "dark";
    setDark(saved);
    document.documentElement.dataset.theme = saved ? "dark" : "";
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "";
    localStorage.setItem("mail-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
      className="theme-toggle-btn fixed bottom-5 left-5 z-50 h-11 w-11 rounded-full grid place-items-center shadow-md"
      style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }}
    >
      {dark ? (
        // שמש. חזרה לבהיר
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // ירח. מעבר לכהה
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
