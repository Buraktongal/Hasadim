'use strict';

// İlan formunda isteğe bağlı konum (Google Haritalar).
// Konum üç yoldan girilir: "Bulunduğum yeri kullan" (tarayıcı konumu), Google Haritalar'dan kopyalanan bağlantı
// ya da "38.49, 27.70" gibi koordinat. Seçilen yer Google Haritalar'da iğneyle önizlenir; konum yoksa seçilen il/ilçe gösterilir.
window.LocationPicker = (() => {
    let bound = false;
    const inTurkey = (lat, lon) => lat >= 35.5 && lat <= 42.5 && lon >= 25.5 && lon <= 45;

    function values(form) {
        const lat = Number(form.elements.namedItem('enlem')?.value);
        const lon = Number(form.elements.namedItem('boylam')?.value);
        return form.elements.namedItem('enlem')?.value && Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
    }

    function preview(form) {
        const root = form.querySelector('#locationPicker');
        if (!root || !window.GoogleMap) return;
        const pinned = values(form);
        const il = form.elements.namedItem('il')?.value, ilce = form.elements.namedItem('ilce')?.value;
        if (pinned) window.GoogleMap.embed(root, { lat: pinned[0], lon: pinned[1], zoom: 15, title: 'İşaretlenen konum' });
        else window.GoogleMap.embed(root, { place: [ilce, il].filter(Boolean).join(', ') || 'Türkiye', zoom: ilce ? 11 : il ? 8 : 5, title: 'Seçilen il ve ilçe' });
    }

    function set(form, lat, lon, message) {
        form.elements.namedItem('enlem').value = lat === null ? '' : String(lat);
        form.elements.namedItem('boylam').value = lon === null ? '' : String(lon);
        const clear = form.querySelector('#clearPin');
        if (clear) clear.hidden = lat === null;
        const help = form.querySelector('#pinHelp');
        // İşaretlenen yer seçilen ilin merkezinden çok uzaksa (başka ilde) uyarılır: ilan yanlış yerde görünmesin.
        let far = '';
        const city = window.HasadimMap?.cities?.[form.elements.namedItem('il')?.value];
        if (lat !== null && city) {
            const km = Math.hypot((lat - city[0]) * 111, (lon - city[1]) * 111 * Math.cos(lat * Math.PI / 180));
            if (km > 130) far = ' ⚠ Bu nokta seçtiğin ilden yaklaşık ' + Math.round(km) + ' km uzakta; il/ilçe veya konum yanlış olabilir.';
        }
        if (help) help.textContent = message || (lat === null
            ? 'Konum eklemezsen ilan, seçtiğin ilçeye yakın yaklaşık konumla gösterilir.'
            : 'Konum eklendi (' + lat.toFixed(5) + ', ' + lon.toFixed(5) + '). Haritada kontrol et.' + far);
        help?.classList.toggle('warn', Boolean(far));
        preview(form);
    }

    function controls(form) {
        const root = form.querySelector('#locationPicker');
        if (!root || form.querySelector('.lp-tools')) return;
        const tools = document.createElement('div');
        tools.className = 'lp-tools';
        const here = document.createElement('button');
        here.type = 'button'; here.className = 'secondary lp-here'; here.textContent = '📍 Bulunduğum yeri kullan';
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'lp-paste'; input.inputMode = 'url'; input.autocomplete = 'off';
        input.placeholder = 'Google Haritalar bağlantısı veya 38.49, 27.70';
        input.setAttribute('aria-label', 'Google Haritalar bağlantısı veya koordinat');
        const use = document.createElement('button');
        use.type = 'button'; use.className = 'secondary'; use.textContent = 'Ekle';
        const open = document.createElement('a');
        open.className = 'textbtn lp-open'; open.target = '_blank'; open.rel = 'noopener noreferrer';
        open.textContent = 'Google Haritalar’da yeri bul ↗';
        const row = document.createElement('div'); row.className = 'lp-row'; row.append(input, use);
        const tip = document.createElement('small'); tip.className = 'muted';
        tip.textContent = 'İpucu: Google Haritalar’da yere uzun bas (bilgisayarda sağ tıkla), çıkan koordinatı veya “Paylaş” bağlantısını kopyalayıp buraya yapıştır.';
        tools.append(here, row, open, tip);
        root.after(tools);

        const apply = () => {
            const p = window.GoogleMap.parse(input.value);
            if (!p) { set(form, ...(values(form) || [null, null]), 'Bağlantıda konum bulunamadı. Google Haritalar’daki konum bağlantısını ya da “38.49, 27.70” biçiminde koordinatı yapıştır.'); return; }
            if (!inTurkey(p[0], p[1])) { set(form, ...(values(form) || [null, null]), 'Bu konum Türkiye dışında görünüyor.'); return; }
            input.value = '';
            set(form, p[0], p[1]);
        };
        use.onclick = apply;
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
        input.addEventListener('paste', () => setTimeout(apply));
        here.onclick = () => {
            if (!navigator.geolocation) { set(form, ...(values(form) || [null, null]), 'Tarayıcın konum paylaşmayı desteklemiyor.'); return; }
            here.disabled = true;
            navigator.geolocation.getCurrentPosition(pos => {
                here.disabled = false;
                const lat = Math.round(pos.coords.latitude * 1e5) / 1e5, lon = Math.round(pos.coords.longitude * 1e5) / 1e5;
                if (!inTurkey(lat, lon)) { set(form, ...(values(form) || [null, null]), 'Bulunduğun yer Türkiye dışında görünüyor.'); return; }
                set(form, lat, lon);
            }, () => { here.disabled = false; set(form, ...(values(form) || [null, null]), 'Konum alınamadı. Tarayıcıda konum izni verdiğinden emin ol ya da bağlantı yapıştır.'); },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
        };
        const refreshLink = () => {
            const il = form.elements.namedItem('il')?.value, ilce = form.elements.namedItem('ilce')?.value;
            open.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([ilce, il, 'Türkiye'].filter(Boolean).join(', '));
        };
        refreshLink();
        form.elements.namedItem('il')?.addEventListener('change', refreshLink);
        form.elements.namedItem('ilce')?.addEventListener('change', refreshLink);
    }

    function show(form) {
        const root = form.querySelector('#locationPicker');
        if (!root || typeof root.getBoundingClientRect !== 'function') return;
        controls(form);
        if (!bound) {
            bound = true;
            form.querySelector('#clearPin')?.addEventListener('click', () => set(form, null, null));
            for (const name of ['il', 'ilce']) form.elements.namedItem(name)?.addEventListener('change', () => { const v = values(form); if (!v) preview(form); else set(form, v[0], v[1]); });
        }
        const pinned = values(form);
        set(form, pinned ? pinned[0] : null, pinned ? pinned[1] : null);
    }

    // Form açıldığında (yeni veya düzenleme) önceki işaret temizlenir.
    function reset(form, lat = null, lon = null) {
        form.elements.namedItem('enlem').value = lat ?? '';
        form.elements.namedItem('boylam').value = lon ?? '';
        const clear = form.querySelector('#clearPin');
        if (clear) clear.hidden = lat === null || lat === undefined;
    }

    return { show, reset };
})();
