import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { prepareBbwebArticles } from './bbweb-adapter.mjs';

const root = process.cwd();
const out = join(root, 'dist');
const ORIGIN = 'https://media.bisabikinweb.site';
const website = 'BisaBikinWeb Media';
const INDEXABLE = process.env.MEDIA_INDEXABLE === 'true';
const supabaseUrl = (process.env.PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
const supabaseKey = (process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();
const categories = ['Nasional','Ekonomi','Bisnis','Teknologi','Internasional','Pendidikan','Lifestyle','Digital','Ekspor'];
const slugify = str => String(str).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const excerpt = (str, len = 165) => String(str || '').length > len ? String(str).slice(0,len-1).trimEnd()+'…' : String(str||'');
const date = d => d && !Number.isNaN(Date.parse(d)) ? new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(d)) : 'Konten contoh';
const jsonSafe = obj => JSON.stringify(obj).replace(/</g,'\\u003c');
const articleUrl = a => `/artikel/${encodeURIComponent(a.slug)}/`;
const categoryUrl = c => `/kategori/${slugify(c)}/`;

async function publicArticles(){
  if (!supabaseUrl || !supabaseKey) return null;
  const endpoint = `${supabaseUrl}/rest/v1/media_articles?select=title,slug,category,excerpt,body,image,image_alt,image_credit,author,published_at,updated_at,read_minutes,featured,status&status=eq.published&order=published_at.desc&limit=150`;
  const response = await fetch(endpoint,{headers:{apikey:supabaseKey,accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error(`Supabase articles request: ${response.status}, ${await response.text()}`);
  return response.json();
}
async function bbwebArticles(){
  // Read *publishable* config from the checked-out main site, never a server key.
  const configPath = join(root, process.env.MEDIA_MAIN_CONFIG_PATH || 'source-main/static-source/lib/supabase.ts');
  const config = await readFile(configPath, 'utf8');
  const url = config.match(/const SUPABASE_URL='([^']+)'/)?.[1];
  const key = config.match(/const SUPABASE_KEY='([^']+)'/)?.[1];
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url || '') || !key || /^(sb_secret_|service_role)/.test(key)) {
    throw new Error('Public Supabase config not available in main website source');
  }
  const endpoint = new URL(url + '/rest/v1/bbweb_articles');
  endpoint.searchParams.set('select','id,title,category,read_time,summary,body,cover_image_url,sort_order,status,is_active,published_at,updated_at,created_at,seller_id,author_store_name,author_type');
  endpoint.searchParams.set('status','eq.published');
  endpoint.searchParams.set('is_active','eq.true');
  endpoint.searchParams.set('order','published_at.desc');
  endpoint.searchParams.set('limit','500');
  const response = await fetch(endpoint, {headers:{apikey:key,Accept:'application/json'},signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error('Could not load existing editorial data. Supabase HTTP '+response.status);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 500) throw new Error('Editorial data missing or truncated; blocking deployment');
  const mapped = prepareBbwebArticles(rows);
  if (mapped.length === 0) throw new Error('No published editorial records available; blocking deployment');
  return mapped;
}
let articles;
let usingDemo = false;
try { articles = process.env.MEDIA_CONTENT_SOURCE === 'bbweb' ? await bbwebArticles() : await publicArticles(); }
catch (error) { console.error(error.message); throw new Error('Build dibatalkan: data Supabase gagal dimuat. Tidak diam-diam memakai konten demo.'); }
if (articles === null){
  articles = JSON.parse(await readFile(join(root,'content/articles.json'),'utf8'));
  usingDemo = true;
}
if (!Array.isArray(articles)) throw new Error('Article payload must be array');
articles = articles.filter(a=>a && /^[a-z0-9][a-z0-9_-]{3,159}$/.test(a.slug) && a.title && categories.includes(a.category)).map(a=>({
  ...a, body: Array.isArray(a.body) ? a.body : String(a.body||'').split(/\n\s*\n/).filter(Boolean), demo:usingDemo,
}));
const seen = new Set();
articles = articles.filter(a=>!seen.has(a.slug) && seen.add(a.slug));

const icon = (name, size=20)=>`<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',
  angle:'<path d="m9 18 6-6-6-6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  close:'<path d="M5 5l14 14M19 5 5 19"/>',
  moon:'<path d="M20.6 13.3A8.5 8.5 0 0 1 10.7 3.4a8.5 8.5 0 1 0 9.9 9.9Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.1-7.1-1.4 1.4M6.3 17.7l-1.4 1.4m14.2 0-1.4-1.4M6.3 6.3 4.9 4.9"/>',
  share:'<path d="M12 16V3m-4 4 4-4 4 4M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
})[name]||''}</svg>`;
const image = (a, cls='', loading='lazy') => a.image ? `<img class="${cls}" src="${esc(a.image)}" alt="${esc(a.image_alt || a.title)}" loading="${loading}" decoding="async" referrerpolicy="no-referrer">` : `<div class="${cls} image-placeholder" aria-label="Gambar belum tersedia">BB<span>MEDIA</span></div>`;
const meta = a => `<span>${esc(a.category)}</span><span class="dot"></span><span>${a.demo?'Edisi demo':date(a.published_at)}</span>`;
const card = (a, cls='')=>`<article class="story-card ${cls}"><a class="image-link" href="${articleUrl(a)}">${image(a,'story-img')}</a><div class="card-content"><div class="story-meta">${meta(a)}</div><h3><a href="${articleUrl(a)}">${esc(a.title)}</a></h3><p>${esc(a.excerpt||excerpt(a.body?.[0]))}</p><a class="text-link" href="${articleUrl(a)}">Baca selengkapnya ${icon('arrow',15)}</a></div></article>`;
const tiny = a => `<article class="compact-story"><a href="${articleUrl(a)}">${image(a,'compact-img')}</a><div><div class="story-meta"><span>${esc(a.category)}</span></div><h3><a href="${articleUrl(a)}">${esc(a.title)}</a></h3><span class="compact-date">${a.demo?'Konten demo':date(a.published_at)}</span></div></article>`;
const navItems = ['Nasional','Ekonomi','Bisnis','Teknologi','Internasional','Ekspor'].map(c=>`<a href="${categoryUrl(c)}">${esc(c)}</a>`).join('');
const masthead = `<div class="top-strip"><div class="container strip-inner"><span>PORTAL INFORMASI & PERSPEKTIF</span><span id="liveDate"></span><span class="strip-right">BAGIAN DARI <a href="https://bisabikinweb.site/" target="_blank" rel="noopener">BISABIKINWEB</a></span></div></div>
<header class="site-header"><div class="container masthead"><button class="icon-button mobile-only" id="menuBtn" aria-label="Buka menu" aria-expanded="false">${icon('menu',24)}</button><a class="logo" href="/" aria-label="BisaBikinWeb Media"><span class="logo-main">BisaBikinWeb<span class="logo-star">✳</span></span><span class="logo-tag">MEDIA<span class="logo-dot">.</span></span></a><div class="masthead-right"><span class="masthead-caption">INFORMASI TERKINI<br> PERSPEKTIF LEBIH LUAS</span><button class="icon-button" id="themeBtn" aria-label="Ganti tema">${icon('moon')}</button><button class="search-button" id="searchBtn" aria-label="Cari berita">${icon('search')}<span>Cari berita</span><kbd>/</kbd></button></div></div><div class="nav-rail"><nav class="container main-nav" id="mainNav" aria-label="Navigasi utama"><a href="/" class="nav-beranda">Beranda</a>${navItems}<a href="${categoryUrl('Digital')}">Digital</a><a class="nav-more" href="/redaksi/">Redaksi</a></nav></div></header>
<div class="search-overlay" id="searchOverlay" hidden><div class="search-backdrop" data-close-search></div><div class="search-modal" role="dialog" aria-modal="true" aria-label="Cari artikel"><div class="search-title"><strong>Temukan cerita</strong><button class="icon-button" data-close-search aria-label="Tutup pencarian">${icon('close')}</button></div><form action="/cari/" method="get"><label for="searchInput">Cari topik atau kata kunci</label><div class="search-field">${icon('search')}<input id="searchInput" name="q" type="search" placeholder="Ekonomi, teknologi, bisnis..." autocomplete="off" required><button type="submit">Cari ${icon('arrow',16)}</button></div></form></div></div>`;
const footer = `<footer class="footer"><div class="container footer-top"><div class="footer-brand"><a href="/" class="logo logo-light"><span class="logo-main">BisaBikinWeb<span class="logo-star">✳</span></span><span class="logo-tag">MEDIA<span class="logo-dot">.</span></span></a><p>Informasi terkini, perspektif lebih luas. Media digital yang mengutamakan konteks, transparansi, dan pengalaman membaca.</p></div><div><h4>Rubrik</h4><a href="${categoryUrl('Nasional')}">Nasional</a><a href="${categoryUrl('Ekonomi')}">Ekonomi</a><a href="${categoryUrl('Teknologi')}">Teknologi</a><a href="${categoryUrl('Bisnis')}">Bisnis</a></div><div><h4>Media</h4><a href="/redaksi/">Tentang & Redaksi</a><a href="/redaksi/#koreksi">Koreksi dan Hak Jawab</a><a href="/redaksi/#kontak">Kontak Redaksi</a><a href="https://bisabikinweb.site/" target="_blank" rel="noopener">Website Utama</a></div><div><h4>Ikuti perkembangan</h4><p class="small">Newsletter belum diaktifkan. Nantinya pembaca dapat berlangganan melalui sistem dengan persetujuan yang jelas.</p><span class="footer-pill">Newsletter · Segera hadir</span></div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} BisaBikinWeb Media. All rights reserved.</span><span>Dikembangkan dengan perhatian pada pembaca.</span></div></footer>`;
function shell({title,description,path='/',content,article=null}){
  const full = title==='Beranda' ? `${website} | Informasi Terkini, Perspektif Lebih Luas` : `${title} | ${website}`;
  const canonical=ORIGIN+path;
  const robots = INDEXABLE&&!usingDemo?'index,follow,max-image-preview:large':'noindex,nofollow';
  const schemas = article && INDEXABLE&&!article.demo ? [{ '@context':'https://schema.org','@type':'NewsArticle', headline:article.title, datePublished:article.published_at, dateModified:article.updated_at||article.published_at, image:article.image?[article.image]:undefined, author:{'@type':'Organization',name:article.author||'Tim Editorial'},publisher:{'@type':'Organization',name:website,url:ORIGIN},mainEntityOfPage:canonical}] : [{ '@context':'https://schema.org','@type':'Organization',name:website,url:ORIGIN,parentOrganization:{'@type':'Organization',name:'BisaBikinWeb',url:'https://bisabikinweb.site/'}}];
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#fafaf8"><meta name="robots" content="${robots}"><title>${esc(full)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="${article?'article':'website'}"><meta property="og:site_name" content="${website}"><meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">${article?.image?`<meta property="og:image" content="${esc(article.image)}">`:''}<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${jsonSafe(schemas.length===1?schemas[0]:schemas)}</script></head><body>${masthead}${usingDemo?'<div class="demo-banner"><div class="container">MODE PREVIEW <span>•</span> Artikel di bawah adalah konten demonstrasi, bukan berita aktual. Publikasi nyata aktif setelah CMS terhubung.</div></div>':''}<main id="main">${content}</main>${footer}<script src="/app.js" defer></script></body></html>`;
}
function lineHeader(label,title,more=''){return `<div class="section-heading"><div><span class="eyebrow">${esc(label)}</span><h2>${esc(title)}</h2></div>${more?`<a class="section-link" href="${more}">Lihat semua ${icon('arrow',18)}</a>`:''}</div>`}
const top = articles[0];
function home(){
 const picks=articles.slice(1,5);
 const leads=articles.slice(3,7);
 const main=top?`<section class="hero-grid"><article class="hero-feature"><a class="hero-img-link" href="${articleUrl(top)}">${image(top,'hero-img','eager')}<span class="hero-image-overlay"></span></a><div class="hero-content"><span class="category-chip">${esc(top.category)}</span><h1><a href="${articleUrl(top)}">${esc(top.title)}</a></h1><p>${esc(top.excerpt)}</p><div class="hero-byline">${esc(top.author||'Redaksi')} <span>•</span> ${top.demo?'Konten demo':date(top.published_at)} ${icon('arrow',18)}</div></div></article><div class="hero-aside"><div class="aside-heading"><span>EDITOR'S PICK</span><span class="tiny-line"></span><span>01 / 04</span></div>${picks.slice(0,3).map((a,i)=>`<article class="aside-story"><span class="aside-number">0${i+1}</span><div><div class="story-meta"><span>${esc(a.category)}</span></div><h3><a href="${articleUrl(a)}">${esc(a.title)}</a></h3><p>${a.demo?'Edisi demo':date(a.published_at)} · ${esc(a.read_minutes||4)} menit baca</p></div></article>`).join('')}<a class="aside-link" href="/cari/">Jelajahi semua topik ${icon('arrow',16)}</a></div></section>`:`<div class="empty-state">Belum ada berita terbit. Artikel yang disetujui redaksi akan tampil di sini.</div>`;
 const fresh = articles.slice(0,6);
 const byCat = ['Bisnis','Teknologi','Ekonomi'].map(cat=>{
  const list=articles.filter(a=>a.category===cat);
  return list.length?`<section class="topic-strip"><div class="topic-header"><span class="eyebrow">RUBRIK PILIHAN</span><a href="${categoryUrl(cat)}"><h2>${cat}</h2> ${icon('arrow',20)}</a></div><div class="topic-cards">${list.slice(0,3).map(a=>card(a)).join('')}</div></section>`:'';
 }).join('');
 return shell({title:'Beranda',description:'BisaBikinWeb Media menghadirkan bacaan nasional, ekonomi, bisnis, teknologi, dan perspektif digital.',content:`<div class="container"><div class="edition-bar"><div class="edition-text"><span class="edition-rule"></span> DIGITAL NEWSROOM <span class="edition-rule"></span> BERITA · ANALISIS · PERSPEKTIF</div><span class="edition-number">VOL. 001 / INDONESIA</span></div>${main}<div class="feature-ticker"><span>FOKUS KAMI</span><span>Berita terverifikasi</span><span class="ticker-dot">✳</span><span>Konteks yang jelas</span><span class="ticker-dot">✳</span><span>Perspektif lebih luas</span><span class="ticker-dot">✳</span><span>Teknologi & bisnis</span></div><div class="main-with-sidebar"><section class="latest-news">${lineHeader('UPDATE & PERSPEKTIF','Sorotan Terbaru','/cari/')}<div class="news-grid">${fresh.map(a=>card(a)).join('')||'<p>Belum ada artikel yang diterbitkan.</p>'}</div><a class="explore-button" href="/cari/">Jelajahi semua artikel ${icon('arrow',18)}</a></section><aside class="side-stack"><div class="dark-panel"><span class="eyebrow">PERSPEKTIF</span><div class="panel-mark">“</div><h3>Di balik setiap judul, ada cerita yang perlu dipahami.</h3><p>Lebih dari informasi cepat. Kami mengedepankan konteks, sumber, dan transparansi editorial.</p><a href="/redaksi/">Kenali redaksi ${icon('arrow',17)}</a></div><div class="side-section"><div class="side-heading"><h3>Pilihan Redaksi</h3><span>✳</span></div>${leads.map(tiny).join('')}</div><div class="ad-placeholder"><span>SPACE FOR PARTNERS</span><strong>Your story<br>matters here.</strong><p>Area kerja sama media</p></div></aside></div><section class="explore-topics">${lineHeader('JELAJAHI','Topik yang Penting')}<div class="topic-tags">${categories.map((c,i)=>`<a href="${categoryUrl(c)}"><span>${String(i+1).padStart(2,'0')}</span>${esc(c)} ${icon('arrow',18)}</a>`).join('')}</div></section>${byCat}<section class="newsletter-panel"><div><span class="eyebrow">BISABIKINWEB MEDIA</span><h2>Lebih paham.<br><em>Lebih siap.</em></h2><p>Baca perspektif baru seputar bisnis, teknologi, dan perkembangan digital.</p></div><a href="/cari/">Mulai menjelajah ${icon('arrow',19)}</a></section></div>`});
}
function categoryPage(category){
 const list=articles.filter(a=>a.category===category);
 return shell({title:category,description:`Kumpulan berita dan artikel ${category} dari BisaBikinWeb Media.`,path:categoryUrl(category),content:`<div class="container inner-page"><div class="breadcrumb"><a href="/">Beranda</a> ${icon('angle',16)} <span>${esc(category)}</span></div><div class="page-heading"><span class="eyebrow">RUBRIK / ${esc(category.toUpperCase())}</span><h1>${esc(category)}<span class="heading-accent">.</span></h1><p>Informasi, analisis, dan perspektif pilihan seputar ${esc(category.toLowerCase())}.</p></div>${list.length?`<div class="category-layout"><div class="news-grid">${list.map(a=>card(a)).join('')}</div><div class="mini-aside"><span class="eyebrow">PILIHAN LAIN</span><h2>Jelajahi<br>rubrik lainnya</h2>${categories.filter(c=>c!==category).map(c=>`<a href="${categoryUrl(c)}">${esc(c)} ${icon('arrow',16)}</a>`).join('')}</div></div>`:'<div class="empty-state">Belum ada artikel yang diterbitkan dalam rubrik ini.</div>'}</div>`});
}
function articlePage(a){
 const related=articles.filter(b=>b.slug!==a.slug && b.category===a.category).concat(articles.filter(b=>b.slug!==a.slug&&b.category!==a.category)).slice(0,3);
 const content = `<div class="container article-wrap"><nav class="breadcrumb"><a href="/">Beranda</a> ${icon('angle',16)} <a href="${categoryUrl(a.category)}">${esc(a.category)}</a> ${icon('angle',16)} <span>Artikel</span></nav><article><header class="article-heading"><a class="category-chip category-chip-light" href="${categoryUrl(a.category)}">${esc(a.category)}</a><h1>${esc(a.title)}</h1><p class="article-deck">${esc(a.excerpt)}</p><div class="article-toolbar"><div class="author-avatar">BB</div><div class="author-info"><strong>${esc(a.author||'Tim Editorial')}</strong><span>${a.demo?'Konten demonstrasi':date(a.published_at)} ${a.updated_at&&a.updated_at!==a.published_at?' · Diperbarui '+date(a.updated_at):''} · ${esc(a.read_minutes||5)} menit baca</span></div><div class="share-buttons"><button id="shareBtn" type="button" aria-label="Bagikan artikel">${icon('share',18)} <span>Bagikan</span></button><button id="copyBtn" type="button">Salin tautan</button></div></div></header><figure class="article-cover">${image(a,'article-cover-img','eager')}<figcaption>${esc(a.image_credit||'Gambar: Redaksi')} ${a.demo?' • Foto ilustrasi untuk tampilan demo':''}</figcaption></figure><div class="reading-layout"><aside class="article-navigation"><span>DALAM ARTIKEL</span><a href="#isi-artikel">Baca artikel</a><a href="#baca-juga">Baca juga</a><div class="reading-line"></div><span>BISABIKINWEB MEDIA</span></aside><div class="article-body" id="isi-artikel">${a.demo?'<div class="article-notice"><strong>CATATAN REDAKSI</strong> Halaman ini adalah contoh desain. Teksnya bukan peliputan berita aktual dan tidak ditujukan sebagai laporan jurnalistik.</div>':''}<p class="lead-paragraph">${esc(a.body[0]||a.excerpt)}</p>${a.body.slice(1).map((p,i)=>i===1?`<h2>Memahami konteks</h2><p>${esc(p)}</p>`:`<p>${esc(p)}</p>`).join('')}<div class="article-end"><span>✳</span> AKHIR ARTIKEL</div><div class="article-share"><strong>Bagikan cerita ini</strong><a target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(a.title+' '+ORIGIN+articleUrl(a))}">WhatsApp ${icon('arrow',16)}</a><button type="button" id="copyBottom">Salin tautan ${icon('share',16)}</button></div></div></div></article><section class="related" id="baca-juga">${lineHeader('BACA JUGA','Cerita lainnya','/cari/')}<div class="topic-cards">${related.map(b=>card(b)).join('')}</div></section></div>`;
 return shell({title:a.title,description:a.excerpt,path:articleUrl(a),article:a,content});
}
function searchPage(){return shell({title:'Cari Berita',description:'Cari artikel di BisaBikinWeb Media.',path:'/cari/',content:`<div class="container inner-page"><div class="breadcrumb"><a href="/">Beranda</a> ${icon('angle',16)} <span>Pencarian</span></div><div class="page-heading"><span class="eyebrow">CARI & TEMUKAN</span><h1>Jelajahi cerita<span class="heading-accent">.</span></h1><p>Temukan bacaan berdasarkan topik, judul, atau kata kunci.</p></div><form id="filterForm" class="filter-form" role="search"><label class="sr-only" for="filterQuery">Cari artikel</label><input id="filterQuery" name="q" type="search" placeholder="Cari topik, judul, atau kata kunci..."><button type="submit">Cari ${icon('arrow',17)}</button></form><div class="filter-bar"><span id="searchCount">Semua artikel</span><select id="categorySelect" aria-label="Filter kategori"><option value="">Semua kategori</option>${categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div><div id="searchResults" class="news-grid">${articles.map(a=>card(a)).join('')}</div><div id="searchEmpty" class="empty-state" hidden>Tidak ada artikel yang cocok. Coba kata kunci lain.</div></div><script type="application/json" id="searchData">${jsonSafe(articles.map(a=>({title:a.title,slug:a.slug,category:a.category,excerpt:a.excerpt,href:articleUrl(a),image:a.image,image_alt:a.image_alt,demo:a.demo,published_at:a.published_at})))}</script>`});}
function redaksiPage(){return shell({title:'Redaksi & Tentang Kami',description:'Identitas, prinsip editorial, koreksi dan kontak redaksi BisaBikinWeb Media.',path:'/redaksi/',content:`<div class="container inner-page"><div class="breadcrumb"><a href="/">Beranda</a> ${icon('angle',16)} <span>Redaksi</span></div><div class="page-heading"><span class="eyebrow">TENTANG KAMI</span><h1>Media untuk <em>memahami</em><span class="heading-accent">.</span></h1><p>BisaBikinWeb Media dibangun untuk menghadirkan cerita yang jelas, relevan, dan dapat ditelusuri sumbernya.</p></div><div class="about-layout"><div class="about-main"><h2>Prinsip editorial</h2><p>Kami mengutamakan verifikasi fakta, keterbukaan sumber, pemisahan informasi dan opini, serta pembaruan yang transparan. Label Breaking News hanya digunakan jika peristiwa penting telah diverifikasi.</p><h2>Keaslian konten</h2><p>Artikel berita harus memiliki sumber dan hak penggunaan foto yang jelas. Konten sponsor diberi label. Foto ilustrasi tidak boleh disajikan seolah-olah dokumentasi kejadian nyata.</p><h2 id="koreksi">Koreksi & hak jawab</h2><p>Kesalahan faktual harus diperbaiki dan dicatat secara jelas pada halaman artikel. Permintaan koreksi dan hak jawab ditinjau dengan memeriksa dokumen, konteks, serta sumber terkait.</p><h2 id="kontak">Kontak redaksi</h2><p>Kontak resmi redaksi akan ditambahkan sebelum peluncuran publik. Untuk saat ini, lihat website perusahaan: <a href="https://bisabikinweb.site/" target="_blank" rel="noopener">bisabikinweb.site</a>.</p><p><strong>Catatan:</strong> nama dan profil anggota redaksi akan ditampilkan setelah terverifikasi. Kami tidak membuat identitas jurnalis fiktif.</p></div><aside class="about-aside"><span class="eyebrow">IDENTITAS</span><h3>BisaBikinWeb<br>Media.</h3><p>Bagian dari ekosistem BisaBikinWeb.</p><a href="https://bisabikinweb.site/" target="_blank" rel="noopener">Buka website utama ${icon('arrow',18)}</a></aside></div></div>`});}
async function write(file,content){const path=join(out,file);await mkdir(join(path,'..'),{recursive:true});await writeFile(path,content,'utf8');}
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await cp(join(root,'src/styles.css'),join(out,'styles.css'));
await cp(join(root,'src/app.js'),join(out,'app.js'));
await write('index.html',home());
for(const c of categories)await write(`kategori/${slugify(c)}/index.html`,categoryPage(c));
for(const a of articles)await write(`artikel/${a.slug}/index.html`,articlePage(a));
await write('cari/index.html',searchPage());
await write('redaksi/index.html',redaksiPage());
await write('404.html',shell({title:'Halaman tidak ditemukan',description:'Halaman ini tidak ditemukan.',content:'<div class="container empty-page"><span class="eyebrow">404 / NOT FOUND</span><h1>Halaman tidak ditemukan.</h1><p>Alamat mungkin telah berubah atau halaman belum diterbitkan.</p><a class="explore-button" href="/">Kembali ke beranda →</a></div>'}));
await write('favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#111111"/><path d="M15 18h18c13 0 17 16 6 20 13 4 9 20-5 20H15V18zm11 10v7h8c5 0 5-7 0-7h-8zm0 17v6h8c5 0 5-6 0-6h-8z" fill="#b6ff00"/></svg>');
await write('robots.txt',`User-agent: *\nAllow: /\n${INDEXABLE&&!usingDemo?'Sitemap: '+ORIGIN+'/sitemap.xml\n':''}`);
await write('CNAME','media.bisabikinweb.site\n');
await write('.nojekyll','');
if(INDEXABLE&&!usingDemo){
 const locs=['/','/cari/','/redaksi/',...categories.map(categoryUrl),...articles.map(articleUrl)];
 await write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+locs.map(p=>`<url><loc>${ORIGIN+p}</loc></url>`).join('')+'</urlset>');
}
if (process.env.MEDIA_CONTENT_SOURCE === 'bbweb') {
  await write('admin/index.html', `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Ruang Redaksi | BisaBikinWeb Media</title><link rel="stylesheet" href="/styles.css"></head><body><main class="container empty-page"><span class="eyebrow">RUANG REDAKSI</span><h1>Kelola berita melalui CMS utama.</h1><p>Konten BisaBikinWeb Media saat ini tersinkron dengan CMS BisaBikinWeb. Agar publikasi tidak terpecah, pengelolaan artikel tetap di dashboard utama.</p><a class="explore-button" href="https://bisabikinweb.site/admin/">Buka dashboard BisaBikinWeb →</a><p><a href="/">Kembali ke Media</a></p></main></body></html>`);
} else {
  await write('admin/index.html',await readFile(join(root,'src/admin.html'),'utf8'));
  await write('admin/admin.js',await readFile(join(root,'src/admin.js'),'utf8'));
  await write('admin/config.js',`window.MEDIA_SUPABASE_CONFIG = ${jsonSafe({url:supabaseUrl,publishableKey:supabaseKey})};`);
}
console.log(`Built ${articles.length} ${usingDemo?'demonstration':'published'} articles. Pages in dist/. noindex=${!(INDEXABLE&&!usingDemo)}.`);
