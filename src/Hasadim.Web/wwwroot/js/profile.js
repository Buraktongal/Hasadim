"use strict";
const $=s=>document.querySelector(s),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};let csrf='',page=1;
async function api(url,method='GET',body){if(method!=='GET'&&!csrf){const r=await fetch('/api/csrf');csrf=(await r.json()).token;}const headers={};if(method!=='GET')headers['X-CSRF-TOKEN']=csrf;if(body&&!(body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body);}const r=await fetch(url,{method,headers,body});const data=await r.json().catch(()=>null);if(!r.ok){if(r.status===401&&document.body.dataset.page==='edit'){location.href='/html/giris.html';}throw Error(data?.mesaj||(data?.errors?Object.values(data.errors).flat().join(' '):'İşlem tamamlanamadı.'));}return data;}
function status(t){$('#status').textContent=t;}
async function busy(button,fn){button.disabled=true;try{await fn();}catch(e){status(e.message);}finally{button.disabled=false;}}
function image(p,parent){if(!p.photoUrl)return;const img=node('img');img.src=p.photoUrl;img.alt=p.displayName;img.className='avatar';parent.append(img);}
let currentProfile = null;
function metadata(p) {
    currentProfile = p;
    $('#avatar').hidden = !p.photoUrl;
    if (p.photoUrl) $('#avatar').src = p.photoUrl;
    $('#name').textContent = p.displayName;
    $('#summary').textContent = 'Profil tamamlanma: %' + p.completion + ' · ' + p.activeListingCount + ' aktif ilan';
    $('#publicLink').href = '/html/satici.html?id=' + p.id;
    $('#publicLink').hidden = false;
    $('#profileForm').elements.namedItem('version').value = p.version;
    $('#emailInfo').textContent = p.email + ' · ' + (p.emailVerified ? 'E-posta doğrulandı' : 'E-posta doğrulanmadı');
    $('#deletePhoto').hidden = !p.photoUrl;
    const activities = { Producer: 'Üretici', Buyer: 'Alıcı', Trader: 'Tüccar', Cooperative: 'Kooperatif', Other: 'Diğer' };
    const details = [
        ['Görünen ad', p.displayName],
        ['Hesap türü', p.accountType === 'Business' ? 'Kurumsal · Kullanıcı beyanı' : 'Bireysel'],
        ['Faaliyet', activities[p.activity]],
        ...(p.accountType === 'Business' ? [['Firma adı', p.businessName]] : []),
        ['Konum', [p.city, p.district].filter(Boolean).join(' / ')],
        ['Hakkımda', p.about],
        ['Telefon görünürlüğü', p.showPhone ? 'Giriş yapan kullanıcılara açık' : 'Gizli'],
        ['E-posta', p.email], ['Telefon', p.phone]
    ];
    const root = $('#profileDetails');
    root.replaceChildren();
    for (const [label, value] of details) {
        const row = node('div');
        const content = node('dd');
        content.append(node('span', value || 'Henüz eklenmedi'));
        if (label === 'E-posta' || label === 'Telefon') {
            content.className = 'profile-contact';
            const verified = label === 'E-posta' ? p.emailVerified : p.phoneVerified;
            const badge = node('span', verified ? 'Doğrulandı' : 'Doğrulanmadı');
            badge.className = 'verification-badge ' + (verified ? 'verified' : 'unverified');
            content.append(badge);
            if (!verified) {
                const action = node('button', label === 'E-posta' ? 'E-postamı doğrula' : 'Telefonumu doğrula');
                action.type = 'button';
                if (label === 'E-posta') {
                    action.onclick = () => {
                        if (action.disabled) return;
                        return busy(action, async () => {
                            const result = await api('/api/account/me/resend-confirmation', 'POST');
                            status(result.mesaj);
                        });
                    };
                } else {
                    action.disabled = true;
                    action.setAttribute('aria-describedby', 'phoneVerificationHelp');
                    const help = node('small', p.phone
                        ? 'SMS ile doğrulama henüz kullanıma açılmadı.'
                        : 'Önce Bilgilerimi düzenle bölümünden telefon numaranı ekle. SMS ile doğrulama henüz kullanıma açılmadı.');
                    help.id = 'phoneVerificationHelp';
                    help.className = 'verification-help';
                    content.append(help);
                }
                content.append(action);
            }
        }
        row.append(node('dt', label), content);
        root.append(row);
    }
}
async function edit() {
    const form = $('#profileForm');
    const editButton = $('#editProfile');
    const cancelButton = $('#cancelProfile');
    const saveButton = $('#saveProfile');
    const type = form.elements.namedItem('accountType');
    function business() {
        $('#businessField').hidden = type.value !== 'Business';
        form.elements.namedItem('businessName').required = type.value === 'Business';
    }
    function closeEditor() {
        $('#profileEditor').hidden = true;
        $('#profileOverview').hidden = false;
        editButton.setAttribute('aria-expanded', 'false');
        form.reset();
        $('#photoForm').reset();
        editButton.focus();
    }
    metadata(await api('/api/profiles/me'));
    $('#profileOverview').hidden = false;
    status('');
    type.onchange = business;
    editButton.onclick = () => busy(editButton, async () => {
        status('İl ve ilçe listesi yükleniyor…');
        form.reset();
        for (const [key, value] of Object.entries(currentProfile)) {
            const field = form.elements.namedItem(key);
            if (!field || key === 'city' || key === 'district') continue;
            if (field.type === 'checkbox') field.checked = !!value;
            else field.value = value ?? '';
        }
        business();
        await window.setupLocationSelectors(form, currentProfile.city, currentProfile.district, 'city', 'district');
        $('#profileOverview').hidden = true;
        $('#profileEditor').hidden = false;
        editButton.setAttribute('aria-expanded', 'true');
        $('#editorHeading').focus();
        const city = form.elements.namedItem('city').value;
        const district = form.elements.namedItem('district').value;
        status((currentProfile.city && !city) || (currentProfile.district && !district)
            ? 'Kayıtlı konum listede bulunamadı. Lütfen il ve ilçeni yeniden seç.' : '');
    });
    cancelButton.onclick = () => { closeEditor(); status('Değişiklikler iptal edildi.'); };
    form.onsubmit = e => {
        e.preventDefault();
        if (saveButton.disabled) return;
        cancelButton.disabled = true;
        return busy(saveButton, async () => {
            const city = form.elements.namedItem('city');
            const district = form.elements.namedItem('district');
            if (city.disabled || district.disabled || !city.value || !district.value)
                throw Error('Lütfen il ve ilçe seç.');
            const data = Object.fromEntries(new FormData(form));
            data.showPhone = form.elements.namedItem('showPhone').checked;
            await api('/api/profiles/me', 'PUT', data);
            metadata(await api('/api/profiles/me'));
            closeEditor();
            status('Profilin güncellendi.');
        }).finally(() => { cancelButton.disabled = false; });
    };
    $('#photoForm').onsubmit = e => {
        e.preventDefault();
        if (e.submitter.disabled) return;
        return busy(e.submitter, async () => {
            const body = new FormData(e.currentTarget), file = body.get('file');
            if (!file || !file.size) throw Error('Bir fotoğraf seç.');
            if (file.size > 3000000) throw Error('Fotoğraf en fazla 3 MB olabilir.');
            metadata(await api('/api/profiles/me/photo', 'POST', body));
            $('#photoForm').reset();
            status('Profil fotoğrafı güncellendi.');
        });
    };
    $('#deletePhoto').onclick = e => busy(e.currentTarget, async () => {
        await api('/api/profiles/me/photo', 'DELETE');
        metadata(await api('/api/profiles/me'));
        status('Fotoğraf kaldırıldı.');
    });
}
const id=new URLSearchParams(location.search).get('id');
async function listings(){const data=await api('/api/meyve-ilanlari?ownerId='+encodeURIComponent(id)+'&page='+page),root=$('#sellerListings');root.replaceChildren();$('#count').textContent=data.total+' ilan';if(!data.items.length)root.append(node('p','Henüz yayında ilan yok.'));for(const x of data.items){const c=node('article');c.className='card';if(x.photoUrl){const img=node('img');img.src=x.photoUrl;img.alt=x.baslik;img.className='seller-list-image';c.append(img);}const body=node('div');body.className='card-body';const link=node('a',x.baslik);link.href='/html/ilan.html?id='+x.id+'&seller='+encodeURIComponent(id);body.append(link,node('p',x.il+' / '+x.ilce),node('strong',new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(x.kilogramFiyati)+' / kg'));c.append(body);root.append(c);}$('#pageLabel').textContent=page+' / '+Math.max(1,Math.ceil(data.total/data.pageSize));$('#previous').disabled=page===1;$('#next').disabled=page*data.pageSize>=data.total;}
async function seller(){if(!/^[0-9a-f-]{36}$/i.test(id||''))throw Error('Satıcı bağlantısı geçersiz.');const p=await api('/api/profiles/'+id),root=$('#seller');window.setBreadcrumbs?.([{label:'Ana sayfa',href:'/'},{label:'Satıcılar'},{label:p.displayName}]);image(p,root);root.append(node('h1',p.displayName),node('p',p.accountType==='Business'?'Kurumsal hesap · Kullanıcı beyanı':'Bireysel hesap'));if(p.businessName)root.append(node('h2',p.businessName));root.append(node('p',[p.city,p.district].filter(Boolean).join(' / ')),node('p',p.about),node('p',p.memberSince?'Üyelik: '+p.memberSince.slice(0,10):'Üyelik tarihi kayıtlı değil'),node('p',p.emailVerified?'E-posta doğrulandı':'E-posta doğrulanmadı'));if(p.phone){const link=node('a',p.phone);link.href='tel:'+p.phone.replace(/[^+0-9]/g,'');root.append(link);}else root.append(node('p','Telefon gizli veya görüntülemek için giriş yapmalısın.'));$('#previous').onclick=()=>{page--;listings().catch(e=>status(e.message));};$('#next').onclick=()=>{page++;listings().catch(e=>status(e.message));};await listings();}
(document.body.dataset.page==='edit'?edit():seller()).catch(e=>status(e.message));
