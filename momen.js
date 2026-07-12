// halaman galeri momen — dipisah dari index.html biar halaman utama gak ikut
// ngunduh semua foto. foto pakai versi terkompresi di images/momen/ (webp 900px).

// belum lewat gerbang password? balik ke halaman utama dulu
if (sessionStorage.getItem('ultah-unlocked') !== '1') {
  location.replace('index.html');
}

// urutan caption mengikuti nomor foto: images/momen/gallery-1.webp dst.
const GALLERY_CAPTIONS = [
  'Awal dari segalanya 💘',
  'Cowok pertama yang di simpan di kamera itu 😍',
  'First time rakit lego bareng ✨',
  'First time Badminton bareng 🏸',
  'Mixue 🍦',
  'Foto random tapi lucu 😝',
  'Biasanya kalau main basket tata kalah 😋',
  'First time kondangan pake baji kopel 📷',
  'Abis nontonin tata lomba badminton 🏸',
  'Difotoin mamak pas ngantar sekolah 😆',
  'Abis masukin berkas di vidatra 📄',
  'Balapan tapi tata juara 1 🏁',
  'Konseran bareng 🎤',
  'First time make blazer dari 2019 😎',
  'Masuk goa skalian strava 🏞️',
  'First time event lari 5K bareng 🏃‍♀️',
  'Koreksian bareng 📚',
];

const GALLERY_DATA = GALLERY_CAPTIONS.map((caption, i) => ({
  src: `images/momen/gallery-${i + 1}.webp`,
  caption,
}));

// ====== HELPERS ======
const $ = (sel, ctx = document) => ctx.querySelector(sel);

const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

function attachTilt(el, maxTilt = 12) {
  if (!FINE_POINTER) return; // no tilt on touch: it fights with scrolling
  el.addEventListener('pointermove', (e) => {
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--rx', ((py - 0.5) * -2 * maxTilt).toFixed(2) + 'deg');
    el.style.setProperty('--ry', ((px - 0.5) * 2 * maxTilt).toFixed(2) + 'deg');
  });
  el.addEventListener('pointerleave', () => {
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  });
}

function spawnAmbientHearts(count = 22) {
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

// ====== BACKGROUND COLLAGE ======
const BG_DARK_GRADIENTS = [
  'linear-gradient(135deg,#5f2c82,#af4261)',
  'linear-gradient(135deg,#2b5876,#4e4376)',
  'linear-gradient(135deg,#c33764,#5b2c6f)',
];

const BG_WORDS = ['Love ♡', 'Memories', 'Us ✨', 'Forever', 'Sayang', 'Happy 24th', 'N ♡ S', 'Celebrate Love'];

function buildGalleryBackground() {
  const track = $('#gallery-bg-track');
  const colWidths = [210, 170, 250, 190, 230, 180];
  const targetWidth = Math.max(window.innerWidth, 900) * 1.3;

  // urutan foto dikocok sekali, lalu dipakai bergilir biar semua 17 foto kebagian
  const photoOrder = GALLERY_DATA.map((g) => g.src).sort(() => Math.random() - 0.5);
  let photoIdx = 0;

  const cols = [];
  let width = 0;
  let wordIdx = 0;

  for (let i = 0; width < targetWidth || i < 8; i++) {
    const w = colWidths[i % colWidths.length];
    width += w + 6; // + margin antar kolom
    const col = document.createElement('div');
    col.className = 'bg-col';
    col.style.width = w + 'px';

    const tiles = 2 + (i % 2); // selang-seling 2-3 tile per kolom
    for (let t = 0; t < tiles; t++) {
      const tile = document.createElement('div');
      const isWord = Math.random() < 0.2;
      tile.className = 'bg-tile' + (isWord ? ' word' : ' photo');
      tile.style.flexGrow = (0.7 + Math.random()).toFixed(2);
      if (isWord) {
        tile.style.background = BG_DARK_GRADIENTS[Math.floor(Math.random() * BG_DARK_GRADIENTS.length)];
        tile.textContent = BG_WORDS[wordIdx++ % BG_WORDS.length];
      } else {
        tile.style.backgroundImage = `url(${photoOrder[photoIdx++ % photoOrder.length]})`;
      }
      col.appendChild(tile);
    }
    cols.push(col);
  }

  // dua salinan identik berdampingan -> geser 50% = loop mulus tanpa "lompatan"
  cols.forEach((c) => track.appendChild(c));
  cols.forEach((c) => track.appendChild(c.cloneNode(true)));

  track.style.setProperty('--slide-dur', Math.round(width / 22) + 's'); // ~22px per detik
}

// ====== IDLE MODE (3 detik tanpa klik -> konten fadeout, tinggal kolase) ======
const GALLERY_IDLE_MS = 3000;

function initGalleryIdleMode() {
  const section = $('#screen-gallery');
  const bg = $('#gallery-bg');
  let timer = null;
  let hidden = false;

  function hideContent() {
    hidden = true;
    section.classList.add('idle');
    bg.classList.add('ambient');
  }

  function showContent() {
    hidden = false;
    section.classList.remove('idle');
    bg.classList.remove('ambient');
  }

  function armTimer() {
    clearTimeout(timer);
    timer = setTimeout(hideContent, GALLERY_IDLE_MS);
  }

  // klik/tap di mana saja: munculin konten lagi (kalau lagi sembunyi) + reset hitungan
  section.addEventListener('pointerdown', () => {
    if (hidden) showContent();
    armTimer();
  });

  // lagi scroll foto = lagi aktif; jangan fadeout di tengah scroll
  section.addEventListener(
    'scroll',
    () => {
      if (!hidden) armTimer();
    },
    { passive: true }
  );

  armTimer();
}

// ====== GALLERY GRID ======
function initGalleryGrid() {
  const grid = $('#gallery-grid');
  GALLERY_DATA.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'polaroid';
    card.innerHTML = `
      <div class="gallery-photo"><img src="${item.src}" alt="momen kita ${i + 1}" loading="lazy" decoding="async" draggable="false"></div>
      <p class="caption">${item.caption}</p>
    `;
    grid.appendChild(card);
    attachTilt(card, 8);
  });
}

// ====== INIT ======
document.addEventListener('DOMContentLoaded', () => {
  spawnAmbientHearts();
  buildGalleryBackground();
  initGalleryGrid();
  initGalleryIdleMode();
});
