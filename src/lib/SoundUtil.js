/**
 * Play a short notification sound using Web Audio API.
 * No external audio files needed — generates tones programmatically.
 *
 * A single AudioContext is reused across calls. Browsers cap the number of
 * concurrent AudioContexts (~6 in Chrome), and messages arrive in bursts, so
 * creating a fresh context per notification could exhaust the limit and
 * silently drop later sounds.
 *
 * @param {'chime' | 'pop' | 'ping' | 'bloop' | 'ding' | 'blip' | 'none'} type - Sound preset to play
 */
let sharedCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new Ctor()
  }
  // Browsers start the context suspended until a user gesture; resume if needed.
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {})
  }
  return sharedCtx
}

export function playNotificationSound(type) {
  if (type === 'none') return

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const t = ctx.currentTime

    if (type === 'chime') {
      // Bright bell-like tone: two harmonics fading out
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.value = 880 // A5
      osc2.type = 'sine'
      osc2.frequency.value = 1320 // E6 (harmonic)

      gain.gain.setValueAtTime(0.15, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)

      osc1.connect(gain).connect(ctx.destination)
      osc2.connect(gain)

      osc1.start(t)
      osc2.start(t)
      osc1.stop(t + 0.4)
      osc2.stop(t + 0.4)
    } else if (type === 'pop') {
      // Short percussive pop: quick frequency sweep with noise-like envelope
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, t)
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.08)

      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)

      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.1)
    } else if (type === 'ping') {
      // Phone-style ping: high-pitched short tone with quick decay
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.value = 1200

      gain.gain.setValueAtTime(0.2, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)

      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.25)
    } else if (type === 'bloop') {
      // Low double-tone "bloop" (similar to messaging app notification)
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.value = 400
      osc2.type = 'sine'
      osc2.frequency.value = 300

      gain.gain.setValueAtTime(0.2, t)
      gain.gain.setValueAtTime(0.2, t + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)

      osc1.connect(gain).connect(ctx.destination)
      osc2.connect(gain)

      osc1.start(t)
      osc1.stop(t + 0.08)
      osc2.start(t + 0.08)
      osc2.stop(t + 0.3)
    } else if (type === 'ding') {
      // Simple bell ding: single clear tone with natural decay
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = 1046.5 // C6

      gain.gain.setValueAtTime(0.18, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)

      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.5)
    } else if (type === 'blip') {
      // Retro game-style blip: short square wave burst
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'square'
      osc.frequency.value = 800

      gain.gain.setValueAtTime(0.08, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)

      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.06)
    }
  } catch {
    // Web Audio not available — fail silently
  }
}
