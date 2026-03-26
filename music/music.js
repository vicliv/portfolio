/* music.js — Music gallery page for Victor's portfolio */

const LANG_KEY = 'lang';

const UI = {
  en: {
    navBrand: 'Music',
    backLabel: 'Portfolio',
    headerTitle: 'Music',
    headerSubtitle: 'Tracks I have produced. I am using Logic Pro with different plugins. I am also playing piano and most vocals are recorded in my home studio.',
    scLabel: 'Follow on SoundCloud',
    loading: 'Loading…',
    noTracks: 'No tracks yet. Check back soon!',
    noResults: 'No tracks match your search.',
    error: 'Could not load tracks.',
    searchPlaceholder: 'Search tracks…',
    allTags: 'All',
    openSoundcloud: 'Open on SoundCloud'
  },
  fr: {
    navBrand: 'Musique',
    backLabel: 'Portfolio',
    headerTitle: 'Musique',
    headerSubtitle: 'Pistes que j\'ai produites. J\'utilise Logic Pro avec différents plugins. Je joue aussi du piano et la plupart des voix sont enregistrées dans mon home studio.',
    scLabel: 'Suivre sur SoundCloud',
    loading: 'Chargement…',
    noTracks: 'Aucune piste pour le moment. Revenez bientôt\u00a0!',
    noResults: 'Aucune piste ne correspond à votre recherche.',
    error: 'Impossible de charger les pistes.',
    searchPlaceholder: 'Rechercher des pistes\u2026',
    allTags: 'Tous',
    openSoundcloud: 'Ouvrir sur SoundCloud'
  }
};

/* ---- Waveform bar heights for placeholder covers ---- */
const WAVE_HEIGHTS = [20, 36, 28, 48, 18, 42, 30, 16, 44, 24, 38, 20, 32, 46, 22];

/* ---- State ---- */
let allTracks = [];
let activeTag = '';
let searchQuery = '';
let activeSlug = null;

/* ---- Language ---- */
function getLang() {
  return localStorage.getItem(LANG_KEY) ||
    (navigator.language && navigator.language.startsWith('fr') ? 'fr' : 'en');
}

function t(key) {
  return (UI[getLang()] || UI.en)[key] || key;
}

/* ---- HTML escape ---- */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---- Build SoundCloud embed URL from track URL ---- */
function scEmbedUrl(trackUrl, autoplay = true) {
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue('--primary-color').trim().replace('#', '');
  const encoded = encodeURIComponent(trackUrl);
  return `https://w.soundcloud.com/player/?url=${encoded}&color=%23${color || '23aeb3'}&auto_play=${autoplay}&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`;
}

/* ---- Render placeholder waveform ---- */
function renderCoverPlaceholder() {
  const bars = WAVE_HEIGHTS.map((h, i) => {
    const dur = (0.5 + (i % 5) * 0.12).toFixed(2);
    return `<span class="cover-bar" style="height:${h}px;--dur:${dur}s"></span>`;
  }).join('');
  return `<div class="track-cover-placeholder"><div class="cover-bars">${bars}</div></div>`;
}

/* ---- Render a track card ---- */
function renderCard(track) {
  const coverHtml = track.cover
    ? `<img class="track-cover" src="${esc(track.cover)}" alt="${esc(track.title)}" loading="lazy" onerror="this.style.display='none'">`
    : renderCoverPlaceholder();

  const tags = (track.tags || []).map(tag =>
    `<span class="track-tag">${esc(tag)}</span>`
  ).join('');

  const isActive = track.slug === activeSlug;

  return `
    <div class="track-card${isActive ? ' active' : ''}" data-slug="${esc(track.slug)}" role="button" tabindex="0" aria-label="Play ${esc(track.title)}">
      ${coverHtml}
      <div class="track-body">
        <div class="track-title">${esc(track.title)}</div>
        ${track.description ? `<p class="track-desc">${esc(track.description)}</p>` : ''}
        <div class="track-meta">
          ${track.year    ? `<span><i class="fas fa-calendar-alt"></i>${esc(String(track.year))}</span>` : ''}
          ${track.duration ? `<span><i class="fas fa-clock"></i>${esc(track.duration)}</span>` : ''}
        </div>
        ${tags ? `<div class="track-tags">${tags}</div>` : ''}
      </div>
    </div>`;
}

/* ---- Build unique sorted tag list ---- */
function buildTagFilters(tracks) {
  const tagSet = new Set();
  tracks.forEach(t => (t.tags || []).forEach(tag => tagSet.add(tag)));
  const sorted = [...tagSet].sort();

  const container = document.getElementById('tag-filters');
  // Keep the "All" button, remove any dynamically added ones
  const existing = container.querySelectorAll('[data-tag-dynamic]');
  existing.forEach(el => el.remove());

  sorted.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.value = tag;
    btn.dataset.tagDynamic = '1';
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      activeTag = tag;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGrid();
    });
    container.appendChild(btn);
  });
}

/* ---- Filter tracks ---- */
function filterTracks() {
  return allTracks.filter(track => {
    const tagOk = !activeTag || (track.tags || []).includes(activeTag);
    const q = searchQuery.toLowerCase();
    const searchOk = !q || [track.title, track.description, ...(track.tags || [])]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
    return tagOk && searchOk;
  });
}

/* ---- Render grid ---- */
function renderGrid() {
  const grid = document.getElementById('tracks-grid');
  const filtered = filterTracks();

  if (filtered.length === 0) {
    const key = allTracks.length === 0 ? 'noTracks' : 'noResults';
    grid.innerHTML = `<p class="no-results">${t(key)}</p>`;
    return;
  }

  grid.innerHTML = filtered.map(renderCard).join('');

  // Attach click handlers
  grid.querySelectorAll('.track-card').forEach(card => {
    const handler = () => {
      const slug = card.dataset.slug;
      const track = allTracks.find(tr => tr.slug === slug);
      if (track) activateTrack(track);
    };
    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
  });
}

/* ---- Activate a track (open player) ---- */
function activateTrack(track) {
  activeSlug = track.slug;

  // Update card active state without full re-render
  document.querySelectorAll('.track-card').forEach(card => {
    card.classList.toggle('active', card.dataset.slug === track.slug);
  });

  // Update player
  const bar = document.getElementById('player-bar');
  document.getElementById('player-title').textContent = track.title;
  document.getElementById('player-year').textContent  = track.year ? String(track.year) : '';

  if (track.soundcloudUrl) {
    document.getElementById('sc-iframe').src = scEmbedUrl(track.soundcloudUrl);
  } else if (track.localFile) {
    // Fall back to a plain audio element for local files
    const wrap = document.querySelector('.player-embed-wrap');
    wrap.innerHTML = `<audio controls src="${esc(track.localFile)}" style="width:100%;height:100%;accent-color:var(--primary-color)"></audio>`;
  }

  bar.classList.add('visible');
  bar.removeAttribute('aria-hidden');
}

/* ---- Close player ---- */
function closePlayer() {
  activeSlug = null;
  document.getElementById('player-bar').classList.remove('visible');
  document.getElementById('player-bar').setAttribute('aria-hidden', 'true');
  document.getElementById('sc-iframe').src = '';
  document.querySelectorAll('.track-card').forEach(c => c.classList.remove('active'));
}

/* ---- Apply UI strings ---- */
function applyUI() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.getElementById('nav-brand').textContent       = t('navBrand');
  document.getElementById('back-label').textContent      = t('backLabel');
  document.getElementById('header-title').textContent    = t('headerTitle');
  document.getElementById('header-subtitle').textContent = t('headerSubtitle');
  document.getElementById('sc-label').textContent        = t('scLabel');
  document.getElementById('lang-toggle').textContent     = lang === 'fr' ? 'EN' : 'FR';
  document.getElementById('search-input').placeholder    = t('searchPlaceholder');
  document.title = t('headerTitle') + ' — Victor Livernoche';

  // "All" button label
  const allBtn = document.querySelector('.filter-btn[data-value=""]');
  if (allBtn) {
    const span = allBtn.querySelector('[data-en]');
    if (span) span.textContent = lang === 'fr' ? span.dataset.fr : span.dataset.en;
  }
}

/* ---- Init ---- */
async function init() {
  applyUI();

  const grid = document.getElementById('tracks-grid');

  try {
    const resp = await fetch('index.json');
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    allTracks = data.filter(t => t.status !== 'on-hold');

    if (allTracks.length === 0) {
      grid.innerHTML = `<p class="no-tracks">${t('noTracks')}</p>`;
      return;
    }

    buildTagFilters(allTracks);
    renderGrid();
  } catch {
    grid.innerHTML = `<p class="no-tracks">${t('error')}</p>`;
  }

  /* ---- Event listeners ---- */

  document.getElementById('player-close').addEventListener('click', closePlayer);

  document.querySelector('.filter-btn[data-value=""]').addEventListener('click', () => {
    activeTag = '';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-value=""]').classList.add('active');
    renderGrid();
  });

  let searchTimer;
  document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      renderGrid();
    }, 200);
  });

  document.getElementById('lang-toggle').addEventListener('click', () => {
    const next = getLang() === 'en' ? 'fr' : 'en';
    localStorage.setItem(LANG_KEY, next);
    applyUI();
    renderGrid();
  });
}

/* ---- Set initial lang before async ---- */
(function () {
  const lang = getLang();
  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.textContent = lang === 'fr' ? 'EN' : 'FR';
  document.documentElement.lang = lang;
})();

init();

/* =========================================
   Dark / Light Mode Toggle
   ========================================= */
(function initTheme() {
  const btn = document.getElementById('theme-toggle');
  const blobContainer = document.createElement('div');
  blobContainer.id = 'light-blobs';
  blobContainer.innerHTML = `
    <div class="light-blob light-blob-1"></div>
    <div class="light-blob light-blob-2"></div>
    <div class="light-blob light-blob-3"></div>
  `;

  function applyTheme(mode) {
    if (mode === 'light') {
      document.body.classList.add('light-mode');
      if (!document.getElementById('light-blobs')) document.body.appendChild(blobContainer);
      if (btn) btn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.body.classList.remove('light-mode');
      const blobs = document.getElementById('light-blobs');
      if (blobs) blobs.remove();
      if (btn) btn.innerHTML = '<i class="fas fa-moon"></i>';
    }
    localStorage.setItem('theme', mode);
  }

  applyTheme(localStorage.getItem('theme') || 'dark');

  if (btn) {
    btn.addEventListener('click', () => {
      applyTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light');
    });
  }
})();
