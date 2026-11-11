import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBbwebArticle, prepareBbwebArticles } from '../scripts/bbweb-adapter.mjs';
const input = [
  {id:'panduan-ekspor',title:'Panduan Ekspor',category:'Ekspor',summary:'Panduan',body:['Satu','Dua'],status:'published',is_active:true,author_type:'editorial',published_at:'2026-11-08T00:00:00Z'},
  {id:'berita-bisnis',title:'Berita Bisnis',category:'Berita Bisnis',summary:'Berita',body:['Ringkasan'],status:'published',is_active:true,author_type:'editorial',published_at:'2026-11-07T00:00:00Z'},
  {id:'draft-editorial',title:'Draft',category:'Ekspor',body:['Belum terbit'],status:'draft',is_active:true},
  {id:'seller-content',title:'Seller',category:'Berita Bisnis',body:['Seller'],status:'published',is_active:true,author_type:'seller'}
];
test('normalizes existing business-news and export content without changing original slugs', () => {
 const items=prepareBbwebArticles(input);
 assert.equal(items.length,2);
 assert.equal(items[0].slug,'berita-bisnis');
 assert.equal(items[0].content_type,'news');
 assert.equal(items[0].category,'Bisnis');
 assert.equal(items[1].category,'Ekspor');
 assert.equal(items[1].slug,'panduan-ekspor');
});
test('rejects invalid names, prevents cross-site Javascript image URLs', () => {
 assert.equal(normalizeBbwebArticle({id:'../danger',title:'Unsafe'}),null);
 const item=normalizeBbwebArticle({id:'ok-article',title:'Valid',category:'Bisnis',cover_image_url:'javascript:alert(1)',body:[]});
 assert.equal(item.image,'');
});
