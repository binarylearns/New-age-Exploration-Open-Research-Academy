/* =====================================================================
   CLASS 1 — MEET THE COMPUTER  (FIXED AUDIO + SPEECH VERSION)
   ===================================================================== */

(function () {
  'use strict';

  /* =========================================================
     1. PART DATA
     ========================================================= */
  const PART_INFO = {
    monitor:  { name: 'Monitor',      line: 'I am the monitor. I show you pictures and words on the screen!' },
    keyboard: { name: 'Keyboard',     line: 'I am the keyboard. You use me to type letters and numbers!' },
    mouse:    { name: 'Mouse',        line: 'I am the mouse. Move me and click to choose things!' },
    system:   { name: 'System Unit',  line: 'I am the system unit. I am the brain box that makes the computer work!' },
    speakers: { name: 'Speakers',     line: 'I am the speakers. I play sounds and music for you!' }
  };

  /* =========================================================
     2. AUDIO CONTEXT — created / resumed on first gesture
     ========================================================= */
  let audioCtx = null;

  function unlockAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        console.warn('[Audio] Web Audio API not supported');
        return null;
      }
      try {
        audioCtx = new AC();
        // iOS/Safari: play a silent buffer to fully unlock
        const buf = audioCtx.createBuffer(1, 1, 22050);
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtx.destination);
        src.start(0);
      } catch (e) {
        console.warn('[Audio] AudioContext creation failed:', e);
        return null;
      }
    }

    // Always try to resume — it may be 'suspended' after tab switch
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  // Belt-and-braces: unlock on ANY first interaction
  ['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => unlockAudio(), { once: true, passive: true });
  });

  /* =========================================================
     3. BEEP SOUND (robust)
     ========================================================= */
  function beep(freq = 660, dur = 0.15, type = 'sine', vol = 0.15) {
    const ctx = audioCtx;
    if (!ctx) {
      unlockAudio();
      if (!audioCtx) return;
    }
    const c = audioCtx;
    if (c.state === 'suspended') {
      c.resume().then(() => beep(freq, dur, type, vol)).catch(() => {});
      return;
    }

    try {
      const osc  = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t0 = c.currentTime;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) {
      console.warn('[Audio] beep failed:', e);
    }
  }

  const sfx = {
    tap:     () => beep(720, 0.08, 'triangle', 0.12),
    correct: () => { beep(880, 0.12, 'sine', 0.15); setTimeout(() => beep(1180, 0.18, 'sine', 0.15), 110); },
    wrong:   () => beep(220, 0.18, 'sawtooth', 0.10),
    slide:   () => beep(520, 0.07, 'sine', 0.08),
    win:     () => {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'sine', 0.15), i * 130));
    }
  };

  /* =========================================================
     4. SPEECH (robust, English, with voice-ready fallback)
     ========================================================= */
  const speechReady = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let cachedVoice = null;

  function pickEnglishVoice() {
    if (!speechReady) return null;
    if (cachedVoice) return cachedVoice;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    cachedVoice =
      voices.find(v => /en[-_]US/i.test(v.lang) && /female|samantha|zira|aria|jenny/i.test(v.name)) ||
      voices.find(v => /en[-_]GB/i.test(v.lang) && /female|karen|serena/i.test(v.name)) ||
      voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en')) ||
      null;
    return cachedVoice;
  }

  if (speechReady) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoice = null;
      pickEnglishVoice();
    };
  }

  function speak(text, opts = {}) {
    if (!speechReady) {
      console.warn('[Speech] Not supported in this browser.');
      return;
    }
    if (!text) return;

    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      u.rate   = opts.rate   ?? 0.9;
      u.pitch  = opts.pitch  ?? 1.1;
      u.volume = opts.volume ?? 1;
      u.lang   = 'en-US';

      const v = pickEnglishVoice();
      if (v) u.voice = v;

      if (!v) {
        const onVoices = () => {
          const v2 = pickEnglishVoice();
          if (v2) u.voice = v2;
          window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        };
        window.speechSynthesis.addEventListener('voiceschanged', onVoices);
      }

      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('[Speech] error:', e);
    }
  }

  /* Visual fallback if TTS is unavailable */
  function speakOrShow(text) {
    if (speechReady) {
      speak(text);
      return;
    }
    let banner = document.getElementById('speechFallback');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'speechFallback';
      banner.style.cssText =
        'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);' +
        'background:#1e293b;color:#fff;padding:10px 18px;border-radius:12px;' +
        'font:600 15px system-ui;z-index:9999;max-width:90vw;text-align:center;' +
        'box-shadow:0 6px 18px rgba(0,0,0,.3);transition:opacity .3s;';
      document.body.appendChild(banner);
    }
    banner.textContent = text;
    banner.style.opacity = '1';
    clearTimeout(banner._t);
    banner._t = setTimeout(() => { banner.style.opacity = '0'; }, 2600);
  }

  /* =========================================================
     5. SLIDE NAVIGATION
     ========================================================= */
  const slides   = document.querySelectorAll('.slide');
  const total    = slides.length;
  const prevBtn  = document.getElementById('prevBtn');
  const nextBtn  = document.getElementById('nextBtn');
  const dotsBox  = document.getElementById('dotsContainer');
  const progress = document.getElementById('progressFill');
  const label    = document.getElementById('progressLabel');
  let current    = 0;

  // Build dots
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot';
    dot.type = 'button';
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => {
      unlockAudio();
      goTo(i);
    });
    dotsBox.appendChild(dot);
  });
  const dots = document.querySelectorAll('.dot');

  function goTo(index) {
    if (index < 0 || index >= total) return;
    if (index === current) return;

    slides[current].classList.remove('active');
    dots[current].classList.remove('active');

    current = index;

    slides[current].classList.add('active');
    dots[current].classList.add('active');

    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;

    const pct = ((current + 1) / total) * 100;
    progress.style.width = pct + '%';
    label.textContent = `Slide ${current + 1} of ${total}`;

    sfx.slide();
    announceSlide(current);
  }

  function announceSlide(index) {
    const slideNum = index + 1;
    if (slideNum === 3) speakOrShow('This is the monitor. It shows pictures and words.');
    else if (slideNum === 4) speakOrShow('This is the keyboard. You use it to type.');
    else if (slideNum === 5) speakOrShow('This is the mouse. You use it to point and click.');
    else if (slideNum === 6) speakOrShow('This is the system unit. It is the brain of the computer.');
    else if (slideNum === 7) speakOrShow('These are the speakers. They make sound.');
    else if (slideNum === 10) { sfx.win(); speakOrShow('Great job, explorer! You learned all the computer parts!'); }
  }

  prevBtn.addEventListener('click', () => { unlockAudio(); goTo(current - 1); });
  nextBtn.addEventListener('click', () => { unlockAudio(); goTo(current + 1); });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowRight') { unlockAudio(); goTo(current + 1); }
    if (e.key === 'ArrowLeft')  { unlockAudio(); goTo(current - 1); }
  });

  /* =========================================================
     6. START LEARNING BUTTON — unlock audio inside gesture
     ========================================================= */
  document.querySelectorAll('.pulse-play').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      unlockAudio();
      sfx.tap();
      // let the beep finish before speech starts
      setTimeout(() => speakOrShow("Let's begin!"), 120);
      setTimeout(() => goTo(1), 500);
    });
  });

  /* =========================================================
     7. "HEAR THE NAME" BUTTONS
     ========================================================= */
  document.querySelectorAll('button').forEach(btn => {
    if (!/Hear the Name/i.test(btn.textContent)) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      unlockAudio();
      const slide   = btn.closest('.slide');
      const hotspot = slide?.querySelector('.hotspot');
      const part    = hotspot?.dataset.part;
      if (part && PART_INFO[part]) {
        sfx.tap();
        setTimeout(() => speakOrShow(PART_INFO[part].line), 120);
        bounce(hotspot);
      } else {
        speakOrShow('Hello!');
      }
    });
  });

  function bounce(el) {
    if (!el) return;
    el.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
      { duration: 500, easing: 'ease-out' }
    );
  }

  /* =========================================================
     8. TAP THE PARTS (slide 8)
     ========================================================= */
  const tapFeedback = document.getElementById('tapFeedback');
  let tapped = new Set();

  document.querySelectorAll('.hotspot[data-part]').forEach(el => {
    el.addEventListener('click', () => {
      unlockAudio();
      const part = el.dataset.part;
      const info = PART_INFO[part];
      if (!info) return;

      sfx.tap();
      setTimeout(() => speakOrShow(info.line), 120);
      bounce(el);

      if (tapFeedback) {
        tapFeedback.textContent = `✅ ${info.name} — ${info.line.split('.')[0]}!`;
        tapFeedback.classList.remove('feedback-pop');
        void tapFeedback.offsetWidth;
        tapFeedback.classList.add('feedback-pop');
      }

      el.classList.remove('pulse-ring');
      tapped.add(part);

      if (tapped.size === Object.keys(PART_INFO).length) {
        setTimeout(() => {
          sfx.correct();
          if (tapFeedback) tapFeedback.textContent = '🎉 You found every part — amazing!';
          speakOrShow('You found every part. Amazing job!');
        }, 900);
      }
    });
  });

  /* =========================================================
     9. MATCH THE EMOJI (slide 9)
     ========================================================= */
  const matchTarget  = document.getElementById('matchTarget');
  const matchChoices = document.querySelectorAll('.match-choice');

  const MATCH_SEQUENCE = [
    { emoji: '🖥️', label: 'Monitor',  speakLine: 'Find the monitor!' },
    { emoji: '⌨️', label: 'Keyboard', speakLine: 'Find the keyboard!' },
    { emoji: '🖱️', label: 'Mouse',    speakLine: 'Find the mouse!' },
    { emoji: '🔊', label: 'Speakers', speakLine: 'Find the speakers!' }
  ];
  let matchIndex = 0;

  function loadMatchRound() {
    if (!matchTarget || matchChoices.length === 0) return;
    const round = MATCH_SEQUENCE[matchIndex % MATCH_SEQUENCE.length];
    matchTarget.textContent = round.emoji;
    matchTarget.dataset.correct = round.emoji;

    const pool = ['🖥️', '⌨️', '🖱️', '🔊'];
    if (!pool.includes(round.emoji)) pool[Math.floor(Math.random() * pool.length)] = round.emoji;
    const shuffled = pool.sort(() => Math.random() - 0.5);

    matchChoices.forEach((btn, i) => {
      btn.textContent = shuffled[i] || '❓';
      btn.dataset.emoji = shuffled[i] || '❓';
      btn.classList.remove('ring-4', 'ring-green-400', 'ring-red-300');
    });

    speakOrShow(round.speakLine);
  }

  matchChoices.forEach(btn => {
    btn.addEventListener('click', () => {
      unlockAudio();
      const picked  = btn.dataset.emoji;
      const correct = matchTarget.dataset.correct;

      if (picked === correct) {
        sfx.correct();
        btn.classList.add('ring-4', 'ring-green-400');
        speakOrShow('Yes! Correct!');
        setTimeout(() => {
          matchIndex++;
          if (matchIndex >= MATCH_SEQUENCE.length) {
            sfx.win();
            speakOrShow('You matched them all! Wonderful!');
            matchTarget.textContent = '🏆';
            matchTarget.dataset.correct = '';
          } else {
            loadMatchRound();
          }
        }, 900);
      } else {
        sfx.wrong();
        btn.classList.add('ring-4', 'ring-red-300');
        speakOrShow('Try again!');
        setTimeout(() => btn.classList.remove('ring-4', 'ring-red-300'), 500);
      }
    });
  });

  // Watch for slide 9 becoming active
  const slideObserver = new MutationObserver(() => {
    const active = document.querySelector('.slide.active');
    if (!active) return;
    const num = parseInt(active.dataset.slide, 10);
    if (num === 9) loadMatchRound();
  });
  slides.forEach(s => slideObserver.observe(s, { attributes: true, attributeFilter: ['class'] }));

  /* =========================================================
     10. SLIDE 2 TILES
     ========================================================= */
  document.querySelectorAll('.slide[data-slide="2"] .grid > div').forEach(tile => {
    tile.addEventListener('click', () => {
      unlockAudio();
      const labelEl = tile.querySelector('span:last-child');
      const text = labelEl?.textContent?.trim() || '';
      if (text) {
        sfx.tap();
        setTimeout(() => speakOrShow(`We can use a computer to ${text.toLowerCase()}!`), 120);
        tile.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
          { duration: 350, easing: 'ease-out' }
        );
      }
    });
  });

  /* =========================================================
     11. BOOT
     ========================================================= */
  function boot() {
    slides.forEach((s, i) => s.classList.toggle('active', i === 0));
    dots.forEach((d, i) => d.classList.toggle('active', i === 0));
    current = 0;
    prevBtn.disabled = true;
    nextBtn.disabled = total === 1;
    progress.style.width = (1 / total * 100) + '%';
    label.textContent = `Slide 1 of ${total}`;
    console.log('✅ Slides ready:', total);
  }
  boot();

  // Also unlock on any first click anywhere (safety net)
  document.addEventListener('click', function firstClick() {
    unlockAudio();
    document.removeEventListener('click', firstClick);
  }, { once: true });

  // Expose for debugging
  window.Class1MeetComputer = { goTo, speak, speakOrShow, sfx, beep, unlockAudio };

  console.log('%c✅ Class 1 – Meet the Computer JS loaded', 'color:#6366f1;font-weight:bold');
})();