// A short, unmistakable double-beep — synthesised rather than shipped as an
// audio file, and never played on its own: browsers block audio that was not
// started by a real tap, and a batch cook should not be surprised by sound
// anyway. Every call to play() is itself the direct result of a click.
export const useTimerChime = (): { play: () => void } => ({
  play: (): void => {
    if (typeof window === 'undefined' || window.AudioContext === undefined) return;

    const context = new AudioContext();
    const beepAt = (startAt: number): void => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.22);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.22);
    };

    beepAt(context.currentTime);
    beepAt(context.currentTime + 0.28);
  },
});
