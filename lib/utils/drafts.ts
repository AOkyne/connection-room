import { useEffect, useRef, useState } from "react";

// Unsent writing (a new post, an answer, a reply) is kept on this device
// as it's typed, so a mis-tap, a closed tab or an accidental select-all
// + delete doesn't lose it (requested after a member on iPhone lost a
// whole answer). Browser storage only -- per-device, never sent anywhere
// -- and wiped on sign-out (clearSession), so a shared device doesn't
// show one member's drafts to the next.
//
// Every access is wrapped in try/catch: storage can be unavailable
// (private browsing, blocked site data) and drafts are a convenience, not
// something a page may break over.

const PREFIX = "connection-room:draft:";
const SAVE_DELAY_MS = 400;

export function loadDraft(key: string): string {
  try {
    return localStorage.getItem(PREFIX + key) || "";
  } catch {
    return "";
  }
}

export function saveDraft(key: string, value: string): void {
  try {
    if (value.trim()) localStorage.setItem(PREFIX + key, value);
    else localStorage.removeItem(PREFIX + key);
  } catch {
    // Storage unavailable or full -- drafts just don't persist.
  }
}

export function clearAllDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Nothing to clear if storage isn't available.
  }
}

/**
 * Keeps one text box's contents saved as a draft under `key` (null = not
 * active). When the key becomes active and the box is empty, a saved
 * draft is put back and the hook returns true, so the page can say
 * "Draft restored". Clearing the box (e.g. after posting) deletes the
 * draft immediately -- not after the save delay -- so a posted answer
 * can never come back as a stale draft.
 */
export function useDraft(key: string | null, value: string, setValue: (v: string) => void): boolean {
  const [restored, setRestored] = useState(false);
  const activeKey = useRef<string | null>(null);
  // Set while a restored draft is on its way into the box: the save
  // effect below runs once more with the old (empty) value first, and
  // must not treat that as "box cleared" and delete the draft.
  const restoring = useRef(false);
  const latest = useRef({ key, value });
  latest.current = { key, value };

  useEffect(() => {
    activeKey.current = key;
    if (!key) {
      setRestored(false);
      return;
    }
    const draft = loadDraft(key);
    if (draft && !latest.current.value) {
      restoring.current = true;
      setValue(draft);
      setRestored(true);
    } else {
      setRestored(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!key || activeKey.current !== key) return;
    if (!value.trim()) {
      if (restoring.current) return;
      saveDraft(key, "");
      setRestored(false);
      return;
    }
    restoring.current = false;
    const timer = setTimeout(() => saveDraft(key, value), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key, value]);

  // Save whatever was typed in the last moment before leaving the page.
  useEffect(
    () => () => {
      const { key: k, value: v } = latest.current;
      if (k) saveDraft(k, v);
    },
    []
  );

  return restored;
}
