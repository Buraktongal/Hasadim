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
    function facts(x) {
        const root = node('dl', undefined, 'harvest-facts');
        for (const [label, value] of [['Miktar', number(x.miktarKg) + ' kg'], ['Hasat tarihi', date(x.hasatTarihi)]]) {
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
        identity.append(node('p', 'HASADIM SATICI PROFİLİ', 'eyebrow'), node(full ? 'h1' : 'h3', full ? p.displayName : 'Satıcı bilgileri'));
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
        root.append(header, badges, stats, node('p', p.about || 'Satıcı henüz tanıtım bilgisi eklememiş.', 'seller-about'));
        root.append(node('small', 'E-posta doğrulaması, ürün kalitesi veya ticari kimlik onayı değildir.', 'muted'));
        if (full && p.phone) {
            const call = node('a', 'Satıcıyı ara · ' + p.phone, 'secondary seller-call');
            call.href = 'tel:' + p.phone.replace(/[^+0-9]/g, ''); root.append(call);
        } else if (full) root.append(node('p', 'Telefon gizli veya görüntülemek için giriş yapmalısın.', 'muted'));
        if (!full) {
            const link = node('a', 'Profili ve tüm ilanları gör →', 'secondary seller-call');
            link.href = '/html/satici.html?id=' + encodeURIComponent(p.id); root.append(link);
        }
    }
    function estimate(x) {
        const root = node('section', undefined, 'quantity-estimate');
        const heading = node('h3', 'Alım tutarını hesapla');
        const label = node('label', 'Almak istediğin miktar (kg)');
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
                result.textContent = number(minimum) + ' ile ' + number(x.miktarKg) + ' kg arasında bir miktar gir.';
                input.setAttribute('aria-invalid', 'true'); return;
            }
            input.setAttribute('aria-invalid', 'false');
            result.textContent = 'Tahmini ürün tutarı: ' + new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount * x.kilogramFiyati);
        };
        input.addEventListener('input', update); update();
        root.append(heading, label, result, node('small', 'İlan fiyatına göre hesaplanır. Sipariş oluşturmaz; teslimat, ek masraflar ve satış koşullarını satıcıyla netleştir.', 'muted'));
        return root;
    }
    return { facts, seller, estimate };
})();
