// Audio Feedback: ưu tiên file custom trong /public/sounds/, tự động fallback Web Audio API nếu chưa có file
import { getAssetPath } from "./asset-path";

class SoundFX {
  private ctx: AudioContext | null = null;

  private isSoundEnabled() {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("vlu_sound") !== "off";
    } catch {
      return true;
    }
  }

  private getContext() {
    if (!this.isSoundEnabled()) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playCustomOrFallback(path: string, fallback: () => void) {
    if (!this.isSoundEnabled()) return;
    try {
      const audio = new Audio(getAssetPath(path));
      audio.volume = 0.85;
      audio.play().catch(() => fallback());
    } catch {
      fallback();
    }
  }

  private playToneSequence(
    notes: Array<{ freq: number; delay: number; dur: number }>,
    peakGain: number,
    waveType: OscillatorType = "sine"
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      notes.forEach(({ freq, delay, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(peakGain, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + dur);
      });
    } catch (e) {
      console.warn("Audio tone error", e);
    }
  }

  // 1. Âm thanh Check-in: dùng /sounds/checkin.mp3 nếu có, không thì phát chime mặc định
  playCheckIn() {
    this.playCustomOrFallback("/sounds/checkin.mp3", () =>
      this.playToneSequence(
        [
          { freq: 783.99, delay: 0.0, dur: 0.18 },
          { freq: 1046.5, delay: 0.08, dur: 0.22 },
          { freq: 1318.51, delay: 0.16, dur: 0.35 },
        ],
        0.22
      )
    );
  }

  // 2. Âm thanh Check-out: dùng /sounds/checkout.mp3 nếu có, không thì phát chime mặc định
  playCheckOut() {
    this.playCustomOrFallback("/sounds/checkout.mp3", () =>
      this.playToneSequence(
        [
          { freq: 1318.51, delay: 0.0, dur: 0.18 },
          { freq: 1046.5, delay: 0.09, dur: 0.22 },
          { freq: 880.0, delay: 0.18, dur: 0.38 },
        ],
        0.25
      )
    );
  }

  // Tiếng Beep đơn giản (Fallback chung)
  playSuccess() {
    this.playCheckIn();
  }

  // Tiếng Cảnh báo Gian lận / Lỗi thao tác: dùng /sounds/error.mp3 nếu có, fallback 2 nốt trầm gọn
  playWarning() {
    this.playCustomOrFallback("/sounds/error.mp3", () =>
      this.playToneSequence(
        [
          { freq: 440.0, delay: 0.0, dur: 0.12 },
          { freq: 311.13, delay: 0.13, dur: 0.22 },
        ],
        0.24,
        "triangle"
      )
    );
  }

  // Tiếng Phát hiện Thiết bị Lab (EQ-)
  playEquipmentChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.22, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.25);
      });
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }
}

export const soundFX = new SoundFX();

