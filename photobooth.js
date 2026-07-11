// ================== CONFIG (silakan diubah-ubah) ==================
const CONFIG = {
  minShots: 3,
  maxShots: 8,
  defaultShots: 4,
  countdownSeconds: 3,   // hitung mundur setelah pencet tombol jepret
  pauseBetweenShots: 500, // jeda setelah flash sebelum lanjut (ms)
  photoWidth: 640,        // resolusi tiap foto di strip (4:3)
  photoHeight: 480,
  fileName: 'photobooth-nurul-24',
  jpgQuality: 0.92,

  layout: {
    pad: 100,      // margin kiri-kanan foto (ruang doodle)
    headerH: 150,  // ruang header kecil di atas
    footerH: 400,  // ruang tanggal + tanda tangan di bawah
    gap: 36,       // jarak vertikal antar foto
    gapX: 36       // jarak horizontal antar foto (mode 2 kolom)
  },

  layouts: [
    { cols: 1, name: 'Strip 1 Kolom', icon: '▮' },
    { cols: 2, name: 'Grid 2 Kolom', icon: '▮▮' }
  ],

  // teks di strip (gaya photobooth studio)
  brandTop: 'PHOTO',
  brandBottom: 'BOOTH',
  dateText: '11.07.2026',
  signature1: 'Happy Birthday Tata',
  signatureMid: 'by',
  signature2: 'Pacar Tata',

  // GIF "live photo": ambil N detik terakhir sebelum tiap jepretan
  gif: {
    seconds: 5,
    fps: 8,           // makin tinggi makin mulus
    frameW: 360,      // resolusi frame live yang direkam
    frameH: 270,
    stripWidth: 480,  // lebar GIF hasil (mengecil otomatis kalau strip terlalu tinggi)
    quality: 6,       // gif.js: makin kecil makin bagus (tapi makin lambat)
    workers: 4,
    // batas biar aman dikirim ke WhatsApp (WA mengonversi GIF ke video):
    maxHeight: 1200,  // GIF terlalu tinggi bikin konversi WA gagal
    maxFrames: 32,    // batasi durasi/ukuran file
    maxBytes: 14 * 1024 * 1024 // lewat ini -> kompres ulang otomatis
  },

  // tema: bg polos lembut + doodle line-art tipis (digambar kurva, bukan emoji)
  frames: [
    {
      id: 'rose', name: 'Classic Rose', icon: '🌹',
      bg: '#faf5ea', ink: '#c98a8f', inkDark: '#9c5a60',
      motifs: ['flower', 'leaf', 'heart', 'sparkle']
    },
    {
      id: 'party', name: 'Party Doodle', icon: '🎈',
      bg: '#fbf6ee', ink: '#dd9068', inkDark: '#b56a42',
      motifs: ['balloon', 'star', 'cake', 'sparkle']
    },
    {
      id: 'jerapah', name: 'Jerapah Doodle', icon: '🦒',
      bg: '#fbf3e2', ink: '#c08a3e', inkDark: '#8f6224',
      motifs: ['giraffe', 'spot', 'leaf', 'star'],
      emoji: '🦒' // ikut nongol di pinggir-pinggir frame
    },
    {
      id: 'sapi', name: 'Sapi Doodle', icon: '🐄',
      bg: '#f7f6f2', ink: '#8a8a8a', inkDark: '#555555',
      motifs: ['cow', 'spot', 'daisy', 'heart']
    }
  ],

  filters: [
    { id: 'normal', name: 'Normal',     css: '' },
    { id: 'bw',     name: 'B&W',        css: 'grayscale(1)' },
    { id: 'sepia',  name: 'Sepia',      css: 'sepia(0.75)' },
    { id: 'warm',   name: 'Warm',       css: 'saturate(1.15) sepia(0.22) brightness(1.05)' },
    { id: 'cool',   name: 'Cool',       css: 'saturate(1.05) hue-rotate(-12deg) brightness(1.04)' },
    { id: 'pinky',  name: 'Sweet Pink', css: 'brightness(1.07) saturate(1.2) contrast(0.94)' }
  ]
};
// ==================================================================

const $ = (sel) => document.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

const pb = {
  frame: CONFIG.frames[0],
  filter: CONFIG.filters[0],
  count: CONFIG.defaultShots,
  cols: CONFIG.layouts[0].cols,
  adjust: { b: 1, c: 1, s: 1 }, // brightness/contrast/saturation (1 = normal)
  shots: [],
  liveShots: [], // frame "live photo" per slot (N detik terakhir sebelum jepretan)
  ring: [],      // ring buffer rekaman kamera yang jalan terus
  recTimer: null,
  stream: null,
  busy: false,
  abort: false,
  shutterResolve: null, // resolver promise tombol jepret
  reviewResolve: null,  // resolver promise cek hasil (lanjut/ulang)
};

// ---------- filter pixel ops (jalan di semua browser, tanpa ctx.filter) ----------
const PIXEL_FILTERS = {
  bw(d) {
    for (let i = 0; i < d.length; i += 4) {
      const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  },
  sepia(d) {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      d[i]     = clamp255(0.393 * r + 0.769 * g + 0.189 * b);
      d[i + 1] = clamp255(0.349 * r + 0.686 * g + 0.168 * b);
      d[i + 2] = clamp255(0.272 * r + 0.534 * g + 0.131 * b);
    }
  },
  warm(d) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]     = clamp255(d[i] * 1.09 + 8);
      d[i + 1] = clamp255(d[i + 1] * 1.03);
      d[i + 2] = clamp255(d[i + 2] * 0.92);
    }
  },
  cool(d) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]     = clamp255(d[i] * 0.93);
      d[i + 1] = clamp255(d[i + 1] * 1.02);
      d[i + 2] = clamp255(d[i + 2] * 1.1 + 8);
    }
  },
  pinky(d) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]     = clamp255(d[i] * 1.1 + 12);
      d[i + 1] = clamp255(d[i + 1] * 0.97 + 2);
      d[i + 2] = clamp255(d[i + 2] * 1.03 + 8);
    }
  },
};

function adjustPixels(d, b, c, s) {
  if (b === 1 && c === 1 && s === 1) return;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * b, g = d[i + 1] * b, bl = d[i + 2] * b;
    r = (r - 128) * c + 128;
    g = (g - 128) * c + 128;
    bl = (bl - 128) * c + 128;
    const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
    d[i]     = clamp255(lum + (r - lum) * s);
    d[i + 1] = clamp255(lum + (g - lum) * s);
    d[i + 2] = clamp255(lum + (bl - lum) * s);
  }
}

function processShot(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const im = ctx.getImageData(0, 0, c.width, c.height);
  const fn = PIXEL_FILTERS[pb.filter.id];
  if (fn) fn(im.data);
  adjustPixels(im.data, pb.adjust.b, pb.adjust.c, pb.adjust.s);
  ctx.putImageData(im, 0, 0);
  return c;
}

// ---------- random dengan seed: hiasan frame konsisten tiap re-render ----------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randMarginPoint(rnd, W, H, L) {
  const zone = rnd();
  if (zone < 0.3) return [14 + rnd() * (L.pad - 34), L.headerH * 0.6 + rnd() * (H - L.headerH * 0.6 - 90)];
  if (zone < 0.6) return [W - L.pad + 20 + rnd() * (L.pad - 34), L.headerH * 0.6 + rnd() * (H - L.headerH * 0.6 - 90)];
  if (zone < 0.82) return [rnd() * W, 16 + rnd() * Math.max(L.headerH - 90, 24)];
  return [rnd() * W, H - 66 + rnd() * 46];
}

// ---------- perpustakaan doodle line-art (semua digambar dengan stroke di titik 0,0) ----------
const DOODLES = {
  flower(ctx, s) {
    const pr = s * 0.3;
    for (let k = 0; k < 5; k++) {
      ctx.save();
      ctx.rotate((k / 5) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -pr * 0.75, s * 0.13, s * 0.24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.09, 0, Math.PI * 2);
    ctx.stroke();
  },
  daisy(ctx, s) {
    for (let k = 0; k < 8; k++) {
      ctx.save();
      ctx.rotate((k / 8) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.28, s * 0.08, s * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
    ctx.stroke();
  },
  heart(ctx, s) {
    const w = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, w * 0.6);
    ctx.bezierCurveTo(-w, -w * 0.2, -w * 0.4, -w, 0, -w * 0.35);
    ctx.bezierCurveTo(w * 0.4, -w, w, -w * 0.2, 0, w * 0.6);
    ctx.stroke();
  },
  sparkle(ctx, s) {
    const r = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.quadraticCurveTo(0, 0, 0, r);
    ctx.quadraticCurveTo(0, 0, -r, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r);
    ctx.stroke();
  },
  leaf(ctx, s) {
    const r = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r);
    ctx.quadraticCurveTo(0, 0, r * 0.15, -r);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, r * 0.3, r * 0.3, r * 0.13, -0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(r * 0.2, -r * 0.25, r * 0.3, r * 0.13, 0.5, 0, Math.PI * 2);
    ctx.stroke();
  },
  balloon(ctx, s) {
    const r = s * 0.3;
    ctx.beginPath();
    ctx.arc(0, -s * 0.15, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.15 + r);
    ctx.quadraticCurveTo(s * 0.12, s * 0.18, -s * 0.05, s * 0.34);
    ctx.quadraticCurveTo(-s * 0.16, s * 0.46, s * 0.05, s * 0.5);
    ctx.stroke();
  },
  star(ctx, s) {
    const R = s * 0.5, r2 = R * 0.45;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const rad = k % 2 === 0 ? R : r2;
      const a = (Math.PI / 5) * k - Math.PI / 2;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  },
  cake(ctx, s) {
    const w = s * 0.72, h = s * 0.56;
    roundRectPath(ctx, -w / 2, -h * 0.06, w, h * 0.46, 5);
    ctx.stroke();
    roundRectPath(ctx, -w * 0.32, -h * 0.4, w * 0.64, h * 0.34, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.4);
    ctx.lineTo(0, -h * 0.62);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -h * 0.72, s * 0.05, 0, Math.PI * 2);
    ctx.stroke();
  },
  spot(ctx, s, rnd) {
    const pts = 7, base = s * 0.4;
    ctx.beginPath();
    for (let k = 0; k <= pts; k++) {
      const a = (k / pts) * Math.PI * 2;
      const rr = base * (0.72 + (rnd ? rnd() : 0.5) * 0.4);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.82;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  },
  giraffe(ctx, s) {
    const r = s * 0.5;
    // muka bulat
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.46, r * 0.52, 0, 0, Math.PI * 2); ctx.stroke();
    // moncong + hidung + senyum
    ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.28, r * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 0.09, r * 0.26, r * 0.025, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.09, r * 0.26, r * 0.025, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.11, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    // mata besar terisi biar imut
    ctx.save();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.arc(-r * 0.17, -r * 0.1, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.17, -r * 0.1, r * 0.06, 0, Math.PI * 2); ctx.fill();
    // pipi merona
    ctx.globalAlpha *= 0.3;
    ctx.beginPath(); ctx.arc(-r * 0.32, r * 0.06, r * 0.075, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.32, r * 0.06, r * 0.075, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    [-1, 1].forEach((d) => {
      // ossicone dengan bulatan terisi
      ctx.beginPath();
      ctx.moveTo(d * r * 0.16, -r * 0.48);
      ctx.lineTo(d * r * 0.23, -r * 0.72);
      ctx.stroke();
      ctx.save();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.arc(d * r * 0.24, -r * 0.78, r * 0.055, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // telinga lebar
      ctx.beginPath();
      ctx.ellipse(d * r * 0.54, -r * 0.3, r * 0.18, r * 0.1, d * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    });
  },
  cow(ctx, s) {
    const r = s * 0.5;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.08, r * 0.48, r * 0.44, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.34, r * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 0.12, r * 0.3, r * 0.04, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.12, r * 0.3, r * 0.04, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.18, r * 0.05, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.18, r * 0.05, 0, Math.PI * 2); ctx.stroke();
    [-1, 1].forEach((d) => {
      ctx.beginPath();
      ctx.ellipse(d * r * 0.56, -r * 0.14, r * 0.16, r * 0.09, d * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(d * r * 0.3, -r * 0.48);
      ctx.quadraticCurveTo(d * r * 0.42, -r * 0.72, d * r * 0.22, -r * 0.72);
      ctx.stroke();
    });
  },
};

function drawMotif(ctx, frame, name, x, y, size, rnd, alpha) {
  const fn = DOODLES[name];
  if (!fn) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rnd() - 0.5) * 0.9);
  ctx.strokeStyle = frame.ink;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  fn(ctx, size, rnd);
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function stripDims(n, cols) {
  const { photoWidth: PW, photoHeight: PH, layout: L } = CONFIG;
  const rows = Math.ceil(n / cols);
  const W = L.pad * 2 + cols * PW + (cols - 1) * L.gapX;
  const H = L.headerH + rows * PH + (rows - 1) * L.gap + L.footerH;
  return { W, H, rows };
}

function drawDecor(ctx, frame, W, H) {
  const L = CONFIG.layout;
  const rnd = mulberry32(9137 + frame.id.length * 131 + W * 3 + H);

  // latar polos lembut
  ctx.fillStyle = frame.bg;
  ctx.fillRect(0, 0, W, H);

  // ilustrasi besar samar di area tanda tangan (kayak sketsa di referensi)
  drawMotif(ctx, frame, frame.motifs[0], W * 0.3, H - L.footerH * 0.42, 200, rnd, 0.14);
  drawMotif(ctx, frame, frame.motifs[1] || frame.motifs[0], W * 0.72, H - L.footerH * 0.6, 150, rnd, 0.12);
  drawMotif(ctx, frame, frame.motifs[2] || frame.motifs[0], W * 0.55, H - L.footerH * 0.18, 110, rnd, 0.12);

  // doodle kecil menyebar di margin
  const count = Math.round(H / 140);
  for (let i = 0; i < count; i++) {
    const [x, y] = randMarginPoint(rnd, W, H, L);
    const name = frame.motifs[Math.floor(rnd() * frame.motifs.length)];
    drawMotif(ctx, frame, name, x, y, 28 + rnd() * 30, rnd, 0.55 + rnd() * 0.25);
  }

  // emoji khas tema (mis. jerapah 🦒) di titik-titik manis
  if (frame.emoji) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const spots = [
      [L.pad * 0.5, L.headerH * 0.55, 42, -0.25],
      [W - L.pad * 0.5, L.headerH * 0.55, 42, 0.25],
      [W * 0.84, H - L.footerH * 0.3, 56, 0.2],
      [W * 0.15, H - 44, 38, -0.15],
    ];
    spots.forEach(([x, y, size, rot]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.font = size + 'px serif';
      ctx.globalAlpha = 0.95;
      ctx.fillText(frame.emoji, 0, 0);
      ctx.restore();
    });
    const extra = Math.round(H / 600);
    for (let i = 0; i < extra; i++) {
      const [x, y] = randMarginPoint(rnd, W, H, L);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rnd() - 0.5) * 0.6);
      ctx.font = Math.round(26 + rnd() * 12) + 'px serif';
      ctx.globalAlpha = 0.85;
      ctx.fillText(frame.emoji, 0, 0);
      ctx.restore();
    }
  }
}

// letterspacing manual biar konsisten di semua browser
function drawSpacedText(ctx, text, cx, y, spacing) {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x + widths[i] / 2, y);
    x += widths[i] + spacing;
  });
}

function drawTexts(ctx, frame, W, H) {
  const L = CONFIG.layout;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = frame.inkDark;

  // header kecil huruf renggang
  ctx.font = '700 30px Poppins, sans-serif';
  drawSpacedText(ctx, CONFIG.brandTop, W / 2, L.headerH * 0.42, 9);
  drawSpacedText(ctx, CONFIG.brandBottom, W / 2, L.headerH * 0.42 + 38, 9);

  // tanggal kecil
  ctx.font = '600 22px Poppins, sans-serif';
  ctx.globalAlpha = 0.75;
  drawSpacedText(ctx, CONFIG.dateText, W / 2, H - L.footerH + 58, 3);
  ctx.globalAlpha = 1;

  // tanda tangan script besar (mengecil otomatis kalau kepanjangan)
  const maxW = W - 110;
  let px = fitScript(ctx, CONFIG.signature1, maxW, 80);
  ctx.font = `700 ${px}px "Dancing Script", cursive`;
  ctx.fillText(CONFIG.signature1, W / 2, H - L.footerH + 168);
  ctx.font = '700 44px "Dancing Script", cursive';
  ctx.globalAlpha = 0.8;
  ctx.fillText(CONFIG.signatureMid, W / 2, H - L.footerH + 228);
  ctx.globalAlpha = 1;
  px = fitScript(ctx, CONFIG.signature2, maxW, 80);
  ctx.font = `700 ${px}px "Dancing Script", cursive`;
  ctx.fillText(CONFIG.signature2, W / 2, H - L.footerH + 310);
}

function fitScript(ctx, text, maxW, basePx) {
  let px = basePx;
  ctx.font = `700 ${px}px "Dancing Script", cursive`;
  while (px > 34 && ctx.measureText(text).width > maxW) {
    px -= 3;
    ctx.font = `700 ${px}px "Dancing Script", cursive`;
  }
  return px;
}

// gambar strip lengkap ke canvas mana pun (dipakai hasil asli & preview frame)
function drawStripTo(canvas, frame, imgs, cols) {
  const { photoWidth: PW, photoHeight: PH, layout: L } = CONFIG;
  const n = imgs.length;
  const { W, H } = stripDims(n, cols);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  drawDecor(ctx, frame, W, H);

  const rnd2 = mulberry32(517 + n * 31 + cols * 7 + frame.id.length);

  imgs.forEach((img, i) => {
    if (!img) return;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const lastAlone = cols === 2 && i === n - 1 && n % 2 === 1;
    const x = lastAlone ? (W - PW) / 2 : L.pad + col * (PW + L.gapX);
    const y = L.headerH + row * (PH + L.gap);

    // foto polos nempel di kertas, sudut sedikit membulat + garis tipis
    ctx.save();
    roundRectPath(ctx, x, y, PW, PH, 8);
    ctx.clip();
    ctx.drawImage(img, x, y, PW, PH);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = frame.ink;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 2;
    roundRectPath(ctx, x + 1, y + 1, PW - 2, PH - 2, 8);
    ctx.stroke();
    ctx.restore();

    // doodle nemplok di pojok foto, selang-seling kiri/kanan
    const motif = frame.motifs[i % frame.motifs.length];
    const cx = i % 2 === 0 ? x + PW - 12 : x + 14;
    const cy = i % 2 === 0 ? y + 12 : y + PH - 14;
    drawMotif(ctx, frame, motif, cx, cy, 46, rnd2, 0.85);
  });

  drawTexts(ctx, frame, W, H);
}

async function renderStrip() {
  try { await document.fonts.load('700 60px "Dancing Script"'); } catch (e) { /* pakai fallback */ }
  const imgs = pb.shots.map((s) => (s ? processShot(s) : null));
  const canvas = $('#pb-canvas');
  drawStripTo(canvas, pb.frame, imgs, pb.cols);
  canvas.classList.toggle('two', pb.cols === 2);
}

// ---------- preview frame di step config ----------
const framePreviewSrc = {};

function makePlaceholder(emoji) {
  const c = document.createElement('canvas');
  c.width = CONFIG.photoWidth;
  c.height = CONFIG.photoHeight;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, c.width, c.height);
  g.addColorStop(0, '#f0e4dd');
  g.addColorStop(1, '#e2d8e8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = '140px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, c.width / 2, c.height / 2);
  return c;
}

function buildFramePreviews() {
  const placeholders = [makePlaceholder('📸'), makePlaceholder('🥰')];
  const off = document.createElement('canvas');
  CONFIG.frames.forEach((f) => {
    drawStripTo(off, f, placeholders, 1);
    const mini = document.createElement('canvas');
    mini.width = 220;
    mini.height = Math.round((off.height * mini.width) / off.width);
    mini.getContext('2d').drawImage(off, 0, 0, mini.width, mini.height);
    framePreviewSrc[f.id] = mini.toDataURL('image/jpeg', 0.85);
  });
}

// ---------- kamera ----------
async function ensureCamera() {
  if (pb.stream) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const err = new Error('unsupported');
    err.name = 'Unsupported';
    throw err;
  }
  // jangan paksa width/height: di beberapa HP malah bikin feed kameranya stretch;
  // biarkan native, crop 4:3 dihitung dari dimensi aslinya
  pb.stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user' },
    audio: false,
  });
  const video = $('#pb-video');
  video.srcObject = pb.stream;
  await new Promise((res) => {
    if (video.readyState >= 2) res();
    else video.onloadeddata = () => res();
  });
  startRecorder();
}

function stopCamera() {
  stopRecorder();
  if (pb.stream) {
    pb.stream.getTracks().forEach((t) => t.stop());
    pb.stream = null;
  }
  const video = $('#pb-video');
  if (video) video.srcObject = null;
}

window.addEventListener('pagehide', stopCamera);

// crop tengah 4:3 + mirror, dipakai jepretan asli & frame live
function drawVideoCover(ctx, video, w, h) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.max(w / vw, h / vh);
  const sw = w / scale, sh = h / scale;
  const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  ctx.restore();
}

// perekam ring buffer: nyimpen N detik terakhir dari kamera terus-menerus
function startRecorder() {
  if (pb.recTimer) return;
  const G = CONFIG.gif;
  const maxFrames = Math.round(G.seconds * G.fps);
  pb.ring = [];
  pb.recTimer = setInterval(() => {
    const video = $('#pb-video');
    if (!video.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = G.frameW;
    c.height = G.frameH;
    drawVideoCover(c.getContext('2d'), video, c.width, c.height);
    pb.ring.push(c);
    if (pb.ring.length > maxFrames) pb.ring.shift();
  }, Math.round(1000 / G.fps));
}

function stopRecorder() {
  clearInterval(pb.recTimer);
  pb.recTimer = null;
  pb.ring = [];
}

function captureTo(idx) {
  const { photoWidth: PW, photoHeight: PH } = CONFIG;
  const c = document.createElement('canvas');
  c.width = PW;
  c.height = PH;
  drawVideoCover(c.getContext('2d'), $('#pb-video'), PW, PH);
  pb.shots[idx] = c;
  pb.liveShots[idx] = pb.ring.slice(); // 5 detik terakhir jadi "live photo" slot ini
}

// ---------- alur capture ----------
function showStep(step) {
  ['config', 'capture', 'result'].forEach((s) => {
    $('#step-' + s).classList.toggle('hidden', s !== step);
  });
}

async function countdown() {
  const el = $('#pb-countdown');
  for (let s = CONFIG.countdownSeconds; s > 0; s--) {
    if (pb.abort) return;
    el.textContent = s;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    await wait(1000);
  }
  el.textContent = '';
}

function flash() {
  const f = $('#pb-flash');
  f.classList.remove('on');
  void f.offsetWidth;
  f.classList.add('on');
}

// nunggu tombol jepret dipencet (atau dibatalkan)
function waitShutter() {
  const btn = $('#pb-shutter');
  btn.classList.remove('hidden');
  return new Promise((resolve) => {
    pb.shutterResolve = () => {
      btn.classList.add('hidden');
      pb.shutterResolve = null;
      resolve();
    };
  });
}

// tampilkan hasil jepretan, tunggu keputusan: 'next' atau 'retake'
function reviewShot(idx) {
  const img = $('#pb-review-img');
  const actions = $('#pb-review-actions');
  img.src = pb.shots[idx].toDataURL('image/jpeg', 0.85);
  img.classList.remove('hidden');
  actions.classList.remove('hidden');
  $('#pb-progress').textContent = 'Gimana, udah oke? Cek dulu hasilnya 👀';
  return new Promise((resolve) => {
    pb.reviewResolve = (choice) => {
      img.classList.add('hidden');
      actions.classList.add('hidden');
      pb.reviewResolve = null;
      resolve(choice);
    };
  });
}

async function runSequence(indices) {
  pb.busy = true;
  pb.abort = false;
  showStep('capture');
  const progress = $('#pb-progress');
  const isFullSession = indices.length === pb.count;

  try {
    await ensureCamera();
    applyPreviewFilter();

    for (let k = 0; k < indices.length; k++) {
      if (pb.abort) break;
      const idx = indices[k];
      let accepted = false;
      let attempt = 0;

      while (!accepted && !pb.abort) {
        progress.textContent = attempt > 0
          ? 'Take ulang — pose lagi, pencet kalau udah siap 🔁'
          : isFullSession
            ? `Foto ${k + 1} dari ${pb.count} — pose dulu, pencet kalau udah siap 📸`
            : `Take ulang foto ke-${idx + 1} — pencet kalau udah siap 🔁`;
        await waitShutter();
        if (pb.abort) break;
        await countdown();
        if (pb.abort) break;
        captureTo(idx);
        flash();
        await wait(CONFIG.pauseBetweenShots);
        const choice = await reviewShot(idx);
        accepted = choice === 'next';
        attempt++;
      }
    }

    if (pb.abort) {
      // batal: kalau semua slot sudah terisi (kasus retake), balik ke hasil
      if (pb.shots.length && pb.shots.every(Boolean)) {
        await renderStrip();
        showStep('result');
      } else {
        showStep('config');
      }
      return;
    }

    await renderStrip();
    buildThumbs();
    showStep('result');
  } catch (err) {
    showError(err);
    showStep('config');
  } finally {
    pb.busy = false;
    pb.shutterResolve = null;
    pb.reviewResolve = null;
    $('#pb-shutter').classList.add('hidden');
    $('#pb-review-img').classList.add('hidden');
    $('#pb-review-actions').classList.add('hidden');
    $('#pb-progress').textContent = '';
    $('#pb-countdown').textContent = '';
  }
}

function showError(err) {
  const el = $('#pb-error');
  let msg = 'Kameranya gagal dibuka 😢 (' + (err && err.name ? err.name : err) + ')';
  if (err && err.name === 'NotAllowedError') {
    msg = 'Izin kameranya ditolak 🙏 Izinkan akses kamera di browser (ikon 🔒/kamera di address bar), lalu coba lagi ya.';
  } else if (err && err.name === 'NotFoundError') {
    msg = 'Kamera tidak ditemukan di perangkat ini 😢';
  } else if (err && err.name === 'Unsupported') {
    msg = 'Browser/alamat ini tidak mendukung kamera. Buka lewat http://localhost — jalankan "python3 -m http.server" di folder website, lalu buka http://localhost:8000/photobooth.html';
  }
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ---------- UI: chips, slider, thumbs ----------
function applyPreviewFilter() {
  const css = [
    pb.filter.css,
    `brightness(${pb.adjust.b})`,
    `contrast(${pb.adjust.c})`,
    `saturate(${pb.adjust.s})`,
  ].filter(Boolean).join(' ');
  $('#pb-video').style.filter = css;
}

function makeChip(label, selected, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pb-chip' + (selected ? ' selected' : '');
  b.innerHTML = label;
  b.addEventListener('click', onClick);
  return b;
}

function buildChips() {
  // kartu frame dengan gambar preview (step config)
  const framesBox = $('#pb-frames');
  framesBox.innerHTML = '';
  CONFIG.frames.forEach((f) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'pb-frame-card' + (f === pb.frame ? ' selected' : '');
    card.innerHTML = `<img src="${framePreviewSrc[f.id] || ''}" alt="preview ${f.name}"><span>${f.icon} ${f.name}</span>`;
    card.addEventListener('click', () => {
      pb.frame = f;
      buildChips();
      rerenderIfResult();
    });
    framesBox.appendChild(card);
  });

  // chip frame versi ringkas (step hasil)
  const resFrames = $('#pb-frames-result');
  resFrames.innerHTML = '';
  CONFIG.frames.forEach((f) => {
    resFrames.appendChild(
      makeChip(`<span class="chip-icon">${f.icon}</span>${f.name}`, f === pb.frame, () => {
        pb.frame = f;
        buildChips();
        rerenderIfResult();
      })
    );
  });

  // layout 1 kolom / 2 kolom
  ['#pb-layouts', '#pb-layouts-result'].forEach((sel) => {
    const box = $(sel);
    box.innerHTML = '';
    CONFIG.layouts.forEach((ly) => {
      box.appendChild(
        makeChip(`<span class="chip-icon">${ly.icon}</span>${ly.name}`, ly.cols === pb.cols, () => {
          pb.cols = ly.cols;
          buildChips();
          rerenderIfResult();
        })
      );
    });
  });

  const countsBox = $('#pb-counts');
  countsBox.innerHTML = '';
  for (let n = CONFIG.minShots; n <= CONFIG.maxShots; n++) {
    countsBox.appendChild(
      makeChip(`${n} foto`, n === pb.count, () => {
        pb.count = n;
        buildChips();
      })
    );
  }

  ['#pb-filters', '#pb-filters-result'].forEach((sel) => {
    const box = $(sel);
    box.innerHTML = '';
    CONFIG.filters.forEach((f) => {
      box.appendChild(
        makeChip(f.name, f === pb.filter, () => {
          pb.filter = f;
          buildChips();
          applyPreviewFilter();
          rerenderIfResult();
        })
      );
    });
  });
}

let renderTimer = null;
function rerenderIfResult() {
  if ($('#step-result').classList.contains('hidden')) return;
  if (!pb.shots.some(Boolean)) return;
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderStrip, 120);
}

function initSliders() {
  const wire = (inputSel, outSel, key) => {
    const input = $(inputSel);
    const out = $(outSel);
    input.addEventListener('input', () => {
      pb.adjust[key] = input.value / 100;
      out.textContent = input.value + '%';
      applyPreviewFilter();
      rerenderIfResult();
    });
  };
  wire('#sl-bright', '#out-bright', 'b');
  wire('#sl-contrast', '#out-contrast', 'c');
  wire('#sl-sat', '#out-sat', 's');
}

function buildThumbs() {
  const box = $('#pb-thumbs');
  box.innerHTML = '';
  pb.shots.forEach((shot, i) => {
    if (!shot) return;
    const item = document.createElement('div');
    item.className = 'pb-thumb';
    const img = document.createElement('img');
    img.src = shot.toDataURL('image/jpeg', 0.6);
    img.alt = 'foto ' + (i + 1);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pb-retake';
    btn.textContent = `↻ Foto ${i + 1}`;
    btn.addEventListener('click', () => {
      if (!pb.busy) runSequence([i]).then(buildThumbs);
    });
    item.append(img, btn);
    box.appendChild(item);
  });
}

// ---------- GIF live photo ----------
let gifWorkerUrl = null;

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('gagal memuat ' + src));
    document.head.appendChild(s);
  });
}

async function ensureGifLib() {
  if (!window.GIF) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js');
  }
  if (!gifWorkerUrl) {
    // worker cross-origin diblokir browser, jadi diambil dulu lalu dibungkus blob
    const r = await fetch('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
    gifWorkerUrl = URL.createObjectURL(await r.blob());
  }
}

async function saveGif() {
  const btn = $('#pb-save-gif');
  if (pb.busy || btn.disabled) return;
  const hasLive = pb.liveShots.some((f) => f && f.length);
  if (!hasLive) {
    btn.textContent = 'Belum ada rekaman live 😢';
    setTimeout(() => (btn.textContent = 'Simpan GIF 🎞️'), 2500);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Nyiapin encoder… ';
  const G = CONFIG.gif;
  const even = (v) => Math.max(2, v - (v % 2)); // dimensi ganjil bikin konversi video WA gagal

  try {
    await ensureGifLib();

    const { W, H } = stripDims(pb.shots.length, pb.cols);

    // terapkan filter/atur warna sekali per frame live; batasi jumlah frame
    // (ambil yang TERAKHIR = paling dekat momen jepret)
    const maxFrames = G.maxFrames || 32;
    const processed = pb.liveShots.map((fr) =>
      fr && fr.length ? fr.slice(-maxFrames).map((c) => processShot(c)) : null
    );
    const stills = pb.shots.map((s) => (s ? processShot(s) : null));
    const frameCount = Math.max(...processed.map((f) => (f ? f.length : 1)));

    const encode = async (gw, gh, quality) => {
      const full = document.createElement('canvas');
      const small = document.createElement('canvas');
      small.width = gw;
      small.height = gh;
      const sctx = small.getContext('2d');

      const gif = new GIF({ workers: G.workers || 2, quality, width: gw, height: gh, workerScript: gifWorkerUrl });
      gif.on('progress', (p) => {
        btn.textContent = `Encoding GIF… ${50 + Math.round(p * 50)}%`;
      });

      for (let t = 0; t < frameCount; t++) {
        const imgs = pb.shots.map((s, i) => {
          const fr = processed[i];
          return fr ? fr[t % fr.length] : stills[i];
        });
        drawStripTo(full, pb.frame, imgs, pb.cols);
        sctx.drawImage(full, 0, 0, gw, gh);
        gif.addFrame(sctx, { copy: true, delay: Math.round(1000 / G.fps) });
        btn.textContent = `Nyusun frame… ${Math.round(((t + 1) / frameCount) * 50)}%`;
        await wait(0); // kasih napas ke UI
      }

      return new Promise((resolve, reject) => {
        gif.on('finished', resolve);
        gif.on('abort', () => reject(new Error('dibatalkan')));
        gif.render();
      });
    };

    // ukuran WA-friendly: tinggi dibatasi, dimensi genap
    let gw = G.stripWidth;
    let gh = Math.round((H * gw) / W);
    const maxH = G.maxHeight || 1200;
    if (gh > maxH) {
      gh = maxH;
      gw = Math.round((W * gh) / H);
    }
    gw = even(gw);
    gh = even(gh);

    let blob = await encode(gw, gh, G.quality);

    // masih kegedean buat WA? kompres ulang sekali dengan skala lebih kecil
    const maxBytes = G.maxBytes || 14 * 1024 * 1024;
    if (blob.size > maxBytes) {
      btn.textContent = 'File kegedean, kompres ulang… 📦';
      blob = await encode(even(Math.round(gw * 0.7)), even(Math.round(gh * 0.7)), Math.min(G.quality + 4, 20));
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${CONFIG.fileName}.gif`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    btn.textContent = 'Simpan GIF 🎞️';
  } catch (err) {
    btn.textContent = 'GIF gagal 😢 coba lagi';
    console.warn('gif error:', err);
    setTimeout(() => (btn.textContent = 'Simpan GIF 🎞️'), 3000);
  } finally {
    btn.disabled = false;
  }
}

// ---------- simpan ----------
function saveStrip(fmt) {
  const canvas = $('#pb-canvas');
  const mime = fmt === 'png' ? 'image/png' : 'image/jpeg';
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${CONFIG.fileName}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    },
    mime,
    CONFIG.jpgQuality
  );
}

// ---------- ambient hearts ----------
function spawnHearts() {
  const box = document.querySelector('.bg-hearts');
  const glyphs = ['💗', '💕', '✨', '📸'];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('span');
    el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.fontSize = 0.8 + Math.random() * 1.2 + 'rem';
    el.style.animationDuration = 9 + Math.random() * 9 + 's';
    el.style.animationDelay = Math.random() * 9 + 's';
    box.appendChild(el);
  }
}

// ---------- init ----------
document.addEventListener('DOMContentLoaded', async () => {
  spawnHearts();
  initSliders();

  // tunggu font script kebaca dulu biar preview frame-nya cakep, baru bangun kartu
  try { await document.fonts.load('700 60px "Dancing Script"'); } catch (e) { /* fallback */ }
  buildFramePreviews();
  buildChips();

  $('#pb-start').addEventListener('click', () => {
    if (pb.busy) return;
    $('#pb-error').classList.add('hidden');
    pb.shots = new Array(pb.count).fill(null);
    pb.liveShots = new Array(pb.count).fill(null);
    runSequence(pb.shots.map((_, i) => i));
  });

  $('#pb-shutter').addEventListener('click', () => {
    if (pb.shutterResolve) pb.shutterResolve();
  });

  $('#pb-accept').addEventListener('click', () => {
    if (pb.reviewResolve) pb.reviewResolve('next');
  });

  $('#pb-redo').addEventListener('click', () => {
    if (pb.reviewResolve) pb.reviewResolve('retake');
  });

  $('#pb-cancel').addEventListener('click', () => {
    pb.abort = true;
    // lepasin loop yang lagi nunggu jepret / nunggu keputusan cek hasil
    if (pb.shutterResolve) pb.shutterResolve();
    if (pb.reviewResolve) pb.reviewResolve('next');
  });

  $('#pb-save-png').addEventListener('click', () => saveStrip('png'));
  $('#pb-save-jpg').addEventListener('click', () => saveStrip('jpg'));
  $('#pb-save-gif').addEventListener('click', saveGif);

  $('#pb-again').addEventListener('click', () => {
    if (!pb.busy) showStep('config');
  });
});
