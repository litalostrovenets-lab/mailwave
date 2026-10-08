export type Net = "mail";

// לוגו Gmail מקורי בצבעים
export function BrandIcon({ size = 26 }: { net: Net; size?: number }) {
  return (
    <div style={{ width: size, height: size, background: "#fff" }}
      className="rounded-[7px] grid place-items-center shrink-0 overflow-hidden ring-1 ring-black/10">
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 48 48">
        <path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75L35 40h7c1.66 0 3-1.34 3-3V16.2z" />
        <path fill="#1e88e5" d="M3 16.2l3.61 1.71L13 23.7V40H6c-1.66 0-3-1.34-3-3V16.2z" />
        <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
        <path fill="#c62828" d="M3 12.3v3.9l10 7.5V11.2L9.88 8.86C9.13 8.3 8.23 8 7.3 8 4.92 8 3 9.92 3 12.3z" />
        <path fill="#fbc02d" d="M45 12.3v3.9l-10 7.5V11.2l3.12-2.34C38.87 8.3 39.77 8 40.7 8 43.08 8 45 9.92 45 12.3z" />
      </svg>
    </div>
  );
}
