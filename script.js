// ====== CONFIG (edit these freely) ======
const CONFIG = {
  PASSWORD: '28102025',
};

// foto momen sekarang ada di momen.html + momen.js (dipisah biar halaman ini ringan)

const MESSAGES = [
  'Selamat ulang tahun, Tatacuu 🎂',
  'Hari ini kamu resmi genap 24 tahun 🎉',
  'Selamat sudah bisa bertahan di dunia ini selama 24 tahun 🥰',
  'Terima kasih sudah selalu ada, jadi tempat paling nyaman buat pulang 🤍',
  'Semoga apa yang kamu mimpikan pelan-pelan bisa jadi kenyataan 🌷',
  'Sehat-sehat terus yahh tatacuu, bahagia terus 💖',
  'Bismillah yok bisa yok tahun depan ultah sdh tinggal serumah 😆',
  'love you so much, happy birthday, tayangkuu 💖',
];

const FLEE_LINES = [
  'Eh, gabisa dipilih! 🙅‍♀️',
  'Yah, kelewat mulu deh~ 😆',
  'Coba lagi? Tetep gabisa kok 😂',
  'Sat set langsung kabur~ 🏃‍♀️💨',
  'Tombol ini emang licik 😏',
  'Capek-capek ngejar, tetep gakena 🤭',
  'Jodohnya cuma tombol satunya lagi tuh 👉',
  'Wkwk gigih banget sih kamu 😹',
];

const NGAMBEK_AFTER = 5; // pencet "Tidak" segini kali -> halaman ngambek

const MOO_LINES = [
  'Mooo~ 🐮',
  'Moooooo!! 💢',
  'Mbee— eh salah, Mooo 🐄',
  'Moo? Kok kamu gitu? 😤',
  'MOOOO!!! 🐮💨',
];

// ====== HELPERS ======
const $ = (sel, ctx = document) => ctx.querySelector(sel);

function showSection(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}

const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

function attachTilt(el, maxTilt = 12) {
  if (!FINE_POINTER) return; // no tilt on touch: it fights with scrolling
  el.addEventListener('pointermove', (e) => {
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (py - 0.5) * -2 * maxTilt;
    const ry = (px - 0.5) * 2 * maxTilt;
    el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
  });
  el.addEventListener('pointerleave', () => {
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  });
}

function burstAt(x, y, count = 30) {
  const emojis = ['💖', '💕', '💗', '✨', '🎉', '🌸', '🦒'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'burst-particle';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 100 + Math.random() * 260;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 160;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.setProperty('--tx', tx.toFixed(0) + 'px');
    el.style.setProperty('--ty', ty.toFixed(0) + 'px');
    el.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

const AMBIENT_GLYPHS = {
  love: ['💗', '💕', '✨', '💫', '🦒'],
  fire: ['🔥', '🔥', '🔥', '💢', '🐮'],
};

function spawnAmbientHearts(count = 25) {
  const container = $('#floating-hearts');
  const glyphs = AMBIENT_GLYPHS.love;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'floating-heart';
    el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.fontSize = (0.8 + Math.random() * 1.4) + 'rem';
    el.style.animationDuration = (8 + Math.random() * 10) + 's';
    el.style.animationDelay = (Math.random() * 10) + 's';
    container.appendChild(el);
  }
}

let bgSetMood = null; // diisi oleh initBackground3D

// 'love' -> hati pink; 'fire' -> api (dipakai di halaman ngambek)
function setAmbientMood(mode) {
  const container = $('#floating-hearts');
  container.classList.toggle('fire', mode === 'fire');
  const glyphs = AMBIENT_GLYPHS[mode] || AMBIENT_GLYPHS.love;
  container.querySelectorAll('.floating-heart').forEach((el) => {
    el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
  });
  if (bgSetMood) bgSetMood(mode);
}

// ====== PASSWORD SCREEN ======
function initPasswordScreen() {
  const form = $('#password-form');
  const input = $('#password-input');
  const card = $('#password-card');
  const error = $('#password-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value.trim().toLowerCase();
    if (val === CONFIG.PASSWORD) {
      sessionStorage.setItem('ultah-unlocked', '1'); // dipakai momen.html buat jaga gerbang
      showSection('screen-question');
    } else {
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      error.classList.add('show');
      input.value = '';
      input.focus();
    }
  });
}

// ====== NGAMBEK SCREEN ======
function placeCowRandom(cow) {
  cow.style.left = (4 + Math.random() * 76) + '%';
  cow.style.top = (6 + Math.random() * 72) + '%';
  cow.style.setProperty('--rot', (Math.random() * 50 - 25).toFixed(0) + 'deg');
  cow.style.setProperty('--sx', Math.random() < 0.5 ? '-1' : '1');
}

// pas sapi dipencet dia langsung pointer-events: none (fading), jadi event click
// dari pointerup bisa jatuh ke tombol di bawahnya -> telan click itu sebentar
let suppressClickUntil = 0;
document.addEventListener(
  'click',
  (e) => {
    if (performance.now() < suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true
);

function spawnCows() {
  const field = $('#cow-field');
  field.innerHTML = '';
  const count = 1 + Math.floor(Math.random() * 5); // 1-5 ekor sapi

  // acak urutan sapi-1..sapi-5 lalu ambil sebanyak count, biar gak ada yang dobel
  const ids = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, count);

  ids.forEach((id, i) => {
    const cow = document.createElement('img');
    cow.className = 'cow';
    cow.src = `images/sapi-${id}.jpg`;
    cow.alt = 'sapi ngambek 🐄';
    cow.draggable = false;
    cow.style.setProperty('--size', Math.round(95 + Math.random() * 85) + 'px');
    cow.style.setProperty('--delay', (i * 0.16).toFixed(2) + 's');
    placeCowRandom(cow);

    cow.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      suppressClickUntil = performance.now() + 600;
      if (cow.classList.contains('fading')) return;

      const moo = document.createElement('span');
      moo.className = 'moo-pop';
      moo.textContent = MOO_LINES[Math.floor(Math.random() * MOO_LINES.length)];
      moo.style.left = cow.style.left;
      moo.style.top = cow.style.top;
      field.appendChild(moo);
      moo.addEventListener('animationend', () => moo.remove());

      // memudar, hilang, lalu muncul lagi di tempat lain setelah 2 detik
      cow.classList.add('fading');
      setTimeout(() => {
        placeCowRandom(cow);
        cow.style.setProperty('--delay', '0s');
        cow.classList.remove('fading'); // animasi pop + wiggle jalan lagi dari awal
        void cow.offsetWidth;
      }, 500);
    });

    field.appendChild(cow);
  });
}

// ====== QUESTION SCREEN ======
function initQuestionScreen() {
  const zone = $('#button-zone');
  const btnNo = $('#btn-no');
  const btnYes = $('#btn-yes');
  const bubble = $('#flee-bubble');
  let fleeCount = 0;
  let noTries = 0;
  let lastFlee = 0;

  function resetNoButton() {
    btnNo.classList.remove('fleeing');
    btnNo.style.left = '';
    btnNo.style.top = '';
    btnNo.style.transform = '';
    btnYes.style.transform = '';
    bubble.classList.remove('show');
    fleeCount = 0;
    noTries = 0;
  }

  function flee() {
    // pointerenter + touchstart bisa dobel dalam satu tap; hitung sekali saja
    const now = performance.now();
    if (now - lastFlee < 150) return;
    lastFlee = now;

    noTries++;
    if (noTries === NGAMBEK_AFTER) {
      setTimeout(() => {
        spawnCows();
        setAmbientMood('fire');
        if (window.MusicPlayer) window.MusicPlayer.setTrack('music/phonk.mp3'); // mode ngambek -> phonk
        showSection('screen-ngambek');
      }, 700);
    }

    btnNo.classList.add('fleeing');

    const zoneRect = zone.getBoundingClientRect();
    const btnRect = btnNo.getBoundingClientRect();
    const yesRect = btnYes.getBoundingClientRect();
    const maxX = Math.max(zoneRect.width - btnRect.width, 0);
    const maxY = Math.max(zoneRect.height - btnRect.height, 0);

    // keep-out area around the Yes button (zone-relative, with margin)
    const KEEP_OUT = 18;
    const yes = {
      left: yesRect.left - zoneRect.left - KEEP_OUT,
      top: yesRect.top - zoneRect.top - KEEP_OUT,
      right: yesRect.right - zoneRect.left + KEEP_OUT,
      bottom: yesRect.bottom - zoneRect.top + KEEP_OUT,
    };

    let newX = 0;
    let newY = 0;
    for (let i = 0; i < 40; i++) {
      newX = Math.random() * maxX;
      newY = Math.random() * maxY;
      const overlapsYes =
        newX < yes.right &&
        newX + btnRect.width > yes.left &&
        newY < yes.bottom &&
        newY + btnRect.height > yes.top;
      if (!overlapsYes) break;
    }

    btnNo.style.left = newX + 'px';
    btnNo.style.top = newY + 'px';
    btnNo.style.transform = `rotate(${(Math.random() * 40 - 20).toFixed(0)}deg)`;

    bubble.textContent = FLEE_LINES[Math.floor(Math.random() * FLEE_LINES.length)];
    const bubbleHalf = Math.min(120, zoneRect.width / 2 - 4);
    const bubbleX = Math.min(Math.max(newX + btnRect.width / 2, bubbleHalf), zoneRect.width - bubbleHalf);
    bubble.style.left = bubbleX + 'px';
    bubble.style.top = Math.max(newY - 6, 16) + 'px';
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.classList.add('show');

    fleeCount = Math.min(fleeCount + 1, 8);
    btnYes.style.transform = `scale(${(1 + fleeCount * 0.025).toFixed(3)})`;
  }

  resetQuestionState = resetNoButton; // dipakai tombol "Balikan yuk" di memory game

  btnNo.addEventListener('pointerenter', flee);
  btnNo.addEventListener('click', (e) => {
    e.preventDefault();
    flee();
  });
  btnNo.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      flee();
    },
    { passive: false }
  );

  btnYes.addEventListener('click', () => {
    const rect = btnYes.getBoundingClientRect();
    burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 34);
    setTimeout(() => { location.href = 'momen.html'; }, 500);
  });

}

// ====== MEMORY GAME (syarat biar dimaafin) ======
let resetQuestionState = null; // diisi initQuestionScreen

function initMemoryGame() {
  const grid = $('#memory-grid');
  const status = $('#memory-status');
  const winBox = $('#memory-win');
  let first = null;
  let lock = false;
  let matched = 0;

  function buildBoard() {
    grid.innerHTML = '';
    winBox.classList.add('hidden');
    first = null;
    lock = false;
    matched = 0;
    status.textContent = 'Pasangan: 0/5';

    // 5 sapi x 2 kartu, dikocok
    const deck = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    deck.forEach((id) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'mem-card';
      card.dataset.id = id;
      card.innerHTML = `
        <span class="mem-inner">
          <span class="mem-face mem-back">❓</span>
          <span class="mem-face mem-front"><img src="images/sapi-${id}.jpg" alt="sapi ${id}" draggable="false"></span>
        </span>`;
      card.addEventListener('click', () => flip(card));
      grid.appendChild(card);
    });
  }

  function flip(card) {
    if (lock || card.classList.contains('flipped')) return;
    card.classList.add('flipped');

    if (!first) {
      first = card;
      return;
    }

    const a = first;
    const b = card;
    first = null;

    if (a.dataset.id === b.dataset.id) {
      a.classList.add('matched');
      b.classList.add('matched');
      matched++;
      status.textContent = `Pasangan: ${matched}/5`;
      const rect = b.getBoundingClientRect();
      burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 10);
      if (matched === 5) {
        setTimeout(() => {
          winBox.classList.remove('hidden');
          winBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          burstAt(window.innerWidth / 2, window.innerHeight / 2, 45);
        }, 650);
      }
    } else {
      lock = true;
      setTimeout(() => {
        a.classList.remove('flipped');
        b.classList.remove('flipped');
        lock = false;
      }, 850);
    }
  }

  // dari halaman ngambek -> harus main dulu
  $('#btn-sorry').addEventListener('click', () => {
    buildBoard();
    showSection('screen-memory');
  });

  // menang -> dimaafin -> apinya padam -> balik ke pertanyaan
  $('#btn-forgiven').addEventListener('click', (e) => {
    burstAt(e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2, 26);
    if (resetQuestionState) resetQuestionState();
    setAmbientMood('love');
    if (window.MusicPlayer) window.MusicPlayer.setTrack('music/birthday.mp3'); // udah dimaafin -> balik ke lagu ultah
    setTimeout(() => showSection('screen-question'), 350);
  });
}

// ====== MESSAGES SCREEN ======
let messagesStarted = false;
function startMessages() {
  if (messagesStarted) return;
  messagesStarted = true;

  const container = $('#message-lines');
  const gap = 1200;

  MESSAGES.forEach((msg, i) => {
    const p = document.createElement('p');
    p.className = 'msg-line';
    p.textContent = msg;
    container.appendChild(p);
    setTimeout(() => {
      p.classList.add('show');
      p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, i * gap + 300);
  });

  setTimeout(() => {
    const finale = $('#finale');
    finale.classList.remove('hidden');
    finale.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const rect = finale.getBoundingClientRect();
    burstAt(rect.left + rect.width / 2, rect.top + 40, 50);
  }, MESSAGES.length * gap + 700);
}

function initReplay() {
  // buang hash #ucapan biar reload-nya beneran mulai dari awal (halaman password)
  $('#btn-replay').addEventListener('click', () => {
    window.location.href = window.location.pathname;
  });
}

// ====== THREE.JS 3D BACKGROUND (progressive enhancement) ======
function createHeartTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.translate(size / 2, size * 0.15);
  ctx.beginPath();
  const top = size * 0.3;
  ctx.moveTo(0, top);
  ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, top);
  ctx.bezierCurveTo(-size / 2, size * 0.6, 0, size * 0.8, 0, size);
  ctx.bezierCurveTo(0, size * 0.8, size / 2, size * 0.6, size / 2, top);
  ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, top);
  ctx.closePath();
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

function createFlameTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(size / 2, 3);
  ctx.bezierCurveTo(size * 0.88, size * 0.38, size * 0.82, size * 0.68, size / 2, size * 0.97);
  ctx.bezierCurveTo(size * 0.18, size * 0.68, size * 0.12, size * 0.38, size / 2, 3);
  ctx.closePath();
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

function initBackground3D() {
  if (typeof THREE === 'undefined') return;

  const container = $('#bg-scene');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 400;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const makeMats = (tex, cols) =>
    cols.map((c) => new THREE.SpriteMaterial({ map: tex, color: c, transparent: true, opacity: 0.85, depthWrite: false }));
  const loveMaterials = makeMats(createHeartTexture(), [0xff6fa5, 0xffb199, 0xd291ff, 0xffe0ec]);
  const fireMaterials = makeMats(createFlameTexture(), [0xff4500, 0xff8c00, 0xffc107, 0xff2d00]);

  const hearts = [];
  let speedMul = 1;
  const count = window.innerWidth < 700 ? 45 : 100;
  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(loveMaterials[i % loveMaterials.length]);
    sprite.position.set((Math.random() - 0.5) * 800, (Math.random() - 0.5) * 640, (Math.random() - 0.5) * 400);
    const scale = 8 + Math.random() * 20;
    sprite.scale.set(scale, scale, 1);
    sprite.userData.speed = 0.15 + Math.random() * 0.4;
    sprite.userData.driftX = (Math.random() - 0.5) * 0.15;
    sprite.userData.mi = i % loveMaterials.length;
    scene.add(sprite);
    hearts.push(sprite);
  }

  // dipanggil setAmbientMood: tukar hati <-> api + api naiknya lebih cepat
  bgSetMood = (mode) => {
    const mats = mode === 'fire' ? fireMaterials : loveMaterials;
    speedMul = mode === 'fire' ? 2.4 : 1;
    hearts.forEach((h) => {
      h.material = mats[h.userData.mi];
    });
  };

  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    hearts.forEach((h) => {
      h.position.y += h.userData.speed * speedMul;
      h.position.x += h.userData.driftX;
      if (h.position.y > 320) h.position.y = -320;
    });
    camera.position.x += (mouseX * 50 - camera.position.x) * 0.03;
    camera.position.y += (-mouseY * 35 - camera.position.y) * 0.03;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
  }
  animate();
}

// ====== INIT ======
document.addEventListener('DOMContentLoaded', () => {
  spawnAmbientHearts(22);
  attachTilt($('#password-card'), 10);
  attachTilt($('#question-card'), 10);
  attachTilt($('#ngambek-card'), 10);
  attachTilt($('#message-card'), 8);

  initPasswordScreen();
  initQuestionScreen();
  initMemoryGame();
  initReplay();

  // balik dari momen.html ("Lanjut ke ucapan →") langsung ke halaman ucapan,
  // tapi cuma kalau sudah pernah lewat gerbang password
  if (location.hash === '#ucapan' && sessionStorage.getItem('ultah-unlocked') === '1') {
    showSection('screen-messages');
    startMessages();
  }

  try {
    initBackground3D();
  } catch (err) {
    console.warn('3D background disabled:', err);
  }
});
