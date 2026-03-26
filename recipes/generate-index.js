#!/usr/bin/env node
// Generates recipes/data/index.json from all recipe JSON files in recipes/data/
// Usage: node recipes/generate-index.js

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const indexPath = path.join(dataDir, 'index.json');

const files = fs.readdirSync(dataDir)
  .filter(f => f.endsWith('.json') && f !== 'index.json')
  .sort();

const index = files.map(file => {
  const recipe = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  const entry = {
    slug: recipe.slug,
    title: recipe.title,
    titleFr: recipe.titleFr,
    description: recipe.description,
    descriptionFr: recipe.descriptionFr,
    tags: recipe.tags,
    time: recipe.time,
    difficulty: recipe.difficulty,
    image: recipe.image?.replace(/^\.\.\//, ''),
    status: recipe.status ?? 'active',
  };
  // Remove undefined fields
  Object.keys(entry).forEach(k => entry[k] === undefined && delete entry[k]);
  return entry;
});

fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
console.log(`index.json updated with ${index.length} recipes.`);
