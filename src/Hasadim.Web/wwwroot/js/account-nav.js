'use strict';

// Hesabım menüsü: tüm hesap sayfalarında aynı yan menü (mobilde yatay şerit).
(() => {
    const groups = [
        ['İlanlar ve alışveriş', [
            ['/?view=mine', 'İlanlarım'],
            ['/?view=favorites', 'Favorilerim'],
            ['/?view=messages', 'Mesajlarım', 'data-message-count'],
            ['/html/tekliflerim.html', 'Tekliflerim', 'data-offer-count'],
            ['/html/kayitli-aramalar.html', 'Kayıtlı aramalar'],
            ['/html/bildirimler.html', 'Bildirimler', 'data-notification-count']
        ]],
        ['Hesap', [
            ['/html/profilim.html', 'Profil bilgilerim'],
            ['/html/ayarlar.html', 'Ayarlar'],
            ['/html/engellenenler.html', 'Engellenen üyeler'],
            ['/html/hesabim.html', 'Hesap güvenliği']
        ]]
    ];
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    for (const nav of document.querySelectorAll('[data-account-nav]')) {
        nav.replaceChildren(node('p', 'Hesabım', 'account-nav-title'));
        for (const [title, links] of groups) {
            nav.append(node('p', title, 'account-nav-group'));
            for (const [href, label, counter] of links) {
                const a = node('a', label);
                a.href = href;
                if (counter) { const badge = node('span', '', 'message-count'); badge.setAttribute(counter, ''); badge.hidden = true; a.append(' ', badge); }
                if (location.pathname === href) a.setAttribute('aria-current', 'page');
                nav.append(a);
            }
        }
    }
})();
