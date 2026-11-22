'use strict';

// Pazar yeri ve ilan sayfasının betikleri. Hepsi aynı anda indirilir (önceden
// tek tek, sırayla indiriliyordu) ve listedeki sırayla çalıştırılır.
const pageScripts = [
    '/js/locations.js',
    '/js/fruit-varieties.js',
    '/js/product-catalog.js',
    '/js/navigation.js',
    '/js/return-path.js',
    '/js/phone-input.js',
    '/js/listing-editor.js',
    '/js/fruit-icons.js',
    '/js/listing-category.js',
    '/js/mini-map.js',
    '/js/location-picker.js',
    '/js/listing-wizard.js',
    '/js/listing-photos.js',
    '/js/confirm-dialog.js',
    '/js/market-catalog.js',
    '/js/listing-workflow.js',
    '/js/market-presentation.js',
    '/js/kart-fotograf.js',
    '/js/tarih-tekerlek.js',
    '/js/market-tools.js',
    '/js/messages.js',
    '/js/message-notifications.js',
    '/js/searchable-select.js',
    '/js/hasadim-api.js',
    '/js/offer-dialog.js',
    '/js/saved-search.js',
    '/js/notification-bell.js',
    '/js/menu-settings.js',
    '/js/sticky-side.js',
    '/js/app.js',
    '/js/camera-capture.js'
];

function loadPageScript(source) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');

        script.src = source;
        script.async = false; // eklenme sırasıyla çalışsın
        script.onload = resolve;
        script.onerror = () => {
            reject(new Error(source + ' yüklenemedi.'));
        };

        document.head.append(script);
    });
}

// Ortak menü gelirken betikler de inmeye başlasın.
for (const source of pageScripts) {
    const hint = document.createElement('link');
    hint.rel = 'preload';
    hint.as = 'script';
    hint.href = source;
    document.head.append(hint);
}

const pageScriptsReady = (async () => {
    try {
        await window.layoutReady;
        await Promise.all(pageScripts.map(loadPageScript));
    } catch (error) {
        console.error(error);

        const message = document.createElement('p');
        message.textContent =
            'Sayfa hazırlanamadı. ' + error.message;

        message.setAttribute('role', 'alert');

        document.querySelector('#siteLayout')
            ?.append(message);
    }
})();

window.HasadimLoading?.track(pageScriptsReady);
