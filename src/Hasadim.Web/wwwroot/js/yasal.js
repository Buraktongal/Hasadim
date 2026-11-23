// Yasal sayfalardaki şirket bilgileri tek yerden (/data/sirket.json) doldurulur.
// Doldurulmamış (köşeli parantezli) alanlar yayından önce fark edilsin diye vurgulanır.
(() => {
    'use strict';
    const fill = info => {
        document.querySelectorAll('[data-sirket]').forEach(el => {
            const value = String(info[el.dataset.sirket] ?? '').trim();
            el.textContent = value || '—';
            el.classList.toggle('legal-missing', !value || value.startsWith('['));
            if (el.dataset.sirket === 'eposta' && value.includes('@') && !el.closest('a')) {
                const a = document.createElement('a'); a.href = 'mailto:' + value; a.textContent = value;
                el.replaceChildren(a);
            }
        });
        const here = location.pathname;
        document.querySelectorAll('.legal-nav a').forEach(a => { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });
    };
    const start = () => fetch('/data/sirket.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(fill);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
