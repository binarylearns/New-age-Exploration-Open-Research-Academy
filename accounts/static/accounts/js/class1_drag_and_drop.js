(function () {
  'use strict';
  console.log('🟡 [BuildComputer] File loaded');

  /* ---------- PART DEFINITIONS ---------- */
  const PARTS = {
    monitor: {
      name: 'Monitor',
      emoji: '🖥️',
      bg: 'from-blue-400 to-blue-600',
      hint: 'It has a screen and shows pictures and words.',
      facts: 'The monitor is the screen you look at.'
    },
    keyboard: {
      name: 'Keyboard',
      emoji: '⌨️',
      bg: 'from-purple-400 to-purple-600',
      hint: 'It has lots of keys with letters and numbers.',
      facts: 'You use the keyboard to type letters and numbers.'
    },
    mouse: {
      name: 'Mouse',
      emoji: '🖱️',
      bg: 'from-pink-400 to-pink-600',
      hint: 'It helps you point and click.',
      facts: 'The mouse helps you point and click.'
    },
    cpu: {
      name: 'System Unit',
      emoji: '🖲️',
      bg: 'from-gray-500 to-gray-700',
      hint: "It's the computer's brain — it thinks and works fast!",
      facts: 'The system unit is the computer\'s brain.'
    },
    speakers: {
      name: 'Speakers',
      emoji: '🔊',
      bg: 'from-orange-400 to-orange-600',
      hint: 'They make music and sound.',
      facts: 'The speakers make sound.'
    }
  };

  const SLOT_ORDER = ['monitor', 'cpu', 'keyboard', 'mouse', 'speakers'];
  // Note: only monitor, cpu, keyboard, mouse appear in the desk HTML above.
  // Speakers is a bonus optional — if you add a slot for it, remove the skip below.

  /* ---------- AUDIO (notification-style SFX) ---------- */
  let audioCtx = null;

  function unlockAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return Promise.resolve(false);
    if (!audioCtx) {
      try { audioCtx = new AC(); } catch (e) { return Promise.resolve(false); }
    }
    if (audioCtx.state === 'running') return Promise.resolve(true);
    return audioCtx.resume().then(() => {
      if (audioCtx.state === 'running') {
        try {
          const b = audioCtx.createBuffer(1, 1, 22050);
          const s = audioCtx.createBufferSource();
          s.buffer = b;
          s.connect(audioCtx.destination);
          s.start(0);
        } catch (e) {}
      }
      return audioCtx.state === 'running';
    }).catch(() => false);
  }

  function tone(freq, startOffset, dur, type, vol) {
    if (!audioCtx || audioCtx.state !== 'running') return;
    try {
      const t = audioCtx.currentTime + startOffset;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const attack = 0.012;
      const peak = vol != null ? vol : 0.2;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + attack);
      gain.gain.setValueAtTime(peak, t + Math.max(attack, dur * 0.35));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch (e) {}
  }

  function playSequence(notes) {
    const run = () => notes.forEach(n =>
      tone(n.freq, n.at || 0, n.dur || 0.18, n.type || 'sine', n.vol));
    if (audioCtx && audioCtx.state === 'running') { run(); return; }
    unlockAudio().then(ok => { if (ok) run(); });
  }

  const sfx = {
    pick: () => playSequence([
      { freq: 900, at: 0, dur: 0.06, type: 'sine', vol: 0.08 }
    ]),
    correct: () => playSequence([
      { freq: 1046.50, at: 0,    dur: 0.15, type: 'sine', vol: 0.22 },
      { freq: 1318.51, at: 0.12, dur: 0.28, type: 'sine', vol: 0.22 }
    ]),
    wrong: () => playSequence([
      { freq: 330, at: 0,    dur: 0.14, type: 'sine',     vol: 0.15 },
      { freq: 220, at: 0.10, dur: 0.20, type: 'triangle', vol: 0.13 }
    ]),
    hint: () => playSequence([
      { freq: 880,  at: 0,    dur: 0.10, type: 'sine', vol: 0.12 },
      { freq: 1320, at: 0.08, dur: 0.14, type: 'sine', vol: 0.12 }
    ]),
    win: () => playSequence([
      { freq: 523.25,  at: 0,    dur: 0.14, type: 'sine', vol: 0.20 },
      { freq: 659.25,  at: 0.10, dur: 0.14, type: 'sine', vol: 0.20 },
      { freq: 783.99,  at: 0.20, dur: 0.14, type: 'sine', vol: 0.20 },
      { freq: 1046.50, at: 0.30, dur: 0.40, type: 'sine', vol: 0.24 }
    ])
  };

  ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => unlockAudio(), { once: true, passive: true });
  });

  /* ---------- STATE ---------- */
  const state = {
    placed: new Set(),
    moves: 0,
    hintsUsed: 0,
    activeDrag: null,    // currently dragged card
    activeSlot: null,    // slot the pointer is over
    dragOffset: { x: 0, y: 0 },
    pointerStart: { x: 0, y: 0 },
    dragThreshold: 6,    // px before we call it a drag (allows clicks)
  };

  const el = {
    partsTray:    document.getElementById('partsTray'),
    slots:        Array.from(document.querySelectorAll('.drop-slot')),
    movesCount:   document.getElementById('movesCount'),
    starsRow:     document.getElementById('starsRow'),
    completionOv: document.getElementById('completionOverlay'),
    finalMoves:   document.getElementById('finalMoves'),
    finalStars:   document.getElementById('finalStars'),
    btnReset:     document.getElementById('btnReset'),
    btnHint:      document.getElementById('btnHint'),
    btnPlayAgain: document.getElementById('btnPlayAgain'),
    instructions: document.getElementById('instructions'),
  };

  /* ---------- BUILD THE PARTS TRAY ---------- */
  function buildTray() {
    el.partsTray.innerHTML = '';
    // Shuffle so kids have to think
    const order = shuffle(SLOT_ORDER.filter(k => !state.placed.has(k)));
    order.forEach(key => {
      const part = PARTS[key];
      const card = document.createElement('div');
      card.className =
        `part-card bg-gradient-to-br ${part.bg} text-white rounded-2xl shadow-lg ` +
        `px-4 py-3 md:px-5 md:py-4 flex flex-col items-center justify-center ` +
        `w-24 h-24 md:w-28 md:h-28 select-none border-4 border-white/50`;
      card.dataset.partKey = key;
      card.innerHTML = `
        <span class="text-3xl md:text-4xl mb-1">${part.emoji}</span>
        <span class="text-xs md:text-sm font-extrabold text-center leading-tight">${part.name}</span>
      `;
      attachDragHandlers(card);
      el.partsTray.appendChild(card);
    });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- DRAG HANDLERS (pointer events, works on touch + mouse) ---------- */
  function attachDragHandlers(card) {
    card.addEventListener('pointerdown', onPointerDown);
  }

  function onPointerDown(e) {
    const card = e.currentTarget;
    if (!card || card.classList.contains('placed')) return;
    e.preventDefault();
    unlockAudio();
    sfx.pick();

    const rect = card.getBoundingClientRect();
    state.activeDrag = card;
    state.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    state.pointerStart = { x: e.clientX, y: e.clientY };
    state.dragging = false;    // until we pass the threshold

    // Use pointer capture so we get the move/up even if the pointer leaves the card
    try { card.setPointerCapture(e.pointerId); } catch (err) {}

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(e) {
    if (!state.activeDrag) return;
    const dx = e.clientX - state.pointerStart.x;
    const dy = e.clientY - state.pointerStart.y;
    if (!state.dragging && Math.hypot(dx, dy) > state.dragThreshold) {
      state.dragging = true;
      // Convert to fixed-position "ghost"
      const card = state.activeDrag;
      const rect = card.getBoundingClientRect();
      card.style.width = rect.width + 'px';
      card.style.height = rect.height + 'px';
      card.classList.add('dragging');
    }

    if (state.dragging) {
      const card = state.activeDrag;
      card.style.left = (e.clientX - state.dragOffset.x) + 'px';
      card.style.top  = (e.clientY - state.dragOffset.y) + 'px';

      // Highlight the slot under the pointer
      const slot = getSlotUnderPoint(e.clientX, e.clientY);
      highlightSlot(slot);
    }
  }

  function onPointerUp(e) {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);

    if (!state.activeDrag) return;
    const card = state.activeDrag;
    const wasDragging = state.dragging;

    if (wasDragging) {
      const slot = getSlotUnderPoint(e.clientX, e.clientY);
      if (slot) {
        tryDrop(card, slot);
      } else {
        // Released over nothing → animate back
        snapBackToTray(card);
      }
    }

    // Cleanup
    card.classList.remove('dragging');
    card.style.left = '';
    card.style.top = '';
    card.style.width = '';
    card.style.height = '';
    highlightSlot(null);
    state.activeDrag = null;
    state.dragging = false;
  }

  function getSlotUnderPoint(x, y) {
    return el.slots.find(slot => {
      if (slot.classList.contains('filled')) return false;
      const r = slot.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) || null;
  }

  function highlightSlot(slot) {
    if (state.activeSlot === slot) return;
    if (state.activeSlot) state.activeSlot.classList.remove('hover');
    if (slot) slot.classList.add('hover');
    state.activeSlot = slot;
  }

  /* ---------- DROP LOGIC ---------- */
  function tryDrop(card, slot) {
    const partKey = card.dataset.partKey;
    const accepts = slot.dataset.accepts;

    if (partKey === accepts) {
      // Correct!
      placePart(card, slot, partKey);
    } else {
      // Wrong
      slot.classList.add('wrong-flash');
      setTimeout(() => slot.classList.remove('wrong-flash'), 500);
      sfx.wrong();
      state.moves++;
      updateMoves();
      showInstruction('❌ Not quite — that part goes somewhere else!');
      snapBackToTray(card);
    }
  }

  function placePart(card, slot, partKey) {
    slot.classList.add('filled', 'pop');
    slot.dataset.placedPart = partKey;

    // Render the part inside the slot
    const part = PARTS[partKey];
    slot.innerHTML = `
      <span class="text-5xl md:text-6xl mb-1">${part.emoji}</span>
      <span class="slot-label text-green-700 font-extrabold">${part.name}</span>
    `;

    // Fade out the tray card
    card.classList.add('placed');
    setTimeout(() => card.remove(), 300);

    state.placed.add(partKey);
    state.moves++;
    updateMoves();
    markStar(partKey);
    sfx.correct();
    throwConfetti();
    showInstruction(`✅ Great! That's the ${part.name}.`);

    // Check for completion
    const requiredSlots = el.slots.length;
    if (state.placed.size >= requiredSlots) {
      setTimeout(finish, 700);
    }
  }

  function snapBackToTray(card) {
    // Simple: just remove the dragging class (CSS transitions it back)
    card.style.transition = 'transform 0.3s, opacity 0.3s';
    card.classList.add('snap-back');
    setTimeout(() => {
      card.classList.remove('snap-back');
      card.style.transition = '';
    }, 300);
  }

  /* ---------- HUD ---------- */
  function updateMoves() {
    if (el.movesCount) el.movesCount.textContent = state.moves;
  }

  function markStar(partKey) {
    const idx = SLOT_ORDER.indexOf(partKey);
    if (idx === -1) return;
    const star = document.querySelector(`.star-slot[data-star="${idx + 1}"]`);
    if (!star || !star.classList.contains('text-gray-300')) return;
    star.classList.remove('text-gray-300');
    star.classList.add('text-amber-400', 'star-pop');
    setTimeout(() => star.classList.remove('star-pop'), 600);
  }

  function showInstruction(msg) {
    if (!el.instructions) return;
    el.instructions.textContent = msg;
    el.instructions.classList.add('bg-yellow-100');
    setTimeout(() => {
      el.instructions.classList.remove('bg-yellow-100');
      el.instructions.textContent = '👇 Drag each part to the right spot on the desk!';
    }, 2200);
  }

  function throwConfetti() {
    const emojis = ['⭐', '🎉', '✨', '🌟', '💫'];
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      c.style.left = (20 + Math.random() * 60) + 'vw';
      c.style.top = (40 + Math.random() * 20) + 'vh';
      c.style.fontSize = (18 + Math.random() * 16) + 'px';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 1900);
    }
  }

  /* ---------- HINT ---------- */
  function showHint() {
    if (!state.placed.size === el.slots.length) return;
    // Find first unfilled slot, then find its part card
    const unfilledSlot = el.slots.find(s => !s.classList.contains('filled'));
    if (!unfilledSlot) return;
    const key = unfilledSlot.dataset.accepts;
    const part = PARTS[key];
    if (!part) return;

    sfx.hint();
    state.hintsUsed++;
    showInstruction(`💡 Hint: ${part.hint}`);

    // Pulse the correct tray card
    const card = el.partsTray.querySelector(`.part-card[data-part-key="${key}"]`);
    if (card) {
      card.style.transition = 'transform 0.3s, box-shadow 0.3s';
      card.style.transform = 'scale(1.15)';
      card.style.boxShadow = '0 0 0 6px rgba(251, 191, 36, 0.7)';
      setTimeout(() => {
        card.style.transform = '';
        card.style.boxShadow = '';
      }, 1200);
    }

    // Pulse the correct slot
    unfilledSlot.style.transition = 'transform 0.3s, box-shadow 0.3s';
    unfilledSlot.style.transform = 'scale(1.05)';
    unfilledSlot.style.boxShadow = '0 0 0 6px rgba(251, 191, 36, 0.7)';
    setTimeout(() => {
      unfilledSlot.style.transform = '';
      unfilledSlot.style.boxShadow = '';
    }, 1200);
  }

  /* ---------- FINISH ---------- */
  function finish() {
    if (el.completionOv) {
      el.completionOv.classList.remove('hidden');
      el.finalMoves.textContent = state.moves;
      const stars = Math.max(1, 5 - Math.floor(state.moves / 3) - state.hintsUsed);
      el.finalStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
    }
    sfx.win();
  }

  /* ---------- RESET ---------- */
  function resetAll() {
    state.placed.clear();
    state.moves = 0;
    state.hintsUsed = 0;
    updateMoves();

    // Reset slots
    el.slots.forEach(slot => {
      slot.classList.remove('filled', 'pop', 'wrong-flash', 'hover');
      delete slot.dataset.placedPart;
      const key = slot.dataset.accepts;
      const part = PARTS[key];
      const defaultEmoji = part ? part.emoji : '❓';
      const defaultLabel = part ? part.name : 'Part';
      slot.innerHTML = `
        <span class="text-4xl md:text-5xl mb-1 opacity-60">${defaultEmoji}</span>
        <span class="slot-label">${defaultLabel} goes here</span>
      `;
    });

    // Reset stars
    document.querySelectorAll('.star-slot').forEach(s => {
      s.classList.add('text-gray-300');
      s.classList.remove('text-amber-400', 'star-pop');
    });

    // Hide overlay
    if (el.completionOv) el.completionOv.classList.add('hidden');

    // Rebuild tray
    buildTray();

    if (el.instructions) {
      el.instructions.textContent = '👇 Drag each part to the right spot on the desk!';
    }
  }

  /* ---------- EVENT BINDINGS ---------- */
  el.btnReset?.addEventListener('click', resetAll);
  el.btnHint?.addEventListener('click', showHint);
  el.btnPlayAgain?.addEventListener('click', resetAll);

  // Prevent page scroll while dragging on touch
  document.addEventListener('touchmove', (e) => {
    if (state.activeDrag && state.dragging) e.preventDefault();
  }, { passive: false });

  /* ---------- INIT ---------- */
  function init() {
    if (!el.partsTray || !el.slots.length) {
      console.error('❌ [BuildComputer] Missing #partsTray or .drop-slot elements');
      return;
    }
    buildTray();
    updateMoves();
    console.log('🟢 [BuildComputer] init — slots:', el.slots.length);
    window.BuildComputer = { resetAll, showHint };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();