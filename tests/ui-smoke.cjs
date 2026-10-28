const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../src/Hasadim.Web/wwwroot');
class E {
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this._dataset={};this.listeners={};this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.className='';this._text='';this.files=[];this.open=false;this.type='';this.classList={toggle:(c,on)=>{const s=new Set(this.className.split(' '));if(on===undefined)on=!s.has(c);on?s.add(c):s.delete(c);this.className=[...s].join(' ');}};}
 set textContent(x){this._text=String(x);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent||'').join('');}
 append(...c){this.children.push(...c);for(const x of c)x.parent=this;}
 setAttribute(k,v){this.attributes[k]=String(v);if(['id','name','type','class','value'].includes(k))this[k==='class'?'className':k]=v;}
 get dataset(){let o=this._dataset;for(const[k,v]of Object.entries(this.attributes))if(k.startsWith('data-'))o[k.slice(5)]=v;return o;}
 addEventListener(n,f){(this.listeners[n]??=[]).push(f);}
 replaceChildren(...x){this.children=[];this._text='';this.append(...x);}
 all(){return this.children.flatMap(c=>[c,...c.all()]);}
 querySelectorAll(s){const parts=s.split(/\s+(?![^\[]*\])/);if(parts.length>1){const p=this.querySelector(parts.shift());return p?p.querySelectorAll(parts.join(' ')):[];}return this.all().filter(n=>match(n,s));}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 get elements(){const a=this.all().filter(n=>n.name);a.namedItem=n=>a.find(e=>e.name===n)||null;return a;}
 reset(){for(const x of this.elements){x.value=x.attributes.value||'';x.checked=Object.hasOwn(x.attributes,'checked');if(x.tagName==='select')x.value=x.children[0]?.value||'';}}
 showModal(){this.open=true;}close(){this.open=false;for(const f of this.listeners.close||[])f();}
}
function match(n,s){if(s.startsWith('#'))return n.id===s.slice(1);if(s.startsWith('.'))return n.className.split(' ').includes(s.slice(1));if(s.startsWith('[')){const[k,v]=s.slice(1,-1).split('=');return v===undefined?Object.hasOwn(n.attributes,k):n.attributes[k]===v.replace(/["']/g,'');}return n.tagName===s;}
const doc=new E('document');doc.createElement=t=>new E(t);
const html=fs.readFileSync(path.join(root,'html/index.html'),'utf8')
 .replace('<div id="siteLayout"></div>', fs.readFileSync(path.join(root,'html/layout.html'),'utf8'));
const stack=[doc],voids=new Set(['meta','link','input','br']);
for(const m of html.matchAll(/<\/?([a-z][\w-]*)([^>]*)>/gi)){const tag=m[1].toLowerCase();if(m[0].startsWith('</')){if(stack.at(-1).tagName===tag)stack.pop();continue;}const e=new E(tag);for(const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)){e.setAttribute(a[1],a[2]??'');if(['hidden','checked','disabled'].includes(a[1]))e[a[1]]=true;}stack.at(-1).append(e);if(!voids.has(tag))stack.push(e);}
doc.body=doc.querySelector("body");
E.prototype.removeAttribute=function(name){delete this.attributes[name];};
E.prototype.closest=function(selector){return match(this,selector)?this:this.parent?.closest(selector)||null;};
E.prototype.contains=function(node){return node===this||this.all().includes(node);};
E.prototype.reportValidity=function(){return true;};
E.prototype.setCustomValidity=function(message){this.validationMessage=message;};
E.prototype.setSelectionRange=function(start,end){this.selectionStart=start;this.selectionEnd=end;};
E.prototype.focus=function(){};
const baseCreate=doc.createElement;
doc.createElement=tag=>{
 const n=baseCreate(tag);
 n.classList.add=cls=>n.classList.toggle(cls,true);
 n.classList.remove=cls=>n.classList.toggle(cls,false);
 return n;
};
class FD {constructor(form){this.map=new Map();if(form)for(const e of form.elements){if(e.type==='checkbox'){if(e.checked)this.map.set(e.name,'on');}else if(e.type==='file')this.map.set(e.name,e.files[0]||{size:0,type:''});else this.map.set(e.name,e.value);}}getAll(k){const v=this.map.get(k);return v===undefined?[]:Array.isArray(v)?v:[v];}get(k){return this.map.get(k)??null;}has(k){return this.map.has(k);}append(k,v){this.map.set(k,v);}[Symbol.iterator](){return this.map[Symbol.iterator]();}}

const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', seller='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
let current={id:owner,displayName:'Burak',email:'burak@example.test',isAdmin:false};
let logs=[],counter=1,items=[{id:'00000000-0000-4000-8000-000000000001',ownerId:seller,ownerName:'Satıcı',baslik:'Korkuteli armut',meyveTuru:'Armut',cesit:'Deveci',miktarKg:1500,kilogramFiyati:30,il:'Antalya',ilce:'Korkuteli',active:true,hidden:false,telefon:'05000000000',hasatTarihi:'2026-09-25T00:00:00',olusturulmaTarihi:'2026-09-23T10:00:00',version:'AAAAAAAAAAE=',favorite:false}],messages=[];
items[0].status=4;
items[0].photos=[];
async function fetcher(url,opts={}){
 const method=opts.method||'GET';let body=opts.body;try{body=JSON.parse(body);}catch{}logs.push({url,method,body});let result=null;const u=new URL(url,'https://localhost');
 if(u.pathname==='/api/csrf')result={token:'csrf'};
 else if(url==='/api/account/me')result=current;
 else if(url==='/api/account/logout')current=null;
 else if(u.pathname==='/api/meyve-ilanlari'&&method==='GET'){
  const historical=x=>[5,6].includes(x.status)||(x.status===4&&x.expiresAt&&new Date(x.expiresAt)<=new Date());
  let r=items.filter(x=>x.active&&!x.hidden&&!historical(x));for(const k of ['meyveTuru','il'])if(u.searchParams.get(k))r=r.filter(x=>x[k]===u.searchParams.get(k));
  if(u.searchParams.get('mine'))r=items.filter(x=>x.ownerId===current.id&&!historical(x));
  if(u.searchParams.get('history'))r=items.filter(x=>x.ownerId===current.id&&historical(x)).map(x=>({...x,status:x.status===4?5:x.status,active:false}));
  if(u.searchParams.get('favorites'))r=r.filter(x=>x.favorite);
  result={items:r.map(x=>({...x,isMine:x.ownerId===current?.id})),total:r.length,page:1,pageSize:12};
 }else if(u.pathname==='/api/meyve-ilanlari/with-photos'&&method==='POST'){
  body=JSON.parse(body.get('listing'));const id='00000000-0000-4000-8000-'+String(++counter).padStart(12,'0');items.push({...body,id,ownerId:current.id,ownerName:current.displayName,status:1,active:false,hidden:false,photos:[{photoUrl:'/test.png'}],version:'AAAAAAAAAAE='});result={id,mesaj:'İlanın incelemeye gönderildi.'};
 }else if(/^\/api\/meyve-ilanlari\/[a-f0-9-]{36}$/.test(u.pathname)){
  const id=u.pathname.split('/').at(-1),x=items.find(x=>x.id===id);
  if(method==='GET')result={...x,isMine:x.ownerId===current?.id};if(method==='PUT'){assert(body.version,'Version must be sent');Object.assign(x,body,{status:1,active:false,reviewNote:null});result={id};}if(method==='DELETE')items=items.filter(x=>x.id!==id);
 }else if(url.endsWith('/favorite')){items.find(x=>x.id===u.pathname.split('/')[3]).favorite=method==='POST';}
 else if(url.startsWith('/api/profiles/'))result={id:seller,displayName:'Satıcı',emailVerified:true,city:'Antalya',district:'Merkez'};
 else if(url.endsWith('/photo'))result={};
 else if(url.startsWith('/api/messages')){if(method==='POST')messages.push({...body,id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',senderId:current.id,createdAt:'2026-09-23T12:00:00Z',listingTitle:'Armut',senderName:'Burak',recipientName:'Satıcı'});else result={items:messages,hasMore:false};}
 else if(url==='/api/admin/reports')result=[];
 return {ok:true,status:200,text:async()=>JSON.stringify(result),json:async()=>result};
}
const location={search:'',pathname:'/html/index.html',_href:'https://localhost/html/index.html',get href(){return this._href;},set href(v){this._href=new URL(v,'https://localhost').href;},replace(v){this.href=v;}};
const context=vm.createContext({document:doc,window:{location},fetch:fetcher,FormData:FD,location,URL,URLSearchParams,Intl,Date,Number,String,Object,Error,TypeError,console,setTimeout:(f,n)=>n===6000?0:setTimeout(f,n),clearTimeout,confirm:()=>true});
context.history={replaceState(_state,_title,url){location.href=new URL(url,'https://localhost').href;}};
context.window.formatListingPhone=()=>{};
context.window.setupFruitVarietySelectors=()=>{};
context.window.setupLocationSelectors=async()=>{};
const run=s=>vm.runInContext(s,context),tick=()=>new Promise(r=>setTimeout(r,15)),get=s=>doc.querySelector(s);
const field=(form,name,value)=>get(form).elements.namedItem(name).value=value;
function fill(){get('#editorForm').elements.namedItem('photo').files=[{size:100,type:'image/png'}];for(const [k,v]of Object.entries({baslik:'Korkuteli yeni elma',meyveTuru:'Elma',cesit:'Starking',miktarKg:'100',kilogramFiyati:'25',il:'Antalya',ilce:'Korkuteli',telefon:'0501 343 10 91',aciklama:'Test'}))field('#editorForm',k,v);}
(async()=>{
 vm.runInContext(fs.readFileSync(path.join(root,'js/listing-workflow.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(path.join(root,'js/app.js'),'utf8'),context);await tick();assert.equal(get('#listings').children.length,1);console.log('PASS: listing loaded');
 field('#filters','il','Mersin');await run('loadListings()');assert(get('#listings').textContent.includes('Henüz ilan yok'));get('#filters').reset();
 field('#filters','minFiyat','40');field('#filters','maxFiyat','20');await run('loadListings()');assert(get('#listStatus').textContent.includes('büyük olamaz'));get('#filters').reset();console.log('PASS: filters');
 run('openEditor()');fill();get('#editorForm').onsubmit({preventDefault(){},currentTarget:get('#editorForm')});await tick();assert.equal(items.length,2);const first=items[1].id;
 run('openEditor()');assert.equal(get('#editorForm').elements.namedItem('id').value,'');assert.equal(get('#editorForm').elements.namedItem('version').value,'');fill();get('#editorForm').onsubmit({preventDefault(){},currentTarget:get('#editorForm')});await tick();assert.equal(items.length,3);assert.notEqual(items[2].id,first);assert.equal(items[1].ownerId,items[2].ownerId);assert.equal(logs.filter(x=>x.method==='POST'&&x.url==='/api/meyve-ilanlari/with-photos').length,2);console.log('PASS: same user creates two listings with fresh GUID IDs');
 assert.equal(items[1].status,1);assert(get('#listings').textContent.includes('İncelemede'));
 assert(!items[1].active);assert(!items[2].active);
 const ownerDetail=new E('div');ownerDetail.id='detailContent';doc.append(ownerDetail);
 await run('renderDetail('+JSON.stringify(first)+')');
 assert(ownerDetail.textContent.includes('İncelemede'));
 assert(!ownerDetail.textContent.includes('İlanı düzenle'));
 items[1].status=2;items[1].reviewNote='İlçeyi kontrol et';
 await run('renderDetail('+JSON.stringify(first)+')');
 assert(ownerDetail.textContent.includes('İlçeyi kontrol et'));
 assert(ownerDetail.textContent.includes('İlanı düzenle'));
 const edit={...items[1],isMine:true,hasatTarihi:'2026-09-25T00:00:00'};await run('openEditor('+JSON.stringify(edit)+')');assert.equal(get('#editorForm').elements.namedItem('hasatTarihi').value,'2026-09-25');assert.equal(get('#editorForm').querySelector('[type="submit"]').textContent,'Değişiklikleri gönder');get('#editorForm').elements.namedItem('photo').files=[];field('#editorForm','baslik','Düzenlenmiş ilan');await get('#editorForm').onsubmit({preventDefault(){},currentTarget:get('#editorForm')});assert.equal(items[1].baslik,'Düzenlenmiş ilan');console.log('PASS: edit sends version and preserves date');
 items[1].status=4;items[1].active=true;items[1].expiresAt=new Date(Date.now()-1000).toISOString();
 await run('changeView("history")');
 assert(get('#listings').textContent.includes('Düzenlenmiş ilan'));
 assert(get('#listings').textContent.includes('Süresi doldu'));
 assert(get('#myListingTabs').hidden===false);
 assert(logs.some(x=>x.url.includes('history=true')));
 await run('changeView("mine")');
 assert(!get('#listings').textContent.includes('Düzenlenmiş ilan'));
 console.log('PASS: expired listings move from current listings into history');
 await run('openDetail('+JSON.stringify(items[0].id)+')');assert.equal(location.href,'https://localhost/html/ilan.html?id='+items[0].id+'&from=mine');console.log('PASS: details');
 run('openCompose('+JSON.stringify(items[0].id)+','+JSON.stringify(seller)+',"Armut")');field('#composeForm','body','Merhaba');get('#composeForm').onsubmit({preventDefault(){},currentTarget:get('#composeForm')});await tick();assert.equal(messages[0].listingId,items[0].id);await run('changeView("messages")');assert(get('#messagesList').textContent.includes('Merhaba'));console.log('PASS: messages preserve GUID');
 await run('changeView("all")');const fav=get('#listings').querySelector('.favorite');await fav.listeners.click[0]();assert(items[0].favorite);console.log('PASS: favorite');
 field('#reportForm','id',items[0].id);field('#reportForm','reason','Test');get('#reportForm').onsubmit({preventDefault(){},currentTarget:get('#reportForm')});await tick();assert(logs.some(x=>x.url.endsWith('/report')));console.log('PASS: report');
 await get('#logoutBtn').onclick();run('openEditor()');assert.equal(location.href,'https://localhost/html/giris.html');console.log('PASS: separate login page redirect');
 const detail=ownerDetail;await run('renderDetail('+JSON.stringify(items[0].id)+')');assert(detail.textContent.includes('Satıcı bilgileri'));assert(detail.textContent.includes('İletişim için giriş yap'));console.log('PASS: separate detail content and seller card');
 const gallery=run('createGallery([{photoUrl:"/one.png"},{photoUrl:"/two.png"}],"Elma")');assert(gallery.querySelector('.photo-counter').textContent.includes('1 / 2'));await gallery.querySelectorAll('.thumbnail')[1].listeners.click[0]();assert(gallery.querySelector('.detail-image').src==='/two.png');assert(gallery.querySelector('.photo-counter').textContent.includes('2 / 2'));await gallery.querySelector('.gallery-open').listeners.click[0]();const modal=gallery.querySelector('dialog');assert(modal.open);modal.listeners.keydown[0]({key:'ArrowRight',preventDefault(){}});assert(gallery.querySelector('.lightbox-image').src==='/one.png');console.log('PASS: gallery count, thumbnail switch, enlargement and keyboard navigation');
 console.log('ALL MOCK UI TESTS PASSED');
})().catch(e=>{console.error(e);process.exitCode=1;});
