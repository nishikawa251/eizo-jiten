{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const store={get(k,d){try{const v=localStorage.getItem('eizo-'+k);return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('eizo-'+k,JSON.stringify(v))}catch(e){}}};
const hira=s=>String(s??'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const norm=s=>hira(String(s??'').normalize('NFKC').toLowerCase()).replace(/\s+/g,' ');
const ROWS=[['あ','あいうえお'],['か','かきくけこ'],['さ','さしすせそ'],['た','たちつてと'],['な','なにぬねの'],['は','はひふへほ'],['ま','まみむめも'],['や','やゆよ'],['ら','らりるれろ'],['わ','わをん']];
const SMALL={'ぁ':'あ','ぃ':'い','ぅ':'う','ぇ':'え','ぉ':'お','っ':'つ','ゃ':'や','ゅ':'ゆ','ょ':'よ','ゎ':'わ'};
const rowOf=r=>{let c=hira(r).normalize('NFD').charAt(0);c=SMALL[c]||c;const f=ROWS.find(x=>x[1].includes(c));return f?f[0]:'他'};
const hasKanji=s=>/[㐀-鿿々A-Za-z0-9]/.test(s);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const CHK=document.body.dataset.chk||'出典に説明がないため、作例から推して書いた下書きです';
const EMPTY='<p class="empty">見つかりませんでした。言葉を変えてみてください。</p>';

let T=[],V=new Map(),SECS=[],BY=new Map();
const th=id=>'https://i.ytimg.com/vi/'+encodeURIComponent(id)+'/mqdefault.jpg';
const st={view:store.get('view','jiten')==='works'?'works':'jiten',order:store.get('order','cat')==='kana'?'kana':'cat',names:!!store.get('names',false),sec:'',row:'',q:'',shuffle:false,ord:null};

const tsec=n=>{const m=String(n).match(/(\d{1,2}):(\d{2})/);return m?(+m[1])*60+(+m[2]):0};
const ytUrl=(id,note)=>{const t=tsec(note);return 'https://www.youtube.com/watch?v='+encodeURIComponent(id)+(t?'&t='+t+'s':'')};
const embedUrl=(id,note)=>{const t=tsec(note);return 'https://www.youtube.com/embed/'+encodeURIComponent(id)+'?autoplay=1&rel=0&playsinline=1'+(t?'&start='+t:'')};
const pathOf=t=>[t.s,t.b].filter(Boolean).join(' › ');
const href=n=>'#'+encodeURIComponent(n);

function frame(id,title,showTags){
  const v=V.get(id);title=title||v.title;
  const tags=showTags?'<span class="tags">'+v.techs.map(x=>'<span>'+esc(T[x.i].t)+'</span>').join('')+'</span>':'';
  return '<button class="frame" type="button" data-id="'+esc(id)+'" aria-label="'+esc(title)+'"><img loading="lazy" alt="" src="'+esc(th(id))+'"><span class="cap">'+esc(title)+'</span>'+tags+'</button>';
}
function readsHtml(t){
  const a=[];
  if(hasKanji(t.t))a.push('<span class="yomi">'+esc(t.r)+'</span>');
  if(t.e)a.push('<span class="en" lang="en">'+esc(t.e)+'</span>');
  return a.length?'<span class="reads">'+a.join('')+'</span>':'';
}
function defHtml(t){
  let h=t.def?'<p class="def">'+esc(t.def)+(t.chk?'<span class="chk" title="'+esc(CHK)+'">要確認</span>':'')+'</p>':'<p class="def none">説明はまだありません。</p>';
  if(t.x)h+='<p class="def x">補足：'+esc(t.x)+'</p>';
  return h;
}
function inView(t){
  if(st.q&&!t.hay.includes(st.q))return false;
  return st.order==='cat'?(!st.sec||t.s===st.sec):(!st.row||t.row===st.row);
}
function entry(t){
  const path=st.order==='cat'?t.b:pathOf(t);
  return '<article class="entry" id="w'+t.i+'"><div class="txt">'+
    (path?'<span class="path">'+esc(path)+'</span>':'')+
    '<h3><span class="hw">'+esc(t.t)+'</span></h3>'+readsHtml(t)+defHtml(t)+
    (t.rel.length?'<p class="rel"><span>関連</span>'+t.rel.map(n=>'<a href="'+esc(href(n))+'">'+esc(n)+'</a>').join('')+'</p>':'')+
    '</div><div class="strip">'+t.v.map(v=>frame(v.id,v.title,false)).join('')+'</div></article>';
}
function renderJiten(){
  const list=T.filter(inView);
  const groups=[];
  if(st.order==='cat'){
    SECS.forEach(s=>{const items=list.filter(t=>t.s===s);if(items.length)groups.push({name:s,items})});
  }else{
    const sorted=[...list].sort((a,b)=>a.r.localeCompare(b.r,'ja')||a.t.localeCompare(b.t,'ja'));
    [...ROWS.map(r=>r[0]),'他'].forEach(k=>{const items=sorted.filter(t=>t.row===k);if(items.length)groups.push({name:k,items})});
  }
  $('main').innerHTML='<p class="count">'+list.length+'の手法</p>'+(groups.length?groups.map(g=>'<section class="grp"><h2 class="gh"><b>'+esc(g.name)+'</b><span>'+g.items.length+'</span></h2>'+g.items.map(entry).join('')+'</section>').join(''):EMPTY);
}
function renderWorks(){
  let ids=[...V.keys()].filter(id=>{const v=V.get(id);
    if(st.sec&&!v.techs.some(x=>T[x.i].s===st.sec))return false;
    return !st.q||v.hay.includes(st.q)||v.techs.some(x=>T[x.i].hayT.includes(st.q));});
  if(st.shuffle&&st.ord)ids.sort((a,b)=>st.ord.get(a)-st.ord.get(b));
  $('main').innerHTML='<p class="count">'+ids.length+'本の作例</p>'+(ids.length?'<div class="grid">'+ids.map(id=>frame(id,'',st.names)).join('')+'</div>':EMPTY);
}
function chips(){
  const kana=st.view==='jiten'&&st.order==='kana';
  const items=kana?['',...ROWS.map(r=>r[0]).filter(k=>T.some(t=>t.row===k))]:['',...SECS];
  const cur=kana?st.row:st.sec;
  $('chips').setAttribute('aria-label',kana?'五十音':'大分類');
  $('chips').innerHTML=items.map(s=>'<button type="button" data-k="'+esc(s)+'" aria-pressed="'+(cur===s)+'">'+esc(s?(kana?s+'行':s):'すべて')+'</button>').join('');
}
function render(){
  const j=st.view==='jiten';
  $('vJiten').setAttribute('aria-pressed',j);$('vWorks').setAttribute('aria-pressed',!j);
  $('sortSeg').hidden=!j;$('names').hidden=j;$('shuffle').hidden=j;
  $('oCat').setAttribute('aria-pressed',st.order==='cat');$('oKana').setAttribute('aria-pressed',st.order==='kana');
  $('names').setAttribute('aria-pressed',st.names);$('shuffle').setAttribute('aria-pressed',st.shuffle);
  chips();
  if(j)renderJiten();else renderWorks();
}
function toTop(){const m=$('main'),y=m.getBoundingClientRect().top+scrollY-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--barh')||0);if(scrollY>y)scrollTo({top:y})}

let opener=null;
function open(id){
  const v=V.get(id);if(!v)return;
  if(!$('veil').classList.contains('on'))opener=document.activeElement;
  const first=v.techs[0];
  const words=v.techs.map(x=>{const t=T[x.i];
    const others=t.v.filter(o=>o.id!==id);
    return '<div class="word"><span class="path">'+esc(pathOf(t))+'</span><h3><mark>'+esc(t.t)+'</mark></h3>'+readsHtml(t)+defHtml(t)+
      (x.n?'<p class="note">この作品では：'+esc(x.n)+(tsec(x.n)?' <button class="seek" type="button" data-id="'+esc(id)+'" data-n="'+esc(x.n)+'">ここから再生</button>':'')+'</p>':'')+
      '<a class="toj" href="'+esc(href(t.t))+'">辞典で見る →</a>'+
      (others.length?'<div class="more">「'+esc(t.t)+'」の他の作例</div><div class="mini">'+others.map(o=>'<button type="button" data-id="'+esc(o.id)+'" title="'+esc(o.title)+'"><img loading="lazy" alt="'+esc(o.title)+'" src="'+esc(th(o.id))+'"></button>').join('')+'</div>':'')+'</div>';}).join('');
  $('sheet').innerHTML='<div class="pic"><div class="player"><iframe src="'+esc(embedUrl(id,first.n))+'" title="'+esc(v.title)+'" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div><div class="vt">'+esc(v.title)+'</div><a class="yt" href="'+esc(ytUrl(id,first.n))+'" target="_blank" rel="noopener">YouTubeで開く</a></div><div class="info"><button class="close" id="close" type="button" aria-label="閉じる">×</button>'+words+'</div>';
  $('veil').classList.add('on');document.body.classList.add('lock');$('sheet').scrollTop=0;$('close').focus();
}
function closeSheet(restore){
  if(!$('veil').classList.contains('on'))return;
  $('veil').classList.remove('on');document.body.classList.remove('lock');$('sheet').innerHTML='';
  if(restore&&opener&&document.contains(opener))opener.focus({preventScroll:true});
  opener=null;
}
function goHash(){
  let h='';try{h=decodeURIComponent(location.hash.slice(1))}catch(e){return}
  if(!h||!BY.has(h))return;
  const t=T[BY.get(h)];
  closeSheet(false);
  if(st.view!=='jiten'){st.view='jiten';store.set('view','jiten')}
  if(!inView(t)){st.q='';$('q').value='';st.sec='';st.row=''}
  render();
  const el=$('w'+t.i);if(!el)return;
  el.classList.add('hit');
  const far=Math.abs(el.getBoundingClientRect().top)>innerHeight*1.5;
  el.scrollIntoView({block:'start',behavior:reduce||far?'auto':'smooth'});
}

$('q').addEventListener('input',e=>{st.q=norm(e.target.value.trim());render()});
$('vJiten').onclick=()=>{st.view='jiten';store.set('view','jiten');render();toTop()};
$('vWorks').onclick=()=>{st.view='works';store.set('view','works');render();toTop()};
$('oCat').onclick=()=>{st.order='cat';store.set('order','cat');render();toTop()};
$('oKana').onclick=()=>{st.order='kana';store.set('order','kana');render();toTop()};
$('names').onclick=()=>{st.names=!st.names;store.set('names',st.names);render()};
$('shuffle').onclick=()=>{st.shuffle=!st.shuffle;if(st.shuffle)st.ord=new Map([...V.keys()].map(k=>[k,Math.random()]));render()};
$('chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(st.view==='jiten'&&st.order==='kana')st.row=b.dataset.k;else st.sec=b.dataset.k;render();toTop()});
$('main').addEventListener('click',e=>{const b=e.target.closest('.frame');if(b)open(b.dataset.id)});
$('veil').addEventListener('click',e=>{
  if(e.target.id==='veil'||e.target.id==='close')return closeSheet(true);
  const k=e.target.closest('.seek');if(k){const f=$('sheet').querySelector('iframe');if(f)f.src=embedUrl(k.dataset.id,k.dataset.n);return}
  const b=e.target.closest('.mini button');if(b)open(b.dataset.id)});
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]');if(!a)return;
  e.preventDefault();history.pushState(null,'',a.getAttribute('href'));goHash()});
addEventListener('popstate',goHash);
addEventListener('hashchange',goHash);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet(true)});

const bar=document.querySelector('.bar');
const setBar=()=>document.documentElement.style.setProperty('--barh',(getComputedStyle(bar).position==='sticky'?bar.offsetHeight:0)+'px');
new ResizeObserver(setBar).observe(bar);addEventListener('resize',setBar);setBar();

Promise.all([
  fetch('data/techs.json').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}),
  fetch('data/jiten.json').then(r=>r.ok?r.json():{}).catch(()=>({}))
]).then(([techs,J])=>{
  T=techs;
  T.forEach((t,i)=>{
    const j=J[t.t]||{};
    t.i=i;t.r=j.r||hira(t.t);t.e=j.e||'';t.def=t.d||j.d||'';t.chk=!t.d&&!!j.d&&!!j.k;t.x=t.d?(j.x||''):'';
    t.row=rowOf(t.r);
    if(!SECS.includes(t.s))SECS.push(t.s);
    if(!BY.has(t.t))BY.set(t.t,i);
    t.hayT=norm([t.t,t.r,t.e,t.def,t.x].join(' '));
    t.hay=norm([t.t,t.r,t.e,t.def,t.x,t.s,t.b,...t.v.map(v=>v.title+' '+v.n)].join(' '));
    t.v.forEach(v=>{if(!V.has(v.id))V.set(v.id,{title:v.title,techs:[],hay:''});const e=V.get(v.id);if(!e.techs.some(x=>x.i===i))e.techs.push({i,n:v.n});e.hay+=' '+norm(v.title)});
  });
  T.forEach(t=>{t.rel=((J[t.t]||{}).rel||[]).filter(n=>BY.has(n)&&n!==t.t)});
  $('stat').textContent='手法'+T.length+'・作例'+V.size+'本を収録。';
  render();
  if(location.hash)goHash();
}).catch(()=>{$('main').innerHTML='<p class="empty">データを読み込めませんでした。ページを再読み込みしてください。</p>'});
}
