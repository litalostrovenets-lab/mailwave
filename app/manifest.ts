import type { MetadataRoute } from "next";
import { BRAND } from "../config/brand";

// מאפשר לשמור את הדשבורד כאפליקציה (ב Mac: Safari > קובץ > הוסף ל Dock)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.appName,
    short_name: BRAND.appName,
    start_url: "/mail",
    display: "standalone",
    background_color: "#f6f7f8",
    theme_color: "#6366f1",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
