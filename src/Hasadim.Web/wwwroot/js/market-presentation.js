'use strict';

// Shared presentation for the marketplace, listing detail and public seller page.
window.MarketPresentation = (() => {
    const number = value => new Intl.NumberFormat('tr-TR').format(value);
    const date = value => {
        if (!value || Number.isNaN(new Date(value).getTime())) return 'Belirtilmedi';
        return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
    };
    const node = (tag, text, cls) => {
        const n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        if (cls) n.className = cls;
        return n;
    };
    function stats(x) {
        return node('p', number(x.viewCount || 0) + ' görüntülenme · ' + number(x.favoriteCount || 0) + ' favori', 'listing-stats');
    }
    const unit = x => ({ kg: 'kg', balya: 'balya', m2: 'm²' })[x?.birim] || 'kg';
    const land = x => x?.kategori === 'Arazi';
    // Ürünlerde birim fiyat, arazide toplam fiyat (ve m² fiyatı) gösterilir.
    function price(x) {
        const currency = value => new Intl.NumberFormat('tr-TR', {style:'currency', currency:'TRY', minimumFractionDigits: land(x) ? 0 : 2, maximumFractionDigits: land(x) ? 0 : 2}).format(value);
        const rent = land(x) && x.islemTipi === 'Kiralik';
        const suffix = land(x) ? (rent ? ' / yıl' : '') : ' / ' + unit(x);
        const root = node('div', undefined, 'listing-price');
        const current = node('p', currency(x.kilogramFiyati) + suffix, 'price');
        root.append(current);
        if (land(x) && x.miktarKg > 0) root.append(node('span', rent
            ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(x.kilogramFiyati / x.miktarKg * 1000) + ' / dönüm · yıllık'
            : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(x.kilogramFiyati / x.miktarKg) + ' / m²', 'unit-price'));
        if (x.oncekiKilogramFiyati > x.kilogramFiyati && x.kilogramFiyati > 0) {
            const percent = Math.round((1 - x.kilogramFiyati / x.oncekiKilogramFiyati) * 1000) / 10;
            const old = node('del', currency(x.oncekiKilogramFiyati) + suffix);
            old.setAttribute('aria-label', 'Önceki ilan fiyatı: ' + currency(x.oncekiKilogramFiyati));
            // Yalnızca fiyat düştüyse gösterilir; artışlarda eski fiyat hiç görünmez.
            current.classList?.add?.('has-discount');
            root.append(old, node('span', (percent ? '%' + number(percent) : '%0,1’den az') + ' indirim', 'discount-badge'));
        }
        return root;
    }
    const countedViews = new Set();
    async function recordView(x, api) {
        if (x.isMine || x.status !== 4 || !x.active || x.hidden) return;
        const key = 'hasadim-view:' + x.id;
        if (countedViews.has(key)) return;
        try { if (sessionStorage.getItem(key)) return; } catch {}
        countedViews.add(key);
        try {
            const result = await api('/api/meyve-ilanlari/' + x.id + '/view', 'POST');
            x.viewCount = result.viewCount;
            try { sessionStorage.setItem(key, '1'); } catch {}
        } catch { countedViews.delete(key); }
    }
    function facts(x) {
        const root = node('dl', undefined, 'harvest-facts');
        for (const [label, value] of [[land(x) ? 'Alan' : 'Miktar', number(x.miktarKg) + ' ' + unit(x)], ['Hasat tarihi', date(x.hasatTarihi)]]) {
            const item = node('div');
            item.append(node('dt', label), node('dd', value));
            root.append(item);
        }
        return root;
    }
    function seller(root, p, full = false) {
        root.replaceChildren();
        root.classList.add('seller-profile');
        const header = node('div', undefined, 'seller-profile-heading');
        const avatar = p.photoUrl ? node('img', undefined, 'avatar') : node('span', (p.displayName || 'S').trim().slice(0, 1).toLocaleUpperCase('tr-TR'), 'seller-initial');
        if (p.photoUrl) { avatar.src = p.photoUrl; avatar.alt = p.displayName; }
        else avatar.setAttribute('aria-hidden', 'true');
        const identity = node('div');
        identity.append(node('p', 'Hasadım satıcı profili', 'eyebrow'), node(full ? 'h1' : 'h3', full ? p.displayName : 'Satıcı bilgileri'));
        if (!full) {
            const link = node('a', p.displayName, 'seller-name');
            link.href = '/html/satici.html?id=' + encodeURIComponent(p.id);
            identity.append(link);
        }
        identity.append(node('p', [p.businessName, p.city, p.district].filter(Boolean).join(' · ') || 'Konum belirtilmedi', 'muted'));
        header.append(avatar, identity);
        const badges = node('div', undefined, 'seller-badges');
        const activities = { Producer: 'Üretici', Buyer: 'Alıcı', Trader: 'Tüccar', Cooperative: 'Kooperatif', Other: 'Diğer' };
        badges.append(node('span', activities[p.activity] || 'Satıcı'), node('span', p.accountType === 'Business' ? 'Kurumsal · Kullanıcı beyanı' : 'Bireysel hesap'));
        badges.append(node('span', p.emailVerified ? 'E-posta doğrulandı' : 'E-posta doğrulanmadı', p.emailVerified ? 'email-confirmed' : ''));
        const stats = node('dl', undefined, 'harvest-facts');
        for (const [label, value] of [['Yayındaki ilan', Number.isInteger(p.activeListingCount) ? number(p.activeListingCount) : 'Belirtilmedi'], ['Üyelik tarihi', date(p.memberSince)]]) {
            const item = node('div'); item.append(node('dt', label), node('dd', value)); stats.append(item);
        }
        const about = node('p', p.about || 'Satıcı henüz tanıtım bilgisi eklememiş.', 'seller-about');
        if (p.about) about.setAttribute('translate', 'no');
        root.append(header, badges, stats, about);
        root.append(node('small', 'E-posta doğrulaması, ürün kalitesi veya ticari kimlik onayı değildir.', 'muted'));
        if (full && p.phone) {
            root.append(contact(p.phone, { message: 'Merhaba, Hasadım\'daki satıcı profilinizi gördüm.' }));
        } else if (full) root.append(node('p', 'Telefon gizli veya görüntülemek için giriş yapmalısın.', 'muted'));
        if (!full) {
            const link = node('a', 'Profili ve tüm ilanları gör →', 'secondary seller-call');
            link.href = '/html/satici.html?id=' + encodeURIComponent(p.id); root.append(link);
        }
    }
    // Basit çizgi simgeler (marka logosu değil).
    function glyph(kind) {
        if (typeof document.createElementNS !== 'function') return null;
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '20'); svg.setAttribute('height', '20');
        svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'contact-glyph');
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '2'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('d', kind === 'chat'
            ? 'M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 11h.01M12 11h.01M16 11h.01'
            : 'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z');
        svg.append(path);
        return svg;
    }
    // Telefon numarası sayfada açık yazılmaz. WhatsApp sohbeti hazır mesajla
    // açılır; numara yalnızca "Telefonu göster" düğmesine basınca görünür.
    function contact(phone, { message = '' } = {}) {
        const root = node('div', undefined, 'contact-buttons');
        const digits = String(phone || '').replace(/[^0-9]/g, '');
        const national = digits.replace(/^90(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
        const pretty = national.length === 10
            ? '0' + national.slice(0, 3) + ' ' + national.slice(3, 6) + ' ' + national.slice(6, 8) + ' ' + national.slice(8)
            : String(phone);
        if (national.length === 10 && national.startsWith('5')) {
            const wa = node('a', undefined, 'whatsapp-button');
            wa.href = 'https://wa.me/90' + national + (message ? '?text=' + encodeURIComponent(message) : '');
            wa.target = '_blank'; wa.rel = 'noopener noreferrer';
            const icon = glyph('chat'); if (icon) wa.append(icon);
            wa.append(node('span', 'WhatsApp ile yaz'));
            root.append(wa);
        }
        const show = node('button', undefined, 'secondary phone-reveal');
        show.type = 'button';
        const phoneIcon = glyph('phone'); if (phoneIcon) show.append(phoneIcon);
        show.append(node('span', 'Telefonu göster'));
        show.onclick = () => {
            const call = node('a', undefined, 'secondary phone-link');
            call.href = 'tel:' + (national.length === 10 ? '+90' + national : digits);
            const icon = glyph('phone'); if (icon) call.append(icon);
            call.append(node('span', pretty));
            call.setAttribute('aria-label', 'Satıcıyı ara: ' + pretty);
            show.replaceWith ? show.replaceWith(call) : root.append(call);
        };
        root.append(show);
        return root;
    }
    function estimate(x) {
        const root = node('section', undefined, 'quantity-estimate');
        const heading = node('h3', 'Alım tutarını hesapla');
        const u = unit(x);
        const label = node('label', 'Almak istediğin miktar (' + u + ')');
        const input = node('input');
        const minimum = x.minAlimKg || 0.01;
        input.type = 'number'; input.min = String(minimum); input.max = String(x.miktarKg); input.step = '0.01';
        input.inputMode = 'decimal'; input.value = String(Math.min(Math.max(100, minimum), x.miktarKg));
        label.append(input);
        const result = node('p', undefined, 'estimate-result');
        result.setAttribute('role', 'status');
        const update = () => {
            const amount = Number(input.value);
            if (!Number.isFinite(amount) || amount < minimum || amount > x.miktarKg) {
                result.textContent = number(minimum) + ' ile ' + number(x.miktarKg) + ' ' + u + ' arasında bir miktar gir.';
                input.setAttribute('aria-invalid', 'true'); return;
            }
            input.setAttribute('aria-invalid', 'false');
            result.textContent = 'Tahmini ürün tutarı: ' + new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount * x.kilogramFiyati);
        };
        input.addEventListener('input', update); update();
        root.append(heading, label, result, node('small', 'İlan fiyatına göre hesaplanır. Sipariş oluşturmaz; teslimat, ek masraflar ve satış koşullarını satıcıyla netleştir.', 'muted'));
        return root;
    }
    // İlan detayında konum: başlıkta ilçe/il ve konumun kesinliği, altta harita ve bağlantılar.
    // İşaretli konum yoksa il merkezine yakın yaklaşık konum gösterilir.
    function locationMap(x) {
        const root = node('section', undefined, 'detail-map');
        const exact = x.enlem !== null && x.enlem !== undefined && x.boylam !== null && x.boylam !== undefined;
        const point = exact ? [Number(x.enlem), Number(x.boylam)] : window.HasadimMap?.approximate(x.id, x.il);
        const head = node('div', undefined, 'detail-map-head');
        const pin = node('span', undefined, 'detail-map-pin');
        pin.setAttribute('aria-hidden', 'true');
        const titles = node('div');
        titles.append(node('p', 'Konum', 'eyebrow'), node('h3', [x.ilce, x.il].filter(Boolean).join(', ')));
        head.append(pin, titles);
        root.append(head);
        root.append(node('p', exact ? 'Satıcının haritada işaretlediği konum' : 'Yaklaşık konum · tam yeri satıcıya sor', 'detail-map-note' + (exact ? ' exact' : '')));
        const box = node('div', undefined, 'mini-map detail-mini-map');
        box.setAttribute('aria-label', 'İlan konumu haritası');
        root.append(box);
        if (point && window.HasadimMap) {
            // Harita, sayfaya eklendikten sonra ölçülerek çizilir.
            setTimeout(() => {
                const map = window.HasadimMap.create(box, { center: point, zoom: exact ? 13 : 9 });
                map?.setPin(point[0], point[1]);
            });
            const links = node('div', undefined, 'detail-map-links');
            const open = node('a', 'Haritada aç', 'secondary');
            open.href = 'https://www.openstreetmap.org/?mlat=' + point[0] + '&mlon=' + point[1] + '#map=' + (exact ? 15 : 10) + '/' + point[0] + '/' + point[1];
            links.append(open);
            if (exact) {
                const route = node('a', 'Yol tarifi', 'secondary');
                route.href = 'https://www.openstreetmap.org/directions?route=%3B' + point[0] + '%2C' + point[1];
                links.append(route);
            }
            for (const a of links.children) { a.target = '_blank'; a.rel = 'noopener noreferrer'; a.append(node('span', ' ↗', 'ext')); }
            root.append(links);
        } else box.hidden = true;
        return root;
    }
    return { facts, seller, estimate, stats, price, recordView, contact, locationMap };
})();
