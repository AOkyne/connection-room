"use client";

import { useSyncExternalStore } from "react";

// "Get the app" support. The Connection Room installs as a web app (see
// app/manifest.ts). Chrome, Edge and Android can show their own install
// prompt, which we hold on to and fire from our buttons; iPhone, iPad and
// Mac Safari have no prompt, so the buttons show step-by-step instructions.

export type Platform =
  | "ios-safari" // iPhone/iPad Safari: Share -> Add to Home Screen
  | "ios-other" // Chrome/Firefox/Edge on iPhone: Share (top right) -> Add to Home Screen
  | "in-app" // Instagram/Facebook/Gmail etc. built-in browsers: open in Safari/Chrome first
  | "android" // Android: browser menu -> Install app / Add to Home screen
  | "mac-safari" // Mac Safari: File -> Add to Dock
  | "desktop"; // Chrome/Edge/Firefox on a computer

export interface InstallState {
  ready: boolean; // false during server render and hydration
  installed: boolean; // running as the installed app (or just installed)
  canPrompt: boolean; // the browser's own install prompt is available
  platform: Platform;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SERVER_STATE: InstallState = { ready: false, installed: false, canPrompt: false, platform: "desktop" };

let state: InstallState = SERVER_STATE;
let deferred: BeforeInstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();

function set(next: Partial<InstallState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function detectPlatform(ua: string, touchPoints = 0): Platform {
  if (/FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Snapchat|Line\/|GSA\/|Twitter|TikTok|musical_ly/i.test(ua)) return "in-app";
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) ? "ios-other" : "ios-safari";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|Edg|Firefox/i.test(ua)) return "mac-safari";
  return "desktop";
}

function isStandalone() {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  state = {
    ready: true,
    installed: isStandalone(),
    canPrompt: false,
    platform: detectPlatform(navigator.userAgent, navigator.maxTouchPoints || 0),
  };
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep the browser's own banner quiet; our buttons fire it
    deferred = e as BeforeInstallPromptEvent;
    set({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    set({ installed: true, canPrompt: false });
  });
}

function subscribe(l: () => void) {
  start();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot() {
  start();
  return state;
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}

/** Fires the browser's own install prompt. Returns false when none is available. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  set({ canPrompt: false });
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  if (outcome === "accepted") set({ installed: true });
  return true;
}
