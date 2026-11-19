'use strict';

// Türkçe / İngilizce arayüz. Sayfalar Türkçe yazılır; İngilizce seçilince
// metinler sözlükten (i18n-en.js) çevrilir. Kullanıcıların yazdığı içerik
// (ilan başlığı, açıklama, mesaj) translate="no" ile işaretlenir ve çevrilmez.
window.HasadimI18n = (() => {
    const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
    const SKIP = 'script, style, textarea, code, pre, [translate="no"], [data-no-i18n]';
    const texts = new WeakMap();   // metin düğümü → { src, out }
    const attrs = new WeakMap();   // öğe → { [ad]: { src, out } }
    let lang = 'tr';
    let dict = null, patterns = [];
    let observer = null;
    let loading = null;

    const current = () => window.HasadimTheme?.language() || 'tr';

    function load() {
        if (dict) return Promise.resolve();
        if (!loading) loading = new Promise(resolve => {
            const script = document.createElement('script');
            script.src = '/js/i18n-en.js';
            script.onload = () => { dict = window.HasadimEn?.words || {}; patterns = window.HasadimEn?.patterns || []; resolve(); };
            script.onerror = () => { dict = {}; resolve(); };
            document.head.append(script);
        });
        return loading;
    }

    // Tam eşleşme, sonra kalıplar (sayı içeren metinler için).
    function translate(text) {
        const t = text.replace(/\s+/g, ' ').trim();
        if (!t || !dict) return null;
        if (Object.hasOwn(dict, t)) return dict[t];
        for (const [re, out] of patterns) {
            const m = t.match(re);
            if (m) return typeof out === 'function' ? out(m, s => translate(s) ?? s) : t.replace(re, out);
        }
        return null;
    }

    const skipped = node => {
        const el = node.nodeType === 1 ? node : node.parentElement;
        return !el || Boolean(el.closest?.(SKIP));
    };

    function textNode(node) {
        if (skipped(node)) return;
        let state = texts.get(node);
        if (!state || node.nodeValue !== state.out) state = { src: node.nodeValue, out: node.nodeValue };
        if (lang === 'en') {
            const t = translate(state.src);
            const lead = state.src.match(/^\s*/)[0], trail = state.src.match(/\s*$/)[0];
            state.out = t === null ? state.src : lead + t + trail;
        } else state.out = state.src;
        texts.set(node, state);
        if (node.nodeValue !== state.out) node.nodeValue = state.out;
    }

    function element(el) {
        if (skipped(el)) return;
        let map = attrs.get(el);
        for (const name of ATTRS) {
            const value = el.getAttribute?.(name);
            if (value === null || value === undefined) continue;
            map ||= {};
            let state = map[name];
            if (!state || value !== state.out) state = { src: value, out: value };
            state.out = lang === 'en' ? (translate(state.src) ?? state.src) : state.src;
            map[name] = state;
            if (value !== state.out) el.setAttribute(name, state.out);
        }
        if (map) attrs.set(el, map);
    }

    function walk(root) {
        if (!root) return;
        if (root.nodeType === 3) { textNode(root); return; }
        if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
        if (root.nodeType === 1) { if (skipped(root)) return; element(root); }
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: n => (n.nodeType === 1 && n.matches?.(SKIP)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        });
        for (let n = walker.nextNode(); n; n = walker.nextNode()) n.nodeType === 3 ? textNode(n) : element(n);
    }

    let titleSource = null;
    function title() {
        if (titleSource === null || (document.title !== titleSource && document.title !== translatedTitle())) titleSource = document.title;
        document.title = lang === 'en' ? translatedTitle() : titleSource;
    }
    function translatedTitle() {
        const [page, ...rest] = String(titleSource).split(' — ');
        return [translate(page) ?? page, ...rest].join(' — ');
    }

    function watch() {
        if (observer || typeof MutationObserver !== 'function') return;
        observer = new MutationObserver(records => {
            for (const r of records) {
                if (r.type === 'characterData') textNode(r.target);
                else if (r.type === 'attributes') element(r.target);
                else for (const n of r.addedNodes) walk(n);
            }
        });
        observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }

    async function setLanguage(next) {
        lang = next === 'en' ? 'en' : 'tr';
        document.documentElement.lang = lang;
        if (lang === 'en') await load();
        if (!document.body) return;
        walk(document.body);
        title();
        if (lang === 'en') watch();
    }

    async function start() {
        if (current() === 'en') await setLanguage('en');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else void start();

    return { setLanguage, translate: text => (lang === 'en' ? translate(text) ?? text : text), lang: () => lang };
})();
