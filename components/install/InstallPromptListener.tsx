"use client";

import { useInstallState } from "@/lib/pwa/install";

// Mounted once in the root layout so the browser's install prompt is caught
// on whatever page a visitor lands on, before they reach a "Get the app" button.
export function InstallPromptListener() {
  useInstallState();
  return null;
}
