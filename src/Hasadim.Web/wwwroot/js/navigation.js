"use strict";
window.setBreadcrumbs=items=>{const root=document.querySelector('#breadcrumbs');root.replaceChildren();items.forEach((item,i)=>{if(i){const sep=document.createElement('span');sep.textContent='›';sep.setAttribute('aria-hidden','true');root.append(sep);}const n=document.createElement(item.href?'a':'span');n.textContent=item.label;if(item.href)n.href=item.href;else n.setAttribute('aria-current','page');root.append(n);});};
const names={'profilim.html':'Profilim','satici.html':'Satıcı profili','ilan.html':'İlan detayı','hesabim.html':'Hesap güvenliği','giris.html':'Giriş yap','kayit.html':'Kayıt ol','sifremi-unuttum.html':'Şifremi unuttum','sifre-yenile.html':'Şifre yenile','eposta-dogrula.html':'E-posta doğrulama'};
const filename=location.pathname.split('/').pop(),query=new URLSearchParams(location.search).get('q');const searchInput=document.querySelector('#globalQuery');if(searchInput)searchInput.value=query||'';
setBreadcrumbs([{label:'Ana sayfa',href:'/'},{label:names[filename]||(query?'Arama: '+query:'Pazar yeri')}]);
// Kaydırma sırasında üst menüyü küçült.
(() => {
    const header = document.querySelector('.topbar');

    if (!header) return;

    let compact = false;
    let scheduled = false;

    function updateHeader() {
        const scrollTop = Math.max(0, window.scrollY);

        // Ayrı eşikler, menünün sürekli büyüyüp küçülmesini önler.
        if (!compact && scrollTop > 140) {
            compact = true;
            header.classList.add('is-compact');
        } else if (compact && scrollTop < 30) {
            compact = false;
            header.classList.remove('is-compact');
        }

        scheduled = false;
    }

    window.addEventListener('scroll', () => {
        if (scheduled) return;

        scheduled = true;
        window.requestAnimationFrame(updateHeader);
    }, { passive: true });

    window.addEventListener('pageshow', updateHeader);

    updateHeader();
})();


// Sayfa konumu bağlantılarını üst menünün altında tut.
(() => {
    const header = document.querySelector('.topbar');
    const breadcrumbs = document.querySelector('#breadcrumbs');

    if (!header || !breadcrumbs) return;

    function updateHeaderHeight() {
        const height = header.getBoundingClientRect().height;

        document.documentElement.style.setProperty(
            '--header-height',
            `${height}px`
        );
    }

    // Menü küçülürken, büyürken veya satır sayısı değişirken çalışır.
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);

    updateHeaderHeight();
})();
