// ====== MUSIC PLAYER (dipakai index.html & momen.html) ======
// Lagu default: birthday.mp3. Halaman ngambek/game ganti ke phonk lewat
// window.MusicPlayer.setTrack(). Pilihan pause disimpan di sessionStorage
// biar kebawa antar halaman.
(function () {
  const PAUSED_KEY = 'ultah-music-paused';
  const DEFAULT_TRACK = 'music/birthday.mp3';

  const audio = new Audio(DEFAULT_TRACK);
  audio.loop = true;
  audio.preload = 'auto';

  let userPaused = sessionStorage.getItem(PAUSED_KEY) === '1';

  const btn = document.createElement('button');
  btn.id = 'music-toggle';
  btn.type = 'button';

  function updateButton() {
    const playing = !audio.paused;
    btn.textContent = playing ? '⏸️' : '🎵';
    btn.title = playing ? 'Pause musiknya' : 'Putar musiknya';
    btn.setAttribute('aria-label', btn.title);
    btn.classList.toggle('playing', playing);
  }

  function tryPlay() {
    if (userPaused) return;
    audio.play().then(updateButton).catch(() => {
      // autoplay diblokir browser -> tunggu interaksi pertama
    });
  }

  // autoplay baru boleh setelah user berinteraksi; coba lagi di tap/klik pertama
  function onFirstInteraction() {
    document.removeEventListener('pointerdown', onFirstInteraction);
    document.removeEventListener('keydown', onFirstInteraction);
    tryPlay();
  }
  document.addEventListener('pointerdown', onFirstInteraction);
  document.addEventListener('keydown', onFirstInteraction);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) {
      userPaused = false;
      sessionStorage.setItem(PAUSED_KEY, '0');
      audio.play().then(updateButton).catch(() => {});
    } else {
      userPaused = true;
      sessionStorage.setItem(PAUSED_KEY, '1');
      audio.pause();
      updateButton();
    }
  });

  audio.addEventListener('play', updateButton);
  audio.addEventListener('pause', updateButton);

  window.MusicPlayer = {
    // ganti lagu; kalau lagi diputar langsung lanjut pakai lagu baru
    setTrack(src) {
      if (audio.src.endsWith(src)) return;
      const wasPlaying = !audio.paused;
      audio.src = src;
      audio.load();
      if (wasPlaying || !userPaused) tryPlay();
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(btn);
    updateButton();
    tryPlay();
  });
})();
