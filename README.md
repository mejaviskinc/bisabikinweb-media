# BisaBikinWeb — Media (GitHub Pages)

Subdomain: **media.bisabikinweb.site**.

**Media bukan website baru dan tidak punya CMS ataupun database sendiri.** Semua artikel, berita, redaksi, dan gambar berasal dari website utama [BisaBikinWeb](https://bisabikinweb.site/) melalui repository source [mejaviskinc/bisabikinweb](https://github.com/mejaviskinc/bisabikinweb).

- Membuka homepage Media langsung mengarahkan ke **`/artikel/`**, menggunakan tampilan artikel yang sama dari website utama.
- **`/artikel/`**, **`/berita/`**, dan halaman detail artikel dibuat dari data yang sama dengan website utama. Source build mengambil konten publik dari Supabase project yang dikonfigurasi pada website utama, dengan fallback bawaan yang sama.
- Tidak ada akun admin, CMS, database, atau sistem publikasi terpisah di repo ini.
- Workflow [Deploy BisaBikinWeb media to GitHub Pages](https://github.com/mejaviskinc/bisabikinweb-media/actions) otomatis membangun dari source utama saat dipicu dan pada jadwal setiap jam. Karena hosting GitHub Pages statis, pembaruan mungkin menunggu build berikutnya.
- Agar tidak menggandakan hasil pencarian saat migrasi, Media tetap **noindex** dan URL kanonis tetap mengarah ke domain utama sampai migrasi SEO disepakati.

## Deployment

1. Settings → Pages → Source: **GitHub Actions**.
2. Custom domain: `media.bisabikinweb.site`.
3. DNS CNAME `media` → `mejaviskinc.github.io`.
4. Periksa HTTPS dan [Actions](https://github.com/mejaviskinc/bisabikinweb-media/actions).

**Edit konten hanya di BisaBikinWeb utama, bukan di repo Media ini.**
