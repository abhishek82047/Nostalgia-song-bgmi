/**
 * Nostalgia Song BGMI - Fullscreen Controller
 * Handles Browser Fullscreen API with a custom styled toast notification.
 */

class FullscreenController {
  constructor(btnId, iconEnterId, iconExitId) {
    this.btn = document.getElementById(btnId);
    this.iconEnter = document.getElementById(iconEnterId);
    this.iconExit = document.getElementById(iconExitId);

    this._toastEl = null;
    this._toastTimer = null;

    this._createToast();
    this.init();
  }

  /* ── Create the custom toast element ── */
  _createToast() {
    const el = document.createElement('div');
    el.id = 'fsToast';
    el.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>
      <span id="fsToastText">Fullscreen mode — swipe down to exit</span>
    `;
    document.body.appendChild(el);
    this._toastEl = el;

    /* Inline styles so it works even before CSS loads */
    Object.assign(el.style, {
      position:       'fixed',
      bottom:         '7rem',
      left:           '50%',
      transform:      'translateX(-50%) translateY(20px)',
      opacity:        '0',
      pointerEvents:  'none',
      display:        'flex',
      alignItems:     'center',
      gap:            '0.5rem',
      padding:        '0.55rem 1.1rem',
      borderRadius:   '30px',
      background:     'rgba(18, 20, 28, 0.88)',
      backdropFilter: 'blur(20px)',
      border:         '1px solid rgba(255,255,255,0.12)',
      color:          'rgba(255,255,255,0.9)',
      fontSize:       '0.8rem',
      fontFamily:     'inherit',
      fontWeight:     '500',
      boxShadow:      '0 8px 32px rgba(0,0,0,0.6)',
      zIndex:         '9999',
      whiteSpace:     'nowrap',
      transition:     'opacity 0.35s ease, transform 0.35s ease',
      letterSpacing:  '0.3px',
    });
  }

  /* ── Show toast with message ── */
  _showToast(msg) {
    if (!this._toastEl) return;
    document.getElementById('fsToastText').textContent = msg;

    clearTimeout(this._toastTimer);

    // Animate in
    this._toastEl.style.opacity = '1';
    this._toastEl.style.transform = 'translateX(-50%) translateY(0)';

    // Auto-hide after 3s
    this._toastTimer = setTimeout(() => {
      this._toastEl.style.opacity = '0';
      this._toastEl.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3000);
  }

  init() {
    if (!this.btn) return;
    this.btn.addEventListener('click', () => this.toggle());

    document.addEventListener('fullscreenchange',       () => this.updateState());
    document.addEventListener('webkitfullscreenchange', () => this.updateState());
    document.addEventListener('mozfullscreenchange',    () => this.updateState());
    document.addEventListener('MSFullscreenChange',     () => this.updateState());
  }

  isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  toggle() {
    if (this.isFullscreen()) {
      this.exit();
    } else {
      this.enter();
    }
  }

  enter() {
    const elem = document.documentElement;
    const p =
      elem.requestFullscreen       ? elem.requestFullscreen() :
      elem.webkitRequestFullscreen ? (elem.webkitRequestFullscreen(), Promise.resolve()) :
      elem.mozRequestFullScreen    ? (elem.mozRequestFullScreen(),    Promise.resolve()) :
      elem.msRequestFullscreen     ? (elem.msRequestFullscreen(),     Promise.resolve()) :
      Promise.reject('not supported');

    Promise.resolve(p)
      .then(() => this._showToast('🎮  Fullscreen — swipe down to exit'))
      .catch(err => console.warn('Fullscreen request error:', err));
  }

  exit() {
    const p =
      document.exitFullscreen       ? document.exitFullscreen() :
      document.webkitExitFullscreen ? (document.webkitExitFullscreen(), Promise.resolve()) :
      document.mozCancelFullScreen  ? (document.mozCancelFullScreen(),  Promise.resolve()) :
      document.msExitFullscreen     ? (document.msExitFullscreen(),     Promise.resolve()) :
      Promise.resolve();

    Promise.resolve(p)
      .then(() => this._showToast('↙  Exited fullscreen'))
      .catch(err => console.warn('Fullscreen exit error:', err));
  }

  updateState() {
    const active = this.isFullscreen();
    if (this.iconEnter && this.iconExit) {
      this.iconEnter.style.display = active ? 'none'  : 'block';
      this.iconExit.style.display  = active ? 'block' : 'none';
    }
    if (this.btn) {
      this.btn.setAttribute('aria-label', active ? 'Exit Fullscreen' : 'Enter Fullscreen');
      this.btn.classList.toggle('active', active);
    }
  }
}
