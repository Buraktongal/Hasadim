'use strict';

(async () => {
    const container = document.querySelector('#siteFooter');

    if (!container) return;

    try {
        const response = await fetch('/footer.html', {
            cache: 'no-cache'
        });

        if (!response.ok) {
            throw new Error('Footer yüklenemedi.');
        }

        // Yalnızca uygulamamızdaki sabit HTML dosyası yükleniyor.
        container.innerHTML = await response.text();

        const year = container.querySelector('[data-footer-year]');

        if (year) {
            year.textContent = String(new Date().getFullYear());
        }

        // Ortak üst menü bulunmayan sayfalarda bu bağlantıyı gösterme.
        if (!document.querySelector('#siteLayout')) {
            container.querySelector('a[href="#siteLayout"]')?.remove();
        }
    } catch (error) {
        console.error(error);

        const message = document.createElement('p');
        message.className = 'footer-load-error';
        message.textContent =
            'Alt bölüm yüklenemedi. Sayfayı yenileyerek tekrar deneyin.';

        container.replaceChildren(message);
    }
})();