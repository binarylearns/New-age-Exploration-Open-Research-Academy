(function () {
  'use strict';
  console.log('🟡 [KnowParts] File loaded');

  /* ---------- SETTINGS ---------- */
  const SOUND_ON = true;        // false = completely silent
  const SHOW_CONFETTI = true;   // false = no confetti

  /* ---------- CONFIG ---------- */
  const ORDER = ['monitor', 'keyboard', 'mouse', 'cpu', 'speakers'];

  const PARTS = {
    monitor:  { display: 'Monitor',  accepts: ['monitor', 'screen'],
                hint: 'It shows pictures and words on a screen.' },
    keyboard: { display: 'Keyboard', accepts: ['keyboard', 'key board', 'keys'],
                hint: 'It has many keys with letters and numbers.' },
    mouse:    { display: 'Mouse',    accepts: ['mouse', 'mice'],
                hint: 'It helps you point and click.' },
    cpu:      { display: 'CPU',      accepts: ['cpu', 'c p u', 'processor', 'the cpu', 'microprocessor'],
                hint: "It's the computer's brain — it thinks and works fast! (3 letters)" },
    speakers: { display: 'Speakers', accepts: ['speakers', 'speaker', 'sound box'],
                hint: 'They make music and sound. (plural)' }
  };

  /* ---------- AUDIO (generated in the browser, no sound files) ---------- */
  let audioCtx = null;

  function getCtx() {
    if (audioCtx) return audioCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { audioCtx = new AC(); } catch (e) { audioCtx = null; }
    return audioCtx;
  }

  // Must be called from a user gesture (click / key / touch)
  function unlockAudio() {
    const ctx = getCtx();
    if (!ctx) return Promise.resolve(false);
    if (ctx.state === 'running') return Promise.resolve(true);
    return ctx.resume().then(() => ctx.state === 'running').catch(() => false);
  }

  function tone(freq, startOffset, dur, type, vol) {
    const ctx = audioCtx;
    if (!ctx || ctx.state !== 'running') return;
    try {
      const t = ctx.currentTime + startOffset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const attack = 0.012;
      const peak = vol != null ? vol : 0.2;

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + attack);
      gain.gain.setValueAtTime(peak, t + Math.max(attack, dur * 0.35));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch (e) { /* silent */ }
  }

  // Plays notes; if audio is not unlocked yet, waits for unlock first
  function playSequence(notes) {
    if (!SOUND_ON) return;
    const run = () => notes.forEach(n =>
      tone(n.freq, n.at || 0, n.dur || 0.18, n.type || 'sine', n.vol));

    if (audioCtx && audioCtx.state === 'running') { run(); return; }
    unlockAudio().then(ok => { if (ok) run(); });
  }

  const sfx = {
    // Check pressed
    tap: () => playSequence([
      { freq: 1200, at: 0, dur: 0.06, vol: 0.08 }
    ]),

    // Navigation blip
    slide: () => playSequence([
      { freq: 700, at: 0,    dur: 0.08, vol: 0.08 },
      { freq: 950, at: 0.06, dur: 0.10, vol: 0.08 }
    ]),

    // Correct: bright "ding-ding"
    correct: () => playSequence([
      { freq: 1046.50, at: 0,    dur: 0.15, vol: 0.22 },
      { freq: 1318.51, at: 0.12, dur: 0.28, vol: 0.22 }
    ]),

    // Wrong: soft low "boop"
    wrong: () => playSequence([
      { freq: 330, at: 0,    dur: 0.14, type: 'sine',     vol: 0.15 },
      { freq: 220, at: 0.10, dur: 0.20, type: 'triangle', vol: 0.13 }
    ]),

    // Hint / fun-fact ping
    hint: () => playSequence([
      { freq: 880,  at: 0,    dur: 0.10, vol: 0.12 },
      { freq: 1320, at: 0.08, dur: 0.14, vol: 0.12 }
    ]),

    // Last slide
    win: () => playSequence([
      { freq: 523.25,  at: 0,    dur: 0.14, vol: 0.20 },
      { freq: 659.25,  at: 0.10, dur: 0.14, vol: 0.20 },
      { freq: 783.99,  at: 0.20, dur: 0.14, vol: 0.20 },
      { freq: 1046.50, at: 0.30, dur: 0.40, vol: 0.24 }
    ]),

    // Last slide with all 5 stars
    complete: () => playSequence([
      { freq: 880,  at: 0,    dur: 0.12, vol: 0.18 },
      { freq: 1174, at: 0.09, dur: 0.12, vol: 0.18 },
      { freq: 1568, at: 0.18, dur: 0.35, vol: 0.22 }
    ])
  };

  // Unlock on the first real user gesture (needed by Firefox and Chrome)
  ['pointerdown', 'click', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => { unlockAudio(); }, { once: true, passive: true });
  });

  // Recover after switching tabs
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  });

  /* ---------- HELPERS ---------- */
  const normalize = s =>
    String(s || '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');

  const isCorrect = (key, val) => {
    const p = PARTS[key];
    const v = normalize(val);
    return !!(p && v && p.accepts.some(a => normalize(a) === v));
  };

  function throwConfetti() {
    if (!SHOW_CONFETTI) return;
    const emojis = ['⭐', '🎉', '✨', '🌟', '💫'];
    for (let i = 0; i < 12; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      c.style.left = Math.random() * 100 + 'vw';
      c.style.bottom = '0';
      c.style.fontSize = (16 + Math.random() * 16) + 'px';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 1900);
    }
  }

  /* ---------- STATE ---------- */
  let SLIDES = [];
  let CURRENT = 0;
  const earnedStars = new Set();
  const attempts = {};
  let advanceTimer = null;

  /* ---------- STARS / FEEDBACK / SCORE ---------- */
  function markStar(key) {
    const idx = ORDER.indexOf(key);
    if (idx === -1 || earnedStars.has(key)) return;
    earnedStars.add(key);

    const el = document.querySelector('.star-slot[data-star="' + (idx + 1) + '"]');
    if (el) {
      el.classList.remove('text-gray-300');
      el.classList.add('text-amber-400', 'star-pop');
      setTimeout(() => el.classList.remove('star-pop'), 600);
    }
  }

  function setFeedback(slide, type, msg) {
    const fb = slide.querySelector('.feedback-bubble');
    if (!fb) return;
    fb.className = 'feedback-bubble ' + type;
    fb.textContent = msg;
  }

  function updateFinalScore() {
    const el = document.getElementById('finalScore');
    if (!el) return;
    el.textContent = '⭐ ' + earnedStars.size + ' / 5 Stars';
    el.classList.toggle('text-amber-500', earnedStars.size === 5);
  }

  /* ---------- NAVIGATION ---------- */
  function goTo(index, force) {
    if (!SLIDES.length || index < 0 || index >= SLIDES.length) return;
    if (index === CURRENT && !force) return;

    clearTimeout(advanceTimer);

    const total = SLIDES.length;
    const dots = document.querySelectorAll('.dot');

    SLIDES[CURRENT].classList.remove('active');
    if (dots[CURRENT]) dots[CURRENT].classList.remove('active');

    CURRENT = index;

    SLIDES[CURRENT].classList.add('active');
    if (dots[CURRENT]) dots[CURRENT].classList.add('active');

    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressLabel');

    if (prev) prev.disabled = CURRENT === 0;
    if (next) next.disabled = CURRENT === total - 1;
    if (fill) fill.style.width = ((CURRENT + 1) / total * 100) + '%';
    if (label) label.textContent = 'Slide ' + (CURRENT + 1) + ' of ' + total;

    const slide = SLIDES[CURRENT];
    const key = slide.dataset.part;

    if (key && PARTS[key]) {
      sfx.slide();
      const input = slide.querySelector('.answer-input');
      if (input && !input.disabled) setTimeout(() => input.focus(), 200);
    } else if (CURRENT === total - 1) {
      updateFinalScore();
      if (earnedStars.size === 5) sfx.complete(); else sfx.win();
    } else {
      sfx.slide();
    }
  }

  /* ---------- CHECK ANSWER ---------- */
  function doCheck(slide) {
    if (!slide) return;

    const key = slide.dataset.part;
    const p = PARTS[key];
    const input = slide.querySelector('.answer-input');
    const checkBtn = slide.querySelector('.check-btn');

    if (!p || !input) return;

    unlockAudio();
    sfx.tap();

    if (!input.value.trim()) {
      setFeedback(slide, 'hint', '✏️ Type the name first!');
      sfx.hint();
      return;
    }

    if (isCorrect(key, input.value)) {
      input.classList.remove('wrong');
      input.classList.add('correct');
      input.disabled = true;
      if (checkBtn) checkBtn.disabled = true;

      setFeedback(slide, 'success', "✅ Correct! It's the " + p.display + '!');
      sfx.correct();
      markStar(key);
      throwConfetti();

      const idx = SLIDES.indexOf(slide);
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(() => {
        if (SLIDES[CURRENT] === slide && idx < SLIDES.length - 1) goTo(idx + 1);
      }, 1600);
    } else {
      attempts[key] = (attempts[key] || 0) + 1;

      input.classList.remove('correct');
      input.classList.add('wrong');

      const extra = attempts[key] >= 2 ? ' Need help? Tap 💡 Hint!' : '';
      setFeedback(slide, 'error', '❌ Not quite. Try again!' + extra);
      sfx.wrong();

      setTimeout(() => input.classList.remove('wrong'), 500);
      input.select();
    }
  }

  /* ---------- HINT ---------- */
  function doHint(slide) {
    if (!slide) return;
    const p = PARTS[slide.dataset.part];
    if (!p) return;

    unlockAudio();
    setFeedback(slide, 'hint', '💡 ' + p.hint);
    sfx.hint();
  }

  /* ---------- RESET ---------- */
  function resetAll() {
    clearTimeout(advanceTimer);
    earnedStars.clear();
    Object.keys(attempts).forEach(k => delete attempts[k]);

    document.querySelectorAll('.star-slot').forEach(s => {
      s.classList.add('text-gray-300');
      s.classList.remove('text-amber-400', 'star-pop');
    });

    SLIDES.forEach(slide => {
      const input = slide.querySelector('.answer-input');
      const btn = slide.querySelector('.check-btn');
      const fb = slide.querySelector('.feedback-bubble');

      if (input) {
        input.value = '';
        input.disabled = false;
        input.classList.remove('correct', 'wrong');
      }
      if (btn) btn.disabled = false;
      if (fb) {
        fb.className = 'feedback-bubble';
        fb.textContent = '';
      }
    });

    const score = document.getElementById('finalScore');
    if (score) {
      score.textContent = '⭐ 0 / 5 Stars';
      score.classList.remove('text-amber-500');
    }

    goTo(0, true);
  }

  /* ---------- INITIAL UI ---------- */
  function goToInitialUI() {
    const total = SLIDES.length;
    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressLabel');

    if (prev) prev.disabled = true;
    if (next) next.disabled = total <= 1;
    if (fill) fill.style.width = (1 / total * 100) + '%';
    if (label) label.textContent = 'Slide 1 of ' + total;

    const first = SLIDES[0].querySelector('.answer-input');
    if (first) setTimeout(() => first.focus(), 300);
  }

  /* ---------- INIT ---------- */
  function init() {
    SLIDES = Array.from(document.querySelectorAll('.slide'));

    if (!SLIDES.length) {
      console.error('❌ [KnowParts] No .slide elements');
      return;
    }
    console.log('🟢 [KnowParts] init — slides:', SLIDES.length);

    const dotsBox = document.getElementById('dotsContainer');
    if (dotsBox && !dotsBox.children.length) {
      SLIDES.forEach((_, i) => {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'dot';
        d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dotsBox.appendChild(d);
      });
    }

    // One delegated click handler for everything
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!t.closest) return;

      const check = t.closest('.check-btn');
      if (check) { doCheck(check.closest('.slide')); return; }

      const hint = t.closest('.hint-btn');
      if (hint) { doHint(hint.closest('.slide')); return; }

      const dot = t.closest('.dot');
      if (dot && dotsBox) { goTo(Array.from(dotsBox.children).indexOf(dot)); return; }

      if (t.closest('#prevBtn')) { goTo(CURRENT - 1); return; }
      if (t.closest('#nextBtn')) { goTo(CURRENT + 1); return; }
      if (t.closest('#playAgainBtn')) { resetAll(); return; }
      if (t.closest('.fact-chip')) { unlockAudio(); sfx.hint(); return; }
    });

    // Enter key in an answer box; arrow keys elsewhere
    document.addEventListener('keydown', function (e) {
      const t = e.target;

      if (t && t.classList && t.classList.contains('answer-input')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          doCheck(t.closest('.slide'));
        }
        return;
      }

      if (e.key === 'ArrowRight') goTo(CURRENT + 1);
      if (e.key === 'ArrowLeft')  goTo(CURRENT - 1);
    });

    // Boot state
    SLIDES.forEach((s, i) => s.classList.toggle('active', i === 0));
    document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === 0));
    CURRENT = 0;
    goToInitialUI();

    window.KnowYourParts = { goTo, resetAll, earnedStars, sfx };
    console.log('✅ [KnowParts] Game initialized successfully');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();