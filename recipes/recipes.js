/* recipes.js — Gallery page for Victor's recipe collection */

const LANG_KEY = 'lang';

const UI = {
  en: {
    navBrand: 'Recipes',
    backLabel: 'Portfolio',
    headerTitle: 'Recipes',
    headerSubtitle: 'A collection of recipes I enjoy making.',
    loading: 'Loading…',
    noRecipes: 'No recipes yet. Check back soon!',
    noResults: 'No recipes match your search.',
    error: 'Could not load recipes.',
    searchPlaceholder: 'Search recipes…'
  },
  fr: {
    navBrand: 'Recettes',
    backLabel: 'Portfolio',
    headerTitle: 'Recettes',
    headerSubtitle: 'Une collection de recettes que j\'aime préparer.',
    loading: 'Chargement…',
    noRecipes: 'Pas encore de recettes. Revenez bientôt\u00a0!',
    noResults: 'Aucune recette ne correspond à votre recherche.',
    error: 'Impossible de charger les recettes.',
    searchPlaceholder: 'Rechercher des recettes…'
  }
};

// Category → tags mapping
const CATEGORY_TAGS = {
  breakfast: ['breakfast', 'brunch'],
  lunch:     ['lunch'],
  dinner:    ['dinner'],
  dessert:   ['dessert']
};

let allRecipes = [];
let activeCategory   = '';
let activeDifficulty = '';
let searchQuery      = '';

function getLang() {
  return localStorage.getItem(LANG_KEY) ||
    (navigator.language && navigator.language.startsWith('fr') ? 'fr' : 'en');
}

function t(key) {
  const lang = getLang();
  return (UI[lang] || UI.en)[key] || key;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyUI() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.getElementById('nav-brand').textContent        = t('navBrand');
  document.getElementById('back-label').textContent       = t('backLabel');
  document.getElementById('header-title').textContent     = t('headerTitle');
  document.getElementById('header-subtitle').textContent  = t('headerSubtitle');
  document.getElementById('lang-toggle').textContent      = lang === 'fr' ? 'EN' : 'FR';
  document.getElementById('search-input').placeholder     = t('searchPlaceholder');
  document.title = t('headerTitle') + ' — Victor Livernoche';

  // Update filter button labels
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const label = btn.dataset[lang === 'fr' ? 'labelFr' : 'labelEn'];
    if (label) btn.textContent = label;
  });
}

function matchesCategory(recipe, category) {
  if (!category) return true;
  const tags = (recipe.tags || []).map(t => t.toLowerCase());
  return (CATEGORY_TAGS[category] || []).some(t => tags.includes(t));
}

function matchesDifficulty(recipe, difficulty) {
  if (!difficulty) return true;
  return recipe.difficulty === difficulty;
}

function matchesSearch(recipe, query) {
  if (!query) return true;
  const lang = getLang();
  const haystack = [
    recipe.title,
    recipe.titleFr,
    lang === 'fr' ? recipe.descriptionFr : recipe.description,
    ...(recipe.tags || [])
  ].filter(Boolean).join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).every(word => haystack.includes(word));
}

function renderCard(recipe) {
  const lang = getLang();
  const title = (lang === 'fr' && recipe.titleFr) ? recipe.titleFr : recipe.title;
  const desc  = (lang === 'fr' && recipe.descriptionFr) ? recipe.descriptionFr : recipe.description;
  const tags  = (recipe.tags || []).map(tag => `<span class="recipe-tag">${escHtml(tag)}</span>`).join('');

  return `
    <a href="recipe.html?slug=${encodeURIComponent(recipe.slug)}" class="recipe-card">
      ${recipe.image ? `<img class="recipe-card-image" src="${escHtml(recipe.image)}" alt="${escHtml(title)}" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${escHtml(title)}</h3>
        ${desc ? `<p class="recipe-card-desc">${escHtml(desc)}</p>` : ''}
        <div class="recipe-card-meta">
          ${recipe.time       ? `<span><i class="fas fa-clock"></i> ${escHtml(recipe.time)}</span>` : ''}
          ${recipe.difficulty ? `<span><i class="fas fa-signal"></i> ${escHtml(recipe.difficulty)}</span>` : ''}
        </div>
        ${tags ? `<div class="recipe-tags">${tags}</div>` : ''}
      </div>
    </a>`;
}

function applyFilters() {
  const gallery = document.getElementById('recipes-gallery');
  const filtered = allRecipes.filter(r =>
    matchesCategory(r, activeCategory) &&
    matchesDifficulty(r, activeDifficulty) &&
    matchesSearch(r, searchQuery)
  );

  if (filtered.length === 0) {
    gallery.innerHTML = `<p class="no-results">${t('noResults')}</p>`;
  } else {
    gallery.innerHTML = filtered.map(renderCard).join('');
  }
}

async function render() {
  const gallery = document.getElementById('recipes-gallery');
  try {
    const resp = await fetch('data/index.json');
    if (!resp.ok) throw new Error();
    const recipes = await resp.json();
    allRecipes = recipes.filter(r => r.status !== 'on-hold');
    if (allRecipes.length === 0) {
      gallery.innerHTML = `<p class="no-recipes">${t('noRecipes')}</p>`;
    } else {
      applyFilters();
    }
  } catch {
    gallery.innerHTML = `<p class="no-recipes">${t('error')}</p>`;
  }
}

// Filter button clicks
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const filterType = btn.dataset.filter;
    const value = btn.dataset.value;

    // Deactivate siblings, activate this
    document.querySelectorAll(`.filter-btn[data-filter="${filterType}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (filterType === 'category')   activeCategory   = value;
    if (filterType === 'difficulty') activeDifficulty = value;
    applyFilters();
  });
});

// Search input
let searchTimer;
document.getElementById('search-input').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value.trim();
    applyFilters();
  }, 200);
});

// Language toggle
document.getElementById('lang-toggle').addEventListener('click', () => {
  const next = getLang() === 'en' ? 'fr' : 'en';
  localStorage.setItem(LANG_KEY, next);
  applyUI();
  applyFilters();
});

applyUI();
render();

// =========================================
// Dark / Light Mode Toggle
// =========================================
(function initThemeToggle() {
  const themeToggleBtn = document.getElementById('theme-toggle');
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
      if (!document.getElementById('light-blobs')) {
        document.body.appendChild(blobContainer);
      }
      if (themeToggleBtn) {
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
      }
    } else {
      document.body.classList.remove('light-mode');
      const blobs = document.getElementById('light-blobs');
      if (blobs) blobs.remove();
      if (themeToggleBtn) {
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
      }
    }
    localStorage.setItem('theme', mode);
  }

  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.body.classList.contains('light-mode') ? 'light' : 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
})();
