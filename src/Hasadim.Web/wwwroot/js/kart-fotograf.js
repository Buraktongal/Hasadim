'use strict';

// İlan kartlarında fotoğraflar arasında gezinme:
//  - Fare ile: görselin üzerinde sağa/sola gezdikçe sıradaki fotoğraf görünür (alan fotoğraf sayısı kadar dilime bölünür).
//  - Dokunmatik ekranda: görseli sağa/sola kaydırınca sonraki/önceki fotoğraf gelir (kaydırma, karta tıklama sayılmaz).
//  - Altta kaç fotoğraf olduğunu ve hangisinde olunduğunu gösteren noktalar çıkar.
window.CardPhotos = (() => {
    function attach(media, img, photos) {
        const urls = (photos || []).map(p => p.photoUrl).filter(Boolean);
        if (!media || !img || urls.length < 2) return;
        const n = Math.min(urls.length, 6);
        media.classList.add('cp-media');
        const dots = document.createElement('span');
        dots.className = 'cp-dots';
        dots.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < n; i++) dots.append(document.createElement('i'));
        media.append(dots);
        let index = 0, loaded = false;
        const set = i => {
            i = Math.max(0, Math.min(n - 1, i));
            if (i === index) return;
            index = i;
            img.src = urls[i];
            [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
        };
        dots.children[0].classList.add('on');
        // İlk dokunuşta/üzerine gelişte diğer fotoğrafları önceden indir ki geçiş anında olsun.
        const preload = () => { if (loaded) return; loaded = true; for (const u of urls.slice(1, n)) { const p = new Image(); p.decoding = 'async'; p.src = u; } };

        media.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') preload(); });
        media.addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse') return;
            const r = media.getBoundingClientRect();
            set(Math.floor(((e.clientX - r.left) / r.width) * n));
        });
        media.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') set(0); });

        let x0 = null, y0 = null, swiped = false;
        media.addEventListener('touchstart', e => { preload(); x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; swiped = false; }, { passive: true });
        media.addEventListener('touchmove', e => {
            if (x0 === null) return;
            const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
            if (!swiped && Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.4) { swiped = true; set(index + (dx < 0 ? 1 : -1)); }
        }, { passive: true });
        media.addEventListener('touchend', () => { x0 = null; });
        // Kaydırma hareketi kartın bağlantısını açmasın.
        media.addEventListener('click', e => { if (swiped) { e.preventDefault(); e.stopPropagation(); swiped = false; } }, true);
    }
    return { attach };
})();
