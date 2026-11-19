'use strict';

// Yapışkan yan sütunlar (Detaylı arama, ilan detayının sağ sütunu, hesap menüsü).
// Sütun ekrandan kısaysa üstte sabit kalır. Uzunsa sayfayla birlikte kayar:
// aşağı inerken alt ucu görünene kadar kayıp altta, yukarı çıkarken üst ucu
// görünene kadar kayıp üstte durur. Böylece en alttaki alanlar ve "Sonuçları
// göster" düğmesi her zaman erişilebilir.
(() => {
    const GAP = 12;
    const SELECTOR = '.market-sidebar, .detail-side, .account-sidebar';
    const items = new Map();   // öğe → şu anki top değeri
    let lastY = window.scrollY, frame = 0;

    function sticky(el) {
        return el.isConnected && el.offsetParent !== null && getComputedStyle(el).position === 'sticky';
    }

    function update() {
        frame = 0;
        const y = window.scrollY, delta = y - lastY;
        lastY = y;
        const viewport = window.innerHeight;
        for (const [el, top] of items) {
            if (!sticky(el)) { el.style.top = ''; continue; }
            const minTop = Math.min(GAP, viewport - el.offsetHeight - GAP);
            const next = Math.max(minTop, Math.min(GAP, top - delta));
            if (next !== top || !el.style.top) {
                items.set(el, next);
                el.style.top = next + 'px';
            }
        }
    }

    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;

    function scan() {
        for (const el of document.querySelectorAll(SELECTOR)) {
            if (items.has(el)) continue;
            items.set(el, GAP);
            resize?.observe(el);
        }
        for (const el of items.keys()) if (!el.isConnected) { items.delete(el); resize?.unobserve(el); }
        schedule();
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // İlan detayı ve görünümler sonradan çizildiği için yeni sütunlar da yakalanır.
    let scanTimer = 0;
    new MutationObserver(() => { clearTimeout(scanTimer); scanTimer = setTimeout(scan, 80); })
        .observe(document.body, { childList: true, subtree: true });
    scan();
})();
