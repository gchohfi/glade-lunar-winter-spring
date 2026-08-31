let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio(): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function tone(
  freq: number,
  when: number,
  duration: number,
  type: OscillatorType = "triangle",
  volume = 0.08,
): void {
  if (!enabled) return;
  const audio = getCtx();
  if (!audio || !master) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(Math.max(0.0001, volume), when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(when);
  osc.stop(when + duration + 0.02);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

export function playTap(): void {
  const audio = getCtx();
  if (!audio) return;
  tone(760, audio.currentTime, 0.04, "square", 0.03);
}

export function playCorrect(): void {
  const audio = getCtx();
  if (!audio) return;
  const t = audio.currentTime;
  tone(523.25, t, 0.07, "triangle", 0.07);
  tone(659.25, t + 0.06, 0.1, "triangle", 0.08);
}

export function playWrong(): void {
  const audio = getCtx();
  if (!audio) return;
  const t = audio.currentTime;
  tone(196, t, 0.16, "sine", 0.07);
  tone(155, t + 0.05, 0.14, "sine", 0.05);
}

export function playWin(): void {
  const audio = getCtx();
  if (!audio) return;
  const t = audio.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    tone(freq, t + i * 0.09, 0.18, "triangle", 0.09);
  });
}

export function playFail(): void {
  const audio = getCtx();
  if (!audio) return;
  const t = audio.currentTime;
  tone(246.94, t, 0.18, "sine", 0.06);
  tone(196, t + 0.14, 0.22, "sine", 0.06);
}

export function playPromote(): void {
  const audio = getCtx();
  if (!audio) return;
  const t = audio.currentTime;
  [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    tone(freq, t + i * 0.08, 0.2, "triangle", 0.08);
  });
}

export function wireAudioUnlock(): void {
  if (typeof window === "undefined") return;
  const resume = () => unlockAudio();
  window.addEventListener("pointerdown", resume, { once: true });
  window.addEventListener("keydown", resume, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") unlockAudio();
  });
}
