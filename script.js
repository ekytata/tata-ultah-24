// ====== CONFIG (edit these freely) ======
const CONFIG = {
  PASSWORD: 'nurul24', // hint shown on screen: nama depan + umur, tanpa spasi
};

const GALLERY_DATA = [
  { emoji: '💑', gradient: 'linear-gradient(135deg,#ffafbd,#ffc3a0)', caption: 'Waktu pertama kali ketemu, dunia langsung berasa lebih cerah ✨' },
  { emoji: '😂', gradient: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', caption: 'Momen konyol yang bikin kita ketawa sampai sakit perut 😂' },
  { emoji: '🌇', gradient: 'linear-gradient(135deg,#ff9a9e,#fecfef)', caption: 'Sore itu, jalan berdua sampai lupa waktu buat pulang 🌇' },
  { emoji: '🥹', gradient: 'linear-gradient(135deg,#f6d365,#fda085)', caption: 'Saat kamu ngambek tapi tetap saja gemesin di mata aku 🥹' },
  { emoji: '💌', gradient: 'linear-gradient(135deg,#84fab0,#8fd3f4)', caption: 'Waktu kamu bilang sayang duluan, aku baper sampai sekarang 💌' },
  { emoji: '🫶', gradient: 'linear-gradient(135deg,#d4a5ff,#ff9ecb)', caption: 'Dan dari semua momen itu, kamu tetap jadi favoritku 🫶' },
];

const MESSAGES = [
  'Selamat ulang tahun, Nurul Sasmitha 🎂',
  'Hari ini kamu resmi genap 24 tahun 🎉',
  '24 tahun isinya cerita, tawa, dan proses jadi kamu yang sekarang ✨',
  'Makasih ya udah selalu ada, jadi tempat paling nyaman buat pulang 🤍',
  'Semoga semua mimpi kamu pelan-pelan jadi kenyataan 🌷',
  'Sehat-sehat, bahagia terus, dan jangan lupa senyum tiap hari 😄',
  'Aku janji bakal terus ada, buat rayain setiap tahun bareng kamu 💍',
  'I love you so much, happy birthday, sayangku 💖',
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
  const emojis = ['💖', '💕', '💗', '✨', '🎉', '🌸'];
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

function spawnAmbientHearts(count = 25) {
  const container = $('#floating-hearts');
  const glyphs = ['💗', '💕', '✨', '💫'];
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

// ====== QUESTION SCREEN ======
function initQuestionScreen() {
  const zone = $('#button-zone');
  const btnNo = $('#btn-no');
  const btnYes = $('#btn-yes');
  const bubble = $('#flee-bubble');
  let fleeCount = 0;

  function flee() {
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
    setTimeout(() => showSection('screen-gallery'), 500);
  });
}

// ====== GALLERY SCREEN ======
function initGalleryScreen() {
  const grid = $('#gallery-grid');
  GALLERY_DATA.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'polaroid';
    card.innerHTML = `
      <div class="gallery-photo" style="background:${item.gradient}">${item.emoji}</div>
      <p class="caption">${item.caption}</p>
    `;
    grid.appendChild(card);
    attachTilt(card, 8);
  });

  $('#btn-to-messages').addEventListener('click', () => {
    showSection('screen-messages');
    startMessages();
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
  $('#btn-replay').addEventListener('click', () => window.location.reload());
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

  const texture = createHeartTexture();
  const colors = [0xff6fa5, 0xffb199, 0xd291ff, 0xffe0ec];
  const materials = colors.map(
    (c) => new THREE.SpriteMaterial({ map: texture, color: c, transparent: true, opacity: 0.85, depthWrite: false })
  );

  const hearts = [];
  const count = window.innerWidth < 700 ? 45 : 100;
  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(materials[i % materials.length]);
    sprite.position.set((Math.random() - 0.5) * 800, (Math.random() - 0.5) * 640, (Math.random() - 0.5) * 400);
    const scale = 8 + Math.random() * 20;
    sprite.scale.set(scale, scale, 1);
    sprite.userData.speed = 0.15 + Math.random() * 0.4;
    sprite.userData.driftX = (Math.random() - 0.5) * 0.15;
    scene.add(sprite);
    hearts.push(sprite);
  }

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
      h.position.y += h.userData.speed;
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
  attachTilt($('#message-card'), 8);

  initPasswordScreen();
  initQuestionScreen();
  initGalleryScreen();
  initReplay();

  try {
    initBackground3D();
  } catch (err) {
    console.warn('3D background disabled:', err);
  }
});
