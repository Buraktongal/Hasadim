'use strict';

window.layoutReady = (async () => {
    const container = document.querySelector('#siteLayout');

    if (!container) {
        throw new Error('Ortak menü alanı bulunamadı.');
    }

    const response = await fetch('/html/layout.html', {
        cache: 'no-cache'
    });

    if (!response.ok) {
        throw new Error('Ortak menü yüklenemedi.');
    }

    container.innerHTML = await response.text();

    // Arama önerileri (ürün ve satıcı) her sayfada ortak arama kutusuna eklenir.
    if (!document.querySelector('script[src="/js/arama-onerileri.js"]')) {
        const script = document.createElement('script');
        script.src = '/js/arama-onerileri.js';
        script.defer = true;
        document.head.append(script);
    }
})();

window.HasadimLoading?.track(window.layoutReady);
