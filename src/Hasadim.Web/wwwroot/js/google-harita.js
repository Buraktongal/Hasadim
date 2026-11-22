'use strict';

// Google Haritalar gömme görünümü (API anahtarı gerekmez).
//  GoogleMap.embed(box, { lat, lon, zoom })    → koordinattaki noktayı iğneyle gösterir.
//  GoogleMap.embed(box, { place, zoom })       → yer adını (ör. "Turgutlu, Manisa") gösterir; yaklaşık konum için.
//  GoogleMap.parse(text)                        → Google Haritalar bağlantısından veya "38.49, 27.70" yazısından koordinat çıkarır.
window.GoogleMap = (() => {
    function embed(box, { lat, lon, place, zoom = 13, title = 'Google Haritalar' }) {
        const q = place ? encodeURIComponent(place + ', Türkiye') : lat.toFixed(6) + ',' + lon.toFixed(6);
        let frame = box.querySelector('iframe.gmap');
        if (!frame) {
            frame = document.createElement('iframe');
            frame.className = 'gmap';
            frame.loading = 'lazy';
            frame.referrerPolicy = 'no-referrer-when-downgrade';
            frame.setAttribute('allowfullscreen', '');
            box.replaceChildren(frame);
        }
        frame.title = title;
        const src = 'https://maps.google.com/maps?q=' + q + '&z=' + zoom + '&hl=tr&output=embed';
        if (frame.src !== src) frame.src = src;
        return frame;
    }

    function parse(text) {
        const s = String(text || '').trim();
        if (!s) return null;
        const patterns = [
            /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,              // .../data=!3d38.49!4d27.70
            /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,                   // .../@38.49,27.70,15z
            /[?&](?:q|query|ll|destination|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i,
            /^(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)$/    // 38.49, 27.70
        ];
        for (const p of patterns) {
            const m = p.exec(s);
            if (!m) continue;
            const lat = Number(m[1].replace(',', '.')), lon = Number(m[2].replace(',', '.'));
            if (Number.isFinite(lat) && Number.isFinite(lon)) return [Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5];
        }
        return null;
    }

    return { embed, parse };
})();
