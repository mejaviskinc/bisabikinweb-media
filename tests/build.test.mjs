import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const root=process.cwd();
execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root,env:{...process.env,PUBLIC_SUPABASE_URL:'',PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',MEDIA_INDEXABLE:'false'}});
const read=p=>readFile(join(root,'dist',p),'utf8');
test('homepage berisi portal media asli, bukan redirect',async()=>{const html=await read('index.html');assert.match(html,/BisaBikinWeb/);assert.match(html,/Sorotan Terbaru/);assert.match(html,/Peta Transformasi Digital UMKM/);assert.doesNotMatch(html,/http-equiv="refresh"/)});
test('jalur kategori dan artikel dibuat terpisah',async()=>{await access(join(root,'dist/kategori/teknologi/index.html'));await access(join(root,'dist/artikel/arah-ai-dalam-bisnis/index.html'));assert.match(await read('artikel/arah-ai-dalam-bisnis/index.html'),/Baca juga/)});
test('konten demonstrasi tidak terindeks dan tidak mengaku berita aktual',async()=>{const h=await read('index.html');assert.match(h,/noindex,nofollow/);assert.match(h,/konten demonstrasi/i);await assert.rejects(access(join(root,'dist/sitemap.xml')))});
test('custom domain terisolasi',async()=>{assert.equal((await read('CNAME')).trim(),'media.bisabikinweb.site');assert.match(await read('robots.txt'),/Allow: \/\n/)});
test('panel redaksi tanpa kunci rahasia',async()=>{const config=await read('admin/config.js');assert.doesNotMatch(config,/sb_secret_|service_role/);assert.match(await read('admin/index.html'),/Ruang Redaksi/);assert.match(await read('admin/admin.js'),/auth\/v1\/token/)});
test('search page memiliki data pencarian dan filter',async()=>{const html=await read('cari/index.html');assert.match(html,/searchData/);assert.match(html,/categorySelect/)});

test('admin Media memiliki dashboard penuh untuk CMS utama',async()=>{
 const h=await read('admin/index.html');
 const js=await read('admin/admin.js');
 assert.match(h,/Dashboard Redaksi/);
 assert.match(h,/Galeri Media/);
 assert.match(h,/Kelola Artikel/);
 assert.match(js,/bbweb_articles/);
 assert.match(js,/bbweb_admin_allowlist/);
 assert.match(js,/storage\/v1\/object\/bbweb-article-images/);
 assert.doesNotMatch(js,/media_staff|media_articles/);
 assert.doesNotMatch(h,/http-equiv="refresh"/);
});
