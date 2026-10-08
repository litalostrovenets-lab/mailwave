"use client";

import { useState } from "react";
import { BRAND } from "../../config/brand";
import AppLogo from "../components/AppLogo";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) {
      const from = new URLSearchParams(window.location.search).get("from") || "/";
      window.location.href = from.startsWith("/") && !from.startsWith("//") ? from : "/";
    } else {
      setErr("סיסמה שגויה");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4" style={{ direction: "rtl" }}>
      <form onSubmit={submit} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 30, width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div className="mx-auto mb-4" style={{ width: 48 }}><AppLogo size={48} /></div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 18 }}>{BRAND.appName}</h1>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="סיסמה" autoFocus
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 16, fontFamily: "inherit" }} />
        {err && <p style={{ color: "#d1493f", fontSize: 14, marginTop: 10 }}>{err}</p>}
        <button disabled={busy} style={{ width: "100%", marginTop: 14, padding: "12px", borderRadius: 10, border: "none", background: "var(--green)", color: "#06301d", fontWeight: 700, fontSize: 16, fontFamily: "inherit" }}>
          {busy ? "נכנס..." : "כניסה"}
        </button>
      </form>
    </div>
  );
}
