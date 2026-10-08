// הלוגו של האפליקציה: מטוס נייר על ריבוע מעוגל בגרדיאנט. משמש בסיידבר ובמסך הכניסה.
export const LOGO_GRADIENT = "linear-gradient(135deg,#22d3ee,#6366f1 55%,#a855f7)";

export default function AppLogo({ size = 44 }: { size?: number }) {
  return (
    <div className="rounded-xl grid place-items-center shadow-sm shrink-0"
      style={{ width: size, height: size, background: LOGO_GRADIENT }}>
      <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
      </svg>
    </div>
  );
}
