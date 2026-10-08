"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandIcon } from "./BrandIcon";
import AppLogo from "./AppLogo";
import { BRAND } from "../../config/brand";

/* ===== אווטאר מותג: לוגו אם יש, אחרת עיגול עם אות ===== */
function BrandAvatar() {
  if (BRAND.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={BRAND.logo} alt={BRAND.name} className="h-9 w-9 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="h-9 w-9 rounded-full grid place-items-center text-white text-[14px] font-bold shrink-0"
      style={{ background: BRAND.color }}>{BRAND.short}</div>
  );
}

export default function Sidebar() {
  const path = usePathname();
  const [count, setCount] = useState(0);

  // כמה מיילים מתוזמנים לעתיד (התג הירוק ליד הערוץ)
  useEffect(() => {
    fetch("/api/newsletter-schedule")
      .then((r) => r.json())
      .then((d) => setCount((d.emails || []).filter((e: { status?: string; dueAt?: string }) =>
        e.status !== "sent" && e.dueAt && new Date(e.dueAt).getTime() > Date.now()).length))
      .catch(() => {});
  }, []);

  const active = path.startsWith("/mail");

  return (
    <aside className="mail-sidebar w-72 shrink-0 h-screen sticky top-0 overflow-y-auto hidden md:flex flex-col text-[var(--text)]"
      style={{ background: "var(--sidebar)", borderLeft: "1px solid var(--border)", scrollbarWidth: "none" } as React.CSSProperties}>
      {/* לוגו */}
      <div className="px-4 pt-8 pb-3 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <AppLogo size={44} />
          <span className="font-extrabold text-[25px] tracking-tight">{BRAND.appName}</span>
        </div>
      </div>

      {/* ערוצים */}
      <div className="px-4 pt-5 pb-1 flex items-center justify-between">
        <span className="text-[13px] font-semibold tracking-wide text-[var(--text-faint)]">ערוצים</span>
        {count > 0 && (
          <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "var(--badge-bg)", color: "var(--badge-text)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" /> {count} מתוזמנים
          </span>
        )}
      </div>
      <div className="px-2 space-y-0.5">
        <Link href="/mail"
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer ${active ? "bg-black/[0.055]" : "hover:bg-black/[0.04]"}`}>
          <div className="relative">
            <BrandIcon net="mail" size={28} />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--sidebar)] bg-[var(--green)]" />
          </div>
          <span className="flex-1 text-[16px] font-semibold truncate">{BRAND.teamName}</span>
          {count > 0 && (
            <span className="text-[12px] font-bold rounded-full px-2 py-0.5" title="מיילים מתוזמנים"
              style={{ background: "var(--badge-bg)", color: "var(--badge-text)" }}>{count}</span>
          )}
        </Link>
      </div>

      {/* כרטיס מותג */}
      <div className="mt-auto px-3 py-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-right">
          <BrandAvatar />
          <div className="flex-1 leading-tight">
            <div className="text-[15px] font-semibold">{BRAND.name}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
