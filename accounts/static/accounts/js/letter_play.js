(function () {
  'use strict';

  const PREETI_MAP = {
    's': 'क', 'v': 'ख', 'u': 'ग', '3': 'घ',
    'r': 'च', '5': 'छ', 'h': 'ज', '6': 'ट',
    '7': 'ठ', '8': 'ड', '9': 'ढ', '0': 'ण',
    't': 'त', 'y': 'थ', 'b': 'द', 'w': 'ध',
    'g': 'न', 'k': 'प', 'a': 'ब', 'e': 'भ',
    'd': 'म', 'o': 'य', '/': 'र', 'n': 'ल',
    'j': 'व', 'z': 'श', 'i': 'ष', ';': 'स',
    'x': 'ह'
  };

  const CONFIG = {
    gameDuration: 60,
    spawnInterval: 1400,
    minSpawnInterval: 450,
    fallDuration: 6000,
    minFallDuration: 2200,
    maxFallingLetters: 5,
    startingHearts: 3,
    comboWindow: 2500,
    comboBonusEvery: 5,
    letters: {
      en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
      ne: Object.entries(PREETI_MAP).map(([key, char]) => ({ key, char }))
    },
    colors: [
      'from-pink-400 to-pink-600',
      'from-blue-400 to-blue-600',
      'from-yellow-400 to-orange-500',
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-teal-400 to-teal-600',
    ],
  };

  const state = {
    language: 'en',
    playerName: 'Guest',
playerId: null,
    score: 0,
    hearts: CONFIG.startingHearts,
    timeLeft: CONFIG.gameDuration,
    isPlaying: false,
    isPaused: false,
    fallingLetters: [],
    countdownTimer: null,
    animationFrame: null,
    lastFrameTime: 0,
    nextId: 0,
    combo: 0,
    maxCombo: 0,
    lastCatchTime: 0,
    nextSpawnAt: 0,       // timestamp when next spawn should happen
  };

  const el = {
    playArea:      document.getElementById('playArea'),
    score:         document.getElementById('score'),
    
    timer:         document.getElementById('timer'),
    hearts:        document.getElementById('hearts'),
    comboValue:    document.getElementById('comboValue'),
    hintText:      document.getElementById('hintText'),
    btnEnglish:    document.getElementById('btnEnglish'),
    btnNepali:     document.getElementById('btnNepali'),
    btnStart:      document.getElementById('btnStart'),
    btnPause:      document.getElementById('btnPause'),
    btnReset:      document.getElementById('btnReset'),
    btnPlayAgain:  document.getElementById('btnPlayAgain'),
    gameOverModal: document.getElementById('gameOverModal'),
    finalScore:    document.getElementById('finalScore'),
    finalCombo:    document.getElementById('finalCombo'),
  };

  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function getPlayAreaSize() {
    const r = el.playArea.getBoundingClientRect();
    return { width: r.width, height: r.height };
  }

  function getLetterSize() {
    return window.innerWidth < 640 ? 80 : 96;
  }

  function updateHUD() {
    if (el.score)  el.score.textContent = state.score;
    if (el.timer)  el.timer.textContent = state.timeLeft;
    if (el.hearts) el.hearts.textContent = state.hearts > 0 ? '❤️'.repeat(state.hearts) : '💔';
  }

  function updateComboHUD() {
    if (!el.comboValue) return;
    el.comboValue.textContent = state.combo;
    el.comboValue.classList.remove('combo-pop');
    void el.comboValue.offsetWidth;
    el.comboValue.classList.add('combo-pop');
  }

  function getCurrentSpawnInterval() {
    const progress = 1 - (state.timeLeft / CONFIG.gameDuration);
    return Math.max(CONFIG.minSpawnInterval,
      CONFIG.spawnInterval - (CONFIG.spawnInterval - CONFIG.minSpawnInterval) * progress);
  }

  function showComboPopup(text, colorClass) {
    const p = document.createElement('div');
    p.textContent = text;
    p.className =
      'absolute left-1/2 top-1/3 -translate-x-1/2 text-4xl md:text-5xl ' +
      'font-extrabold drop-shadow-lg pointer-events-none z-50 ' +
      (colorClass || 'text-orange-500');
    p.style.animation = 'comboFloat 1s ease-out forwards';
    el.playArea.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }

  function setLanguage(lang) {
    if (state.isPlaying) return;
    state.language = lang;
    const active = ['bg-purple-500', 'text-white'];
    const inactive = ['bg-white', 'text-purple-600'];
    if (lang === 'en') {
      el.btnEnglish.classList.remove(...inactive); el.btnEnglish.classList.add(...active);
      el.btnNepali.classList.remove(...active);   el.btnNepali.classList.add(...inactive);
    } else {
      el.btnNepali.classList.remove(...inactive);  el.btnNepali.classList.add(...active);
      el.btnEnglish.classList.remove(...active);  el.btnEnglish.classList.add(...inactive);
    }
  }

  // ─────────────────────────────────────────────
  // SPAWN
  // ─────────────────────────────────────────────
  function spawnLetter() {
    if (!state.isPlaying || state.isPaused) return;
    if (state.fallingLetters.length >= CONFIG.maxFallingLetters) return;

    const { width, height } = getPlayAreaSize();
    const size = getLetterSize();
    const padding = 10;

    const selected = pickRandom(CONFIG.letters[state.language]);
    const key  = state.language === 'ne' ? selected.key : selected;
    const char = state.language === 'ne' ? selected.char : selected;

    const color = pickRandom(CONFIG.colors);
    const maxX = Math.max(padding, width - size - padding);
    const x = Math.random() * (maxX - padding) + padding;

    const letterEl = document.createElement('div');
    letterEl.className =
      `falling-letter absolute bg-gradient-to-br ${color} text-white ` +
      `text-5xl md:text-6xl font-bold rounded-2xl shadow-lg ` +
      `flex items-center justify-center select-none`;
    letterEl.style.width  = size + 'px';
    letterEl.style.height = size + 'px';
    letterEl.style.left   = x + 'px';
    letterEl.style.top    = '-100px';
    letterEl.textContent  = char;
    el.playArea.appendChild(letterEl);

    const progress = 1 - (state.timeLeft / CONFIG.gameDuration);
    const fallSec    = CONFIG.fallDuration / 1000;
    const minFallSec = CONFIG.minFallDuration / 1000;
    const curFallSec = fallSec - (fallSec - minFallSec) * progress;

    // SAFETY: if height or curFallSec is bad, force a sane speed
    let speed = height / curFallSec;
    if (!isFinite(speed) || speed <= 0) speed = 120; // px per second fallback

    state.fallingLetters.push({
      id: state.nextId++,
      key: state.language === 'ne' ? key : key.toUpperCase(),
      char: char,
      el: letterEl,
      y: -100,
      speed: speed
    });
  }

  // ─────────────────────────────────────────────
  // GAME LOOP — also drives spawning now
  // ─────────────────────────────────────────────
  function gameLoop(timestamp) {
    if (!state.isPlaying) return;

    if (state.isPaused) {
      state.lastFrameTime = timestamp;
      state.animationFrame = requestAnimationFrame(gameLoop);
      return;
    }

    if (!state.lastFrameTime) state.lastFrameTime = timestamp;
    const dt = Math.min((timestamp - state.lastFrameTime) / 1000, 0.1);
    state.lastFrameTime = timestamp;

    const { height } = getPlayAreaSize();
    const size = getLetterSize();

    // Move letters
    for (let i = state.fallingLetters.length - 1; i >= 0; i--) {
      const item = state.fallingLetters[i];
      item.y += item.speed * dt;
      item.el.style.top = item.y + 'px';
      if (item.y + size >= height) missLetter(i);
    }

    // Spawn on schedule (driven by rAF, not setTimeout)
    if (timestamp >= state.nextSpawnAt) {
      spawnLetter();
      state.nextSpawnAt = timestamp + getCurrentSpawnInterval();
    }

    // Combo timeout
    if (state.combo > 0 &&
        performance.now() - state.lastCatchTime > CONFIG.comboWindow) {
      if (state.combo >= 3) showComboPopup('⏱️ Combo ended', 'text-gray-500');
      state.combo = 0;
      updateComboHUD();
    }

    state.animationFrame = requestAnimationFrame(gameLoop);
  }

  // ─────────────────────────────────────────────
  // KEY HANDLER
  // ─────────────────────────────────────────────
  function handleKeyPress(rawKey) {
    if (!state.isPlaying || state.isPaused) return;
    if (!rawKey) return;

    const key = state.language === 'ne'
      ? rawKey.toLowerCase()
      : rawKey.toUpperCase();

    let targetIndex = -1;
    let lowestY = -Infinity;

    state.fallingLetters.forEach((item, i) => {
      if (item.key === key && item.y > lowestY) {
        lowestY = item.y;
        targetIndex = i;
      }
    });

    if (targetIndex === -1) return;

    const target = state.fallingLetters[targetIndex];
    target.el.style.transition = 'transform 0.15s ease-out, opacity 0.15s';
    target.el.style.transform  = 'scale(1.4)';
    target.el.style.opacity    = '0';
    setTimeout(() => target.el.remove(), 150);
    state.fallingLetters.splice(targetIndex, 1);

    state.combo++;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.lastCatchTime = performance.now();
    state.score++;

    if (state.combo % CONFIG.comboBonusEvery === 0) {
      state.score += state.combo;
      playSound('combo');
      showComboPopup(`🔥 COMBO x${state.combo}!`);
    }

    updateHUD();
    updateComboHUD();
    playSound('catch');
  }

  function missLetter(index) {
    const item = state.fallingLetters[index];
    if (!item) return;
    item.el.style.transition = 'opacity 0.3s';
    item.el.style.opacity = '0';
    setTimeout(() => item.el.remove(), 300);
    state.fallingLetters.splice(index, 1);

    state.hearts = Math.max(0, state.hearts - 1);
    if (state.combo >= 3) showComboPopup('💔 Combo lost', 'text-red-500');
    state.combo = 0;
    updateComboHUD();
    updateHUD();
    playSound('miss');

    if (state.hearts <= 0) endGame();
  }

  // ─────────────────────────────────────────────
  // COUNTDOWN
  // ─────────────────────────────────────────────
  function startCountdown() {
    clearInterval(state.countdownTimer);
    state.countdownTimer = setInterval(() => {
      if (!state.isPlaying || state.isPaused) return;
      state.timeLeft--;
      updateHUD();
      if (state.timeLeft <= 0) endGame();
    }, 1000);
  }

  // ─────────────────────────────────────────────
  // SOUND
  // ─────────────────────────────────────────────
  let audioCtx = null;
  function playSound(type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);

      if (type === 'catch') {
        osc.type = 'sine'; osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'miss') {
        osc.type = 'sawtooth'; osc.frequency.value = 200;
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start(); osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'combo') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) { /* ignore */ }
  }

  // ─────────────────────────────────────────────
  // START / PAUSE / END / RESET
  // ─────────────────────────────────────────────
  function startGame() {
    if (state.isPlaying) return;
    state.isPlaying = true;
    state.isPaused = false;
    state.score = 0;
    state.hearts = CONFIG.startingHearts;
    state.timeLeft = CONFIG.gameDuration;
    state.lastFrameTime = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.lastCatchTime = 0;
    state.nextSpawnAt = 0;

    state.fallingLetters.forEach((it) => it.el.remove());
    state.fallingLetters = [];

    el.hintText.classList.add('hidden');
    el.btnStart.classList.add('hidden');
    el.btnPause.classList.remove('hidden');
    el.btnReset.classList.remove('hidden');
    el.btnPause.textContent = '⏸️ Pause';
    el.gameOverModal.classList.add('hidden');

    updateHUD();
    updateComboHUD();

    startCountdown();
    state.animationFrame = requestAnimationFrame(gameLoop);
  }

  function togglePause() {
    if (!state.isPlaying) return;
    state.isPaused = !state.isPaused;
    el.btnPause.textContent = state.isPaused ? '▶️ Resume' : '⏸️ Pause';
    state.lastFrameTime = 0;
  }

  function endGame() {
    if (!state.isPlaying) return;
    state.isPlaying = false;
    state.isPaused = false;
    clearInterval(state.countdownTimer);
    cancelAnimationFrame(state.animationFrame);
    state.fallingLetters.forEach((it) => it.el.remove());
    state.fallingLetters = [];
    el.finalScore.textContent = state.score;
    if (el.finalCombo) el.finalCombo.textContent = state.maxCombo;
    el.gameOverModal.classList.remove('hidden');
    el.btnPause.classList.add('hidden');
  }

  function resetGame() {
    state.isPlaying = false;
    state.isPaused = false;
    state.score = 0;
    state.hearts = CONFIG.startingHearts;
    state.timeLeft = CONFIG.gameDuration;
    state.lastFrameTime = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.lastCatchTime = 0;
    state.nextSpawnAt = 0;

    clearInterval(state.countdownTimer);
    cancelAnimationFrame(state.animationFrame);
    state.fallingLetters.forEach((it) => it.el.remove());
    state.fallingLetters = [];

    updateHUD();
    updateComboHUD();
    el.hintText.classList.remove('hidden');
    el.btnStart.classList.remove('hidden');
    el.btnPause.classList.add('hidden');
    el.btnReset.classList.add('hidden');
    el.gameOverModal.classList.add('hidden');
  }

  // ─────────────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!state.isPlaying || state.isPaused) return;
    if (e.key.length === 1) {
      e.preventDefault();
      handleKeyPress(e.key);
    }
  });

  el.btnEnglish?.addEventListener('click', () => setLanguage('en'));
  el.btnNepali?.addEventListener('click',  () => setLanguage('ne'));
  el.btnStart?.addEventListener('click',   startGame);
  el.btnPause?.addEventListener('click',   togglePause);
  el.btnReset?.addEventListener('click',   resetGame);
  el.btnPlayAgain?.addEventListener('click', () => { resetGame(); startGame(); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.isPlaying && !state.isPaused) togglePause();
  });

  updateHUD();
  updateComboHUD();
})();