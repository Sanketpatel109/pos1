// Digital Voice Soundbox Synthesizer (Paytm / PhonePe Soundbox style announcement)

class SoundboxEngine {
  private ctx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Signature two-tone melodic soundbox chime before speech announcement
   */
  playChime(): Promise<void> {
    return new Promise((resolve) => {
      const ctx = this.getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      try {
        const now = ctx.currentTime;

        // Tone 1 (587 Hz - D5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Tone 2 (880 Hz - A5)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.12);
        gain2.gain.setValueAtTime(0.25, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.38);

        setTimeout(() => resolve(), 350);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Speak text using Web SpeechSynthesis API
   */
  speak(text: string, language: 'en' | 'hi' = 'en'): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Natural conversational tempo
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      if (language === 'hi') {
        utterance.lang = 'hi-IN';
        const hiVoice = voices.find((v) => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi'));
        if (hiVoice) utterance.voice = hiVoice;
      } else {
        utterance.lang = 'en-IN';
        const enInVoice = voices.find((v) => v.lang === 'en-IN' || v.name.includes('India'));
        if (enInVoice) utterance.voice = enInVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Soundbox speech error:', err);
    }
  }

  /**
   * Announce payment received (Plays signature chime then speaks aloud)
   */
  async announcePayment({
    amount,
    paymentMethod = 'UPI',
    language = 'en',
    shopName,
  }: {
    amount: number;
    paymentMethod?: string;
    language?: 'en' | 'hi';
    shopName?: string;
  }): Promise<void> {
    await this.playChime();

    const roundedAmount = Math.round(amount);
    let spokenText = '';

    const methodLabel =
      paymentMethod.toUpperCase() === 'UPI' || paymentMethod.toUpperCase() === 'ONLINE'
        ? 'UPI'
        : paymentMethod.toUpperCase() === 'CASH'
        ? 'Cash'
        : 'Card';

    if (language === 'hi') {
      // Hindi: "MonoPOS par ₹350 prapt hue"
      const storePrefix = shopName ? `${shopName} par ` : 'MonoPOS par ';
      spokenText = `${storePrefix}${roundedAmount} rupaye prapt hue.`;
    } else {
      // English: "Received payment of 350 rupees on UPI"
      spokenText = `Received payment of ${roundedAmount} rupees on ${methodLabel}.`;
    }

    this.speak(spokenText, language);
  }
}

export const soundbox = new SoundboxEngine();
