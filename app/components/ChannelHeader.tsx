"use client";

import { ReactNode } from "react";
import { BrandIcon, Net } from "./BrandIcon";

/**
 * כותרת אחידה לכל הערוצים: כפתור "חזור אחורה" בצד ההתחלה (ימין),
 * הלוגו והשם במרכז — הכל על אותו קו. תג/מידע נוסף נכנס ל-extra בצד השני.
 */
export default function ChannelHeader({
  net,
  icon,
  title,
  subtitle,
  onBack,
  extra,
}: {
  net?: Net;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  extra?: ReactNode;
}) {
  return (
    <header className="ch-head">
      <div className="ch-head-side">
        {onBack && (
          <button className="ch-back" onClick={onBack} aria-label="חזור אחורה">
            <span style={{ fontSize: 19, lineHeight: 1 }}>→</span>
            <span className="ch-back-label">חזור אחורה</span>
          </button>
        )}
      </div>

      <div className="ch-head-main">
        {icon ?? (net && <BrandIcon net={net} size={52} />)}
        <div className="text-right">
          <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="text-[16px] text-[var(--text-dim)]">{subtitle}</p>}
        </div>
      </div>

      <div className="ch-head-side ch-head-end">{extra}</div>
    </header>
  );
}
