(()=>{
 const html=document.documentElement;
 const themeBtn=document.getElementById('themeBtn');
 const savedTheme=localStorage.getItem('bbmedia-theme');
 if(savedTheme==='dark' || (savedTheme!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)) html.dataset.theme='dark';
 themeBtn?.addEventListener('click',()=>{html.dataset.theme=html.dataset.theme==='dark'?'light':'dark';localStorage.setItem('bbmedia-theme',html.dataset.theme);themeBtn.setAttribute('aria-label',html.dataset.theme==='dark'?'Aktifkan mode terang':'Aktifkan mode gelap')});
 const today=new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date());
 const dateEl=document.getElementById('liveDate');if(dateEl)dateEl.textContent=today.toUpperCase();
 const overlay=document.getElementById('searchOverlay');const searchInput=document.getElementById('searchInput');
 function openSearch(){if(!overlay)return;overlay.hidden=false;document.body.style.overflow='hidden';searchInput?.focus()}
 function closeSearch(){if(!overlay)return;overlay.hidden=true;document.body.style.overflow='';document.getElementById('searchBtn')?.focus()}
 document.getElementById('searchBtn')?.addEventListener('click',openSearch);
 document.querySelectorAll('[data-close-search]').forEach(el=>el.addEventListener('click',closeSearch));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSearch();if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();openSearch()}});
 const nav=document.querySelector('.nav-rail');const menu=document.getElementById('menuBtn');
 menu?.addEventListener('click',()=>{const open=!nav.classList.contains('mobile-open');nav.classList.toggle('mobile-open',open);menu.setAttribute('aria-expanded',String(open))});
 const copyButtons=['copyBtn','copyBottom'].map(id=>document.getElementById(id)).filter(Boolean);
 copyButtons.forEach(btn=>btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);const old=btn.textContent;btn.textContent='Tautan tersalin ✓';setTimeout(()=>btn.textContent=old,2200)}catch{prompt('Salin URL artikel',location.href)}}));
 document.getElementById('shareBtn')?.addEventListener('click',async()=>{if(navigator.share){try{await navigator.share({title:document.title,url:location.href})}catch{}}else document.getElementById('copyBtn')?.click()});
 const dataEl=document.getElementById('searchData');if(!dataEl)return;
 let articles=[];try{articles=JSON.parse(dataEl.textContent||'[]')}catch{return}
 const form=document.getElementById('filterForm');const input=document.getElementById('filterQuery');const select=document.getElementById('categorySelect');const results=document.getElementById('searchResults');const count=document.getElementById('searchCount');const empty=document.getElementById('searchEmpty');
 const params=new URLSearchParams(location.search);input.value=params.get('q')||'';
 const escapeText=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function render(){const q=input.value.trim().toLocaleLowerCase('id-ID');const cat=select.value;
 const filtered=articles.filter(a=>(!cat||cat===a.category)&&(!q||[a.title,a.category,a.excerpt].some(s=>String(s).toLocaleLowerCase('id-ID').includes(q))));
 results.innerHTML=filtered.map(a=>`<article class="story-card"><a class="image-link" href="${a.href}"><img class="story-img" src="${escapeText(a.image||'')}" alt="${escapeText(a.image_alt||a.title)}" loading="lazy"></a><div class="card-content"><div class="story-meta"><span>${escapeText(a.category)}</span><span class="dot"></span><span>${a.demo?'Konten demo':'Artikel redaksi'}</span></div><h3><a href="${a.href}">${escapeText(a.title)}</a></h3><p>${escapeText(a.excerpt)}</p><a class="text-link" href="${a.href}">Baca selengkapnya →</a></div></article>`).join('');
 count.textContent=`${filtered.length} artikel ditemukan`;empty.hidden=!!filtered.length;
 const url=new URL(location.href);if(q)url.searchParams.set('q',input.value.trim());else url.searchParams.delete('q');history.replaceState({},'',url);
 }
 form?.addEventListener('submit',e=>{e.preventDefault();render()});select?.addEventListener('change',render);input?.addEventListener('input',render);render();
})();
