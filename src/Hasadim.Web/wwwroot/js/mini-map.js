'use strict';

// Hafif harita: OpenStreetMap karolarını gösterir; sürükleme, yakınlaştırma,
// işaretçi ve kümeleme destekler. Dış kütüphane kullanmaz.
// Karolar: © OpenStreetMap katkıcıları (https://www.openstreetmap.org/copyright).
window.HasadimMap = (() => {
    const TILE = 256;
    const TILE_URL = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const MIN_ZOOM = 5, MAX_ZOOM = 17;
    // Türkiye'nin yaklaşık sınırları ve merkezi.
    const TURKEY = { center: [39.0, 35.2], bounds: [[35.8, 25.6], [42.2, 44.8]] };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const project = (lat, lon, z) => {
        const s = TILE * 2 ** z;
        const sin = Math.sin(clamp(lat, -85, 85) * Math.PI / 180);
        return [(lon + 180) / 360 * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s];
    };
    const unproject = (x, y, z) => {
        const s = TILE * 2 ** z;
        const lon = x / s * 360 - 180;
        const n = Math.PI - 2 * Math.PI * y / s;
        return [180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lon];
    };
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

    function create(root, options = {}) {
        if (!root || typeof root.getBoundingClientRect !== 'function') return null;
        let [lat, lon] = options.center || TURKEY.center;
        let zoom = options.zoom || 6;
        let points = [];
        let renderPoint = null;
        let single = null;
        root.classList.add('hmap');
        root.replaceChildren();
        root.tabIndex = 0;
        const tiles = el('div', 'hmap-tiles');
        const layer = el('div', 'hmap-markers');
        const controls = el('div', 'hmap-controls');
        const plus = el('button', 'hmap-zoom', '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'Yakınlaştır');
        const minus = el('button', 'hmap-zoom', '−'); minus.type = 'button'; minus.setAttribute('aria-label', 'Uzaklaştır');
        controls.append(plus, minus);
        const credit = el('div', 'hmap-credit');
        const link = el('a', '', '© OpenStreetMap katkıcıları');
        link.href = 'https://www.openstreetmap.org/copyright'; link.target = '_blank'; link.rel = 'noopener noreferrer';
        credit.append(link);
        const hint = el('div', 'hmap-hint', 'Yakınlaştırmak için Ctrl + tekerlek veya + düğmesini kullan');
        hint.hidden = true;
        root.append(tiles, layer, controls, credit, hint);

        const size = () => { const r = root.getBoundingClientRect(); return [Math.max(1, r.width), Math.max(1, r.height)]; };
        const origin = () => { const [w, h] = size(); const [cx, cy] = project(lat, lon, zoom); return [cx - w / 2, cy - h / 2]; };
        const toScreen = (plat, plon) => { const [ox, oy] = origin(); const [x, y] = project(plat, plon, zoom); return [x - ox, y - oy]; };

        function drawTiles() {
            const [w, h] = size();
            const [ox, oy] = origin();
            const n = 2 ** zoom;
            const wanted = new Map();
            for (let tx = Math.floor(ox / TILE); tx <= Math.floor((ox + w) / TILE); tx++) {
                for (let ty = Math.floor(oy / TILE); ty <= Math.floor((oy + h) / TILE); ty++) {
                    if (ty < 0 || ty >= n) continue;
                    const wx = ((tx % n) + n) % n;
                    wanted.set(`${zoom}/${wx}/${ty}@${tx}`, [tx, ty, wx]);
                }
            }
            for (const img of Array.from(tiles.children)) if (!wanted.has(img.dataset.key)) img.remove();
            const have = new Set(Array.from(tiles.children).map(i => i.dataset.key));
            for (const [key, [tx, ty, wx]] of wanted) {
                let img;
                if (!have.has(key)) {
                    img = el('img', 'hmap-tile');
                    img.alt = ''; img.draggable = false; img.decoding = 'async';
                    img.dataset.key = key;
                    img.onerror = () => { img.style.visibility = 'hidden'; };
                    img.src = TILE_URL(zoom, wx, ty);
                    tiles.append(img);
                } else img = tiles.querySelector(`[data-key="${CSS.escape(key)}"]`);
                img.style.transform = `translate(${Math.round(tx * TILE - ox)}px, ${Math.round(ty * TILE - oy)}px)`;
            }
        }

        // Yakın işaretçiler küme olarak gösterilir; kümeye basınca yakınlaşır.
        function drawMarkers() {
            layer.replaceChildren();
            const [w, h] = size();
            const all = single ? [...points, single] : points;
            const cell = zoom >= 13 ? 0 : 46;
            const groups = new Map();
            for (const p of all) {
                const [x, y] = toScreen(p.lat, p.lon);
                if (x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
                const key = cell && p !== single ? Math.floor(x / cell) + ':' + Math.floor(y / cell) : 'p' + groups.size;
                const g = groups.get(key) || { items: [], x: 0, y: 0 };
                g.items.push(p); g.x += x; g.y += y;
                groups.set(key, g);
            }
            for (const g of groups.values()) {
                const x = g.x / g.items.length, y = g.y / g.items.length;
                let marker;
                if (g.items.length > 1) {
                    marker = el('button', 'hmap-cluster', String(g.items.length));
                    marker.type = 'button';
                    marker.setAttribute('aria-label', g.items.length + ' ilan — yakınlaştır');
                    marker.onclick = event => {
                        event.stopPropagation();
                        const [cx, cy] = [x, y];
                        const [ox, oy] = origin();
                        [lat, lon] = unproject(ox + cx, oy + cy, zoom);
                        setZoom(zoom + 2);
                    };
                } else {
                    const p = g.items[0];
                    marker = p === single ? el('div', 'hmap-pin') : (renderPoint ? renderPoint(p) : el('div', 'hmap-pin'));
                    marker.classList.add('hmap-marker');
                }
                marker.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
                layer.append(marker);
            }
        }

        function draw() { drawTiles(); drawMarkers(); }
        function setZoom(z) { zoom = clamp(Math.round(z), MIN_ZOOM, MAX_ZOOM); draw(); }

        plus.onclick = event => { event.stopPropagation(); setZoom(zoom + 1); };
        minus.onclick = event => { event.stopPropagation(); setZoom(zoom - 1); };

        // Sürükleme (fare ve dokunma), iki parmakla yakınlaştırma ve tıklama.
        const pointers = new Map();
        let start = null, moved = false, pinch = null;
        root.addEventListener('pointerdown', event => {
            if (event.target.closest('button, a')) return;
            root.setPointerCapture?.(event.pointerId);
            pointers.set(event.pointerId, [event.clientX, event.clientY]);
            if (pointers.size === 1) { start = { x: event.clientX, y: event.clientY, origin: origin() }; moved = false; }
            if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom }; }
        });
        root.addEventListener('pointermove', event => {
            if (!pointers.has(event.pointerId)) return;
            pointers.set(event.pointerId, [event.clientX, event.clientY]);
            if (pinch && pointers.size === 2) {
                const [a, b] = [...pointers.values()];
                const next = clamp(Math.round(pinch.zoom + Math.log2(Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)), MIN_ZOOM, MAX_ZOOM);
                if (next !== zoom) setZoom(next);
                moved = true; return;
            }
            if (!start) return;
            const dx = event.clientX - start.x, dy = event.clientY - start.y;
            if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
            const [w, h] = size();
            [lat, lon] = unproject(start.origin[0] - dx + w / 2, start.origin[1] - dy + h / 2, zoom);
            lat = clamp(lat, 30, 46);
            draw();
        });
        const end = event => {
            if (!pointers.has(event.pointerId)) return;
            pointers.delete(event.pointerId);
            if (pointers.size < 2) pinch = null;
            if (pointers.size === 0) {
                if (!moved && start && options.onClick && !event.target.closest('.hmap-marker, .hmap-cluster')) {
                    const r = root.getBoundingClientRect();
                    const [ox, oy] = origin();
                    const [plat, plon] = unproject(ox + event.clientX - r.left, oy + event.clientY - r.top, zoom);
                    options.onClick(Math.round(plat * 10000) / 10000, Math.round(plon * 10000) / 10000);
                }
                start = null;
            }
        };
        root.addEventListener('pointerup', end);
        root.addEventListener('pointercancel', end);
        root.addEventListener('dblclick', event => { event.preventDefault(); setZoom(zoom + 1); });
        root.addEventListener('wheel', event => {
            if (!event.ctrlKey && !event.metaKey) {
                hint.hidden = false; clearTimeout(hint.timer); hint.timer = setTimeout(() => { hint.hidden = true; }, 1400);
                return;
            }
            event.preventDefault();
            setZoom(zoom + (event.deltaY < 0 ? 1 : -1));
        }, { passive: false });
        root.addEventListener('keydown', event => {
            const step = 80;
            const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            if (event.key === '+' || event.key === '=') { setZoom(zoom + 1); event.preventDefault(); return; }
            if (event.key === '-') { setZoom(zoom - 1); event.preventDefault(); return; }
            const m = moves[event.key];
            if (!m) return;
            event.preventDefault();
            const [w, h] = size(); const [ox, oy] = origin();
            [lat, lon] = unproject(ox + w / 2 + m[0], oy + h / 2 + m[1], zoom);
            draw();
        });
        if (typeof ResizeObserver === 'function') new ResizeObserver(() => draw()).observe(root);

        const api = {
            setView(plat, plon, z = zoom) { lat = plat; lon = plon; zoom = clamp(z, MIN_ZOOM, MAX_ZOOM); draw(); },
            // Noktalar: { lat, lon, ... }; renderPoint(nokta) işaretçi öğesini döndürür.
            setPoints(list, render) { points = list || []; renderPoint = render || null; drawMarkers(); },
            setPin(plat, plon) { single = plat === null || plat === undefined ? null : { lat: plat, lon: plon }; drawMarkers(); },
            fit(list = points) {
                if (!list.length) { api.setView(...TURKEY.center, 6); return; }
                const lats = list.map(p => p.lat), lons = list.map(p => p.lon);
                const [w, h] = size();
                let z = MAX_ZOOM;
                for (; z > MIN_ZOOM; z--) {
                    const [x1, y1] = project(Math.max(...lats), Math.min(...lons), z);
                    const [x2, y2] = project(Math.min(...lats), Math.max(...lons), z);
                    if (x2 - x1 < w - 60 && y2 - y1 < h - 60) break;
                }
                lat = (Math.max(...lats) + Math.min(...lats)) / 2;
                lon = (Math.max(...lons) + Math.min(...lons)) / 2;
                zoom = Math.min(z, 12);
                draw();
            },
            zoom: () => zoom,
            redraw: draw
        };
        draw();
        return api;
    }

    // İl merkezleri (yaklaşık). Konum işaretlenmemiş ilanlar il merkezine yakın gösterilir.
    const cities = {
        'Adana': [37.00, 35.32], 'Adıyaman': [37.76, 38.28], 'Afyonkarahisar': [38.76, 30.54], 'Ağrı': [39.72, 43.05], 'Amasya': [40.65, 35.83],
        'Ankara': [39.93, 32.86], 'Antalya': [36.89, 30.71], 'Artvin': [41.18, 41.82], 'Aydın': [37.85, 27.84], 'Balıkesir': [39.65, 27.88],
        'Bilecik': [40.14, 29.98], 'Bingöl': [38.88, 40.50], 'Bitlis': [38.40, 42.11], 'Bolu': [40.74, 31.61], 'Burdur': [37.72, 30.29],
        'Bursa': [40.19, 29.06], 'Çanakkale': [40.15, 26.41], 'Çankırı': [40.60, 33.62], 'Çorum': [40.55, 34.95], 'Denizli': [37.78, 29.09],
        'Diyarbakır': [37.91, 40.24], 'Edirne': [41.68, 26.56], 'Elazığ': [38.67, 39.22], 'Erzincan': [39.75, 39.49], 'Erzurum': [39.90, 41.27],
        'Eskişehir': [39.78, 30.52], 'Gaziantep': [37.07, 37.38], 'Giresun': [40.91, 38.39], 'Gümüşhane': [40.46, 39.48], 'Hakkari': [37.58, 43.74],
        'Hatay': [36.20, 36.16], 'Isparta': [37.76, 30.55], 'Mersin': [36.80, 34.63], 'İstanbul': [41.01, 28.98], 'İzmir': [38.42, 27.14],
        'Kars': [40.60, 43.10], 'Kastamonu': [41.38, 33.78], 'Kayseri': [38.73, 35.48], 'Kırklareli': [41.73, 27.22], 'Kırşehir': [39.15, 34.16],
        'Kocaeli': [40.77, 29.92], 'Konya': [37.87, 32.48], 'Kütahya': [39.42, 29.98], 'Malatya': [38.35, 38.31], 'Manisa': [38.61, 27.43],
        'Kahramanmaraş': [37.58, 36.94], 'Mardin': [37.31, 40.74], 'Muğla': [37.22, 28.36], 'Muş': [38.74, 41.49], 'Nevşehir': [38.62, 34.71],
        'Niğde': [37.97, 34.68], 'Ordu': [40.98, 37.88], 'Rize': [41.03, 40.52], 'Sakarya': [40.78, 30.40], 'Samsun': [41.29, 36.33],
        'Siirt': [37.93, 41.94], 'Sinop': [42.03, 35.15], 'Sivas': [39.75, 37.02], 'Tekirdağ': [40.98, 27.51], 'Tokat': [40.31, 36.55],
        'Trabzon': [41.00, 39.72], 'Tunceli': [39.11, 39.55], 'Şanlıurfa': [37.16, 38.79], 'Uşak': [38.68, 29.41], 'Van': [38.49, 43.38],
        'Yozgat': [39.82, 34.81], 'Zonguldak': [41.45, 31.79], 'Aksaray': [38.37, 34.03], 'Bayburt': [40.26, 40.23], 'Karaman': [37.18, 33.22],
        'Kırıkkale': [39.85, 33.51], 'Batman': [37.88, 41.13], 'Şırnak': [37.52, 42.46], 'Bartın': [41.64, 32.34], 'Ardahan': [41.11, 42.70],
        'Iğdır': [39.92, 44.04], 'Yalova': [40.66, 29.27], 'Karabük': [41.20, 32.62], 'Kilis': [36.72, 37.12], 'Osmaniye': [37.07, 36.25],
        'Düzce': [40.84, 31.16]
    };

    // İşaretlenmemiş ilan için il merkezine yakın, ilan kimliğine göre sabit konum.
    function approximate(id, city) {
        const c = cities[city];
        if (!c) return null;
        let h = 0;
        for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        const a = (h % 360) * Math.PI / 180, r = 0.04 + (h % 97) / 97 * 0.18;
        return [c[0] + Math.sin(a) * r * 0.75, c[1] + Math.cos(a) * r];
    }

    return { create, cities, approximate, TURKEY };
})();
