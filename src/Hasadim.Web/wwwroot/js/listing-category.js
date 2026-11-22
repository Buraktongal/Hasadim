'use strict';

// İlan formunu seçilen ana kategoriye uyarlar: ürün listesi, birim, etiketler,
// arazi alanları ve yalnızca ürünlerde kullanılan alanlar.
window.ListingCategory = (() => {
    const catalog = () => window.HasadimCatalog;
    const unitText = { kg: 'kg', balya: 'balya', m2: 'm²' };

    // Gizlenen bölümdeki alanlar devre dışı kalır: doğrulanmaz ve gönderilmez.
    function toggle(form, selector, show) {
        for (const section of form.querySelectorAll(selector)) {
            section.hidden = !show;
            for (const field of section.querySelectorAll('input, select, textarea')) {
                if (field.name === 'cesit') continue;
                field.disabled = !show;
            }
        }
    }

    function current(form) {
        return catalog()?.category(form.elements.namedItem('kategori')?.value || 'Meyve');
    }

    function unit(form) {
        const c = current(form);
        if (!c) return 'kg';
        const chosen = form.elements.namedItem('birim')?.value;
        return c.units.length > 1 && c.units.includes(chosen) ? chosen : c.units[0];
    }

    function setText(form, selector, text) {
        const n = form.querySelector(selector);
        if (n) n.textContent = text;
    }

    function labels(form) {
        const c = current(form);
        const land = Boolean(c?.land);
        const u = unitText[unit(form)];
        const rent = land && form.querySelector('input[name="islemTipi"]:checked')?.value === 'Kiralik';
        setText(form, '[data-qty-label]', land ? 'Arazi alanı (m²)' : 'Toplam miktar (' + u + ')');
        setText(form, '[data-price-label]', land ? (rent ? 'Yıllık kira bedeli (TL)' : 'Satış fiyatı (toplam TL)') : 'Fiyat (TL/' + u + ')');
        setText(form, '[data-min-label]', 'Minimum alım (' + u + ')');
        setText(form, '[data-product-label]', land ? 'Arazi türü' : 'Ürün');
        setText(form, '[data-location-label]', land ? 'Arazinin bulunduğu il' : 'Ürünün bulunduğu il');
        setText(form, '[data-price-help]', land
            ? (rent ? 'Alanı metrekare, fiyatı yıllık kira bedeli olarak gir. 1 dönüm = 1.000 m².' : 'Alanı metrekare, fiyatı toplam satış bedeli olarak gir. 1 dönüm = 1.000 m².')
            : 'Fiyatı ' + u + ' başına, miktarı toplam ' + u + ' olarak gir. Toptan alıcılar en çok bu bilgilere bakar.');
        const qtyInput = form.elements.namedItem('miktarKg'), priceInput = form.elements.namedItem('kilogramFiyati');
        if (qtyInput) qtyInput.placeholder = land ? 'Örn. 12000' : unit(form) === 'balya' ? 'Örn. 3000' : 'Örn. 15000';
        if (priceInput) priceInput.placeholder = land ? (rent ? 'Örn. 60000' : 'Örn. 2500000') : unit(form) === 'balya' ? 'Örn. 350' : 'Örn. 35';
        const title = form.elements.namedItem('baslik');
        if (title) title.placeholder = land
            ? (rent ? 'Örn. Karapınar’da kiralık 40 dönüm sulu tarla' : 'Örn. Eğirdir’de yola cepheli 12 dönüm sulu elma bahçesi')
            : c?.id === 'Sebze' ? 'Örn. Antalya serasından salkım domates — 20 ton, kasalı'
            : c?.id === 'Tahil' ? 'Örn. Konya Karapınar Bezostaya buğday — 50 ton, dökme'
            : c?.id === 'Yem' ? 'Örn. 2. biçim yonca balyası — 3.000 balya, ahırdan teslim'
            : c?.id === 'Bal' ? 'Örn. Muğla çam balı — 2026 hasadı, teneke'
            : c?.id === 'Kuruyemis' ? 'Örn. Chandler ceviz, kabuklu, 32+ kalibre — 5 ton'
            : 'Örn. Korkuteli bahçesinden Deveci armut — 1. sınıf, kasalı';
        const description = form.elements.namedItem('aciklama');
        if (description) description.placeholder = land
            ? 'Arazinin konumu, ulaşım, su kaynağı, ağaç sayısı ve yaşı, toprak yapısı, tapu ve ödeme koşulları…'
            : 'Kalibre / boy, kalite sınıfı, depolama durumu, ilaçlama veya analiz bilgisi, ödeme ve yükleme koşulları…';
        areaHint(form);
    }

    // Arazi alanını dönüm ve m² fiyatıyla gösterir.
    function areaHint(form) {
        const hint = form.querySelector('#landAreaHint');
        if (!hint) return;
        const area = Number(form.elements.namedItem('miktarKg')?.value);
        const price = Number(form.elements.namedItem('kilogramFiyati')?.value);
        if (!current(form)?.land || !(area > 0)) { hint.textContent = ''; return; }
        const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
        const rent = form.querySelector('input[name="islemTipi"]:checked')?.value === 'Kiralik';
        hint.textContent = nf.format(area / 1000) + ' dönüm' + (price > 0 ? (rent ? ' · dönüm başına yıllık ' + nf.format(price / area * 1000) + ' TL' : ' · m² fiyatı ' + nf.format(price / area) + ' TL') : '');
    }

    // Ürün seçeneklerini kategoriye göre doldurur ve formu uyarlar.
    function apply(form, id, { product = '', variety = '' } = {}) {
        const c = catalog()?.category(id || 'Meyve');
        if (!c) return;
        form.elements.namedItem('kategori').value = c.id;
        const land = Boolean(c.land);
        toggle(form, '[data-land-only]', land);
        toggle(form, '[data-product-only]', !land);
        const unitField = form.querySelector('[data-unit-field]');
        if (unitField) {
            const choose = c.units.length > 1;
            unitField.hidden = !choose;
            const select = form.elements.namedItem('birim');
            if (select) {
                select.disabled = !choose;
                if (choose && !c.units.includes(select.value)) select.value = c.units[0];
            }
        }
        const price = form.elements.namedItem('kilogramFiyati');
        if (price) price.max = land ? '10000000000' : '1000000';
        const qty = form.elements.namedItem('miktarKg');
        if (qty) qty.min = land ? '1' : '0.01';
        const select = form.elements.namedItem('meyveTuru');
        const cesit = form.elements.namedItem('cesit');
        if (cesit) cesit.dataset.locked = String(land);
        if (select && typeof select.replaceChildren === 'function') {
            select.replaceChildren();
            for (const name of c.products) select.add(new Option(name, name));
        }
        if (typeof window.setupFruitVarietySelectors === 'function' && select && cesit) {
            window.setupFruitVarietySelectors(form, product, variety);
        }
        if (cesit && land) { cesit.disabled = true; cesit.value = ''; }
        labels(form);
    }

    function bind(form) {
        if (form.dataset.categoryBound) return;
        form.dataset.categoryBound = 'true';
        form.elements.namedItem('birim')?.addEventListener('change', () => labels(form));
        for (const radio of form.querySelectorAll('input[name="islemTipi"]')) radio.addEventListener('change', () => labels(form));
        for (const name of ['miktarKg', 'kilogramFiyati']) form.elements.namedItem(name)?.addEventListener('input', () => areaHint(form));
    }

    return { apply, bind, unit, labels, current };
})();
