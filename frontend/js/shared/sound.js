/* ============================================================
   ELITE CLASS — SOUND EFFECTS (Web Audio API, no external files)
   ============================================================ */

window.EC = window.EC || {};

EC.sound = (() => {
  let ctx = null;
  let warmupBound = false;

  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  };

  const play = (fn) => {
    if (!EC.state.soundEnabled) return;
    try {
      const audioCtx = getCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      fn(audioCtx);
    } catch (e) {}
  };

  const warmup = () => {
    try {
      const audioCtx = getCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    } catch (e) {}
  };

  const bindWarmup = () => {
    if (warmupBound) return;
    const opts = { once: true, passive: true };
    window.addEventListener('pointerdown', warmup, opts);
    window.addEventListener('keydown', warmup, opts);
    warmupBound = true;
  };

  bindWarmup();

  const tone = (ctx, freq, type, startTime, duration, gainVal = 0.3) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  return {
    xpGain() {
      play(ctx => {
        const t = ctx.currentTime;
        tone(ctx, 523, 'sine', t,       0.12, 0.25);
        tone(ctx, 659, 'sine', t + 0.08, 0.12, 0.25);
        tone(ctx, 784, 'sine', t + 0.16, 0.18, 0.3);
      });
    },

    badgeUnlock() {
      play(ctx => {
        const t = ctx.currentTime;
        tone(ctx, 440, 'triangle', t,       0.15, 0.3);
        tone(ctx, 554, 'triangle', t + 0.1, 0.15, 0.3);
        tone(ctx, 659, 'triangle', t + 0.2, 0.15, 0.3);
        tone(ctx, 880, 'sine',     t + 0.32, 0.35, 0.4);
      });
    },

    levelUp() {
      play(ctx => {
        const t = ctx.currentTime;
        [523, 659, 784, 1047].forEach((f, i) => {
          tone(ctx, f, 'sine', t + i * 0.1, 0.2, 0.4);
        });
        tone(ctx, 1047, 'triangle', t + 0.45, 0.5, 0.35);
      });
    },

    taskSubmit() {
      play(ctx => {
        const t = ctx.currentTime;
        tone(ctx, 440, 'sine', t,      0.1, 0.2);
        tone(ctx, 660, 'sine', t + 0.08, 0.15, 0.25);
      });
    },

    streak() {
      play(ctx => {
        const t = ctx.currentTime;
        [330, 392, 494, 587, 698].forEach((f, i) => {
          tone(ctx, f, 'sawtooth', t + i * 0.07, 0.1, 0.15);
        });
      });
    },

    booyah() {
      play(ctx => {
        const t = ctx.currentTime;
        tone(ctx, 196, 'sawtooth', t,      0.1, 0.3);
        tone(ctx, 294, 'sawtooth', t + 0.06, 0.1, 0.3);
        tone(ctx, 392, 'sawtooth', t + 0.12, 0.1, 0.3);
        tone(ctx, 523, 'sine',     t + 0.2, 0.5, 0.5);
        tone(ctx, 784, 'sine',     t + 0.35, 0.4, 0.45);
      });
    },

    click() {
      play(ctx => {
        const t = ctx.currentTime;
        tone(ctx, 880, 'sine', t, 0.06, 0.08);
      });
    },

    notify() {
      play(ctx => {
        const t = ctx.currentTime;
        tone(ctx, 698, 'sine', t,      0.12, 0.15);
        tone(ctx, 880, 'sine', t + 0.12, 0.12, 0.15);
      });
    },

    error() {
      play(ctx => {
        const t = ctx.currentTime;
        tone(ctx, 220, 'sawtooth', t,      0.15, 0.2);
        tone(ctx, 196, 'sawtooth', t + 0.1, 0.2, 0.25);
      });
    },

    warmup,
  };
})();
