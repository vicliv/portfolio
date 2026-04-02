/* recipe.js — Single recipe page for Victor's recipe collection */

const GITHUB_REPO = 'vicliv/portfolio';
const GITHUB_BRANCH = 'main';
const LANG_KEY = 'lang';

/* ---- Quantity rounding constants ---- */
const COOK_FRACTIONS = [0, 1 / 8, 1 / 4, 1 / 3, 3 / 8, 1 / 2, 5 / 8, 2 / 3, 3 / 4, 7 / 8];
const FRAC_DISPLAY = ['', '⅛', '¼', '⅓', '⅜', '½', '⅝', '⅔', '¾', '⅞'];
const VOLUME_UNITS = new Set(['cup', 'cups', 'tbsp', 'tsp']);
const METRIC_UNITS = new Set(['g', 'kg', 'ml', 'L', 'l']);

/* ---- Volume conversions to ml ---- */
const ML_PER = { cup: 236.588, cups: 236.588, tbsp: 14.787, tsp: 4.929 };

/* ---- ml → best-fit imperial unit ---- */
function mlToImperial(ml) {
  if (ml >= ML_PER.cups * 0.25) return { qty: ml / ML_PER.cups, unit: 'cups' };
  if (ml >= ML_PER.tbsp)        return { qty: ml / ML_PER.tbsp, unit: 'tbsp' };
  return                               { qty: ml / ML_PER.tsp,  unit: 'tsp'  };
}
const UNITS_KEY = 'units'; // localStorage key

/* ---- Difficulty translations ---- */
const DIFFICULTY_FR = {
  easy:   'facile',
  medium: 'intermédiaire',
  hard:   'difficile'
};

/* ---- Tag translations (EN → FR) ---- */
const TAGS_FR = {
  breakfast: 'déjeuner', brunch: 'brunch', lunch: 'dîner', dinner: 'souper',
  dessert: 'dessert', savory: 'salé', spicy: 'épicé', vegetarian: 'végétarien',
  quick: 'rapide', baking: 'pâtisserie', beef: 'bœuf', chicken: 'poulet',
  fish: 'poisson', salmon: 'saumon', eggs: 'œufs', french: 'français',
  italian: 'italien', thai: 'thaïlandais', asian: 'asiatique', korean: 'coréen',
  pizza: 'pizza', noodles: 'nouilles', crepes: 'crêpes', steak: 'steak',
  potato: 'pomme de terre', chocolate: 'chocolat', cake: 'gâteau',
  cookies: 'biscuits', appetizer: 'entrée', 'side dish': 'accompagnement',
  'fried chicken': 'poulet frit', 'pain doré': 'pain doré'
};

/* ---- UI strings ---- */
const UI = {
  en: {
    ingredients: 'Ingredients',
    instructions: 'Instructions',
    notes: 'Notes',
    editGithub: 'Edit on GitHub',
    allRecipes: 'All Recipes',
    backLabel: 'All Recipes',
    servings: 'servings',
    source: 'Source:',
    notFound: 'Recipe not found.',
    useMetric: 'Use metric (ml)',
    useImperial: 'Use imperial (cups)'
  },
  fr: {
    ingredients: 'Ingrédients',
    instructions: 'Instructions',
    notes: 'Notes',
    editGithub: 'Modifier sur GitHub',
    allRecipes: 'Toutes les recettes',
    backLabel: 'Toutes les recettes',
    servings: 'portions',
    source: 'Source\u00a0:',
    notFound: 'Recette introuvable.',
    useMetric: 'Utiliser métrique (ml)',
    useImperial: 'Utiliser impérial (tasses)'
  }
};

/* ---- State ---- */
let currentRecipe = null;
let currentPortions = 2;
let useMetric = localStorage.getItem(UNITS_KEY) === 'metric';

/* ---- Language helpers ---- */
function getLang() {
  return localStorage.getItem(LANG_KEY) ||
    (navigator.language && navigator.language.startsWith('fr') ? 'fr' : 'en');
}

function t(key) {
  const lang = getLang();
  return (UI[lang] || UI.en)[key] || key;
}

/* ---- Quantity formatting ---- */
function snapFraction(frac) {
  let bestIdx = 0, bestDist = Math.abs(COOK_FRACTIONS[0] - frac);
  for (let i = 1; i < COOK_FRACTIONS.length; i++) {
    const d = Math.abs(COOK_FRACTIONS[i] - frac);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

function formatVolumeQty(scaled) {
  const whole = Math.floor(scaled);
  const frac = scaled - whole;
  const idx = snapFraction(frac);

  // If the fractional part is closer to 1 than to ⅞, round up to next whole
  if (COOK_FRACTIONS[idx] > 0.9) return String(whole + 1);

  const fracStr = FRAC_DISPLAY[idx];
  if (whole === 0) return fracStr || '0';
  if (!fracStr) return String(whole);
  return `${whole} ${fracStr}`;
}

function formatQuantity(quantity, unit, scaleFactor) {
  if (quantity == null) return null;
  const scaled = quantity * scaleFactor;

  if (METRIC_UNITS.has(unit)) {
    if (scaled >= 100) return String(Math.round(scaled / 5) * 5);
    if (scaled >= 10) return String(Math.round(scaled));
    return String(Math.round(scaled * 10) / 10);
  }

  if (VOLUME_UNITS.has(unit)) {
    if (useMetric) {
      // Convert to ml and round sensibly
      const ml = scaled * ML_PER[unit];
      if (ml >= 100) return String(Math.round(ml / 5) * 5);
      if (ml >= 10)  return String(Math.round(ml));
      return String(Math.round(ml * 10) / 10);
    }
    return formatVolumeQty(scaled);
  }

  // Countable whole items — round to nearest int, minimum 1
  return String(Math.max(1, Math.round(scaled)));
}

function renderIngredientItem(ing, scaleFactor) {
  const lang = getLang();
  const item = (lang === 'fr' && ing.itemFr) ? ing.itemFr : ing.item;

  if (ing.quantity == null) {
    return `<li class="ingredient-item"><span class="ingredient-qty"></span>${escHtml(item)}</li>`;
  }

  const unit = ing.unit || '';
  let qty, displayUnit;

  if (unit === 'ml' && !useMetric) {
    const imp = mlToImperial(ing.quantity * scaleFactor);
    qty = formatVolumeQty(imp.qty);
    displayUnit = imp.unit;
  } else {
    qty = formatQuantity(ing.quantity, unit, scaleFactor);
    const isVolumeUnit = VOLUME_UNITS.has(unit);
    displayUnit = (useMetric && isVolumeUnit) ? 'ml' : unit;
  }

  let qtyDisplay;
  if (!displayUnit) {
    qtyDisplay = qty;
  } else if (METRIC_UNITS.has(displayUnit) || (useMetric && VOLUME_UNITS.has(unit))) {
    qtyDisplay = `${qty}${displayUnit}`;  // "237ml", "200g"
  } else {
    qtyDisplay = `${qty} ${displayUnit}`; // "1 cup", "2 tbsp"
  }

  return `<li class="ingredient-item"><span class="ingredient-qty">${escHtml(qtyDisplay)}</span>${escHtml(item)}</li>`;
}

/* ---- DOM rendering ---- */
function renderIngredients(recipe, portions) {
  const scaleFactor = portions / recipe.defaultPortions;
  const list = document.getElementById('ingredients-list');
  const hasGroups = recipe.ingredients.some(i => i.group);

  if (hasGroups) {
    const grouped = {}, order = [];
    recipe.ingredients.forEach(ing => {
      const g = ing.group || '';
      if (!grouped[g]) { grouped[g] = []; order.push(g); }
      grouped[g].push(ing);
    });
    let html = '';
    for (const g of order) {
      if (g) html += `<li class="ingredient-group-label">${escHtml(g)}</li>`;
      html += grouped[g].map(ing => renderIngredientItem(ing, scaleFactor)).join('');
    }
    list.innerHTML = html;
  } else {
    list.innerHTML = recipe.ingredients.map(ing => renderIngredientItem(ing, scaleFactor)).join('');
  }
}

function renderSteps(recipe) {
  const lang = getLang();
  const list = document.getElementById('steps-list');
  list.innerHTML = recipe.steps.map(step => {
    const text = (lang === 'fr' && step.textFr) ? step.textFr : step.text;
    return `<li class="step-item"><span>${escHtml(text)}</span></li>`;
  }).join('');
}

function renderNotes(recipe) {
  const lang = getLang();
  const notes = (lang === 'fr' && recipe.notesFr) ? recipe.notesFr : recipe.notes;
  const el = document.getElementById('recipe-notes');
  if (notes) {
    el.innerHTML = `<h3>${t('notes')}</h3><p>${escHtml(notes)}</p>`;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

function applyUIStrings() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.getElementById('ingredients-title').textContent = t('ingredients');
  document.getElementById('instructions-title').textContent = t('instructions');
  document.getElementById('edit-label').textContent = t('editGithub');
  document.getElementById('all-recipes-label').textContent = t('allRecipes');
  document.getElementById('back-label').textContent = t('backLabel');
  document.getElementById('lang-toggle').textContent = lang === 'fr' ? 'EN' : 'FR';
  // Unit toggle label: show what clicking will switch TO
  const unitToggleLabel = document.getElementById('unit-toggle-label');
  if (unitToggleLabel) {
    unitToggleLabel.textContent = useMetric ? t('useImperial') : t('useMetric');
  }
  const unitToggleBtn = document.getElementById('unit-toggle');
  if (unitToggleBtn) {
    unitToggleBtn.classList.toggle('active', useMetric);
  }
}

function renderRecipe(recipe) {
  const lang = getLang();
  const title = (lang === 'fr' && recipe.titleFr) ? recipe.titleFr : recipe.title;

  document.title = `${title} — Victor's Recipes`;
  document.getElementById('recipe-title').textContent = title;

  // Header image
  const imgEl = document.getElementById('recipe-header-image');
  if (recipe.image) {
    imgEl.src = recipe.image;
    imgEl.alt = title;
    imgEl.style.display = 'block';
    imgEl.onerror = () => { imgEl.style.display = 'none'; };
  } else {
    imgEl.style.display = 'none';
  }

  // Portions label
  const portionLabel = (lang === 'fr' && recipe.portionLabelFr)
    ? recipe.portionLabelFr : (recipe.portionLabel || t('servings'));
  document.getElementById('portions-label').textContent = portionLabel;

  // Meta line
  const metaParts = [];
  if (recipe.time) metaParts.push(`<span><i class="fas fa-clock"></i> ${escHtml(recipe.time)}</span>`);
  if (recipe.difficulty) {
    const diffLabel = lang === 'fr' ? (DIFFICULTY_FR[recipe.difficulty] || recipe.difficulty) : recipe.difficulty;
    metaParts.push(`<span><i class="fas fa-signal"></i> ${escHtml(diffLabel)}</span>`);
  }
  if (recipe.tags && recipe.tags.length) {
    const tagHtml = recipe.tags.map(tag => {
      const label = lang === 'fr' ? (TAGS_FR[tag.toLowerCase()] || tag) : tag;
      return `<span class="recipe-tag-meta">${escHtml(label)}</span>`;
    }).join('');
    metaParts.push(`<span class="recipe-tag-group">${tagHtml}</span>`);
  }
  document.getElementById('recipe-meta').innerHTML = metaParts.join('');

  renderIngredients(recipe, currentPortions);
  renderSteps(recipe);
  renderNotes(recipe);

  // Edit on GitHub link
  const editPath = recipe.editPath || `recipes/data/${recipe.slug}.json`;
  document.getElementById('edit-link').href =
    `https://github.com/${GITHUB_REPO}/edit/${GITHUB_BRANCH}/${editPath}`;

  // Source
  const sourceEl = document.getElementById('recipe-source');
  sourceEl.innerHTML = recipe.source
    ? `${t('source')} <a href="${escAttr(recipe.source)}" target="_blank" rel="noopener noreferrer">${escHtml(recipe.source)}</a>`
    : '';
}

function updatePortions(delta) {
  const next = Math.max(1, Math.min(20, currentPortions + delta));
  if (next === currentPortions) return;
  currentPortions = next;
  document.getElementById('portions-display').textContent = currentPortions;
  renderIngredients(currentRecipe, currentPortions);
}

/* ---- Escape helpers ---- */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escAttr(str) { return escHtml(str); }

/* ---- Init ---- */
async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) {
    document.getElementById('recipe-title').textContent = t('notFound');
    return;
  }

  let recipe;
  try {
    const resp = await fetch(`data/${encodeURIComponent(slug)}.json`);
    if (!resp.ok) throw new Error();
    recipe = await resp.json();
  } catch {
    document.getElementById('recipe-title').textContent = t('notFound');
    return;
  }

  currentRecipe = recipe;
  currentPortions = recipe.defaultPortions || 2;
  document.getElementById('portions-display').textContent = currentPortions;

  applyUIStrings();
  renderRecipe(recipe);

  document.getElementById('portions-dec').addEventListener('click', () => updatePortions(-1));
  document.getElementById('portions-inc').addEventListener('click', () => updatePortions(+1));

  document.getElementById('unit-toggle').addEventListener('click', () => {
    useMetric = !useMetric;
    localStorage.setItem(UNITS_KEY, useMetric ? 'metric' : 'imperial');
    applyUIStrings();
    renderIngredients(currentRecipe, currentPortions);
  });

  document.getElementById('lang-toggle').addEventListener('click', () => {
    const next = getLang() === 'en' ? 'fr' : 'en';
    localStorage.setItem(LANG_KEY, next);
    applyUIStrings();
    renderRecipe(recipe);
  });
}

// Set initial lang state before async work
(function () {
  const lang = getLang();
  document.getElementById('lang-toggle').textContent = lang === 'fr' ? 'EN' : 'FR';
  document.documentElement.lang = lang;
})();

init();

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
