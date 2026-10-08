import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import ThemeToggle from "./components/ThemeToggle";
import { BRAND } from "../config/brand";

export const metadata: Metadata = {
  title: BRAND.appName,
  description: "ניוזלטר, רצפי מיילים ורשימות תפוצה",
  appleWebApp: { capable: true, title: BRAND.appName, statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* מחיל את המצב הכהה לפני הציור הראשון כדי למנוע הבהוב לבן */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("mail-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}` }} />
      </head>
      <body>
        <div className="flex" style={{ background: "var(--bg)" }}>
          <Sidebar />
          <main className="flex-1 min-w-0 min-h-screen" style={{ background: "var(--bg)" }}>{children}</main>
        </div>
        <ThemeToggle />
      </body>
    </html>
  );
}
