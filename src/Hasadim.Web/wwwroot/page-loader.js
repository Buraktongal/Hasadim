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

        await loadPageScript('/locations.js');
        await loadPageScript('/fruit-varieties.js');
        await loadPageScript('/navigation.js');
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