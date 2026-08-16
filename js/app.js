/**
 * Nostalgia Song BGMI - Application Coordinator
 * Handles background crossfading, responsive orientation, intro modal, auto-fade & hotkeys.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check if SONGS_DATA is loaded
  if (typeof SONGS_DATA === 'undefined' || SONGS_DATA.length === 0) {
    console.error("SONGS_DATA missing or empty!");
    return;
  }

  // State
  let activeBgIndex = 0; // 0 for A, 1 for B
  let currentSong = SONGS_DATA[0];
  let isMobileViewport = window.innerWidth <= 767;

  // DOM Elements
  const bgLayerA = document.getElementById('bgLayerA');
  const bgLayerB = document.getElementById('bgLayerB');
  const centerTitleElem = document.getElementById('centerTitleText');
  const centerSubtitleElem = document.getElementById('centerSubtitleText');

  const introModal = document.getElementById('introModal');
  const btnEnterExperience = document.getElementById('btnEnterExperience');
  const toastElem = document.getElementById('toastNotification');

  // Initialize Clock
  const clock = new LiveClock('clockDisplay');
  clock.start();

  // Initialize Fullscreen
  const fullscreenCtrl = new FullscreenController('btnFullscreen', 'iconFsEnter', 'iconFsExit');

  // Live People Online Counter Simulation (fluctuates randomly between 100+ and 490 every 3-5 sec)
  const onlineCountText = document.getElementById('onlineCountText');
  if (onlineCountText) {
    let currentOnline = Math.floor(Math.random() * (410 - 210 + 1)) + 210;
    onlineCountText.textContent = `${currentOnline} people online`;

    function updateOnlineCount() {
      const delta = Math.floor(Math.random() * 15) - 6; // Small random fluctuation (-6 to +8)
      currentOnline = Math.max(108, Math.min(492, currentOnline + delta));
      onlineCountText.textContent = `${currentOnline} people online`;

      const nextDelay = Math.floor(Math.random() * 2000) + 3000; // 3 to 5 seconds
      setTimeout(updateOnlineCount, nextDelay);
    }

    setTimeout(updateOnlineCount, Math.floor(Math.random() * 2000) + 3000);
  }

  // Initialize Audio Player
  const player = new AudioPlayer({
    songs: SONGS_DATA,
    onTrackChange: (song) => {
      currentSong = song;
      updateBackground(song);
      updateCenterTypography(song);
    },
    onStateChange: (song, isPlaying) => {
      if (musicLibrary) {
        musicLibrary.setCurrentState(song.id, isPlaying);
      }
      // Sync waveform with play/pause state
      if (window.waveform) {
        isPlaying ? window.waveform.onPlay() : window.waveform.onPause();
      }
    },
    onError: (msg) => {
      showToast(msg, 'error');
    }
  });

  // Initialize Waveform Visualizer (pass the audio element from player)
  window.waveform = new WaveformVisualizer('waveformCanvas', player.audio);

  // Initialize Music Library
  const musicLibrary = new MusicLibrary({
    songs: SONGS_DATA,
    onSelectSong: (song) => {
      const idx = SONGS_DATA.findIndex(s => s.id === song.id);
      if (idx !== -1) {
        player.loadTrack(idx, true);
        musicLibrary.close();
      }
    }
  });

  // Background Crossfade Handler
  function updateBackground(song) {
    const isMobile = window.innerWidth <= 767;
    const bgUrl = isMobile ? song.mobileBg : song.desktopBg;

    // Pick inactive layer to crossfade
    const targetLayer = activeBgIndex === 0 ? bgLayerB : bgLayerA;
    const currentLayer = activeBgIndex === 0 ? bgLayerA : bgLayerB;

    // Preload image before fading
    const img = new Image();
    img.src = bgUrl;
    img.onload = () => {
      targetLayer.style.backgroundImage = `url("${bgUrl}")`;
      targetLayer.classList.add('active');
      currentLayer.classList.remove('active');
      activeBgIndex = activeBgIndex === 0 ? 1 : 0;
    };
    img.onerror = () => {
      // Fallback to desktop artwork if mobile fails or vice versa
      const fallbackUrl = isMobile ? song.desktopBg : song.mobileBg;
      targetLayer.style.backgroundImage = `url("${fallbackUrl}")`;
      targetLayer.classList.add('active');
      currentLayer.classList.remove('active');
      activeBgIndex = activeBgIndex === 0 ? 1 : 0;
    };
  }

  // Handle Window Resize (Responsive Background Switch)
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const newIsMobile = window.innerWidth <= 767;
      if (newIsMobile !== isMobileViewport) {
        isMobileViewport = newIsMobile;
        if (currentSong) {
          updateBackground(currentSong);
        }
      }
    }, 250);
  });

  // Center Typography Update
  function updateCenterTypography(song) {
    if (centerTitleElem) {
      centerTitleElem.textContent = "NOSTALGIA SONG";
    }
    if (centerSubtitleElem) {
      centerSubtitleElem.textContent = "BGMI • " + (song.tag || "VIBES");
    }
  }

  // Toast Notification Helper
  function showToast(message, type = 'info') {
    if (!toastElem) return;
    toastElem.textContent = message;
    toastElem.className = `toast toast-${type} show`;
    setTimeout(() => {
      toastElem.classList.remove('show');
    }, 3500);
  }

  // Keep UI Controls Always Visible
  const autoFadeElements = document.querySelectorAll('.auto-fade-ui');
  autoFadeElements.forEach(el => el.classList.remove('ui-idle'));

  // Desktop Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Ignore hotkeys when typing in input fields
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        player.togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        player.seekBy(-5);
        showToast("Seek -5s");
        break;
      case 'ArrowRight':
        e.preventDefault();
        player.seekBy(5);
        showToast("Seek +5s");
        break;
      case 'KeyN':
        player.playNext();
        showToast("Next Song ⏭");
        break;
      case 'KeyP':
        player.playPrev();
        showToast("Previous Song ⏮");
        break;
      case 'KeyM':
        player.toggleMute();
        showToast(player.audio.muted ? "Muted 🔇" : "Unmuted 🔊");
        break;
      case 'KeyF':
        fullscreenCtrl.toggle();
        break;
    }
  });

  // Preload first song images
  if (currentSong) {
    updateBackground(currentSong);
    updateCenterTypography(currentSong);
  }
});
