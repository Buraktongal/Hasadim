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
        await loadPageScript('/js/navigation.js');
        await loadPageScript('/js/phone-input.js');
        await loadPageScript('/app.js');
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