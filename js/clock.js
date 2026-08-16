/**
 * Nostalgia Song BGMI - Live Clock
 * 24-hour format HH:MM:SS continuously updating every second.
 */

class LiveClock {
  constructor(elementId) {
    this.element = document.getElementById(elementId);
    this.timer = null;
  }

  start() {
    this.update();
    this.timer = setInterval(() => this.update(), 1000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  update() {
    if (!this.element) return;
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // convert 0 → 12
    const hh = String(hours).padStart(2, '0');
    
    this.element.textContent = `${hh}:${minutes} ${ampm}`;
  }
}
