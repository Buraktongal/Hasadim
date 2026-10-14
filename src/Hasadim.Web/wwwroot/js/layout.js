'use strict';

window.layoutReady = (async () => {
    const container = document.querySelector('#siteLayout');

    if (!container) {
        throw new Error('Ortak menü alanı bulunamadı.');
    }

    const response = await fetch('/layout.html', {
        cache: 'no-cache'
    });

    if (!response.ok) {
        throw new Error('Ortak menü yüklenemedi.');
    }

    container.innerHTML = await response.text();
})();