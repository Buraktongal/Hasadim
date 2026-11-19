'use strict';

function loadPageScript(source) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');

        script.src = source;
        script.onload = resolve;
        script.onerror = () => {
            reject(new Error(source + ' yüklenemedi.'));
        };

        document.head.append(script);
    });
}

(async () => {
    try {
        await window.layoutReady;

        await loadPageScript('/js/locations.js');
        await loadPageScript('/js/fruit-varieties.js');
        await loadPageScript('/js/product-catalog.js');
        await loadPageScript('/js/navigation.js');
        await loadPageScript('/js/return-path.js');
        await loadPageScript('/js/phone-input.js');
        await loadPageScript('/js/listing-editor.js');
        await loadPageScript('/js/fruit-icons.js');
        await loadPageScript('/js/listing-category.js');
        await loadPageScript('/js/mini-map.js');
        await loadPageScript('/js/location-picker.js');
        await loadPageScript('/js/listing-wizard.js');
        await loadPageScript('/js/listing-photos.js');
        await loadPageScript('/js/confirm-dialog.js');
        await loadPageScript('/js/market-catalog.js');
        await loadPageScript('/js/listing-workflow.js');
        await loadPageScript('/js/market-presentation.js');
        await loadPageScript('/js/market-tools.js');
        await loadPageScript('/js/messages.js');
        await loadPageScript('/js/message-notifications.js');
        await loadPageScript('/js/searchable-select.js');
        await loadPageScript('/js/hasadim-api.js');
        await loadPageScript('/js/offer-dialog.js');
        await loadPageScript('/js/saved-search.js');
        await loadPageScript('/js/notification-bell.js');
        await loadPageScript('/js/menu-settings.js');
        await loadPageScript('/js/app.js');
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
