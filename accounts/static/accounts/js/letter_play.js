// ============================================================
// 🔤 LETTER PLAY — Class 1 Typing Game
// ============================================================

(function () {
  'use strict';

  // FIX: Define PREETI_MAP BEFORE CONFIG so it's initialized first
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
    fallDuration: 6000,
    maxFallingLetters: 5,
    startingHearts: 3,
    maxHearts: 5,
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

  // ─────────────────────────────────────────────
  // 🧠 STATE
  // ─────────────────────────────────────────────
  const state = {
    language: 'en',
    score: 0,
    hearts: CONFIG.startingHearts,
    timeLeft: CONFIG.gameDuration,
    isPlaying: false,
    isPaused: false,
    fallingLetters: [],
    spawnTimer: null,
    countdownTimer: null,
    animationFrame: null,
    lastFrameTime: 0,
    nextId: 0,
  };

  // ─────────────────────────────────────────────
  // 🎯 DOM REFS
  // ─────────────────────────────────────────────
  const el = {
    playArea:      document.getElementById('playArea'),
    score:         document.getElementById('score'),
    timer:         document.getElementById('timer'),
    hearts:        document.getElementById('hearts'),
    hintText:      document.getElementById('hintText'),
    btnEnglish:    document.getElementById('btnEnglish'),
    btnNepali:     document.getElementById('btnNepali'),
    btnStart:      document.getElementById('btnStart'),
    btnPause:      document.getElementById('btnPause'),
    btnReset:      document.getElementById('btnReset'),
    btnPlayAgain:  document.getElementById('btnPlayAgain'),
    gameOverModal: document.getElementById('gameOverModal'),
    finalScore:    document.getElementById('finalScore'),
    keyboard:      document.getElementById('keyboard'),
  };

  // ─────────────────────────────────────────────
  // 🛠️ HELPERS
  // ─────────────────────────────────────────────
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function getPlayAreaSize() {
    const rect = el.playArea.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function getLetterSize() {
    return window.innerWidth < 640 ? 80 : 96;
  }

  function updateHUD() {
    if (el.score)  el.score.textContent = state.score;
    if (el.timer)  el.timer.textContent = state.timeLeft;
    if (el.hearts) {
      el.hearts.textContent = state.hearts > 0
        ? '❤️'.repeat(state.hearts)
        : '💔';
    }
  }

  // ─────────────────────────────────────────────
  // 📚 LANGUAGE SWITCH
  // ─────────────────────────────────────────────
  function setLanguage(lang) {
    if (state.isPlaying) return;
    state.language = lang;

    const active   = ['bg-purple-500', 'text-white'];
    const inactive = ['bg-white', 'text-purple-600'];

    if (lang === 'en') {
      el.btnEnglish.classList.remove(...inactive);
      el.btnEnglish.classList.add(...active);
      el.btnNepali.classList.remove(...active);
      el.btnNepali.classList.add(...inactive);
    } else {
      el.btnNepali.classList.remove(...inactive);
      el.btnNepali.classList.add(...active);
      el.btnEnglish.classList.remove(...active);
      el.btnEnglish.classList.add(...inactive);
    }
    buildKeyboard();
  }

  // ─────────────────────────────────────────────
  // 🎹 VIRTUAL KEYBOARD
  // ─────────────────────────────────────────────
  function buildKeyboard() {
    if (!el.keyboard) return;
    el.keyboard.innerHTML = '';

    const letters = CONFIG.letters[state.language];

    letters.forEach((letter) => {
      const btn = document.createElement('button');
      btn.type = 'button';

      const key = state.language === 'ne' ? letter.key : letter;
      const label = state.language === 'ne' ? letter.char : letter;

      btn.textContent = label;
      btn.className =
        'bg-white hover:bg-purple-100 active:bg-purple-300 text-purple-700 ' +
        'font-bold text-lg md:text-xl rounded-lg py-2 md:py-3 shadow ' +
        'border-2 border-purple-200 transition';

      btn.addEventListener('click', () => handleKeyPress(key));
      el.keyboard.appendChild(btn);
    });
  }

  // ─────────────────────────────────────────────
  // 🎈 SPAWN A FALLING LETTER
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
    const x = Math.random() * (width - size - padding * 2) + padding;

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

    const speed = height / (CONFIG.fallDuration / 1000);

    state.fallingLetters.push({
      id: state.nextId++,
      key: state.language === 'ne' ? key : key.toUpperCase(),
      char: char,
      el: letterEl,
      y: -100,
      speed: speed
    });
  } // FIX: added missing closing brace for spawnLetter

  // ─────────────────────────────────────────────
  // 🏃 GAME LOOP
  // ─────────────────────────────────────────────
  function gameLoop(timestamp) {
    if (!state.isPlaying) return;

    if (state.isPaused) {
      state.lastFrameTime = timestamp;
      state.animationFrame = requestAnimationFrame(gameLoop);
      return;
    }

    if (!state.lastFrameTime) state.lastFrameTime = timestamp;
    const dt = (timestamp - state.lastFrameTime) / 1000;
    state.lastFrameTime = timestamp;

    const { height } = getPlayAreaSize();
    const size = getLetterSize();

    for (let i = state.fallingLetters.length - 1; i >= 0; i--) {
      const item = state.fallingLetters[i];
      item.y += item.speed * dt;
      item.el.style.top = item.y + 'px';

      if (item.y + size >= height) {
        missLetter(i);
      }
    }

    state.animationFrame = requestAnimationFrame(gameLoop);
  }

  // ─────────────────────────────────────────────
  // 💥 HANDLE KEY PRESS
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

    state.score++;
    updateHUD();
    playSound('catch');
  } // FIX: removed the duplicated/broken tail block that followed this

  // ─────────────────────────────────────────────
  // 💔 MISS
  // ─────────────────────────────────────────────
  function missLetter(index) {
    const item = state.fallingLetters[index];
    if (!item) return;

    item.el.style.transition = 'opacity 0.3s';
    item.el.style.opacity = '0';
    setTimeout(() => item.el.remove(), 300);
    state.fallingLetters.splice(index, 1);

    state.hearts = Math.max(0, state.hearts - 1);
    updateHUD();
    playSound('miss');

    if (state.hearts <= 0) endGame();
  }

  // ─────────────────────────────────────────────
  // ⏱️ COUNTDOWN
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
  // 🔊 SOUND
  // ─────────────────────────────────────────────
  let audioCtx = null;
  function playSound(type) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'catch') {
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'miss') {
        osc.type = 'sawtooth';
        osc.frequency.value = 200;
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      /* audio not critical */
    }
  }

  // ─────────────────────────────────────────────
  // ▶️ START GAME
  // ─────────────────────────────────────────────
  function startGame() {
    if (state.isPlaying) return;

    state.isPlaying = true;
    state.isPaused = false;
    state.score = 0;
    state.hearts = CONFIG.startingHearts;
    state.timeLeft = CONFIG.gameDuration;
    state.lastFrameTime = 0;

    state.fallingLetters.forEach((item) => item.el.remove());
    state.fallingLetters = [];

    el.hintText.classList.add('hidden');
    el.btnStart.classList.add('hidden');
    el.btnPause.classList.remove('hidden');
    el.btnReset.classList.remove('hidden');
    el.btnPause.textContent = '⏸️ Pause';
    el.gameOverModal.classList.add('hidden');

    updateHUD();

    clearInterval(state.spawnTimer);
    state.spawnTimer = setInterval(spawnLetter, CONFIG.spawnInterval);
    spawnLetter();

    startCountdown();
    state.animationFrame = requestAnimationFrame(gameLoop);
  }

  // ─────────────────────────────────────────────
  // ⏸️ PAUSE / RESUME
  // ─────────────────────────────────────────────
  function togglePause() {
    if (!state.isPlaying) return;
    state.isPaused = !state.isPaused;
    el.btnPause.textContent = state.isPaused ? '▶️ Resume' : '⏸️ Pause';
    state.lastFrameTime = 0;
  }

  // ─────────────────────────────────────────────
  // 🛑 END GAME
  // ─────────────────────────────────────────────
  function endGame() {
    if (!state.isPlaying) return;
    state.isPlaying = false;
    state.isPaused = false;

    clearInterval(state.spawnTimer);
    clearInterval(state.countdownTimer);
    cancelAnimationFrame(state.animationFrame);

    state.fallingLetters.forEach((item) => item.el.remove());
    state.fallingLetters = [];

    el.finalScore.textContent = state.score;
    el.gameOverModal.classList.remove('hidden');
    el.btnPause.classList.add('hidden');
  }

  // ─────────────────────────────────────────────
  // 🔄 RESET
  // ─────────────────────────────────────────────
  function resetGame() {
    state.isPlaying = false;
    state.isPaused = false;
    state.score = 0;
    state.hearts = CONFIG.startingHearts;
    state.timeLeft = CONFIG.gameDuration;
    state.lastFrameTime = 0;

    clearInterval(state.spawnTimer);
    clearInterval(state.countdownTimer);
    cancelAnimationFrame(state.animationFrame);

    state.fallingLetters.forEach((item) => item.el.remove());
    state.fallingLetters = [];

    updateHUD();
    el.hintText.classList.remove('hidden');
    el.btnStart.classList.remove('hidden');
    el.btnPause.classList.add('hidden');
    el.btnReset.classList.add('hidden');
    el.gameOverModal.classList.add('hidden');
  }

  // ─────────────────────────────────────────────
  // 🎧 EVENT BINDINGS
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
  el.btnPlayAgain?.addEventListener('click', () => {
    resetGame();
    startGame();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.isPlaying && !state.isPaused) {
      togglePause();
    }
  });

  // ─────────────────────────────────────────────
  // 🚀 INIT
  // ─────────────────────────────────────────────
  buildKeyboard();
  updateHUD();

})();