// Arayüzdeki Türkçe metinlerden İngilizce karşılığı olmayanları listeler: node scripts/i18n-check.mjs
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const files = []; const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f) && !p.includes('/i18n/')) files.push(p); } }; walk('src');
const found = new Set();
const re = [
  /\b(?:title|label|text|hint|placeholder|emptyLabel|subtitle|ok|message)=["']([^"'{}]{2,})["']/g,
  /\b(?:t|toast|setError|ask|ErrorBox)\(\s*'((?:[^'\\]|\\.)+)'/g,
  /<(?:Txt|H1|H2|Eyebrow)[^>]*>([^<{}]{2,})<\//g,
  /'((?:[^'\\]|\\.)*)'/g
];
for (const f of files) { const s = fs.readFileSync(f, 'utf8'); for (const r of re) for (const m of s.matchAll(r)) { const g = m[1]; if (g && /[A-Za-zÇĞİÖŞÜçğıöşü]{2}/.test(g) && !g.startsWith('/') && !/^[\w./@-]+$/.test(g)) found.add(g.trim().replace(/\\'/g, "'")); } }
const src = fs.readFileSync('src/i18n/en.ts', 'utf8').replace(/export const HasadimEn: [^\n]*? = \(\(\) => \{/, 'export const HasadimEn = (() => {');
fs.writeFileSync('/tmp/en.mjs', src); fs.writeFileSync('/tmp/extra.mjs', fs.readFileSync('src/i18n/extra.ts', 'utf8').replace(': Record<string, string>', ''));
const { HasadimEn } = await import(pathToFileURL('/tmp/en.mjs')); const { extraEn } = await import(pathToFileURL('/tmp/extra.mjs'));
const words = { ...HasadimEn.words, ...extraEn };
const missing = [...found].filter(x => !(x in words) && !HasadimEn.patterns.some(([r]) => r.test(x)) && /[çğıöşüÇĞİÖŞÜ]|\b(ve|ile|bir|için|yok|var|gör|ilan|sil|seç|ekle|yaz|kayıt|teklif|mesaj|fiyat|konum|arama|hesap|giriş)/i.test(x));
console.log(missing.length); console.log(missing.sort().join('\n'));
