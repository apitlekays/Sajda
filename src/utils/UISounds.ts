/**
 * UI Sound utilities using Web Audio API
 * Generates lightweight click/toggle sounds without requiring audio files
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    return audioContext;
}

/**
 * Play a soft click sound for toggles and buttons
 */
export function playToggleSound(): void {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Soft click: short duration, medium-high frequency
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.05);
    } catch (e) {
        // Silently fail if audio context unavailable
        console.debug('UI sound unavailable:', e);
    }
}

/**
 * Play a soft tick sound for checkboxes
 */
export function playCheckSound(): void {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Tick sound: very short, higher pitch
        oscillator.frequency.setValueAtTime(1800, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.03);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.03);
    } catch (e) {
        console.debug('UI sound unavailable:', e);
    }
}
