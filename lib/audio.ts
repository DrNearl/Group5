// Audio Feedback using Web Audio API (Zero external assets needed - High-fidelity synthesis)

class SoundFX {
  private ctx: AudioContext | null = null;

  private getContext() {
    if (typeof window === "undefined") return null;
    try {
      if (localStorage.getItem("vlu_sound") === "off") return null;
    } catch {
      // Ignore storage errors
    }
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

  // 1. Tiếng Chime Check-in (Âm thanh đón tiếp công nghệ cao, thăng hoa - G5 -> C6 -> E6)
  playCheckIn() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Hợp âm 3 nốt vuốt lên thanh lịch như quét thẻ Metro / Apple Pay
      const notes = [
        { freq: 783.99, delay: 0.0, dur: 0.18 }, // G5
        { freq: 1046.5, delay: 0.08, dur: 0.22 }, // C6
        { freq: 1318.51, delay: 0.16, dur: 0.35 }, // E6
      ];

      notes.forEach(({ freq, delay, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.22, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + dur);
      });
    } catch (e) {
      console.warn("CheckIn audio error", e);
    }
  }

  // 2. Tiếng Chime Check-out (Âm thanh hoàn thành phiên làm việc - E6 -> C6 -> G5)
  playCheckOut() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Âm thanh trầm ấm, kết thúc hoàn tất
      const notes = [
        { freq: 1318.51, delay: 0.0, dur: 0.18 }, // E6
        { freq: 1046.5, delay: 0.09, dur: 0.22 }, // C6
        { freq: 880.0, delay: 0.18, dur: 0.38 }, // A5
      ];

      notes.forEach(({ freq, delay, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.25, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + dur);
      });
    } catch (e) {
      console.warn("CheckOut audio error", e);
    }
  }

  // Tiếng Beep đơn giản (Fallback chung)
  playSuccess() {
    this.playCheckIn();
  }

  // Tiếng Cảnh báo Gian lận / Lỗi thao tác
  playWarning() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch (e) {
      console.warn("Audio play error", e);
    }
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

