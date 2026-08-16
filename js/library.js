/**
 * Nostalgia Song BGMI - Music Library Drawer
 * Manages track search, categories, UI rendering, and track selection.
 */

class MusicLibrary {
  constructor(options) {
    this.songs = options.songs || [];
    this.onSelectSong = options.onSelectSong || function() {};
    
    this.drawer = document.getElementById('musicDrawer');
    this.overlay = document.getElementById('drawerOverlay');
    this.openBtn = document.getElementById('btnMusicLibrary');
    this.closeBtn = document.getElementById('btnCloseDrawer');
    this.searchInput = document.getElementById('songSearchInput');
    this.songListElem = document.getElementById('songList');
    this.categoryContainer = document.getElementById('categoryFilters');

    this.currentCategory = 'ALL';
    this.searchQuery = '';
    this.currentSongId = null;
    this.isPlaying = false;

    this.init();
  }

  init() {
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderSongs();
      });
    }

    this.setupCategories();
    this.renderSongs();
  }

  open() {
    if (this.drawer) this.drawer.classList.add('open');
    if (this.overlay) this.overlay.classList.add('open');
    if (this.openBtn) this.openBtn.classList.add('active');
  }

  close() {
    if (this.drawer) this.drawer.classList.remove('open');
    if (this.overlay) this.overlay.classList.remove('open');
    if (this.openBtn) this.openBtn.classList.remove('active');
  }

  toggle() {
    if (this.drawer && this.drawer.classList.contains('open')) {
      this.close();
    } else {
      this.open();
    }
  }

  setupCategories() {
    if (!this.categoryContainer) return;
    const categories = ['ALL', 'OLD BGMI', 'TRENDING', 'GAMING', 'ANIME'];
    this.categoryContainer.innerHTML = categories.map(cat => `
      <button class="cat-pill ${cat === this.currentCategory ? 'active' : ''}" data-cat="${cat}">
        ${cat}
      </button>
    `).join('');

    this.categoryContainer.querySelectorAll('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.categoryContainer.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
        btn.classList.active = true;
        btn.classList.add('active');
        this.currentCategory = btn.getAttribute('data-cat');
        this.renderSongs();
      });
    });
  }

  setCurrentState(songId, isPlaying) {
    this.currentSongId = songId;
    this.isPlaying = isPlaying;
    this.updateActiveItem();
  }

  renderSongs() {
    if (!this.songListElem) return;

    const filtered = this.songs.filter(song => {
      const matchCat = this.currentCategory === 'ALL' || song.category.toUpperCase() === this.currentCategory;
      const matchSearch = !this.searchQuery || 
        song.title.toLowerCase().includes(this.searchQuery) ||
        song.artist.toLowerCase().includes(this.searchQuery) ||
        song.tag.toLowerCase().includes(this.searchQuery);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      this.songListElem.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No tracks found</p>
          <span>Try searching for something else</span>
        </div>
      `;
      return;
    }

    this.songListElem.innerHTML = filtered.map((song, idx) => {
      const isActive = song.id === this.currentSongId;
      const isEqPlaying = isActive && this.isPlaying;

      return `
        <div class="song-card ${isActive ? 'active' : ''}" data-id="${song.id}">
          <div class="song-cover-wrapper">
            <img class="song-cover" src="${song.cover}" alt="${song.title}" loading="lazy" />
            <div class="play-overlay">
              ${isEqPlaying ? `
                <div class="equalizer">
                  <span class="bar bar1"></span>
                  <span class="bar bar2"></span>
                  <span class="bar bar3"></span>
                  <span class="bar bar4"></span>
                </div>
              ` : `
                <svg class="play-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              `}
            </div>
          </div>
          <div class="song-meta">
            <div class="song-title-row">
              <span class="song-title">${song.title}</span>
              ${isActive ? '<span class="now-playing-badge">PLAYING</span>' : ''}
            </div>
            <span class="song-artist">${song.artist}</span>
            <div class="song-tags">
              <span class="song-tag">${song.tag}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    this.songListElem.querySelectorAll('.song-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const song = this.songs.find(s => s.id === id);
        if (song) {
          this.onSelectSong(song);
        }
      });
    });
  }

  updateActiveItem() {
    this.renderSongs();
  }
}
