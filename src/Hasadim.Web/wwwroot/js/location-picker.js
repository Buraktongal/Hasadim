'use strict';

// İlan formunda isteğe bağlı harita konumu: haritaya dokununca işaretlenir.
window.LocationPicker = (() => {
    let map = null;
    let bound = false;

    function values(form) {
        const lat = Number(form.elements.namedItem('enlem')?.value);
        const lon = Number(form.elements.namedItem('boylam')?.value);
        return form.elements.namedItem('enlem')?.value && Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
    }

    function set(form, lat, lon) {
        form.elements.namedItem('enlem').value = lat === null ? '' : String(lat);
        form.elements.namedItem('boylam').value = lon === null ? '' : String(lon);
        map?.setPin(lat, lon);
        const clear = form.querySelector('#clearPin');
        if (clear) clear.hidden = lat === null;
        const help = form.querySelector('#pinHelp');
        if (help) help.textContent = lat === null
            ? 'Haritaya dokunarak ürünün veya arazinin yerini işaretle. İşaretlemezsen ilan, il merkezine yakın yaklaşık konumla gösterilir.'
            : 'Konum işaretlendi (' + lat.toFixed(4) + ', ' + lon.toFixed(4) + '). Değiştirmek için haritada başka bir yere dokun.';
    }

    function center(form) {
        const pinned = values(form);
        if (pinned) { map.setView(pinned[0], pinned[1], 13); return; }
        const city = window.HasadimMap.cities[form.elements.namedItem('il')?.value];
        if (city) map.setView(city[0], city[1], 9);
        else map.setView(...window.HasadimMap.TURKEY.center, 6);
    }

    function show(form) {
        const root = form.querySelector('#locationPicker');
        if (!root || !window.HasadimMap || typeof root.getBoundingClientRect !== 'function') return;
        if (!map) {
            map = window.HasadimMap.create(root, {
                onClick: (lat, lon) => {
                    if (lat < 35.5 || lat > 42.5 || lon < 25.5 || lon > 45) return;
                    set(form, lat, lon);
                }
            });
        }
        if (!bound) {
            bound = true;
            form.querySelector('#clearPin')?.addEventListener('click', () => set(form, null, null));
            form.elements.namedItem('il')?.addEventListener('change', () => { if (map && !values(form)) center(form); });
        }
        const pinned = values(form);
        set(form, pinned ? pinned[0] : null, pinned ? pinned[1] : null);
        setTimeout(() => center(form));
    }

    // Form açıldığında (yeni veya düzenleme) önceki işaret temizlenir.
    function reset(form, lat = null, lon = null) {
        form.elements.namedItem('enlem').value = lat ?? '';
        form.elements.namedItem('boylam').value = lon ?? '';
        const clear = form.querySelector('#clearPin');
        if (clear) clear.hidden = lat === null || lat === undefined;
        map?.setPin(lat ?? null, lon ?? null);
    }

    return { show, reset };
})();
