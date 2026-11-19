/* BisaBikinWeb Media: read-only live CMS layer.
 * Published editorial data is fetched with a publishable key and protected by Supabase RLS.
 * No writes, admin tokens or service keys are used here.
 */
(function(){
  'use strict';
  var cfg=window.MEDIA_SUPABASE_CONFIG||{};
  var page=location.pathname.replace(/\/+$/,'')||'/';
  var wantsList=page==='/'||page==='/cari'||page.indexOf('/kategori/')===0;
  var wantsReader=page==='/baca';
  if(!wantsList&&!wantsReader)return;
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url||'')||!/^sb_publishable_/.test(cfg.publishableKey||''))return;
  function element(tag,className,content){
    var node=document.createElement(tag);if(className)node.className=className;
    if(content!==undefined&&content!==null)node.textContent=String(content);
    return node;
  }
  function category(value){
    var s=String(value||'').toLowerCase();
    if(s.includes('ekspor'))return 'Ekspor';
    if(s.includes('olahraga'))return 'Olahraga';
    if(s.includes('otomotif'))return 'Otomotif';
    if(s.includes('hiburan'))return 'Hiburan';
    if(s.includes('opini'))return 'Opini';
    if(s.includes('politik'))return 'Politik';
    if(s.includes('pemerintah'))return 'Pemerintahan';
    if(s.includes('teknolog')||s.includes('kecerdasan buatan')||s==='ai')return 'Teknologi';
    if(s.includes('internasional'))return 'Internasional';
    if(s.includes('pendidikan'))return 'Pendidikan';
    if(s.includes('nasional'))return 'Nasional';
    if(s.includes('ekonomi'))return 'Ekonomi';
    if(s.includes('lifestyle'))return 'Lifestyle';
    if(s.includes('digital')||s.includes('website'))return 'Digital';
    return 'Bisnis';
  }
  function date(input){
    if(!input||Number.isNaN(Date.parse(input)))return 'Tanggal belum tersedia';
    return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(input));
  }
  function safeImage(value){
    try {var url=new URL(value);return url.protocol==='https:'?url.href:'';}catch(e){return '';}
  }
  function valid(a){
    return !!(a&&/^[a-z0-9][a-z0-9_-]{3,159}$/.test(a.id||'')&&a.title&&a.status==='published'&&a.is_active===true&&!a.seller_id&&a.author_type!=='seller'&&(!a.published_at||Date.parse(a.published_at)<=Date.now()));
  }
  function normalize(a){
    return {
      id:a.id,title:a.title,category:category(a.category),excerpt:a.summary||'',
      image:safeImage(a.cover_image_url),published_at:a.published_at||'',updated_at:a.updated_at||'',
      author:a.author_store_name||'Redaksi BisaBikinWeb',
      body:Array.isArray(a.body)?a.body.map(String):[],read:a.read_time||'5 menit',
      image_alt:a.image_alt||'',image_caption:a.image_caption||'',image_credit:a.image_credit||'',image_license:a.image_license||'',image_source_url:a.image_source_url||'',source_urls:Array.isArray(a.source_urls)?a.source_urls:[],
      url:'/baca/?slug='+encodeURIComponent(a.id)
    };
  }
  async function request(query){
    var path=new URL(cfg.url+'/rest/v1/bbweb_articles');
    Object.keys(query).forEach(function(key){path.searchParams.set(key,query[key]);});
    var controller=new AbortController();
    var timeout=setTimeout(function(){controller.abort();},12000);
    try{
      var response=await fetch(path.href,{headers:{apikey:cfg.publishableKey,Accept:'application/json'},signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error('Supabase HTTP '+response.status);
      var data=await response.json();
      if(!Array.isArray(data))throw new Error('Format data tidak valid');
      return data.filter(valid).map(normalize);
    }finally{clearTimeout(timeout);}
  }
  var fields='id,title,category,summary,body,read_time,cover_image_url,published_at,updated_at,author_store_name,author_type,seller_id,status,is_active,source_urls,image_source_url,image_credit,image_license,image_caption,image_alt';
  function img(a){
    var link=safeImage(a.image);
    if(!link)return element('div','story-img image-placeholder','MEDIA');
    var node=element('img','story-img');node.src=link;node.alt=a.image_alt||'Gambar untuk '+a.title;node.loading='lazy';node.decoding='async';node.referrerPolicy='no-referrer';return node;
  }
  function card(a){
    var article=element('article','story-card');
    var photo=element('a','image-link');photo.href=a.url;photo.appendChild(img(a));
    var info=element('div','card-content');
    var meta=element('div','story-meta');meta.append(element('span','',a.category),element('span','dot'),element('span','',date(a.published_at)));
    var h3=element('h3'),heading=element('a','',a.title);heading.href=a.url;h3.appendChild(heading);
    var summary=element('p','',a.excerpt);
    var more=element('a','text-link','Baca selengkapnya →');more.href=a.url;
    info.append(meta,h3,summary,more);article.append(photo,info);return article;
  }
  function renderLiveSection(list){
    var home=document.getElementById('liveCms');
    var cat=page.indexOf('/kategori/')===0?decodeURIComponent(page.split('/')[2]||'').toLowerCase():null;
    var filtered=cat?list.filter(function(a){return a.category.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-')===cat;}):list;
    if(cat){home=document.createElement('section');home.id='liveCms';home.className='live-cms-section';var wrapper=document.querySelector('.category-layout,.inner-page .empty-state');if(wrapper&&wrapper.parentNode)wrapper.parentNode.insertBefore(home,wrapper);else return;}
    if(!home)return;
    home.replaceChildren();
    if(!filtered.length)return;
    var top=element('div','section-heading');
    var copy=element('div');copy.append(element('span','eyebrow','TERBARU DARI REDAKSI'),element('h2','',cat?'Artikel terbaru rubrik ini':'Artikel terkini dari CMS'));
    var all=element('a','section-link','Lihat semuanya →');all.href='/cari/';
    top.append(copy,all);
    var grid=element('div','news-grid');
    filtered.slice(0,6).forEach(function(a){grid.appendChild(card(a));});
    home.append(top,grid);home.hidden=false;
  }
  function changeMeta(name,value,attr){
    var node=document.head.querySelector('meta['+(attr||'name')+'="'+name+'"]');
    if(node)node.setAttribute('content',value);
  }
  function readParagraph(root,raw,index){
    var value=String(raw||'').trim();if(!value)return;
    var head=/^(#{2,3})\s+(.+)$/.exec(value);
    if(head){root.appendChild(element(head[1].length===2?'h2':'h3','',head[2]));return;}
    var source=/^(Sumber(?: resmi)?|Referensi):\s*(https:\/\/\S+)/i.exec(value);
    if(source){var p=element('p','');p.appendChild(document.createTextNode(source[1]+': '));var anchor=element('a','',source[2]);anchor.href=source[2];anchor.rel='noopener noreferrer';anchor.target='_blank';p.appendChild(anchor);root.appendChild(p);return;}
    root.appendChild(element('p',index===0?'lead-paragraph':'',value));
  }
  function renderReader(a){
    document.title=a.title+' | BisaBikinWeb Media';
    changeMeta('description',a.excerpt);
    changeMeta('og:title',a.title,'property');
    changeMeta('og:description',a.excerpt,'property');
    changeMeta('og:image',a.image,'property');
    changeMeta('og:url',location.href,'property');
    var canonical=document.head.querySelector('link[rel="canonical"]');if(canonical)canonical.href=location.href;
    var main=document.getElementById('liveArticle');if(!main)return;
    main.replaceChildren();
    var crumb=element('nav','breadcrumb');var home=element('a','','Beranda');home.href='/';crumb.append(home,document.createTextNode(' / '+a.category+' / Artikel'));
    var article=element('article','');
    var heading=element('header','article-heading');heading.append(element('span','category-chip category-chip-light',a.category),element('h1','',a.title),element('p','article-deck',a.excerpt));
    var toolbar=element('div','article-toolbar');
    var avatar=element('div','author-avatar','BB');var author=element('div','author-info');
    author.append(element('strong','',a.author),element('span','',date(a.published_at)+(a.updated_at&&a.updated_at!==a.published_at?' · Diperbarui '+date(a.updated_at):'')+' · '+a.read));
    var share=element('div','share-buttons');var wa=element('a','text-link','Bagikan ke WhatsApp ↗');wa.href='https://wa.me/?text='+encodeURIComponent(a.title+' '+location.href);wa.rel='noopener noreferrer';wa.target='_blank';
    share.appendChild(wa);toolbar.append(avatar,author,share);heading.appendChild(toolbar);article.appendChild(heading);
    var figure=element('figure','article-cover');var imageUrl=safeImage(a.image);
    if(imageUrl){var picture=element('img','article-cover-img');picture.src=imageUrl;picture.alt=a.image_alt||'Gambar artikel: '+a.title;picture.loading='eager';picture.referrerPolicy='no-referrer';figure.appendChild(picture);}
    else figure.appendChild(element('div','article-cover-img image-placeholder','MEDIA'));
    var caption=element('figcaption','',a.image_caption||'Gambar artikel');
    if(a.image_credit)caption.appendChild(document.createTextNode(' · Kredit: '+a.image_credit));
    if(a.image_license)caption.appendChild(document.createTextNode(' · Lisensi: '+a.image_license));
    var original=safeImage(a.image_source_url);if(original){var sourcePhoto=element('a','',' Sumber foto ↗');sourcePhoto.href=original;sourcePhoto.target='_blank';sourcePhoto.rel='noopener noreferrer';caption.appendChild(sourcePhoto);}
    figure.appendChild(caption);article.appendChild(figure);
    var body=element('div','article-body live-reading-body');body.id='isi-artikel';
    (a.body.length?a.body:[a.excerpt]).forEach(function(p,i){readParagraph(body,p,i);});
    if(a.source_urls.length){var refs=element('section','article-sources');refs.appendChild(element('h2','','Sumber dan Referensi'));var ul=element('ul');a.source_urls.forEach(function(url){var link=safeImage(url);if(!link)return;var li=element('li'),anchor=element('a','',link);anchor.href=link;anchor.target='_blank';anchor.rel='noopener noreferrer';li.appendChild(anchor);ul.appendChild(li);});refs.appendChild(ul);body.appendChild(refs);}
    body.appendChild(element('div','article-end','✳ AKHIR ARTIKEL'));article.appendChild(body);
    var correction=element('div','correction-inline','Menemukan informasi yang perlu dikoreksi? ');
    var link=element('a','','Lihat prosedur koreksi dan hak jawab.');link.href='/koreksi/';correction.appendChild(link);article.appendChild(correction);
    main.append(crumb,article);
    main.hidden=false;
  }
  function showError(message){
    var el=document.getElementById('liveArticle');if(el){el.replaceChildren(element('div','empty-state',message));el.hidden=false;}
  }
  if(wantsReader){
    var slug=new URLSearchParams(location.search).get('slug')||'';
    if(!/^[a-z0-9][a-z0-9_-]{3,159}$/.test(slug)){showError('Alamat artikel tidak valid.');return;}
    request({select:fields,id:'eq.'+slug,status:'eq.published',is_active:'eq.true',seller_id:'is.null',limit:'1'})
      .then(function(items){if(items[0])renderReader(items[0]);else showError('Artikel belum terbit atau tidak ditemukan.');})
      .catch(function(){showError('Artikel belum dapat dimuat. Periksa koneksi dan coba lagi.');});
  }else{
    request({select:fields,status:'eq.published',is_active:'eq.true',seller_id:'is.null',order:'published_at.desc',limit:'200'})
      .then(function(items){
        if(page==='/cari')window.dispatchEvent(new CustomEvent('bbmedia:livearticles',{detail:items.map(function(a){return {title:a.title,slug:a.id,category:a.category,excerpt:a.excerpt,href:a.url,image:a.image,image_alt:'Gambar artikel '+a.title,demo:false,published_at:a.published_at};})}));
        else renderLiveSection(items);
      }).catch(function(){/* Keep the last deployed static pages if live CMS is unavailable. */});
  }
})();
