/**
 * Nostalgia Song BGMI - Waveform Visualizer
 * Draws animated white frequency bars on a canvas above the music player.
 * Syncs with the actual audio using Web Audio API AnalyserNode.
 */

class WaveformVisualizer {
  constructor(canvasId, audioElement) {
    this.canvas = document.getElementById(canvasId);
    this.audio = audioElement;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.rafId = null;
    this.isConnected = false;
    this.isPlaying = false;

    // Idle animation state (gentle random bars when paused)
    this.idleBars = [];

    if (this.canvas) {
      this._initIdleBars();
      this._resizeCanvas();
      window.addEventListener('resize', () => this._resizeCanvas());
      this._drawIdle(); // start idle animation immediately
    }
  }

  // ── Initialize Web Audio API (called on first play, needs user gesture) ──
  _initAudio() {
    if (this.isConnected) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = this.audioCtx.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      const bufferLen = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLen);
      this.isConnected = true;
    } catch (e) {
      console.warn('WaveformVisualizer: Audio context init failed', e);
    }
  }

  // ── Resize canvas to match its CSS display size ──
  _resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this._initIdleBars();
  }

  // ── Set up idle bar targets for gentle ambient animation ──
  _initIdleBars() {
    const BAR_COUNT = 60;
    this.idleBars = Array.from({ length: BAR_COUNT }, () => ({
      height: Math.random() * 0.3 + 0.05,
      target: Math.random() * 0.3 + 0.05,
      speed: Math.random() * 0.015 + 0.005,
    }));
  }

  // ── Draw using real analyser data (playing state) ──
  _drawLive() {
    if (!this.isPlaying) return;
    this.rafId = requestAnimationFrame(() => this._drawLive());

    const { canvas, ctx, analyser, dataArray } = this;
    if (!ctx || !analyser) return;

    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const BAR_COUNT = 80;
    const usableBins = Math.floor(dataArray.length * 0.75); // use lower 75% of freq range
    const step = Math.floor(usableBins / BAR_COUNT);
    const gap = 3;
    const barW = Math.max(2, Math.floor((canvas.width - gap * (BAR_COUNT - 1)) / BAR_COUNT));
    const totalW = barW * BAR_COUNT + gap * (BAR_COUNT - 1);
    const startX = (canvas.width - totalW) / 2;

    for (let i = 0; i < BAR_COUNT; i++) {
      // average a small chunk of bins for smoother look
      let sum = 0;
      for (let k = 0; k < step; k++) {
        sum += dataArray[i * step + k] || 0;
      }
      const avg = sum / step;
      const normalised = avg / 255;
      const barH = Math.max(3, normalised * canvas.height * 0.92);

      const x = startX + i * (barW + gap);
      const y = canvas.height - barH;

      // White gradient bars, slightly transparent at base
      const grad = ctx.createLinearGradient(0, y, 0, canvas.height);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(1, 'rgba(255,255,255,0.15)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [2, 2, 0, 0]);
      ctx.fill();
    }
  }

  // ── Draw gentle idle animation when paused ──
  _drawIdle() {
    if (this.isPlaying) return;
    this.rafId = requestAnimationFrame(() => this._drawIdle());

    const { canvas, ctx, idleBars } = this;
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const BAR_COUNT = idleBars.length;
    const gap = 3;
    const barW = Math.max(2, Math.floor((canvas.width - gap * (BAR_COUNT - 1)) / BAR_COUNT));
    const totalW = barW * BAR_COUNT + gap * (BAR_COUNT - 1);
    const startX = (canvas.width - totalW) / 2;

    for (let i = 0; i < BAR_COUNT; i++) {
      const bar = idleBars[i];

      // Slowly drift toward target
      bar.height += (bar.target - bar.height) * bar.speed;

      // Occasionally pick a new target
      if (Math.abs(bar.target - bar.height) < 0.005) {
        bar.target = Math.random() * 0.25 + 0.04;
        bar.speed = Math.random() * 0.015 + 0.005;
      }

      const barH = Math.max(3, bar.height * canvas.height);
      const x = startX + i * (barW + gap);
      const y = canvas.height - barH;

      const grad = ctx.createLinearGradient(0, y, 0, canvas.height);
      grad.addColorStop(0, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0.05)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [2, 2, 0, 0]);
      ctx.fill();
    }
  }

  // ── Called when audio starts playing ──
  onPlay() {
    cancelAnimationFrame(this.rafId);
    this._initAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.isPlaying = true;
    this._drawLive();
  }

  // ── Called when audio pauses ──
  onPause() {
    cancelAnimationFrame(this.rafId);
    this.isPlaying = false;
    this._drawIdle();
  }
}
