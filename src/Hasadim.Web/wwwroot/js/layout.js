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

    // Her sayfada ortak: arama önerileri (ürün ve satıcı) ve özel görünümlü seçim kutuları.
    for (const src of ['/js/arama-onerileri.js', '/js/searchable-select.js']) {
        if (document.querySelector('script[src="' + src + '"]')) continue;
        if (src.includes('searchable') && window.SearchableSelect) continue;
        const script = document.createElement('script');
        script.src = src;
        script.defer = true;
        document.head.append(script);
    }
})();

window.HasadimLoading?.track(window.layoutReady);
