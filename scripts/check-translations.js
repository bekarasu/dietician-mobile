#!/usr/bin/env node
// Checks the bundled translations in src/i18n/locales: every language has the
// same keys as English, with the same {{placeholders}}, and no empty text.
// The typecheck already fails on a key missing from Turkish; this also catches
// extra keys and placeholder mistakes. Run with `npm run i18n:check`.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const source = 'en';
// Data-driven namespaces that exist only in some languages.
const optionalNamespaces = new Set(['countries']);

function flatten(tree, prefix = '', into = {}) {
  for (const [key, value] of Object.entries(tree)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      into[fullKey] = value;
    } else {
      flatten(value, fullKey, into);
    }
  }
  return into;
}

function load(language) {
  const dir = path.join(root, language);
  const texts = {};
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) {
    const namespace = path.basename(file, '.json');
    if (optionalNamespaces.has(namespace)) {
      continue;
    }
    Object.assign(texts, flatten(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')), namespace));
  }
  return texts;
}

const placeholders = (text) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]).sort().join(',');

const languages = fs.readdirSync(root).filter((name) => fs.statSync(path.join(root, name)).isDirectory());
const english = load(source);
const problems = [];

for (const [key, text] of Object.entries(english)) {
  if (!text.trim()) {
    problems.push(`${source}: ${key} is empty`);
  }
}

for (const language of languages.filter((name) => name !== source)) {
  const texts = load(language);
  for (const [key, text] of Object.entries(english)) {
    if (!(key in texts)) {
      problems.push(`${language}: missing ${key}`);
    } else if (!texts[key].trim()) {
      problems.push(`${language}: ${key} is empty`);
    } else if (placeholders(texts[key]) !== placeholders(text)) {
      problems.push(`${language}: ${key} has {{${placeholders(texts[key])}}}, English has {{${placeholders(text)}}}`);
    }
  }
  for (const key of Object.keys(texts)) {
    if (!(key in english)) {
      problems.push(`${language}: ${key} is not in English`);
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Translations OK: ${Object.keys(english).length} keys in ${languages.join(', ')}.`);
