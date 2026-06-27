/* detector.js — Deepfake Detector page for Victor's portfolio
   Talks to the OpenFake joint_v1 detection API. */

const API_BASE = 'https://deepfake-detector.ai4.institute';
const LANG_KEY = 'lang';

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;   // 50 MB (images + GIF)
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;  // 300 MB (video)

/* ------------------------------------------------------------------ i18n */
const UI = {
  en: {
    navBrand: 'Deepfake Detector',
    backLabel: 'Portfolio',
    headerTitle: 'Deepfake Detector',
    headerSubtitle: 'Upload an image or video to estimate how likely it is AI-generated or tampered. Powered by my OpenFake joint detector. Files are sent to the detection API for analysis and are not stored.',
    dropzoneText: 'Drag & drop an image or video here',
    dropzoneSub: 'or click to choose a file · images/GIF ≤ 50 MB · video ≤ 300 MB',
    analyze: 'Analyze',
    clear: 'Clear',
    loading: 'Analyzing…',
    verdictReal: 'Likely authentic',
    verdictUncertain: 'Uncertain',
    verdictFake: 'Likely fake',
    pFakeLabel: 'Fake probability',
    breakdownTitle: 'Breakdown',
    localized: 'Localized edit',
    synthetic: 'Fully synthetic',
    real: 'Real',
    reliability: 'Reliability',
    pFakeMax: 'Most suspicious frame',
    framesAnalyzed: 'Frames analyzed',
    generatorsTitle: 'Likely generators',
    maskTitle: 'Localization mask',
    maskHint: 'Brighter red marks regions the model flags as manipulated.',
    maskOpacity: 'Mask opacity',
    showMask: 'Show mask',
    timelineTitle: 'Fake-probability timeline',
    timelineLegendReal: 'authentic',
    timelineLegendFake: 'fake',
    frameAt: 'Frame at',
    clickTimeline: 'Click the timeline to inspect a frame.',
    errGeneric: 'Something went wrong while analyzing the file.',
    errNetwork: 'Could not reach the detection API. It may be offline, or it may need to allow requests from this site (CORS).',
    errTooBigImage: 'Image/GIF is too large (max 50 MB).',
    errTooBigVideo: 'Video is too large (max 300 MB).',
    errType: 'Unsupported file type. Use an image (jpeg/png/webp/gif) or video (mp4/mov/webm/mkv).'
  },
  fr: {
    navBrand: 'Détecteur de deepfakes',
    backLabel: 'Portfolio',
    headerTitle: 'Détecteur de deepfakes',
    headerSubtitle: 'Téléversez une image ou une vidéo pour estimer la probabilité qu\'elle soit générée par IA ou trafiquée. Propulsé par mon détecteur joint OpenFake. Les fichiers sont envoyés à l\'API d\'analyse et ne sont pas conservés.',
    dropzoneText: 'Glissez-déposez une image ou une vidéo ici',
    dropzoneSub: 'ou cliquez pour choisir un fichier · images/GIF ≤ 50 Mo · vidéo ≤ 300 Mo',
    analyze: 'Analyser',
    clear: 'Effacer',
    loading: 'Analyse en cours…',
    verdictReal: 'Probablement authentique',
    verdictUncertain: 'Incertain',
    verdictFake: 'Probablement faux',
    pFakeLabel: 'Probabilité de falsification',
    breakdownTitle: 'Répartition',
    localized: 'Édition localisée',
    synthetic: 'Entièrement synthétique',
    real: 'Réel',
    reliability: 'Fiabilité',
    pFakeMax: 'Image la plus suspecte',
    framesAnalyzed: 'Images analysées',
    generatorsTitle: 'Générateurs probables',
    maskTitle: 'Masque de localisation',
    maskHint: 'Le rouge plus vif marque les régions que le modèle juge manipulées.',
    maskOpacity: 'Opacité du masque',
    showMask: 'Afficher le masque',
    timelineTitle: 'Chronologie de probabilité de falsification',
    timelineLegendReal: 'authentique',
    timelineLegendFake: 'faux',
    frameAt: 'Image à',
    clickTimeline: 'Cliquez sur la chronologie pour inspecter une image.',
    errGeneric: 'Une erreur est survenue lors de l\'analyse du fichier.',
    errNetwork: 'Impossible de joindre l\'API de détection. Elle est peut-être hors ligne, ou doit autoriser les requêtes de ce site (CORS).',
    errTooBigImage: 'Image/GIF trop volumineuse (max 50 Mo).',
    errTooBigVideo: 'Vidéo trop volumineuse (max 300 Mo).',
    errType: 'Type de fichier non pris en charge. Utilisez une image (jpeg/png/webp/gif) ou une vidéo (mp4/mov/webm/mkv).'
  }
};

function getLang() {
  return localStorage.getItem(LANG_KEY) ||
    (navigator.language && navigator.language.startsWith('fr') ? 'fr' : 'en');
}

function t(key) {
  const lang = getLang();
  return (UI[lang] || UI.en)[key] || key;
}

/* ------------------------------------------------------------------ state */
let selectedFile = null;
let previewUrl = null;
let lastResult = null;       // last API response, for re-render on lang toggle
let maskCache = new Map();   // base64 mask -> tinted data URL

/* ------------------------------------------------------------------ elements */
const els = {};
function $(id) { return document.getElementById(id); }

/* ------------------------------------------------------------------ static UI text */
function applyUI() {
  const lang = getLang();
  document.documentElement.lang = lang;
  $('nav-brand').textContent = t('navBrand');
  $('back-label').textContent = t('backLabel');
  $('header-title').textContent = t('headerTitle');
  $('header-subtitle').textContent = t('headerSubtitle');
  $('dropzone-text').textContent = t('dropzoneText');
  $('dropzone-sub').textContent = t('dropzoneSub');
  $('analyze-label').textContent = t('analyze');
  $('reset-label').textContent = t('clear');
  $('loading-text').textContent = t('loading');
  $('lang-toggle').textContent = lang === 'fr' ? 'EN' : 'FR';
  document.title = t('headerTitle') + ' — Victor Livernoche';
}

/* ------------------------------------------------------------------ helpers */
function pct(x) { return Math.round((x || 0) * 100); }

function fmtTime(s) {
  if (s == null || isNaN(s)) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// p in [0,1] -> green→yellow→red
function scoreColor(p) {
  p = Math.max(0, Math.min(1, p || 0));
  let r, g, b = 60;
  if (p < 0.5) {            // green -> yellow
    const k = p / 0.5;
    r = Math.round(46 + k * (241 - 46));
    g = Math.round(204 + k * (196 - 204));
  } else {                  // yellow -> red
    const k = (p - 0.5) / 0.5;
    r = Math.round(241 + k * (231 - 241));
    g = Math.round(196 + k * (76 - 196));
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function verdictWord(p) {
  if (p < 0.35) return { text: t('verdictReal'), color: 'var(--real-color)' };
  if (p < 0.65) return { text: t('verdictUncertain'), color: 'var(--uncertain-color)' };
  return { text: t('verdictFake'), color: 'var(--fake-color)' };
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Recolor a grayscale (white = manipulated) PNG mask into a red heat overlay
// where alpha follows mask intensity. Returns a Promise<dataURL>.
function tintMask(maskBase64) {
  if (maskCache.has(maskBase64)) return Promise.resolve(maskCache.get(maskBase64));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      try {
        const data = cx.getImageData(0, 0, c.width, c.height);
        const d = data.data;
        for (let i = 0; i < d.length; i += 4) {
          const intensity = d[i]; // grayscale -> use red channel
          d[i] = 240; d[i + 1] = 50; d[i + 2] = 40; // hot red
          d[i + 3] = intensity;                      // alpha = mask strength
        }
        cx.putImageData(data, 0, 0);
        const url = c.toDataURL('image/png');
        maskCache.set(maskBase64, url);
        resolve(url);
      } catch (e) {
        // canvas tainting shouldn't happen for data URLs, but fall back
        resolve('data:image/png;base64,' + maskBase64);
      }
    };
    img.onerror = () => resolve('data:image/png;base64,' + maskBase64);
    img.src = 'data:image/png;base64,' + maskBase64;
  });
}

/* ------------------------------------------------------------------ result fragments */
function scoreBarHtml(pFake) {
  const v = verdictWord(pFake);
  return `
    <div class="verdict">
      <div class="verdict-label" style="color:${v.color}">${v.text}</div>
      <div class="verdict-pfake">${escHtml(t('pFakeLabel'))}: <strong>${pct(pFake)}%</strong></div>
      <div class="score-bar">
        <div class="score-bar-marker" style="left:${Math.max(0, Math.min(100, pct(pFake)))}%"></div>
      </div>
      <div class="score-bar-scale"><span>0%</span><span>50%</span><span>100%</span></div>
    </div>`;
}

function breakdownHtml(r) {
  const loc = r.p_localized || 0;
  const syn = r.p_full_synthetic || 0;
  const real = Math.max(0, r.p_real != null ? r.p_real : 1 - loc - syn);
  const total = loc + syn + real || 1;
  return `
    <div class="result-card">
      <div class="result-card-title">${escHtml(t('breakdownTitle'))}</div>
      <div class="stacked-bar">
        <div class="stacked-seg real" style="width:${(real / total) * 100}%"></div>
        <div class="stacked-seg localized" style="width:${(loc / total) * 100}%"></div>
        <div class="stacked-seg synthetic" style="width:${(syn / total) * 100}%"></div>
      </div>
      <div class="stacked-legend">
        <span><i class="legend-dot real"></i>${escHtml(t('real'))} ${pct(real)}%</span>
        <span><i class="legend-dot localized"></i>${escHtml(t('localized'))} ${pct(loc)}%</span>
        <span><i class="legend-dot synthetic"></i>${escHtml(t('synthetic'))} ${pct(syn)}%</span>
      </div>
      <div class="stat-grid">
        <div class="stat-item"><div class="stat-value">${pct(loc)}%</div><div class="stat-label">${escHtml(t('localized'))}</div></div>
        <div class="stat-item"><div class="stat-value">${pct(syn)}%</div><div class="stat-label">${escHtml(t('synthetic'))}</div></div>
        <div class="stat-item"><div class="stat-value">${pct(r.reliability != null ? r.reliability : real)}%</div><div class="stat-label">${escHtml(t('reliability'))}</div></div>
      </div>
    </div>`;
}

function generatorsHtml(list) {
  if (!list || !list.length) return '';
  const rows = list.map(g => `
    <div class="gen-row">
      <div class="gen-name">${escHtml(g.name)}</div>
      <div class="gen-track"><div class="gen-fill" style="width:${pct(g.p)}%"></div></div>
      <div class="gen-pct">${pct(g.p)}%</div>
    </div>`).join('');
  return `
    <div class="result-card">
      <div class="result-card-title">${escHtml(t('generatorsTitle'))}</div>
      <div class="gen-list">${rows}</div>
    </div>`;
}

/* ------------------------------------------------------------------ render: image */
async function renderImage(r) {
  const results = $('results');
  results.innerHTML = `
    <div class="result-card">${scoreBarHtml(r.p_fake)}</div>
    ${breakdownHtml(r)}
    ${generatorsHtml(r.generators)}
  `;

  if (r.mask && r.mask.data) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-card-title">${escHtml(t('maskTitle'))}</div>
      <div class="mask-overlay-wrap" id="mask-wrap">
        <img class="base-media" src="${previewUrl}" alt="uploaded image">
        <img class="mask-layer" id="mask-layer" alt="localization mask" style="opacity:0.6">
      </div>
      <div class="mask-controls">
        <label><input type="checkbox" id="mask-toggle" checked> ${escHtml(t('showMask'))}</label>
        <label>${escHtml(t('maskOpacity'))} <input type="range" id="mask-opacity" min="0" max="100" value="60"></label>
      </div>
      <p class="mask-hint">${escHtml(t('maskHint'))}</p>`;
    results.appendChild(card);

    const layer = card.querySelector('#mask-layer');
    tintMask(r.mask.data).then(url => { layer.src = url; });
    const toggle = card.querySelector('#mask-toggle');
    const opacity = card.querySelector('#mask-opacity');
    const sync = () => { layer.style.opacity = toggle.checked ? (opacity.value / 100) : 0; };
    toggle.addEventListener('change', sync);
    opacity.addEventListener('input', sync);
  }
}

/* ------------------------------------------------------------------ render: video */
async function renderVideo(r) {
  const results = $('results');
  const frames = (r.frames || []).slice();

  // top summary
  const summary = document.createElement('div');
  summary.className = 'result-card';
  summary.innerHTML = scoreBarHtml(r.p_fake) + `
    <div class="stat-grid">
      <div class="stat-item"><div class="stat-value" style="color:${scoreColor(r.p_fake_max)}">${pct(r.p_fake_max)}%</div><div class="stat-label">${escHtml(t('pFakeMax'))}</div></div>
      <div class="stat-item"><div class="stat-value">${r.n_frames || frames.length}</div><div class="stat-label">${escHtml(t('framesAnalyzed'))}</div></div>
      <div class="stat-item"><div class="stat-value">${pct(r.reliability != null ? r.reliability : r.p_real)}%</div><div class="stat-label">${escHtml(t('reliability'))}</div></div>
    </div>`;
  results.innerHTML = '';
  results.appendChild(summary);

  // breakdown + generators
  results.insertAdjacentHTML('beforeend', breakdownHtml(r));
  const gen = generatorsHtml(r.generators);
  if (gen) results.insertAdjacentHTML('beforeend', gen);

  // timeline + frame inspector
  const tl = document.createElement('div');
  tl.className = 'result-card';
  tl.innerHTML = `
    <div class="result-card-title">${escHtml(t('timelineTitle'))}</div>
    <div class="timeline-block">
      <div class="timeline-track" id="timeline-track">
        <div class="timeline-gradient" id="timeline-gradient"></div>
      </div>
      <div class="timeline-axis"><span>0:00</span><span id="timeline-end">—</span></div>
      <div class="timeline-legend">
        <span>${escHtml(t('timelineLegendReal'))}</span><span class="bar"></span><span>${escHtml(t('timelineLegendFake'))}</span>
      </div>
    </div>
    <div class="frame-detail" id="frame-detail" hidden>
      <div class="frame-meta" id="frame-meta"></div>
      <div class="mask-overlay-wrap" id="vid-mask-wrap">
        <video class="base-media" id="frame-video" src="${previewUrl}" muted playsinline></video>
        <img class="mask-layer" id="vid-mask-layer" alt="frame mask" style="opacity:0.6">
      </div>
    </div>
    <p class="mask-hint">${escHtml(t('clickTimeline'))}</p>`;
  results.appendChild(tl);

  // determine duration / positions
  const knownTs = frames.map(f => f.t).filter(v => v != null);
  let duration = knownTs.length ? Math.max(...knownTs) : (frames.length - 1);
  const posOf = (f, i) => {
    if (f.t != null && duration > 0) return (f.t / duration) * 100;
    return frames.length > 1 ? (i / (frames.length - 1)) * 100 : 0;
  };

  // gradient across frames
  const stops = frames.map((f, i) => `${scoreColor(f.p_fake)} ${posOf(f, i).toFixed(1)}%`);
  if (stops.length === 1) stops.push(stops[0]);
  $('timeline-gradient').style.background = `linear-gradient(90deg, ${stops.join(', ')})`;
  $('timeline-end').textContent = fmtTime(duration);

  // markers
  const track = $('timeline-track');
  const peakIdx = frames.reduce((best, f, i, arr) => f.p_fake > arr[best].p_fake ? i : best, 0);
  const video = $('frame-video');
  const maskLayer = $('vid-mask-layer');
  const detail = $('frame-detail');
  const meta = $('frame-meta');

  function showFrame(f, i) {
    detail.hidden = false;
    track.querySelectorAll('.timeline-marker').forEach(m => m.classList.remove('active'));
    const mk = track.querySelector(`.timeline-marker[data-i="${i}"]`);
    if (mk) mk.classList.add('active');
    // seek video to frame time
    const seekTo = f.t != null ? f.t : (duration > 0 ? (i / Math.max(1, frames.length - 1)) * duration : 0);
    const doSeek = () => { try { video.currentTime = Math.min(seekTo, (video.duration || seekTo)); } catch (e) {} };
    if (video.readyState >= 1) doSeek(); else video.addEventListener('loadedmetadata', doSeek, { once: true });
    // mask
    if (f.mask && f.mask.data) {
      maskLayer.style.display = '';
      tintMask(f.mask.data).then(url => { maskLayer.src = url; });
    } else {
      maskLayer.style.display = 'none';
    }
    const v = verdictWord(f.p_fake);
    meta.innerHTML = `
      <div class="big" style="color:${v.color}">${v.text} · ${pct(f.p_fake)}%</div>
      <div>${escHtml(t('frameAt'))} ${fmtTime(f.t)}</div>
      <div>${escHtml(t('localized'))}: ${pct(f.p_localized)}% · ${escHtml(t('synthetic'))}: ${pct(f.p_full_synthetic)}%</div>
      ${(f.generators && f.generators.length) ? `<div>${escHtml(t('generatorsTitle'))}: ${f.generators.map(g => escHtml(g.name) + ' ' + pct(g.p) + '%').join(' · ')}</div>` : ''}`;
  }

  frames.forEach((f, i) => {
    const mk = document.createElement('div');
    mk.className = 'timeline-marker' + (i === peakIdx ? ' peak' : '');
    mk.style.left = posOf(f, i) + '%';
    mk.dataset.i = i;
    mk.title = `${fmtTime(f.t)} · ${pct(f.p_fake)}%`;
    mk.addEventListener('click', (e) => { e.stopPropagation(); showFrame(f, i); });
    track.appendChild(mk);
  });

  // click anywhere on the track -> nearest frame
  track.addEventListener('click', (e) => {
    const rect = track.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    let best = 0, bestD = Infinity;
    frames.forEach((f, i) => { const d = Math.abs(posOf(f, i) - x); if (d < bestD) { bestD = d; best = i; } });
    showFrame(frames[best], best);
  });

  // open on the most suspicious frame by default
  if (frames.length) showFrame(frames[peakIdx], peakIdx);
}

/* ------------------------------------------------------------------ render dispatch */
function renderResult(r) {
  lastResult = r;
  $('results').hidden = false;
  if (r.media_type === 'video') renderVideo(r);
  else renderImage(r);
}

/* ------------------------------------------------------------------ file handling */
function showError(msg) {
  const el = $('error-msg');
  el.textContent = msg;
  el.hidden = false;
}
function clearError() { $('error-msg').hidden = true; }

function isVideo(file) { return file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(file.name); }
function isImage(file) { return file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name); }

function validateFile(file) {
  if (!isImage(file) && !isVideo(file)) return t('errType');
  if (isVideo(file) && file.size > MAX_VIDEO_BYTES) return t('errTooBigVideo');
  if (!isVideo(file) && file.size > MAX_IMAGE_BYTES) return t('errTooBigImage');
  return null;
}

function setFile(file) {
  const err = validateFile(file);
  if (err) { showError(err); return; }
  clearError();
  selectedFile = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);

  const dz = $('dropzone');
  const preview = $('media-preview');
  preview.innerHTML = '';
  if (isVideo(file)) {
    const v = document.createElement('video');
    v.src = previewUrl; v.controls = true; v.muted = true; v.playsInline = true;
    preview.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = previewUrl; img.alt = 'selected media';
    preview.appendChild(img);
  }
  $('dropzone-prompt').hidden = true;
  preview.hidden = false;
  dz.classList.add('has-media');
  $('analyze-btn').disabled = false;
  $('reset-btn').hidden = false;
  // clear any previous results
  $('results').hidden = true;
  $('results').innerHTML = '';
}

function resetAll() {
  selectedFile = null;
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
  lastResult = null;
  maskCache.clear();
  $('media-preview').innerHTML = '';
  $('media-preview').hidden = true;
  $('dropzone-prompt').hidden = false;
  $('dropzone').classList.remove('has-media');
  $('analyze-btn').disabled = true;
  $('reset-btn').hidden = true;
  $('results').hidden = true;
  $('results').innerHTML = '';
  $('file-input').value = '';
  clearError();
}

async function analyze() {
  if (!selectedFile) return;
  clearError();
  $('analyze-btn').disabled = true;
  $('loading-state').hidden = false;
  $('results').hidden = true;
  $('results').innerHTML = '';

  const form = new FormData();
  form.append('file', selectedFile);

  try {
    const resp = await fetch(`${API_BASE}/api/predict?return_mask=true`, {
      method: 'POST',
      body: form
    });
    if (!resp.ok) {
      let detail = '';
      try { const j = await resp.json(); detail = j.detail || j.error || ''; } catch (e) {}
      throw new Error(detail || `${t('errGeneric')} (HTTP ${resp.status})`);
    }
    const data = await resp.json();
    renderResult(data);
  } catch (e) {
    // TypeError from fetch usually means network / CORS failure
    if (e instanceof TypeError) showError(t('errNetwork'));
    else showError(e.message || t('errGeneric'));
  } finally {
    $('loading-state').hidden = true;
    $('analyze-btn').disabled = !selectedFile;
  }
}

/* ------------------------------------------------------------------ wiring */
function initUploader() {
  const dz = $('dropzone');
  const input = $('file-input');

  dz.addEventListener('click', () => { if (!dz.classList.contains('has-media')) input.click(); });
  dz.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !dz.classList.contains('has-media')) { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', () => { if (input.files && input.files[0]) setFile(input.files[0]); });

  ['dragenter', 'dragover'].forEach(ev =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(ev =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) setFile(f);
  });

  $('analyze-btn').addEventListener('click', analyze);
  $('reset-btn').addEventListener('click', resetAll);
}

/* ------------------------------------------------------------------ theme + lang */
(function initThemeToggle() {
  const themeToggleBtn = $('theme-toggle');
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
      if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.body.classList.remove('light-mode');
      const blobs = document.getElementById('light-blobs');
      if (blobs) blobs.remove();
      if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
    localStorage.setItem('theme', mode);
  }

  applyTheme(localStorage.getItem('theme') || 'dark');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.body.classList.contains('light-mode') ? 'light' : 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
})();

$('lang-toggle').addEventListener('click', () => {
  const next = getLang() === 'en' ? 'fr' : 'en';
  localStorage.setItem(LANG_KEY, next);
  applyUI();
  if (lastResult) renderResult(lastResult); // re-render results in new language
});

applyUI();
initUploader();
