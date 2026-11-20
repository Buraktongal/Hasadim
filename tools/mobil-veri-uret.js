// Web uygulamasındaki ortak verileri mobil uygulamaya aktarır (tek kaynak: web dosyaları).
// Kullanım: node tools/mobil-veri-uret.js
//  - ürün kataloğu, çeşitler, hasat takvimi   → mobile/src/data/catalog.json
//  - ürün simgeleri (SVG şekilleri)            → mobile/src/data/icons.json
//  - il ve ilçeler                              → mobile/src/data/cities.json
//  - il sınırları (harita)                      → mobile/src/data/provinces.json
//  - İngilizce sözlük                           → mobile/src/i18n/en.ts
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const web = path.join(__dirname, '..', 'src', 'Hasadim.Web', 'wwwroot');
const out = path.join(__dirname, '..', 'mobile', 'src');
const read = f => fs.readFileSync(path.join(web, f), 'utf8').replace(/^﻿/, '');
const write = (f, text) => { fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); fs.writeFileSync(path.join(out, f), text); console.log('yazıldı:', f, Math.round(text.length / 1024) + ' KB'); };

const sandbox = { window: {}, document: { createElementNS() {}, createElement() { return {}; } } };
vm.createContext(sandbox);
vm.runInContext(read('js/fruit-varieties.js') + '\n;window.__fruits = typeof fruitVarieties !== "undefined" ? fruitVarieties : {};', sandbox);
vm.runInContext(read('js/product-catalog.js'), sandbox);
vm.runInContext(read('js/fruit-icons.js').replace('return { node, names', 'return { shapes, aliases, node, names'), sandbox);
vm.runInContext(read('js/turkiye-iller.js'), sandbox);

const cat = sandbox.window.HasadimCatalog;
const catalog = {
    categories: cat.categories.map(c => ({ ...c, products: [...c.products] })),
    varieties: Object.fromEntries(cat.categories.flatMap(c => c.products).map(p => [p, [...cat.varieties(p)]])),
    seasons: cat.seasons,
    varietySeasons: cat.varietySeasons
};
write('data/catalog.json', JSON.stringify(catalog));

const icons = sandbox.window.FruitIcons;
write('data/icons.json', JSON.stringify({ shapes: icons.shapes, aliases: icons.aliases }));

const cities = JSON.parse(read('data/iller-ilceler.json')).data
    .map(c => [c.name, c.districts.map(d => d.name).sort((a, b) => a.localeCompare(b, 'tr'))])
    .sort((a, b) => a[0].localeCompare(b[0], 'tr'));
write('data/cities.json', JSON.stringify(cities));

const geo = sandbox.window.TurkiyeIller;
write('data/provinces.json', JSON.stringify(geo));

const en = read('js/i18n-en.js').replace('window.HasadimEn = (() => {', 'export const HasadimEn: { words: Record<string, string>; patterns: [RegExp, string | ((m: RegExpMatchArray, t: (s: string) => string) => string)][] } = (() => {');
write('i18n/en.ts', '/* eslint-disable */\n// @ts-nocheck — tools/mobil-veri-uret.js ile web sözlüğünden üretilir; elle düzenlemeyin.\n' + en.replace(/^'use strict';\s*/, ''));
