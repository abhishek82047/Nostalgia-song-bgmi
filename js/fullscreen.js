/**
 * Nostalgia Song BGMI - Fullscreen Controller
 * Handles Browser Fullscreen API and fallback states.
 */

class FullscreenController {
  constructor(btnId, iconEnterId, iconExitId) {
    this.btn = document.getElementById(btnId);
    this.iconEnter = document.getElementById(iconEnterId);
    this.iconExit = document.getElementById(iconExitId);
    
    this.init();
  }

  init() {
    if (!this.btn) return;

    this.btn.addEventListener('click', () => this.toggle());

    // Listen for fullscreen change events across vendors
    document.addEventListener('fullscreenchange', () => this.updateState());
    document.addEventListener('webkitfullscreenchange', () => this.updateState());
    document.addEventListener('mozfullscreenchange', () => this.updateState());
    document.addEventListener('MSFullscreenChange', () => this.updateState());
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
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => console.warn("Fullscreen request error:", err));
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  }

  exit() {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => console.warn("Fullscreen exit error:", err));
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  updateState() {
    const active = this.isFullscreen();
    if (this.iconEnter && this.iconExit) {
      this.iconEnter.style.display = active ? 'none' : 'block';
      this.iconExit.style.display = active ? 'block' : 'none';
    }
    if (this.btn) {
      this.btn.setAttribute('aria-label', active ? 'Exit Fullscreen' : 'Enter Fullscreen');
      this.btn.classList.toggle('active', active);
    }
  }
}
