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
        const fingerprint = JSON.stringify([...data].map(([key, value]) => [key, typeof value === 'string' ? value : [value.name, value.size, value.lastModified]]));
        if (signature === fingerprint) return true;
        const preview = document.querySelector('#listingPreview');
        preview.replaceChildren(node('p', 'YAYIN ÖNCESİ KONTROL', 'eyebrow'), node('h3', data.get('baslik')));
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
            ['Yayın süresi', '30 gün']
        ]) { const item = node('div'); item.append(node('dt', label), node('dd', value)); facts.append(item); }
        preview.append(facts, node('p', data.get('aciklama') || 'Açıklama eklenmemiş.', 'preview-description'),
            node('p', 'Bilgileri kontrol et. Düzeltmek için yukarıdaki alanları değiştirebilirsin. İlanı yayımla düğmesiyle başvurun gönderilir.', 'muted'));
        preview.hidden = false; signature = fingerprint;
        form.querySelector('[type="submit"]').textContent = 'İlanı yayımla';
        preview.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        preview.focus?.();
        return false;
    }
    return { ready, reset };
})();
