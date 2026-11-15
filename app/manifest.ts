import type { MetadataRoute } from "next";
import { appConfig } from "@/lib/config";

// Makes The Connection Room installable ("Add to Home Screen" on iPhone,
// "Install app" in Chrome and Edge). It opens on the members area in its
// own window, without browser bars. No offline caching: every page still
// comes fresh from the server, so members never see stale content.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: appConfig.name,
    short_name: "Connection Room",
    description: appConfig.shortDescription,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f2",
    theme_color: "#faf7f2",
    categories: ["social", "lifestyle", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
