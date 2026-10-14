'use strict';
const $ = s => document.querySelector(s);
const fruits = {Elma:'🍎',Armut:'🍐',Portakal:'🍊',Mandalina:'🍊',Limon:'🍋',Üzüm:'🍇',Kiraz:'🍒',Vişne:'🍒',Şeftali:'🍑',Kayısı:'🍑',Erik:'🟣',Nar:'🔴',Çilek:'🍓',Karpuz:'🍉',Kavun:'🍈',Muz:'🍌',İncir:'🌿',Avokado:'🥑',Kivi:'🥝',Diğer:'🌱'};
const money = n => new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(n);
const number = n => new Intl.NumberFormat('tr-TR').format(n);
const date = v => v ? v.slice(0,10).split('-').reverse().join('.') : 'Belirtilmedi';
let user=null, csrf='', view='all', page=1, registration=false, listRequest=0, detailRequest=0, messageBefore=1;
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
}
function openAuth(){closeAccountMenu();window.location.href=user?'/html/profilim.html':'/html/giris.html';}
async function submit(form,task){const b=form.querySelector('[type=submit]')||form.querySelector('button');if(b.disabled)return;b.disabled=true;form.querySelector('.form-error').textContent='';try{await task();}catch(e){form.querySelector('.form-error').textContent=e.message;}finally{b.disabled=false;}}
$('#accountBtn').onclick=openAuth;
$('#logoutBtn').onclick=async()=>{closeAccountMenu();try{await api('/api/account/logout','POST');if(isDetailPage()){window.location.href='/';return;}await session();await changeView('all');toast('Çıkış yapıldı.');}catch(e){toast(e.message);}};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>close(b.dataset.close);
for(const name of Object.keys(fruits)){for(const id of ['fruitFilter','editorFruit']){const o=el('option',name);o.value=name;$('#'+id).append(o);}}
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
    if (!menu.contains(event.target) || event.target.closest('.account-menu-panel a')) {
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

async function changeView(next, { query = '' } = {}) {
    const titles = {
        all: 'Pazar yeri', mine: 'İlanlarım', history: 'Geçmiş ilanlar', favorites: 'Favorilerim',
        messages: 'Mesajlar', admin: 'Yönetim'
    };
    if (!Object.hasOwn(titles, next)) next = 'all';
    if (next !== 'all' && !mustLogin()) return;
    if (next === 'admin' && !user?.isAdmin) return;

    closeAccountMenu();
    view = next;
    page = 1;
    listRequest++;
    window.setBreadcrumbs?.([
        { label: 'Ana sayfa', href: '/' }, { label: titles[next] }
    ]);
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
    history.replaceState(null, '', url.pathname + url.search + url.hash);
}
function empty(parent,title,text){const n=el('div',undefined,'empty');n.append(el('strong',title),el('p',text));parent.append(n);}
async function loadListings(){
 syncHeaderQuery($('#filters').elements.namedItem('q').value);
 updateMarketAddress();
 const request=++listRequest;const f=new FormData($('#filters'));const p=new URLSearchParams();for(const [k,v]of f)if(v)p.set(k,v.trim());
 if(f.get('minFiyat')&&f.get('maxFiyat')&&Number(f.get('minFiyat'))>Number(f.get('maxFiyat'))){$('#listStatus').textContent='En düşük fiyat, en yüksek fiyattan büyük olamaz.';return;}
 p.set('page',page);if(view==='mine')p.set('mine','true');if(view==='history')p.set('history','true');if(view==='favorites')p.set('favorites','true');
 $('#listStatus').textContent='İlanlar yükleniyor…';$('#prevPage').disabled=true;$('#nextPage').disabled=true;
 try{const data=await api('/api/meyve-ilanlari?'+p);if(request!==listRequest)return;
 if(data.items.length===0&&page>1){page--;return loadListings();}
 $('#listings').replaceChildren();$('#listStatus').textContent='';$('#resultCount').textContent=number(data.total)+' ilan';
 if(!data.items.length)empty($('#listings'),view==='history'?'Henüz geçmiş ilanın yok':'Henüz ilan yok',view==='history'?'Süresi dolan ve satılan ilanların burada görünecek.':'Filtreleri değiştirebilir veya ilk ilanını verebilirsin.');
 for(const x of data.items)$('#listings').append(card(x));
 $('#pageLabel').textContent=page+' / '+Math.max(1,Math.ceil(data.total/data.pageSize));$('#prevPage').disabled=page<=1;$('#nextPage').disabled=page*data.pageSize>=data.total;
 }catch(e){if(request===listRequest){$('#listings').replaceChildren();$('#listStatus').textContent=e.message;}}
}
function picture(x, cls) {
    if (x.photoUrl) { const img = el('img', undefined, cls); img.src = x.photoUrl; img.alt = x.baslik; img.loading = 'lazy'; return img; }
    const n = el('div', fruits[x.meyveTuru] || '🌱', 'fruit-placeholder'); n.setAttribute('aria-label', x.meyveTuru + ' — fotoğraf eklenmemiş'); return n;
}
function card(x) {
    const c = el('article', undefined, 'card')
        , media = el('div', undefined, 'card-media');

    media.append(picture(x));
    const fav = button(x.favorite ? '♥' : '♡', 'favorite' + (x.favorite ? ' on' : ''),
        async () => {
            if (!mustLogin()) return; fav.disabled = true;
            try {
                await api(`/api/meyve-ilanlari/${x.id}/favorite`, x.favorite ? 'DELETE' : 'POST');
                x.favorite = !x.favorite; fav.textContent = x.favorite ? '♥' : '♡';
                fav.classList.toggle('on', x.favorite);
                fav.setAttribute('aria-pressed', String(x.favorite)); if (view === 'favorites') await loadListings();
            } catch (e) { toast(e.message); } finally { fav.disabled = false; }
        });
    fav.setAttribute('aria-label', 'Favorilere ekle / çıkar');
    fav.setAttribute('aria-pressed', String(x.favorite));
    if (x.status === 4 && x.active && !x.hidden) media.append(fav);
    const body = el('div', undefined, 'card-body');
    body.append(
        el('small', 'İlan No: ' + x.listingNumber, 'listing-number')
    );
    body.append(el('span', x.meyveTuru + (x.cesit ? ' / ' + x.cesit : ''), 'card-tag'),
        el('h3', x.baslik), el('p', x.il + ' / ' + x.ilce + ' · ' + number(x.miktarKg) + ' kg', 'card-meta'));
 window.ListingWorkflow.appendStatus(body, x);
 const price=el('p',money(x.kilogramFiyati),'price');price.append(el('small',' / kg'));body.append(price);
    const bottom = el('div', undefined, 'card-bottom'); bottom.append(el('span', x.ownerName, 'card-owner'), button('İlanı incele ↗', 'textbtn', () => openDetail(x.id)));

    body.append(bottom);
    c.append(media, body);

    c.classList.add('clickable-card');

    c.addEventListener('click', event => {
        if (event.target.closest(
            'a, button, input, select, textarea, label'
        )) {
            return;
        }

        openDetail(x.id);
    });

    return c;
}
$('#filters').onsubmit = e => { e.preventDefault(); page = 1; loadListings(); }; $('#clearFilters').onclick = () => {
    $('#filters').reset();
    page = 1; loadListings();
}; $('#prevPage').onclick = () => { page--; loadListings(); }; $('#nextPage').onclick = () => { page++; loadListings(); };
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
        if (request !== detailRequest) return;
        content.replaceChildren(); document.title = x.baslik + ' — Hasadım'; window.setBreadcrumbs?.([{ label: 'Ana sayfa', href: '/' }, { label: ({ mine: 'İlanlarım', history: 'Geçmiş ilanlar', favorites: 'Favorilerim', admin: 'Yönetim' })[new URLSearchParams(location.search).get('from')] || 'İlanlar', href: '/?view=' + encodeURIComponent(new URLSearchParams(location.search).get('from') || 'all') }, { label: x.baslik }]); const originSeller = new URLSearchParams(location.search).get('seller'); if (originSeller === x.ownerId) window.setBreadcrumbs?.([{ label: 'Ana sayfa', href: '/' }, { label: x.ownerName, href: '/html/satici.html?id=' + encodeURIComponent(originSeller) }, { label: x.baslik }]); const photos = x.photos || []; if (photos.length) content.append(createGallery(photos, x.baslik)); content.append(el('p', x.meyveTuru + ' / ' + (x.cesit || 'Çeşit belirtilmedi'), 'eyebrow'), el('h2', x.baslik), el('p', money(x.kilogramFiyati) + ' / kg', 'price'));
        const grid = el('div', undefined, 'detail-grid');
        for (const [k, v] of Object.entries({ 'Konum': x.il + ' / ' + x.ilce, 'Miktar': number(x.miktarKg) + ' kg', 'Hasat tarihi': date(x.hasatTarihi), 'İlan tarihi': date(x.olusturulmaTarihi), 'Satıcı': x.ownerName, 'İlan numarası': String(x.listingNumber) })) {
            const n = el('div');
            n.append(el('span', k), el('strong', v)); grid.append(n);
        } content.append(grid, el('p', x.aciklama || 'Açıklama eklenmemiş.', 'description'));
 window.ListingWorkflow.appendStatus(content, x);
 const actions = el('div', undefined, 'actions');
 const publiclyVisible = x.status === 4 && x.active && !x.hidden;
 if (x.isMine) {
     if (window.ListingWorkflow.editable(x)) {
         actions.append(button('İlanı düzenle', 'primary', () => openEditor(x)));
     }
     actions.append(button('İlanı sil', 'danger', async () => {
         if (!confirm('İlan silinsin mi? Mesaj geçmişi korunacak.')) return;
         try {
             await api('/api/meyve-ilanlari/' + id, 'DELETE');
             window.location.href = '/?view=mine';
         } catch (error) { toast(error.message); }
     }));
 } else if (user && publiclyVisible) {
     if (x.telefon) {
         const tel = el('a', 'Telefon: ' + x.telefon, 'secondary');
         tel.href = 'tel:' + x.telefon.replace(/[^+0-9]/g, '');
         actions.append(tel);
     }
     actions.append(button('Satıcıya mesaj gönder', 'primary',
         () => openCompose(x.id, x.ownerId, x.baslik)));
     actions.append(button('İlanı bildir', 'textbtn', () => {
         $('#reportForm').reset();
         $('#reportForm [name=id]').value = id;
         $('#reportForm .form-error').textContent = '';
         show('reportDialog');
     }));
 } else if (!user && publiclyVisible) {
     actions.append(button('İletişim için giriş yap', 'primary', openAuth));
 }
 window.ListingWorkflow.appendReviewActions(content, x);
 content.append(actions);const seller=el('section',undefined,'seller-box');content.append(seller);try{const p=await api('/api/profiles/'+x.ownerId);if(p.photoUrl){const img=el('img',undefined,'avatar');img.src=p.photoUrl;img.alt=p.displayName;seller.append(img);}const link=el('a',p.displayName);link.href='/html/satici.html?id='+p.id;seller.append(el('h3','Satıcı bilgileri'),link,el('p',[p.businessName,p.city,p.district].filter(Boolean).join(' · ')),el('p',p.emailVerified?'E-posta doğrulandı':'E-posta doğrulanmadı'));}catch{const link=el('a',x.ownerName+' — Satıcı profili');link.href='/html/satici.html?id='+x.ownerId;seller.append(link);}
 }catch(e){if(request===detailRequest)content.replaceChildren(el('p',e.message,'form-error'));}}

async function openEditor(x) {
    if (!mustLogin()) return;
    if (x && !window.ListingWorkflow.editable(x)) {
        toast('Bu ilan şu anda düzenlenemez.');
        return;
    }

    const form = $('#editorForm');

    form.reset();
    form.elements.namedItem('id').value = '';
    form.elements.namedItem('version').value = '';
    form.querySelector('.form-error').textContent = '';

    $('#editorTitle').textContent = x
        ? 'İlanını düzenle'
        : 'Yeni ilan ver';
    form.querySelector('[type="submit"]').textContent = x
        ? 'Değişiklikleri gönder' : 'İlan ver';

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

    try {
        window.formatListingPhone();

        window.setupFruitVarietySelectors(
            form,
            x?.meyveTuru ?? '',
            x?.cesit ?? ''
        );

        await window.setupLocationSelectors(
            form,
            x?.il ?? '',
            x?.ilce ?? ''
        );

        show('editorDialog');
    } catch (error) {
        toast(error.message);
    }

}

function openNewListingFromMenu() {
    closeAccountMenu();
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
function openCompose(listingId,recipientId,title){const f=$('#composeForm');f.reset();f.elements.namedItem('listingId').value=listingId;f.elements.namedItem('recipientId').value=recipientId;f.querySelector('.form-error').textContent='';$('#composeContext').textContent=title;show('composeDialog');}
$('#composeForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;submit(f,async()=>{const d=Object.fromEntries(new FormData(f));d.body=d.body.trim();await api('/api/messages','POST',d);close('composeDialog');toast('Mesaj gönderildi.');if(view==='messages')await loadMessages();});};
$('#reportForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;submit(f,async()=>{const d=Object.fromEntries(new FormData(f));await api('/api/meyve-ilanlari/'+d.id+'/report','POST',{reason:d.reason.trim()});close('reportDialog');toast('Bildirimin yönetime iletildi.');});};
async function loadMessages(append=false){const parent=$('#messagesList');if(!append){parent.replaceChildren(el('p','Yükleniyor…'));messageBefore=1;}$('#moreMessages').disabled=true;
 try{const data=await api('/api/messages'+(append&&messageBefore?'?page='+messageBefore:''));if(!append)parent.replaceChildren();if(!data.items.length&&!append)empty(parent,'Henüz mesajın yok','Bir ilandan satıcıya mesaj göndererek başlayabilirsin.');
 for(const m of data.items){const sent=m.senderId===user.id;const c=el('article',undefined,'message '+(sent?'sent':'received'));c.append(el('small',`${sent?'Gönderen: sen':'Gönderen: '+m.senderName} → ${sent?m.recipientName:'sen'} · ${new Date(m.createdAt.endsWith('Z')?m.createdAt:m.createdAt+'Z').toLocaleString('tr-TR')}`),el('h3',m.listingTitle),el('p',m.body));if(!sent)c.append(button('Yanıtla','secondary',()=>openCompose(m.listingId,m.senderId,m.listingTitle)));parent.append(c);}messageBefore++;$('#moreMessages').hidden=!data.hasMore;
 }catch(e){if(!append)parent.replaceChildren(el('p',e.message,'form-error'));else toast(e.message);}finally{$('#moreMessages').disabled=false;}}
$('#refreshMessages').onclick=()=>loadMessages();$('#moreMessages').onclick=()=>loadMessages(true);
async function loadReports(){const parent=$('#reportsList');parent.replaceChildren(el('p','Yükleniyor…'));try{const data=await api('/api/admin/reports');parent.replaceChildren();if(!data.length)empty(parent,'Açık şikâyet yok','Yeni bildirimler burada görüntülenecek.');for(const r of data){const c=el('article',undefined,'report');c.append(el('h3','#'+r.listingId+' · '+r.baslik),el('p',r.reason));const actions=el('div',undefined,'actions');actions.append(button('İlanı incele','secondary',()=>openDetail(r.listingId)),button(r.hidden?'İlanı tekrar göster':'İlanı gizle','danger',async()=>{try{await api(`/api/admin/listings/${r.listingId}/visibility?hidden=${!r.hidden}`,'POST');await loadReports();}catch(e){toast(e.message);}}),button('Şikâyeti kapat','primary',async()=>{try{await api(`/api/admin/reports/${r.id}/resolve`,'POST');await loadReports();}catch(e){toast(e.message);}}));c.append(actions);parent.append(c);}}catch(e){parent.replaceChildren(el('p',e.message,'form-error'));}}
$('#refreshAdmin').onclick = () => Promise.all([
    loadReports(), window.ListingWorkflow.loadQueue(1)
]);
(async () => {
    try {
        await session();
        const params = new URLSearchParams(location.search);
        if (isDetailPage()) {
            syncHeaderQuery(params.get('q') || '');
            const id = params.get('id');
            if (!id) throw Error('İlan bağlantısında ilan kimliği bulunamadı.');
            await renderDetail(id);
        } else {
            const initialView = params.get('view') || 'all';
            const permittedView = initialView === 'admin' && !user?.isAdmin
                ? 'all' : initialView;
            await changeView(permittedView, { query: (params.get('q') || '').slice(0, 150) });
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
