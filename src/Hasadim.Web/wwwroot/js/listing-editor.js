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
        const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
        for (const [label, value] of [
            ['Ürün', data.get('meyveTuru') + ' / ' + data.get('cesit')],
            ['Miktar', new Intl.NumberFormat('tr-TR').format(Number(data.get('miktarKg'))) + ' kg'],
            ['Birim fiyat', money.format(Number(data.get('kilogramFiyati'))) + ' / kg'],
            ['Konum', data.get('il') + ' / ' + data.get('ilce')],
            ['Hasat tarihi', data.get('hasatTarihi') || 'Belirtilmedi'],
            ['Fotoğraf', String(Number(form.dataset.photoCount || 0) + data.getAll('photo').filter(f => f.size).length)],
            ['Ambalaj', data.get('ambalaj') || 'Belirtilmedi'],
            ['Teslimat', data.get('teslimat') || 'Belirtilmedi'],
            ['Minimum alım', data.get('minAlimKg') ? data.get('minAlimKg') + ' kg' : 'Belirtilmedi'],
            ['Yayın süresi', published ? 'Mevcut bitiş tarihi korunacak' : '30 gün']
        ]) { const item = node('div'); item.append(node('dt', label), node('dd', value)); facts.append(item); }
        if (editing && form.dataset.original) preview.append(changes(JSON.parse(form.dataset.original), data, form));
        preview.append(facts, node('p', data.get('aciklama') || 'Açıklama eklenmemiş.', 'preview-description'),
            node('p', editing ? 'Bilgileri kontrol et ve Değişiklikleri kaydet düğmesine bas.' : 'Bilgileri kontrol et. Düzeltmek için yukarıdaki alanları değiştirebilirsin. İlanı yayımla düğmesiyle başvurun gönderilir.', 'muted'));
        preview.hidden = false; signature = fingerprint;
        form.querySelector('[type="submit"]').textContent = editing ? 'Değişiklikleri kaydet' : 'İlanı yayımla';
        preview.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        preview.focus?.();
        return false;
    }
    // Düzenlemede değişen alanları "Önce → Sonra" olarak gösterir.
    function changes(before, data, form) {
        const money = value => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value) + ' / kg';
        const kg = value => new Intl.NumberFormat('tr-TR').format(value) + ' kg';
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
        add('Meyve türü', text(before.meyveTuru), text(after('meyveTuru')), text);
        add('Çeşit', text(before.cesit), text(after('cesit')), text);
        const oldPrice = num(before.kilogramFiyati), newPrice = num(after('kilogramFiyati'));
        if (oldPrice !== newPrice) {
            const diff = oldPrice ? Math.round((newPrice - oldPrice) / oldPrice * 1000) / 10 : 0;
            rows.push({ label: 'Fiyat', before: money(oldPrice), after: money(newPrice),
                kind: newPrice < oldPrice ? 'down' : 'up',
                note: oldPrice ? (diff < 0 ? '%' + new Intl.NumberFormat('tr-TR').format(-diff) + ' düşüş' : '%' + new Intl.NumberFormat('tr-TR').format(diff) + ' artış') : '' });
        }
        add('Toplam miktar', num(before.miktarKg), num(after('miktarKg')), v => v === null ? '—' : kg(v));
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
