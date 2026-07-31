// A short, pleasant two-tone chime synthesized with the Web Audio API --
// no audio asset file needed (avoids licensing/asset-management entirely,
// and keeps this to a few KB of code instead of a shipped media file).
// Used to signal new activity arriving on the Connections page/detail
// view without a manual refresh (see the polling in both).

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedContext) {
    sharedContext = new AudioContextClass();
  }
  // Browsers suspend a newly-created (or backgrounded) AudioContext until
  // a user gesture resumes it -- this call is a no-op if already running,
  // and harmlessly does nothing if the browser still refuses (e.g. no
  // gesture has happened yet this page load) rather than throwing.
  sharedContext.resume().catch(() => {});
  return sharedContext;
}

function playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  // Quick fade in/out so the tone doesn't click at its start/end edges.
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export function playNotificationSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // A soft ascending two-note chime (C6 -> E6) -- warm and brief, not
    // an alarm-style beep.
    playTone(ctx, 1046.5, now, 0.18);
    playTone(ctx, 1318.5, now + 0.12, 0.22);
  } catch (err) {
    console.warn("Could not play notification sound:", err);
  }
}
