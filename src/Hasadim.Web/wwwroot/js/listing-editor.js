'use strict';
window.ListingEditor = (() => {
    let signature = null;
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    function reset() {
        signature = null;
        const preview = document.querySelector('#listingPreview');
        if (preview) { preview.hidden = true; preview.replaceChildren(); }
        const submit = document.querySelector('#editorForm [type="submit"]');
        if (submit) submit.textContent = 'İlanı önizle';
    }
    function ready(form) {
        const data = new FormData(form);
        const editing = Boolean(data.get('id'));
        const published = form.dataset.published === 'true';
        const fingerprint = JSON.stringify([...data].map(([key, value]) => [key, typeof value === 'string' ? value : [value.name, value.size, value.lastModified]]));
        if (signature === fingerprint) return true;
        const preview = document.querySelector('#listingPreview');
        preview.replaceChildren(node('p', editing ? 'Değişiklikleri kontrol et' : 'Yayın öncesi kontrol', 'eyebrow'), node('h3', data.get('baslik')));
        const facts = node('dl', undefined, 'preview-facts');
        const landPreview = data.get('kategori') === 'Arazi';
        const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: landPreview ? 0 : 2, maximumFractionDigits: landPreview ? 0 : 2 });
        const nf = new Intl.NumberFormat('tr-TR');
        const land = data.get('kategori') === 'Arazi';
        const u = unitText(form);
        const category = window.HasadimCatalog?.category(data.get('kategori'))?.name || '';
        const photos = String(Number(form.dataset.photoCount || 0) + data.getAll('photo').filter(f => f.size).length);
        const pin = data.get('enlem') ? 'Haritada işaretli' : 'İl merkezine yakın (yaklaşık)';
        const rows = land ? [
            ['Kategori', category + ' / ' + data.get('meyveTuru')],
            ['Alan', nf.format(Number(data.get('miktarKg'))) + ' m² (' + nf.format(Number(data.get('miktarKg')) / 1000) + ' dönüm)'],
            [data.get('islemTipi') === 'Kiralik' ? 'Yıllık kira' : 'Satış fiyatı', money.format(Number(data.get('kilogramFiyati'))) + (data.get('islemTipi') === 'Kiralik' ? ' / yıl' : '')],
            ['İşlem tipi', data.get('islemTipi') === 'Kiralik' ? 'Kiralık' : 'Satılık'],
            ['İmar / tapu', (data.get('imarDurumu') || '—') + ' · ' + (data.get('tapuDurumu') || '—')],
            ['Konum', data.get('il') + ' / ' + data.get('ilce')],
            ['Harita', pin],
            ['Fotoğraf', photos],
            ['Yayın süresi', published ? 'Mevcut bitiş tarihi korunacak' : '30 gün']
        ] : [
            ['Ürün', category + ' / ' + data.get('meyveTuru') + (data.get('cesit') ? ' / ' + data.get('cesit') : '')],
            ['Miktar', nf.format(Number(data.get('miktarKg'))) + ' ' + u],
            ['Birim fiyat', money.format(Number(data.get('kilogramFiyati'))) + ' / ' + u],
            ['Konum', data.get('il') + ' / ' + data.get('ilce')],
            ['Hasat tarihi', data.get('hasatTarihi') || 'Belirtilmedi'],
            ['Fotoğraf', photos],
            ['Ambalaj', data.get('ambalaj') || 'Belirtilmedi'],
            ['Teslimat', data.get('teslimat') || 'Belirtilmedi'],
            ['Minimum alım', data.get('minAlimKg') ? data.get('minAlimKg') + ' ' + u : 'Belirtilmedi'],
            ['Yayın süresi', published ? 'Mevcut bitiş tarihi korunacak' : '30 gün']
        ];
        for (const [label, value] of rows) { const item = node('div'); item.append(node('dt', label), node('dd', value)); facts.append(item); }
        if (editing && form.dataset.original) preview.append(changes(JSON.parse(form.dataset.original), data, form));
        preview.append(facts, node('p', data.get('aciklama') || 'Açıklama eklenmemiş.', 'preview-description'),
            node('p', editing ? 'Bilgileri kontrol et ve Değişiklikleri kaydet düğmesine bas.' : 'Bilgileri kontrol et. Düzeltmek için yukarıdaki alanları değiştirebilirsin. İlanı yayımla düğmesiyle başvurun gönderilir.', 'muted'));
        preview.hidden = false; signature = fingerprint;
        form.querySelector('[type="submit"]').textContent = editing ? 'Değişiklikleri kaydet' : 'İlanı yayımla';
        preview.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        preview.focus?.();
        return false;
    }
    function unitText(form) {
        const unit = window.ListingCategory ? window.ListingCategory.unit(form) : 'kg';
        return ({ kg: 'kg', balya: 'balya', m2: 'm²' })[unit] || 'kg';
    }
    // Düzenlemede değişen alanları "Önce → Sonra" olarak gösterir.
    function changes(before, data, form) {
        const land = data.get('kategori') === 'Arazi';
        const u = unitText(form);
        const money = value => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: land ? 0 : 2, maximumFractionDigits: land ? 0 : 2 }).format(value) + (land ? (data.get('islemTipi') === 'Kiralik' ? ' / yıl' : '') : ' / ' + u);
        const kg = value => new Intl.NumberFormat('tr-TR').format(value) + ' ' + u;
        const text = value => (value === null || value === undefined || value === '') ? '—' : String(value);
        const short = value => { const t = text(value); return t.length > 90 ? t.slice(0, 87) + '…' : t; };
        const num = value => (value === null || value === undefined || value === '') ? null : Number(value);
        const after = key => data.get(key) ?? '';
        const rows = [];
        const add = (label, oldValue, newValue, show, kind = '') => {
            if (oldValue === newValue) return;
            rows.push({ label, before: show(oldValue), after: show(newValue), kind });
        };
        add('Başlık', text(before.baslik).trim(), text(after('baslik')).trim(), short);
        const name = id => window.HasadimCatalog?.category(id)?.name || id;
        add('Kategori', text(name(before.kategori || 'Meyve')), text(name(after('kategori'))), text);
        add(land ? 'Arazi türü' : 'Ürün', text(before.meyveTuru), text(after('meyveTuru')), text);
        add('Çeşit', text(before.cesit), text(after('cesit')), text);
        const oldPrice = num(before.kilogramFiyati), newPrice = num(after('kilogramFiyati'));
        if (oldPrice !== newPrice) {
            const diff = oldPrice ? Math.round((newPrice - oldPrice) / oldPrice * 1000) / 10 : 0;
            // İndirim yeşil rozetle gösterilir; artışta rozet ve renk kullanılmaz.
            const down = newPrice < oldPrice;
            rows.push({ label: 'Fiyat', before: money(oldPrice), after: money(newPrice),
                kind: down ? 'down' : '',
                note: down && oldPrice ? '%' + new Intl.NumberFormat('tr-TR').format(-diff) + ' indirim' : '' });
        }
        add(land ? 'Alan' : 'Toplam miktar', num(before.miktarKg), num(after('miktarKg')), v => v === null ? '—' : kg(v));
        if (land) {
            const deal = v => v === 'Kiralik' ? 'Kiralık' : v ? 'Satılık' : '—';
            add('İşlem tipi', deal(before.islemTipi), deal(after('islemTipi')), text);
            add('İmar durumu', text(before.imarDurumu), text(after('imarDurumu')), text);
            add('Tapu durumu', text(before.tapuDurumu), text(after('tapuDurumu')), text);
            add('Sulama', text(before.sulama), text(after('sulama')), text);
        }
        add('Harita konumu', before.enlem ? 'İşaretli' : 'Yok', after('enlem') ? (Number(after('enlem')) === before.enlem && Number(after('boylam')) === before.boylam ? 'İşaretli' : 'Yeni konum') : 'Yok', text);
        add('Minimum alım', num(before.minAlimKg), num(after('minAlimKg')), v => v === null ? 'Belirtilmedi' : kg(v));
        add('Ambalaj', text(before.ambalaj), text(after('ambalaj')), text);
        add('Teslimat', text(before.teslimat), text(after('teslimat')), text);
        add('Konum', text(before.il) + ' / ' + text(before.ilce), text(after('il')) + ' / ' + text(after('ilce')), text);
        add('Hasat tarihi', text(before.hasatTarihi), text(after('hasatTarihi')), v => v === '—' ? 'Belirtilmedi' : v.split('-').reverse().join('.'));
        add('Açıklama', text(before.aciklama).trim(), text(after('aciklama')).trim(), short);
        const newPhotos = data.getAll('photo').filter(f => f.size).length;
        if (newPhotos) rows.push({ label: 'Fotoğraf', before: String(Number(form.dataset.photoCount || 0)), after: String(Number(form.dataset.photoCount || 0) + newPhotos), kind: '', note: '+' + newPhotos + ' yeni' });

        const root = node('section', undefined, 'change-summary');
        root.append(node('h4', rows.length ? 'Değişiklikler (' + rows.length + ')' : 'Değişiklik yok'));
        if (!rows.length) { root.append(node('p', 'İlan bilgilerinde bir değişiklik yapmadın.', 'muted')); return root; }
        const table = node('table');
        const head = node('tr');
        for (const h of ['Alan', 'Önce', 'Sonra']) head.append(node('th', h));
        const thead = node('thead'); thead.append(head); table.append(thead);
        const body = node('tbody');
        for (const row of rows) {
            const tr = node('tr', undefined, row.kind ? 'is-' + row.kind : '');
            tr.append(node('th', row.label), node('td', row.before, 'before'));
            const cell = node('td', undefined, 'after');
            cell.append(node('strong', row.after));
            if (row.note) cell.append(node('span', row.note, 'change-note'));
            tr.append(cell);
            body.append(tr);
        }
        table.append(body); root.append(table);
        return root;
    }
    return { ready, reset };
})();
