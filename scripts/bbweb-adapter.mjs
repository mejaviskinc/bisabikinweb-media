/** Convert published public BisaBikinWeb editorial records into the Media V2 shape.
 * The existing CMS remains the source of truth until a separate migration is approved.
 */
export function normalizeBbwebArticle(row) {
  if (!row || typeof row !== 'object') return null;
  const slug = String(row.id || '').toLowerCase().trim();
  const title = String(row.title || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,159}$/.test(slug) || !title) return null;
  const rawCategory = String(row.category || '').toLowerCase().trim();
  let category = 'Bisnis';
  if (rawCategory.includes('ekspor')) category = 'Ekspor';
  else if (rawCategory.includes('teknolog') || rawCategory.includes('ai')) category = 'Teknologi';
  else if (rawCategory.includes('internasional') || rawCategory.includes('dunia')) category = 'Internasional';
  else if (rawCategory.includes('pendidikan')) category = 'Pendidikan';
  else if (rawCategory.includes('politik') || rawCategory.includes('nasional') || rawCategory.includes('pemerintah')) category = 'Nasional';
  else if (rawCategory.includes('ekonomi')) category = 'Ekonomi';
  else if (rawCategory.includes('lifestyle')) category = 'Lifestyle';
  else if (rawCategory.includes('digital') || rawCategory.includes('website')) category = 'Digital';
  const body = Array.isArray(row.body) ? row.body.map(p => String(p || '').trim()).filter(Boolean) : String(row.body || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const image = String(row.cover_image_url || '').trim();
  const read = String(row.read_time || '5 menit');
  const minutes = Number.parseInt(read, 10);
  return {
    title, slug, category, excerpt: String(row.summary || '').trim() || body[0]?.slice(0, 200) || title,
    body,
    image: /^https:\/\/[^\s]+$/i.test(image) ? image : '',
    image_alt: `Ilustrasi untuk artikel ${title}`,
    image_credit: 'Kredit gambar mengikuti sumber asli; verifikasi sebelum penggunaan ulang',
    author: String(row.author_store_name || 'Tim Editorial BisaBikinWeb').trim(),
    published_at: row.published_at || row.created_at || null,
    updated_at: row.updated_at || row.published_at || null,
    read_minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 5,
    featured: rawCategory.includes('berita'),
    content_type: rawCategory.includes('berita') ? 'news' : 'guide'
  };
}
export function prepareBbwebArticles(rows) {
  if (!Array.isArray(rows)) throw new Error('Supabase must return an article array.');
  const seen = new Set();
  return rows.filter(r => r?.status === 'published' && r.is_active === true && !r.seller_id && r.author_type !== 'seller')
    .map(normalizeBbwebArticle)
    .filter(a => a && !seen.has(a.slug) && seen.add(a.slug))
    .sort((a, b) => Number(b.content_type === 'news') - Number(a.content_type === 'news') || (Date.parse(b.published_at || 0) || 0) - (Date.parse(a.published_at || 0) || 0));
}
