'use strict';
const $ = s => document.querySelector(s);
const fruits = {Elma: '🍎', Armut: '🍐', Ayva: '🍐', Portakal: '🍊', Mandalina: '🍊', Limon: '🍋', Greyfurt: '🍊', Üzüm: '🍇', Kiraz: '🍒', Vişne: '🍒', Şeftali: '🍑', Nektarin: '🍑', Kayısı: '🍑', Erik: '🟣', Nar: '🔴', Çilek: '🍓', Ahududu: '🍓', Böğürtlen: '🫐', 'Yaban mersini': '🫐', Dut: '🫐', Karpuz: '🍉', Kavun: '🍈', Muz: '🍌', İncir: '🌿', 'Trabzon hurması': '🟠', Avokado: '🥑', Kivi: '🥝', Diğer: '🌱'};
const money = n => new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(n);
const number = n => new Intl.NumberFormat('tr-TR').format(n);
const date = v => v ? v.slice(0,10).split('-').reverse().join('.') : 'Belirtilmedi';
// Birim ve kategoriye göre miktar/fiyat metinleri.
const unitOf = x => ({ kg: 'kg', balya: 'balya', m2: 'm²' })[x?.birim] || 'kg';
const isLand = x => x?.kategori === 'Arazi';
const isRent = x => isLand(x) && x?.islemTipi === 'Kiralik';
const qtyText = x => isLand(x) ? number(x.miktarKg) + ' m² · ' + new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(x.miktarKg / 1000) + ' dönüm' : number(x.miktarKg) + ' ' + unitOf(x);
const categoryName = id => window.HasadimCatalog?.category(id)?.name || 'Meyve';
// Sayfalama: sunucudan yalnızca seçili sayfadaki ilanlar istenir.
const PAGE_SIZES = [10, 25, 50, 100];
const urlParams0 = new URLSearchParams(location.search);
let pageSize = (() => {
    const fromUrl = Number(urlParams0.get('pageSize'));
    if (PAGE_SIZES.includes(fromUrl)) return fromUrl;
    try { const saved = Number(localStorage.getItem('hasadim-page-size')); if (PAGE_SIZES.includes(saved)) return saved; } catch { }
    return 25;
})();
let pendingPage = Math.max(1, Math.min(100000, Number(urlParams0.get('page')) || 1));
let user=null, csrf='', view='all', page=1, registration=false, listRequest=0, detailRequest=0;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,cls,fn){const b=el('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;}
let toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,6000);}
async function token(){const r=await fetch('/api/csrf');if(!r.ok)throw Error('Oturum başlatılamadı.');csrf=(await r.json()).token;}
async function api(path,method='GET',data){
 const headers={};if(method!=='GET'){if(!csrf)await token();headers['X-CSRF-TOKEN']=csrf;}
 let body;if(data instanceof FormData)body=data;else if(data!==undefined){headers['Content-Type']='application/json';body=JSON.stringify(data);}
 let r;try{r=await fetch(path,{method,headers,body});}catch{throw Error('Sunucuya ulaşılamadı. Tekrar göndermeden önce işlemin sonucunu kontrol edin.');}
 const text=await r.text();let result;try{result=text?JSON.parse(text):null;}catch{result=null;}
 if(!r.ok){const msg=result?.mesaj||(result?.errors?Object.values(result.errors).flat().join(' '):null);throw Error(msg||(r.status===401?'Devam etmek için giriş yapın.':r.status===403?'Bu işlem için yetkiniz yok.':r.status===404?'Kayıt bulunamadı.':r.status===429?'Çok fazla istek. Bir dakika sonra tekrar deneyin.':r.status===400?'Bilgileri kontrol edin. Oturum değiştiyse sayfayı yenileyin.':'İşlem tamamlanamadı.'));}return result;
}
function show(id){const d=$('#'+id);if(!d.open)d.showModal();}
function close(id){$('#'+id).close();}
function mustLogin(){if(user)return true;openAuth();return false;}
function closeAccountMenu() {
    const menu = $('#accountMenu');
    if (menu) menu.open = false;
}
function isDetailPage() {
    return document.body.dataset.page === 'detail' || location.pathname === '/html/ilan.html';
}
function syncHeaderQuery(value) {
    const input = $('#globalQuery');
    if (input) input.value = value || '';
}
async function session() {
    user = await api('/api/account/me');
    const name = $('#accountMenuName');
    if (name) name.textContent = user?.displayName || 'Hesabım';
    $('#accountBtn').textContent = user ? 'Profilim' : 'Giriş yap';
    $('#logoutBtn').hidden = !user;
    $('#securityLink').hidden = !user;
    $('#adminNav').hidden = !user?.isAdmin;
    for (const item of document.querySelectorAll('[data-auth-menu]')) {
        item.hidden = !user;
    }
    await token();
    void window.messageAlerts?.refresh();
    void window.NotificationBell?.refresh(user);
}
function openAuth(){closeAccountMenu();window.location.href=user?'/html/profilim.html':'/html/giris.html?returnUrl='+encodeURIComponent(window.HasadimReturn.resolve(location.pathname+location.search));}
async function submit(form,task){const b=form.querySelector('[type=submit]')||form.querySelector('button');if(b.disabled)return;b.disabled=true;form.querySelector('.form-error').textContent='';try{await task();}catch(e){form.querySelector('.form-error').textContent=e.message;}finally{b.disabled=false;}}
$('#accountBtn').onclick=openAuth;
// Çıkış önce onay ister.
async function confirmAction(message, options) { return window.HasadimConfirm ? window.HasadimConfirm(message, options) : confirm(message); }
$('#logoutBtn').onclick=async()=>{closeAccountMenu();if(!await confirmAction('Hesabından çıkış yapmak istediğine emin misin?',{title:'Çıkış yap',okText:'Çıkış yap'}))return;try{await api('/api/account/logout','POST');if(isDetailPage()){window.location.href='/';return;}await session();await changeView('all');toast('Çıkış yapıldı.');}catch(e){toast(e.message);}};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>close(b.dataset.close);
// Ürün seçenekleri kategoriye göre doldurulur (market-catalog.js, listing-category.js).
// Ortak hesap menüsü: seçim, dışarı tıklama ve Escape ile kapanır.
for (const item of document.querySelectorAll('[data-view]')) {
    item.onclick = async () => {
        const next = item.dataset.view;
        closeAccountMenu();
        if (next !== 'all' && !mustLogin()) return;
        if (next === 'admin' && !user?.isAdmin) return;
        if (isDetailPage()) {
            window.location.href = '/?view=' + encodeURIComponent(next);
            return;
        }
        try { await changeView(next); } catch (error) { toast(error.message); }
    };
}
document.addEventListener('click', event => {
    const menu = $('#accountMenu');
    if (!menu?.open) return;
    if (!event.target.isConnected) return;
    if (!menu.contains(event.target) || event.target.closest('.account-menu-panel a:not([data-menu-settings])')) {
        closeAccountMenu();
    }
});
document.addEventListener('keydown', event => {
    const menu = $('#accountMenu');
    if (event.key === 'Escape' && menu?.open) {
        closeAccountMenu();
        menu.querySelector('summary')?.focus();
    }
});

// Üst arama her zaman pazar yerinde arar.
const globalSearchForm = $('#globalQuery')?.closest('form');
if (globalSearchForm) {
    globalSearchForm.onsubmit = async event => {
        event.preventDefault();
        const query = $('#globalQuery').value.trim().slice(0, 150);
        closeAccountMenu();
        if (isDetailPage()) {
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            window.location.href = '/' + (params.size ? '?' + params : '');
            return;
        }
        try { await changeView('all', { query }); }
        catch (error) { toast(error.message); }
    };
}

async function changeView(next, { query = '', filters = null } = {}) {
    const titles = {
        all: 'Pazar yeri', mine: 'İlanlarım', history: 'Geçmiş ilanlar', favorites: 'Favorilerim',
        messages: 'Mesajlar', admin: 'Yönetim'
    };
    if (!Object.hasOwn(titles, next)) next = 'all';
    if (next !== 'all' && !mustLogin()) return;
    if (next === 'admin' && !user?.isAdmin) return;
    // Yönetim artık ayrı sayfada (html/yonetim.html); eski bağlantılar oraya yönlenir.
    if (next === 'admin') { location.href = '/html/yonetim.html'; return; }

    closeAccountMenu();
    view = next;
    page = pendingPage; pendingPage = 1;
    listRequest++;
    window.setBreadcrumbs?.([
        { label: 'Ana sayfa', href: '/' }, { label: titles[next] }
    ]);
    document.body.dataset.view = next;
    window.HasadimMotion?.enter(next === 'messages' ? '#messagesView' : next === 'admin' ? '#adminView' : '#marketView');
    $('#hero').hidden = next !== 'all';
    $('#marketView').hidden = ['messages', 'admin'].includes(next);
    $('#messagesView').hidden = next !== 'messages';
    $('#adminView').hidden = next !== 'admin';
    const listingTabs = $('#myListingTabs');
    if (listingTabs) listingTabs.hidden = !['mine', 'history'].includes(next);
    for (const item of document.querySelectorAll('[data-view]')) {
        const selected = item.dataset.view === next;
        item.classList.toggle('selected', selected);
        if (selected) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    }

    $('#filters').reset();
    $('#filters').elements.namedItem('q').value = query;
    await window.MarketCatalog.apply($('#filters'), filters || {});
    syncHeaderQuery(query);
    updateMarketAddress();
    if (next === 'messages') return loadMessages();
    if (next === 'admin') return Promise.all([
        loadReports(), window.ListingWorkflow.loadQueue(1)
    ]);
    $('#viewTitle').textContent = next === 'history' ? 'Geçmiş ilanlar' : next === 'mine' ? 'İlanlarım'
        : next === 'favorites' ? 'Favori ilanlarım' : 'Taze ilanları keşfet';
    await loadListings();
}

// Yenilemede seçili sekme ve arama metni korunur.
function updateMarketAddress() {
    if (isDetailPage()) return;
    const url = new URL(location.href);
    if (view === 'all') url.searchParams.delete('view');
    else url.searchParams.set('view', view);
    const query = $('#filters').elements.namedItem('q').value.trim();
    if (query && !['messages', 'admin'].includes(view)) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.MarketCatalog.writeUrl(url, $('#filters'), !['messages', 'admin'].includes(view));
    const listView = !['messages', 'admin'].includes(view);
    if (listView && page > 1) url.searchParams.set('page', page); else url.searchParams.delete('page');
    if (listView && pageSize !== 25) url.searchParams.set('pageSize', pageSize); else url.searchParams.delete('pageSize');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
}
// Pazar yerinde sayfa konumu seçili filtreleri izler: Ana sayfa › Meyve ilanları › Elma › Starking › Isparta
function marketCrumbs() {
    const form = $('#filters');
    const value = name => form.elements.namedItem(name)?.value?.trim() || '';
    const base = '/html/index.html';
    const items = [{ label: 'Ana sayfa', href: '/' }, { label: 'İlanlar', href: base }];
    const category = value('kategori'), fruit = value('meyveTuru'), variety = value('cesit'), city = value('il'), district = value('ilce'), query = value('q');
    const params = new URLSearchParams();
    for (const [key, label] of [['kategori', category ? categoryName(category) : ''], ['meyveTuru', fruit], ['cesit', variety], ['il', city], ['ilce', district]]) {
        if (!label) continue;
        params.set(key, key === 'kategori' ? category : label);
        items.push({ label, href: base + '?' + params });
    }
    if (query) items.push({ label: '“' + query + '” araması' });
    const last = items[items.length - 1];
    delete last.href;
    // Kategori veya arama sayfasında tanıtım şeridi gizlenir; sonuçlar yukarı çıkar.
    const hero = $('#hero');
    if (hero) hero.hidden = items.length > 2;
    window.setBreadcrumbs?.(items);
}
function empty(parent,title,text){const n=el('div',undefined,'empty');n.append(el('strong',title),el('p',text));parent.append(n);}
async function loadListings(){
 window.MarketTools.filterSummary($('#filters'), () => { page=1; return loadListings(); });
 syncHeaderQuery($('#filters').elements.namedItem('q').value);
 updateMarketAddress();
 const request=++listRequest;const f=new FormData($('#filters'));const p=new URLSearchParams();for(const [k,v]of f)if(v)p.set(k,v.trim());
 if(f.get('minFiyat')&&f.get('maxFiyat')&&Number(f.get('minFiyat'))>Number(f.get('maxFiyat'))){$('#listStatus').textContent='En düşük fiyat, en yüksek fiyattan büyük olamaz.';return;}
 p.set('page',page);p.set('pageSize',pageSize);if(view==='mine')p.set('mine','true');if(view==='history')p.set('history','true');if(view==='favorites')p.set('favorites','true');
 $('#listStatus').textContent='İlanlar yükleniyor…';$('#prevPage').disabled=true;$('#nextPage').disabled=true;
 try{const data=await api('/api/meyve-ilanlari?'+p);if(request!==listRequest)return;
 if(data.items.length===0&&page>1){page--;return loadListings();}
 $('#listings').replaceChildren();$('#listStatus').textContent='';$('#resultCount').textContent=number(data.total)+' ilan bulundu';const selectedFruit=$('#filters').elements.namedItem('meyveTuru').value,selectedCategory=$('#filters').elements.namedItem('kategori').value;window.MarketCatalog.highlight({kategori:selectedCategory,meyveTuru:selectedFruit});if(view==='all'){$('#viewTitle').textContent=selectedFruit?selectedFruit+' ilanları':selectedCategory?categoryName(selectedCategory)+' ilanları':'Tüm ilanlar';marketCrumbs();}
 window.SavedSearch?.sync($('#filters'),view==='all');window.HasadimMotion?.enter('#listings');
 if(!data.items.length)empty($('#listings'),view==='history'?'Henüz geçmiş ilanın yok':'Henüz ilan yok',view==='history'?'Süresi dolan ve satılan ilanların burada görünecek.':'Filtreleri değiştirebilir veya ilk ilanını verebilirsin.');
 for(const x of data.items)$('#listings').append(card(x));
 renderPager(data);
 }catch(e){if(request===listRequest){$('#listings').replaceChildren();$('#listStatus').textContent=e.message;}}
}
// Sayfa numaraları: 1 … 4 5 [6] 7 8 … 45
function renderPager(data) {
    const size = data.pageSize || pageSize;
    const pages = Math.max(1, Math.ceil(data.total / size));
    $('#prevPage').disabled = page <= 1;
    $('#nextPage').disabled = page >= pages;
    const from = data.total ? (page - 1) * size + 1 : 0, to = Math.min(data.total, page * size);
    $('#pageLabel').textContent = data.total
        ? number(data.total) + ' ilandan ' + number(from) + '–' + number(to) + ' arası gösteriliyor · Sayfa ' + page + ' / ' + pages
        : '';
    const root = $('#pageNumbers');
    if (!root) return;
    root.replaceChildren();
    const wanted = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter(n => n >= 1 && n <= pages));
    let last = 0;
    for (const n of [...wanted].sort((a, b) => a - b)) {
        if (n - last > 1) root.append(el('span', '…', 'page-gap'));
        const b = button(String(n), 'page-number' + (n === page ? ' current' : ''), () => goToPage(n));
        b.setAttribute('aria-label', 'Sayfa ' + n);
        if (n === page) b.setAttribute('aria-current', 'page');
        root.append(b);
        last = n;
    }
    root.hidden = pages <= 1;
}
async function goToPage(n) {
    page = n;
    await loadListings();
    $('#marketView')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}
function picture(x, cls) {
    if (x.photoUrl) { const img = el('img', undefined, cls); img.src = x.photoUrl; img.alt = x.baslik; img.loading = 'lazy'; return img; }
    const n = el('div', window.FruitIcons ? undefined : (fruits[x.meyveTuru] || '🌱'), 'fruit-placeholder'); if (window.FruitIcons) n.append(window.FruitIcons.node(x.meyveTuru, 48)); n.setAttribute('aria-label', x.meyveTuru + ' — fotoğraf eklenmemiş'); return n;
}
function card(x) {
    // Liste görünümünde satır, galeri görünümünde kart olarak çizilir (CSS).
    const c = el('article', undefined, 'card listing-item'),
        media = el('div', undefined, 'card-media');

    const pic = picture(x);
    media.append(pic);
    if (pic.tagName === 'IMG') window.CardPhotos?.attach(media, pic, x.photos);
    const stats = window.MarketPresentation.stats(x);
    const fav = button(x.favorite ? '♥' : '♡', 'favorite' + (x.favorite ? ' on' : ''),
        async () => {
            if (!mustLogin()) return; fav.disabled = true;
            try {
                await api(`/api/meyve-ilanlari/${x.id}/favorite`, x.favorite ? 'DELETE' : 'POST');
                x.favoriteCount = Math.max(0, (x.favoriteCount || 0) + (x.favorite ? -1 : 1));
                stats.textContent = window.MarketPresentation.stats(x).textContent;
                x.favorite = !x.favorite; fav.textContent = x.favorite ? '♥' : '♡';
                fav.classList.toggle('on', x.favorite);
                fav.setAttribute('aria-pressed', String(x.favorite)); if (view === 'favorites') await loadListings();
            } catch (e) { toast(e.message); } finally { fav.disabled = false; }
        });
    fav.setAttribute('aria-label', 'Favorilere ekle / çıkar');
    fav.setAttribute('aria-pressed', String(x.favorite));
    if (x.status === 4 && x.active && !x.hidden) media.append(fav);

    const main = el('div', undefined, 'card-body card-main');
    const title = el('h3');
    const link = el('a', x.baslik, 'card-title');
    link.setAttribute('translate', 'no');
    link.href = '/html/ilan.html?id=' + encodeURIComponent(x.id) + '&from=' + encodeURIComponent(view);
    link.addEventListener('click', event => { event.preventDefault(); openDetail(x.id); });
    title.append(link);
    main.append(
        el('span', (isLand(x) ? (isRent(x) ? 'Kiralık ' : 'Satılık ') + x.meyveTuru.toLocaleLowerCase('tr-TR') : x.meyveTuru) + (x.cesit ? ' / ' + x.cesit : ''), 'card-tag'),
        title,
        el('p', x.il + ' / ' + x.ilce + ' · ' + qtyText(x), 'card-meta'));
    const badges = el('div', undefined, 'card-badges');
    if (isLand(x)) for (const v of [x.imarDurumu, x.tapuDurumu, x.sulama, x.yolCephesi ? 'Yola cepheli' : '', x.elektrik ? 'Elektrik var' : '']) if (v) badges.append(el('span', v, 'badge'));
    if (x.minAlimKg) badges.append(el('span', 'Min. ' + number(x.minAlimKg) + ' ' + unitOf(x), 'badge'));
    if (x.ambalaj) badges.append(el('span', x.ambalaj, 'badge'));
    if (x.teslimat) badges.append(el('span', x.teslimat, 'badge'));
    if (x.hasatTarihi) badges.append(el('span', 'Hasat ' + date(x.hasatTarihi), 'badge'));
    if (badges.children.length) main.append(badges);
    window.ListingWorkflow.appendStatus(main, x);
    main.append(el('small', 'İlan No: ' + x.listingNumber + ' · ' + (x.ownerName || ''), 'listing-number'));

    const column = (cls, label, value) => {
        const n = el('div', undefined, 'card-col ' + cls);
        n.append(el('span', label, 'col-label'));
        if (typeof value === 'string') n.append(el('strong', value)); else n.append(value);
        return n;
    };
    const priceBox = window.MarketPresentation.price(x);
    c.append(media, main,
        column('col-variety', isLand(x) ? 'Arazi türü' : 'Çeşit', isLand(x) ? x.meyveTuru : (x.cesit || '—')),
        column('col-qty', isLand(x) ? 'Alan' : 'Miktar', isLand(x) ? number(x.miktarKg) + ' m²' : number(x.miktarKg) + ' ' + unitOf(x)),
        column('col-price', 'Fiyat', priceBox),
        column('col-date', 'İlan tarihi', date(x.publishedAt || x.olusturulmaTarihi)),
        column('col-location', 'İl / İlçe', x.il + '\n' + x.ilce));
    const bottom = el('div', undefined, 'card-bottom');
    bottom.append(stats, button('İlanı incele ↗', 'textbtn', () => openDetail(x.id)));
    c.append(bottom);

    c.classList.add('clickable-card');
    c.addEventListener('click', event => {
        if (event.target.closest('a, button, input, select, textarea, label')) return;
        openDetail(x.id);
    });
    return c;
}
$('#filters').onsubmit = e => { e.preventDefault(); page = 1; loadListings(); }; $('#clearFilters').onclick = () => {
    $('#filters').reset();
    window.MarketCatalog.fillProducts($('#filters'));
    window.MarketCatalog.fillVarieties($('#filters'));
    window.MarketCatalog.syncSort($('#filters'));
    page = 1; loadListings();
}; $('#prevPage').onclick = () => goToPage(page - 1); $('#nextPage').onclick = () => goToPage(page + 1);
// Sayfa başına ilan sayısı: 10 / 25 / 50 / 100
const pageSizeSelect = $('#pageSize');
if (pageSizeSelect) {
    pageSizeSelect.value = String(pageSize);
    pageSizeSelect.onchange = () => {
        const next = Number(pageSizeSelect.value);
        if (!PAGE_SIZES.includes(next)) return;
        pageSize = next; page = 1;
        try { localStorage.setItem('hasadim-page-size', String(next)); } catch { }
        loadListings();
    };
}
function openDetail(id){window.location.href='/html/ilan.html?id='+encodeURIComponent(id)+'&from='+encodeURIComponent(view);}
function createGallery(photos,title){
    let index = 0; const gallery = el('section', undefined, 'gallery'); gallery.setAttribute('aria-label', 'İlan fotoğrafları');
    const large = el('img', undefined, 'detail-image'), opener = button('', 'gallery-open', () => {
        update(index);
        lightbox.showModal();
    }); opener.setAttribute('aria-label', 'Fotoğrafı büyük görüntüle');
    opener.append(large); const thumbs = el('div', undefined, 'thumbnails'), counter = el('span', undefined, 'photo-counter'); counter.setAttribute('aria-live', 'polite');
    const lightbox = el('dialog', undefined, 'photo-lightbox'), big = el('img', undefined, 'lightbox-image'), bigCounter = el('span'), closeButton = button('Kapat ×', 'secondary', () => lightbox.close()), previous = button('← Önceki', 'secondary', () => update(index - 1)), next = button('Sonraki →', 'secondary', () => update(index + 1)), bar = el('div', undefined, 'lightbox-bar');
    lightbox.setAttribute('aria-label', title + ' — Büyük fotoğraf');
    bar.append(previous, bigCounter, next, closeButton);
    lightbox.append(big, bar); lightbox.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); update(index - 1); } if (e.key === 'ArrowRight') { e.preventDefault(); update(index + 1); } });
    lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });
 const buttons=photos.map((p,i)=>{const b=button('','thumbnail',()=>update(i));b.setAttribute('aria-label','Fotoğraf '+(i+1));const img=el('img');img.src=p.photoUrl;img.alt='Fotoğraf '+(i+1);img.loading='lazy';b.append(img);thumbs.append(b);return b;});
    function update(i) {
        index = (i + photos.length) % photos.length; large.src = photos[index].photoUrl;
        large.alt = title + ' — Fotoğraf ' + (index + 1); big.src = large.src; big.alt = large.alt; counter.textContent = (index + 1) + ' / ' + photos.length + ' fotoğraf'; bigCounter.textContent = counter.textContent; buttons.forEach((b, n) => { b.classList.toggle('active', n === index); b.setAttribute('aria-pressed', String(n === index)); }); previous.disabled = next.disabled = photos.length === 1;
    }
 const controls=el('div',undefined,'gallery-controls');controls.append(counter,button('Büyük görüntüle ⤢','secondary',()=>{update(index);lightbox.showModal();}));gallery.append(opener,controls,thumbs,lightbox);update(0);return gallery;
}
async function renderDetail(id)
{
    const request = ++detailRequest;
    const content = $('#detailContent');
    content.replaceChildren(el('p', 'Yükleniyor…'));
    try {
        const x = await api('/api/meyve-ilanlari/' + id);
        await window.MarketPresentation.recordView(x, api);
        if (request !== detailRequest) return;
        content.replaceChildren(); document.title = x.baslik + ' — Hasadım';
        const params = new URLSearchParams(location.search);
        const from = params.get('from');
        const crumbs = [{ label: 'Ana sayfa', href: '/' },
            { label: ({ mine: 'İlanlarım', history: 'Geçmiş ilanlar', favorites: 'Favorilerim', admin: 'Yönetim' })[from] || 'İlanlar', href: '/?view=' + encodeURIComponent(from || 'all') }];
        if (!from || from === 'all') crumbs.push({ label: categoryName(x.kategori), href: '/html/index.html?kategori=' + encodeURIComponent(x.kategori || 'Meyve') },
            { label: x.meyveTuru, href: '/html/index.html?kategori=' + encodeURIComponent(x.kategori || 'Meyve') + '&meyveTuru=' + encodeURIComponent(x.meyveTuru) });
        crumbs.push({ label: x.baslik });
        window.setBreadcrumbs?.(crumbs);
        const originSeller = params.get('seller');
        if (originSeller === x.ownerId) window.setBreadcrumbs?.([{ label: 'Ana sayfa', href: '/' }, { label: x.ownerName, href: '/html/satici.html?id=' + encodeURIComponent(originSeller) }, { label: x.baslik }]);
        window.MarketCatalog?.highlight({ kategori: x.kategori, meyveTuru: x.meyveTuru });

        // Başlık satırı
        const head = el('header', undefined, 'detail-head');
        head.append(el('p', isLand(x) ? (isRent(x) ? 'Kiralık arazi' : 'Satılık arazi') + ' / ' + x.meyveTuru : x.meyveTuru + ' / ' + (x.cesit || 'Çeşit belirtilmedi'), 'eyebrow'), el('h2', x.baslik),
            el('p', 'İlan No: ' + x.listingNumber + ' · ' + x.il + ' / ' + x.ilce, 'detail-sub'));
        head.querySelector('h2')?.setAttribute('translate', 'no');
        content.append(head);
        window.HasadimMotion?.enter(content);

        const layout = el('div', undefined, 'detail-layout');
        const mediaCol = el('div', undefined, 'detail-media');
        const infoCol = el('div', undefined, 'detail-info');
        const sideCol = el('aside', undefined, 'detail-side');
        // Satıcı kartı fotoğrafların hemen altında durur (sağ sütun kısa kalır, sayfa gereksiz uzamaz).
        const mediaStack = el('div', undefined, 'detail-stack');
        mediaStack.append(mediaCol);
        layout.append(mediaStack, infoCol, sideCol);
        content.append(layout);

        const photos = x.photos || [];
        if (photos.length) mediaCol.append(createGallery(photos, x.baslik));
        else { const ph = el('div', window.FruitIcons ? undefined : (fruits[x.meyveTuru] || '🌱'), 'fruit-placeholder detail-placeholder'); if (window.FruitIcons) ph.append(window.FruitIcons.node(x.meyveTuru, 120)); ph.setAttribute('aria-label', 'Fotoğraf eklenmemiş'); mediaCol.append(ph); }

        // Fiyat ve ilan bilgileri tablosu
        infoCol.append(window.MarketPresentation.price(x));
        const grid = el('div', undefined, 'detail-grid info-table');
        const yes = v => v === true ? 'Var' : v === false ? 'Yok' : 'Belirtilmedi';
        const info = isLand(x)
            ? { 'İlan numarası': String(x.listingNumber), 'İlan tarihi': date(x.publishedAt || x.olusturulmaTarihi), 'İşlem tipi': isRent(x) ? 'Kiralık (yıllık kira)' : 'Satılık', 'Arazi türü': x.meyveTuru, 'Alan': qtyText(x), [isRent(x) ? 'Dönüm başına yıllık kira' : 'm² fiyatı']: money(isRent(x) ? x.kilogramFiyati / x.miktarKg * 1000 : x.kilogramFiyati / x.miktarKg), 'İmar durumu': x.imarDurumu || 'Belirtilmedi', 'Tapu durumu': x.tapuDurumu || 'Belirtilmedi', 'Sulama': x.sulama || 'Belirtilmedi', 'Ada / parsel': [x.ada, x.parsel].filter(Boolean).join(' / ') || 'Belirtilmedi', 'Elektrik': yes(x.elektrik), 'Yol cephesi': yes(x.yolCephesi), 'Konum': x.il + ' / ' + x.ilce, 'Satıcı': x.ownerName }
            : { 'İlan numarası': String(x.listingNumber), 'İlan tarihi': date(x.publishedAt || x.olusturulmaTarihi), 'Kategori': categoryName(x.kategori), 'Ürün': x.meyveTuru, 'Çeşit': x.cesit || 'Belirtilmedi', 'Toplam miktar': number(x.miktarKg) + ' ' + unitOf(x), 'Minimum alım': x.minAlimKg ? number(x.minAlimKg) + ' ' + unitOf(x) : 'Belirtilmedi', 'Ambalaj': x.ambalaj || 'Belirtilmedi', 'Teslimat': x.teslimat || 'Belirtilmedi', 'Hasat tarihi': date(x.hasatTarihi), 'Konum': x.il + ' / ' + x.ilce, 'Satıcı': x.ownerName };
        for (const [k, v] of Object.entries(info)) {
            const n = el('div');
            n.append(el('span', k), el('strong', v)); grid.append(n);
        }
        infoCol.append(grid);
        window.ListingWorkflow.appendStatus(infoCol, x);
        const statistics = window.MarketPresentation.stats(x); infoCol.append(statistics);
        const publiclyVisible = x.status === 4 && x.active && !x.hidden;
        if (publiclyVisible) infoCol.append(window.MarketTools.detailActions(x, { api, requireLogin: mustLogin, onFavorite: () => { statistics.textContent = window.MarketPresentation.stats(x).textContent; } }));

        // Sağ sütun: satıcı ve iletişim
        const seller = el('section', undefined, 'seller-box'); mediaStack.append(seller);
        const actions = el('div', undefined, 'actions contact-actions');
        if (x.isMine) {
            if (window.ListingWorkflow.editable(x)) {
                actions.append(button('İlanı düzenle', 'primary', () => openEditor(x)));
            }
            actions.append(button('İlanı sil', 'danger', async () => {
                if (!await confirmAction('İlan yayından kaldırılıp silinecek. Mesaj geçmişin korunur.', { title: 'İlan silinsin mi?', okText: 'İlanı sil', danger: true })) return;
                try {
                    await api('/api/meyve-ilanlari/' + id, 'DELETE');
                    window.location.href = '/?view=mine';
                } catch (error) { toast(error.message); }
            }));
        } else if (user && publiclyVisible) {
            // Numara açıkça yazılmaz: WhatsApp ve "Telefonu göster" düğmeleri.
            if (x.telefon) actions.append(window.MarketPresentation.contact(x.telefon, {
                message: 'Merhaba, Hasadım\'daki "' + x.baslik + '" ilanınız (İlan No: ' + x.listingNumber + ') hakkında yazıyorum.'
            }));
            actions.append(button('Satıcıya mesaj gönder', 'primary',
                () => openCompose(x.id, x.ownerId, x.baslik)));
            actions.append(button('Teklif ver', 'secondary offer-button', () => window.OfferDialog?.open(x, { api, toast })));
            actions.append(button('İlanı bildir', 'textbtn', () => {
                $('#reportForm').reset();
                $('#reportForm [name=id]').value = id;
                $('#reportForm .form-error').textContent = '';
                show('reportDialog');
            }));
            actions.append(button('Satıcıyı engelle', 'textbtn', async () => {
                if (!await confirmAction(x.ownerName + ' engellenirse ilanlarını görmezsin; birbirinize mesaj ve teklif gönderemezsiniz. Engeli Ayarlar → Engellenen üyeler bölümünden kaldırabilirsin.', { title: 'Satıcı engellensin mi?', okText: 'Engelle', danger: true })) return;
                try { const r = await api('/api/blocks/' + x.ownerId, 'POST'); toast(r?.mesaj || 'Üye engellendi.'); window.location.href = '/'; }
                catch (error) { toast(error.message); }
            }));
        } else if (!user && publiclyVisible) {
            actions.append(button('İletişim için giriş yap', 'primary', openAuth));
        }
        sideCol.append(actions);
        if (publiclyVisible && !isLand(x)) sideCol.append(window.MarketPresentation.estimate(x));
        sideCol.append(window.MarketPresentation.locationMap(x));

        // Alt bölüm: açıklama, sorular, yönetim işlemleri
        const lower = el('div', undefined, 'detail-lower');
        const description = el('section', undefined, 'description');
        const descriptionText = el('p', x.aciklama || 'Açıklama eklenmemiş.');
        if (x.aciklama) descriptionText.setAttribute('translate', 'no');
        description.append(el('h3', isLand(x) ? 'Arazi açıklaması' : 'Ürün açıklaması', 'listing-description-title'), descriptionText);
        lower.append(description);
        content.append(lower);
        window.ListingWorkflow.appendReviewActions(lower, x);
        if (!x.isMine && publiclyVisible) lower.append(window.HasadimMessages.questions(x, question => {
            if (!mustLogin()) return;
            openCompose(x.id, x.ownerId, x.baslik, question);
        }));

        try { const p = await api('/api/profiles/' + x.ownerId); window.MarketPresentation.seller(seller, p); }
        catch { const link = el('a', x.ownerName + ' — Satıcı profili'); link.href = '/html/satici.html?id=' + x.ownerId; seller.append(link); }
        if (publiclyVisible) void renderSimilar(content, x);
}catch(e){if(request===detailRequest)content.replaceChildren(el('p',e.message,'form-error'));}}

// Aynı meyve türündeki diğer güncel ilanlar.
async function renderSimilar(content, x) {
    try {
        const data = await api('/api/meyve-ilanlari?meyveTuru=' + encodeURIComponent(x.meyveTuru) + '&pageSize=5');
        const others = (data?.items || []).filter(item => item.id !== x.id).slice(0, 4);
        if (!others.length) return;
        const section = el('section', undefined, 'similar-listings');
        section.append(el('h3', 'Benzer ' + x.meyveTuru.toLocaleLowerCase('tr-TR') + ' ilanları'));
        const list = el('div', undefined, 'cards gallery-view');
        for (const item of others) list.append(card(item));
        section.append(list);
        content.append(section);
    } catch { /* Benzer ilanlar isteğe bağlıdır. */ }
}

async function openEditor(x) {
    if (!mustLogin()) return;
    if (x && !window.ListingWorkflow.editable(x)) {
        toast('Bu ilan şu anda düzenlenemez.');
        return;
    }

    const form = $('#editorForm');
    form.dataset.published = String(x?.status === 4);

    form.reset();
    form.elements.namedItem('id').value = '';
    form.elements.namedItem('version').value = '';
    form.querySelector('.form-error').textContent = '';

    $('#editorTitle').textContent = x
        ? 'İlanını düzenle'
        : 'Yeni ilan ver';
    form.querySelector('[type="submit"]').textContent = x
        ? 'İlanı önizle' : 'İlanı önizle';
    window.ListingEditor.reset();
    window.ListingWizard?.reset(Boolean(x));

    if (x) {
        for (const [key, value] of Object.entries(x)) {
            const field = form.elements.namedItem(key);

            if (!field || field.type === 'file') continue;

            if (field.type === 'checkbox') {
                field.checked = Boolean(value);
            } else {
                field.value = key === 'hasatTarihi' && value
                    ? value.slice(0, 10)
                    : (value ?? '');
            }
        }
    }

    const photoCount = x?.photos?.length ?? 0;

    form.dataset.photoCount = String(photoCount);
    form.elements.namedItem('photo').required = photoCount === 0;

    $('#photoPreviews').replaceChildren();

    // Düzenlemede önce/sonra karşılaştırması için ilk değerler saklanır.
    if (x) form.dataset.original = JSON.stringify({ baslik: x.baslik, kategori: x.kategori, birim: x.birim, meyveTuru: x.meyveTuru, cesit: x.cesit, miktarKg: x.miktarKg,
        kilogramFiyati: x.kilogramFiyati, minAlimKg: x.minAlimKg, ambalaj: x.ambalaj, teslimat: x.teslimat, il: x.il, ilce: x.ilce,
        hasatTarihi: x.hasatTarihi ? x.hasatTarihi.slice(0, 10) : '', aciklama: x.aciklama, photoCount: photoCount,
        islemTipi: x.islemTipi, imarDurumu: x.imarDurumu, tapuDurumu: x.tapuDurumu, sulama: x.sulama, ada: x.ada, parsel: x.parsel, enlem: x.enlem, boylam: x.boylam });
    else delete form.dataset.original;
    window.ListingPhotos?.render(x, { api, toast, onChange: fresh => { if (isDetailPage()) void renderDetail(fresh.id); } });

    try {
        window.formatListingPhone?.();

        // Yeni ilanda kategori kullanıcıya seçtirilir; düzenlemede ilanın kategorisi açılır.
        window.ListingCategory.bind(form);
        window.ListingCategory.apply(form, x?.kategori || 'Meyve', { product: x?.meyveTuru ?? '', variety: x?.cesit ?? '' });
        if (!x) form.elements.namedItem('kategori').value = '';
        window.LocationPicker?.reset(form, x?.enlem ?? null, x?.boylam ?? null);

        await window.setupLocationSelectors(
            form,
            x?.il ?? '',
            x?.ilce ?? ''
        );

        window.ListingWizard?.refreshTiles();
        show('editorDialog');
    } catch (error) {
        toast(error.message);
    }

}

function openNewListingFromMenu() {
    closeAccountMenu();
    if (!user) {
        window.location.href = '/html/giris.html?returnUrl=' + encodeURIComponent('/?action=new-listing');
        return;
    }
    return openEditor();
}

// Header üzerindeki ilan verme düğmesi.
$('#newBtn').onclick = openNewListingFromMenu;

// Hesap menüsündeki ilan verme düğmesi.
document
    .querySelectorAll('[data-account-action="create-listing"]')
    .forEach(button => {
        button.onclick = openNewListingFromMenu;
    });
window.ListingWorkflow.bindEditor();
window.MarketTools.bindFilters($('#filters'), () => { page=1; return loadListings(); });
window.MarketCatalog.bind($('#filters'), () => { page = 1; return loadListings(); });
window.SavedSearch?.bind({ api, toast, requireLogin: mustLogin });
window.MarketCatalog.onCategory = async selection => {
    const kategori = selection?.kategori || '', meyveTuru = selection?.meyveTuru || '';
    if (view !== 'all') return changeView('all', { filters: { kategori, meyveTuru } });
    const form = $('#filters');
    form.elements.namedItem('kategori').value = kategori;
    window.MarketCatalog.fillProducts(form, meyveTuru);
    window.MarketCatalog.fillVarieties(form);
    page = 1;
    await loadListings();
};
function openCompose(listingId,recipientId,title,question=""){const f=$('#composeForm');f.reset();f.elements.namedItem('listingId').value=listingId;f.elements.namedItem('recipientId').value=recipientId;f.querySelector('.form-error').textContent='';$('#composeContext').textContent=title;f.elements.namedItem('body').value=question;show('composeDialog');}
$('#composeForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;submit(f,async()=>{const d=Object.fromEntries(new FormData(f));d.body=d.body.trim();await api('/api/messages','POST',d);close('composeDialog');toast('Mesaj gönderildi.');if(view==='messages')await loadMessages();});};
$('#reportForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;submit(f,async()=>{const d=Object.fromEntries(new FormData(f));await api('/api/meyve-ilanlari/'+d.id+'/report','POST',{reason:d.reason.trim()});close('reportDialog');toast('Bildirimin yönetime iletildi.');});};
const messageCenter = window.HasadimMessages.create({root: $('#messagesList'), more: $('#moreMessages'), api, currentUser: () => user, isActive: () => view === 'messages' && !isDetailPage(), onRead: () => window.messageAlerts?.refresh()});
window.messageAlerts = window.HasadimMessageNotifications.create({ api, currentUser: () => user, onChange: async changed => {
    if (view === 'messages' && !document.hidden && !isDetailPage()) {
        await messageCenter.load(false, true);
        await messageCenter.readVisible();
    }
}});
function loadMessages(append = false) { return messageCenter.load(append); }
$('#refreshMessages').onclick=()=>loadMessages();$('#moreMessages').onclick=()=>loadMessages(true);
async function loadReports(){const parent=$('#reportsList');parent.replaceChildren(el('p','Yükleniyor…'));try{const data=await api('/api/admin/reports');parent.replaceChildren();if(!data.length)empty(parent,'Açık şikâyet yok','Yeni bildirimler burada görüntülenecek.');for(const r of data){const c=el('article',undefined,'report');c.append(el('h3','#'+r.listingId+' · '+r.baslik),el('p',r.reason));const actions=el('div',undefined,'actions');actions.append(button('İlanı incele','secondary',()=>openDetail(r.listingId)),button(r.hidden?'İlanı tekrar göster':'İlanı gizle','danger',async()=>{try{await api(`/api/admin/listings/${r.listingId}/visibility?hidden=${!r.hidden}`,'POST');await loadReports();}catch(e){toast(e.message);}}),button('Şikâyeti kapat','primary',async()=>{try{await api(`/api/admin/reports/${r.id}/resolve`,'POST');await loadReports();}catch(e){toast(e.message);}}));c.append(actions);parent.append(c);}}catch(e){parent.replaceChildren(el('p',e.message,'form-error'));}}
$('#refreshAdmin').onclick = () => Promise.all([
    loadReports(), window.ListingWorkflow.loadQueue(1)
]);
(async () => {
    try {
        await session();
        window.messageAlerts.start();
        const params = new URLSearchParams(location.search);
        if (isDetailPage()) {
            syncHeaderQuery(params.get('q') || '');
            const id = params.get('id');
            if (!id) throw Error('İlan bağlantısında ilan kimliği bulunamadı.');
            window.MarketCatalog.highlight({});
            await renderDetail(id);
        } else {
            if (params.get('hesap') === 'silindi') {
                toast('Hesabın silindi. Hasadım’ı kullandığın için teşekkürler.');
                const clean = new URL(location.href); clean.searchParams.delete('hesap'); history.replaceState(null, '', clean.pathname + clean.search);
            }
            const initialView = params.get('view') || 'all';
            const permittedView = initialView === 'admin' && !user?.isAdmin
                ? 'all' : initialView;
            await changeView(permittedView, { query: (params.get('q') || '').slice(0, 150), filters: window.MarketCatalog.readUrl() });
            void window.MarketCatalog.refresh(api, { kategori: $('#filters').elements.namedItem('kategori').value, meyveTuru: $('#filters').elements.namedItem('meyveTuru').value });
            if (params.get('action') === 'new-listing' && !user) {
                window.location.href = '/html/giris.html?returnUrl=' + encodeURIComponent('/?action=new-listing');
                return;
            }
            if (params.get('action') === 'new-listing' && user) {
                const url = new URL(location.href); url.searchParams.delete('action'); history.replaceState(null, '', url.pathname + url.search);
                await openEditor();
            }
        }
    } catch (error) {
        const target = isDetailPage() ? $('#detailContent') : $('#listStatus');
        if (target) target.textContent = error.message;
        else toast(error.message);
    }
})();

let selectedPhotos = [];
let previewUrls = [];

const photoForm = document.querySelector('#editorForm');
const photoInput = photoForm.elements.namedItem('photo');
const photoPreviews = document.querySelector('#photoPreviews');

function refreshSelectedPhotos() {
    // Seçilen dosyaları input'a aktarır.
    // Mevcut FormData yükleme kodu bunların hepsini gönderir.
    const transfer = new DataTransfer();

    for (const file of selectedPhotos) {
        transfer.items.add(file);
    }

    photoInput.files = transfer.files;

    for (const url of previewUrls) {
        URL.revokeObjectURL(url);
    }

    previewUrls = [];
    photoPreviews.replaceChildren();

    selectedPhotos.forEach((file, index) => {
        const item = document.createElement('div');

        const image = document.createElement('img');
        const url = URL.createObjectURL(file);

        previewUrls.push(url);
        image.src = url;
        image.alt = file.name;

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'textbtn';
        remove.textContent = 'Kaldır';
        remove.setAttribute('aria-label', file.name + ' fotoğrafını kaldır');

        remove.onclick = () => {
            selectedPhotos.splice(index, 1);
            refreshSelectedPhotos();
        };

        item.append(image, remove);
        photoPreviews.append(item);
    });
}

function resetSelectedPhotos() {
    selectedPhotos = [];
    refreshSelectedPhotos();
}

// Yeni ilan veya düzenleme formu açılınca önceki seçimleri temizle.
photoForm.addEventListener('reset', resetSelectedPhotos);

photoInput.onchange = () => {
    const incoming = Array.from(photoInput.files);
    const combined = [...selectedPhotos];
    const existingCount = Number(photoForm.dataset.photoCount || 0);

    try {
        for (const file of incoming) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                throw new Error('JPG, PNG veya WebP fotoğraf seçmelisin.');
            }

            if (file.size === 0 || file.size > 5_000_000) {
                throw new Error('Her fotoğraf 0–5 MB arasında olmalıdır.');
            }

            const duplicate = combined.some(existing =>
                existing.name === file.name &&
                existing.size === file.size &&
                existing.lastModified === file.lastModified
            );

            if (!duplicate) combined.push(file);
        }

        if (existingCount + combined.length > 10) {
            throw new Error('Bir ilanda toplam en fazla 10 fotoğraf olabilir.');
        }

        selectedPhotos = combined;
        photoForm.querySelector('.form-error').textContent = '';
    } catch (error) {
        photoForm.querySelector('.form-error').textContent = error.message;
    }

    // Hatalı seçimde önceki geçerli fotoğrafları da korur.
    refreshSelectedPhotos();
};
