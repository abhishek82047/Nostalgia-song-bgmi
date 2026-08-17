/**
 * Nostalgia Song BGMI - Player Engine
 * HTML5 Audio player controller with queue, seeking, volume, shuffle, repeat & callbacks.
 */

class AudioPlayer {
  constructor(options) {
    this.songs = options.songs || [];
    this.onTrackChange = options.onTrackChange || function() {};
    this.onStateChange = options.onStateChange || function() {};
    this.onError = options.onError || function() {};

    this.currentIndex = 0;
    this.audio = new Audio();
    this.isShuffle = false;
    this.isRepeat = false; // false: queue, true: single track repeat
    this.hasUserInteracted = false;

    // DOM Elements
    this.elemCover = document.getElementById('playerCover');
    this.elemTitle = document.getElementById('playerTitle');
    this.elemArtist = document.getElementById('playerArtist');
    this.elemTag = document.getElementById('playerTag');

    this.btnPlayPause = document.getElementById('btnPlayPause');
    this.btnPrev = document.getElementById('btnPrev');
    this.btnNext = document.getElementById('btnNext');
    this.btnShuffle = document.getElementById('btnShuffle');
    this.btnRepeat = document.getElementById('btnRepeat');
    this.btnMute = document.getElementById('btnMute');

    this.iconPlay = document.getElementById('iconPlay');
    this.iconPause = document.getElementById('iconPause');

    this.progressBar = document.getElementById('playerProgress');
    this.progressFill = document.getElementById('playerProgressFill');
    this.timeCurrent = document.getElementById('timeCurrent');
    this.timeDuration = document.getElementById('timeDuration');

    this.volumeBar = document.getElementById('playerVolume');
    this.volumeFill = document.getElementById('playerVolumeFill');

    this.init();
  }

  init() {
    this.isSeeking = false;
    // Audio element setup
    this.audio.preload = 'metadata';

    this.audio.addEventListener('timeupdate', () => {
      if (!this.isSeeking) {
        this.handleTimeUpdate();
      }
    });
    this.audio.addEventListener('loadedmetadata', () => this.handleMetadata());
    this.audio.addEventListener('ended', () => this.handleEnded());
    this.audio.addEventListener('error', (e) => this.handleAudioError(e));

    // Player button setup
    if (this.btnPlayPause) {
      this.btnPlayPause.addEventListener('click', () => this.togglePlay());
    }
    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => this.playPrev());
    }
    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => this.playNext());
    }
    if (this.btnShuffle) {
      this.btnShuffle.addEventListener('click', () => this.toggleShuffle());
    }
    if (this.btnRepeat) {
      this.btnRepeat.addEventListener('click', () => this.toggleRepeat());
    }
    if (this.btnMute) {
      this.btnMute.addEventListener('click', () => this.toggleMute());
    }

    // Progress bar seeking (instant jump on click & drag)
    if (this.progressBar) {
      const handleSeek = (e) => {
        const value = parseFloat(e.target.value);
        if (this.audio.duration && !isNaN(this.audio.duration)) {
          const seekTime = (value / 100) * this.audio.duration;
          this.audio.currentTime = seekTime;
          this.updateProgressUI(seekTime, this.audio.duration);
        }
      };

      const startSeek = () => { this.isSeeking = true; };
      const endSeek = (e) => {
        handleSeek(e);
        this.isSeeking = false;
      };

      this.progressBar.addEventListener('mousedown', startSeek);
      this.progressBar.addEventListener('touchstart', startSeek);
      this.progressBar.addEventListener('input', (e) => {
        this.isSeeking = true;
        handleSeek(e);
      });
      this.progressBar.addEventListener('change', endSeek);
      this.progressBar.addEventListener('mouseup', endSeek);
      this.progressBar.addEventListener('touchend', endSeek);
    }

    // Volume bar
    if (this.volumeBar) {
      this.volumeBar.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.audio.volume = val / 100;
        this.audio.muted = (val === 0);
        this.updateVolumeUI();
      });
    }

    // ── Restore last played song from localStorage ──
    const savedIndex = parseInt(localStorage.getItem('bgmi_song_index') || '0', 10);
    const startIndex = (savedIndex >= 0 && savedIndex < this.songs.length) ? savedIndex : 0;

    if (this.songs.length > 0) {
      this.loadTrack(startIndex, false); // load without autoplay first
    }

    // ── Autoplay: try immediately, fall back to first user interaction ──
    this._attemptAutoplay();
  }

  _attemptAutoplay() {
    // Step 1: Mute and play (browsers ALWAYS allow muted autoplay)
    this.audio.muted = true;
    this.hasUserInteracted = true;

    const p = this.audio.play();
    if (p !== undefined) {
      p.then(() => {
        // Playing muted — now update UI as playing
        this.updatePlayStateUI(true);
        this.onStateChange(this.getCurrentSong(), true);

        // Step 2: Unmute on first user interaction
        const unmute = () => {
          this.audio.muted = false;
          document.removeEventListener('click',    unmute);
          document.removeEventListener('touchend', unmute);
          document.removeEventListener('keydown',  unmute);
        };
        document.addEventListener('click',    unmute, { once: true });
        document.addEventListener('touchend', unmute, { once: true });
        document.addEventListener('keydown',  unmute, { once: true });

      }).catch(() => {
        // Even muted play failed (very rare) — try on first interaction
        this.audio.muted = false;
        this.updatePlayStateUI(false);
        const startOnInteract = () => {
          this.hasUserInteracted = true;
          this.audio.muted = false;
          this.play();
        };
        document.addEventListener('click',    startOnInteract, { once: true });
        document.addEventListener('touchend', startOnInteract, { once: true });
        document.addEventListener('keydown',  startOnInteract, { once: true });
      });
    }
  }

  getCurrentSong() {
    return this.songs[this.currentIndex] || null;
  }

  loadTrack(index, autoPlay = true) {
    if (index < 0 || index >= this.songs.length) return;
    
    this.currentIndex = index;
    const song = this.songs[index];

    // ── Save current song index to localStorage ──
    localStorage.setItem('bgmi_song_index', index);

    this.audio.src = song.audio;
    this.audio.load();

    // Update UI elements
    if (this.elemCover) this.elemCover.src = song.cover;
    if (this.elemTitle) this.elemTitle.textContent = song.title;
    if (this.elemArtist) this.elemArtist.textContent = song.artist;
    if (this.elemTag) this.elemTag.textContent = song.tag || song.category;

    // Reset progress UI
    this.updateProgressUI(0, 0);

    // Notify listeners (for background image sync etc)
    this.onTrackChange(song);

    // ── Update OS media notification (artwork + title) ──
    this.updateMediaSession(song);

    if (autoPlay && this.hasUserInteracted) {
      this.play();
    } else {
      this.updatePlayStateUI(false);
    }
  }

  updateMediaSession(song) {
    if (!('mediaSession' in navigator)) return;

    // Build absolute URL for artwork (relative paths don't work in notifications)
    const origin = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    const artworkUrl = song.cover.startsWith('http')
      ? song.cover
      : origin + song.cover.replace(/^\.?\//, '');

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  song.title,
      artist: song.artist,
      album:  'BGMI Nostalgia',
      artwork: [
        { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
      ]
    });

    // Register media control button handlers
    navigator.mediaSession.setActionHandler('play',          () => this.play());
    navigator.mediaSession.setActionHandler('pause',         () => this.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrev());
    navigator.mediaSession.setActionHandler('nexttrack',     () => this.playNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && this.audio.duration) {
        this.audio.currentTime = details.seekTime;
      }
    });
  }

  play() {
    this.hasUserInteracted = true;
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.updatePlayStateUI(true);
          this.onStateChange(this.getCurrentSong(), true);
        })
        .catch(err => {
          console.warn("Audio play prevented:", err);
          this.updatePlayStateUI(false);
          this.onStateChange(this.getCurrentSong(), false);
        });
    }
  }

  pause() {
    this.audio.pause();
    this.updatePlayStateUI(false);
    this.onStateChange(this.getCurrentSong(), false);
  }

  togglePlay() {
    this.hasUserInteracted = true;
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  playNext() {
    if (this.isShuffle) {
      let randIndex;
      do {
        randIndex = Math.floor(Math.random() * this.songs.length);
      } while (randIndex === this.currentIndex && this.songs.length > 1);
      this.loadTrack(randIndex, true);
    } else {
      const nextIndex = (this.currentIndex + 1) % this.songs.length;
      this.loadTrack(nextIndex, true);
    }
  }

  playPrev() {
    // If track played > 3s, restart track first
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    if (this.isShuffle) {
      let randIndex;
      do {
        randIndex = Math.floor(Math.random() * this.songs.length);
      } while (randIndex === this.currentIndex && this.songs.length > 1);
      this.loadTrack(randIndex, true);
    } else {
      const prevIndex = (this.currentIndex - 1 + this.songs.length) % this.songs.length;
      this.loadTrack(prevIndex, true);
    }
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    if (this.btnShuffle) {
      this.btnShuffle.classList.toggle('active', this.isShuffle);
    }
  }

  toggleRepeat() {
    this.isRepeat = !this.isRepeat;
    if (this.btnRepeat) {
      this.btnRepeat.classList.toggle('active', this.isRepeat);
    }
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
    this.updateVolumeUI();
  }

  seekBy(seconds) {
    if (!this.audio.duration) return;
    let newTime = this.audio.currentTime + seconds;
    if (newTime < 0) newTime = 0;
    if (newTime > this.audio.duration) newTime = this.audio.duration;
    this.audio.currentTime = newTime;
  }

  handleTimeUpdate() {
    if (!this.audio.duration) return;
    this.updateProgressUI(this.audio.currentTime, this.audio.duration);
  }

  handleMetadata() {
    this.updateProgressUI(this.audio.currentTime, this.audio.duration);
  }

  handleEnded() {
    if (this.isRepeat) {
      this.audio.currentTime = 0;
      this.play();
    } else {
      this.playNext();
    }
  }

  handleAudioError(e) {
    console.error("Audio playback error:", e);
    this.onError("Could not play track. Skipping to next song...");
    setTimeout(() => this.playNext(), 2000);
  }

  updatePlayStateUI(isPlaying) {
    if (this.iconPlay && this.iconPause) {
      this.iconPlay.style.display = isPlaying ? 'none' : 'block';
      this.iconPause.style.display = isPlaying ? 'block' : 'none';
    }
    if (this.btnPlayPause) {
      this.btnPlayPause.setAttribute('aria-label', isPlaying ? 'Pause song' : 'Play song');
    }
    if (this.elemCover) {
      this.elemCover.classList.toggle('playing', isPlaying);
    }
  }

  updateProgressUI(current, duration) {
    const percent = duration > 0 ? (current / duration) * 100 : 0;
    if (this.progressBar) this.progressBar.value = percent;
    if (this.progressFill) this.progressFill.style.width = `${percent}%`;

    const timeCombined = document.getElementById('timeCombined');
    if (timeCombined) {
      timeCombined.textContent = `${this.formatTime(current)} / ${this.formatTime(duration)}`;
    }
    if (this.timeCurrent) this.timeCurrent.textContent = this.formatTime(current);
    if (this.timeDuration) this.timeDuration.textContent = this.formatTime(duration);
  }

  updateVolumeUI() {
    const isMuted = this.audio.muted || this.audio.volume === 0;
    const val = isMuted ? 0 : this.audio.volume * 100;
    if (this.volumeBar) this.volumeBar.value = val;
    if (this.volumeFill) this.volumeFill.style.width = `${val}%`;
    if (this.btnMute) this.btnMute.classList.toggle('muted', isMuted);
    
    const iconOn = document.getElementById('iconVolumeOn');
    const iconOff = document.getElementById('iconVolumeOff');
    if (iconOn && iconOff) {
      iconOn.style.display = isMuted ? 'none' : 'block';
      iconOff.style.display = isMuted ? 'block' : 'none';
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds === null) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
