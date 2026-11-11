# BisaBikinWeb Media V2 — portal berita

Source V2 untuk **`media.bisabikinweb.site`**. Desain baru, tetapi tetap membaca konten yang sudah terbit di Supabase BisaBikinWeb utama (`bbweb_articles`). Tidak ada perubahan database atau CMS utama.

## Mode produksi

- Homepage editorial, kategori, halaman artikel, pencarian, mode gelap, halaman redaksi, mobile layout.
- GitHub Pages build per jam dan pada setiap push ke `main`, serta manual melalui Actions.
- GitHub Action mengambil source Media sendiri **dan** file konfigurasi publishable dari repository `mejaviskinc/bisabikinweb` secara read-only.
- Build mengambil data publik artikel (`published`, `is_active`) melalui REST dengan public/publishable API key. **Tidak menggunakan service-role key.**
- Validasi build membatalkan deployment jika Supabase tidak dapat diakses atau data kosong, sehingga situs terakhir yang berhasil di-deploy tetap aman.
- Redaksi masih memakai CMS existing di `https://bisabikinweb.site/admin/` melalui halaman `/admin/` Media. Tidak membuat database redaksi kedua.
- Seluruh halaman Media **`noindex`** selama mencerminkan artikel yang URL kanonisnya masih di situs utama. Tidak membuat sitemap baru agar tidak bersaing dengan URL lama. Indeksasi baru membutuhkan migrasi SEO khusus.
- Artikel bertipe `Berita Bisnis` muncul di rubrik Bisnis, artikel `Ekspor` di rubrik Ekspor. Artikel demonstrasi tidak dipublikasikan saat mode produksi.
- Kontak, hak penggunaan foto, dan validitas jurnalistik masing-masing konten tetap harus dikurasi secara editorial.

## Menjalankan

Node.js >= 20.

```sh
npm test
npm run build
```

Tanpa mode produksi, build lokal menampilkan konten demo bertanda jelas `noindex`. Untuk simulasi produksi, diperlukan checkout repository utama di `source-main` dan akses REST Supabase publik:

```sh
MEDIA_CONTENT_SOURCE=bbweb MEDIA_MAIN_CONFIG_PATH=source-main/static-source/lib/supabase.ts MEDIA_INDEXABLE=false npm run build
```

**Jangan memakai `MEDIA_INDEXABLE=true` saat konten duplikat.**

## Integrasi media CMS terpisah (opsional, belum dijalankan)

Source eksperimen `src/admin.*` dan `supabase/media_schema.sql` masih disimpan untuk pengembangan kelak. Jangan menjalankan SQL ini di database produksi tanpa review dan migrasi yang disetujui. Di deployment saat ini dashboard redaksi diarahkan ke CMS utama.

## Deployment GitHub Pages

- Repo: `mejaviskinc/bisabikinweb-media`
- GitHub Pages Source: GitHub Actions
- Custom Domain: `media.bisabikinweb.site`
- DNS `media` CNAME `mejaviskinc.github.io` (jika belum ada)
- Workflow: `.github/workflows/deploy-pages.yml`
- Validasi HTTPS dan build di GitHub Actions setelah push.

Tampilan berubah lewat deployment repo Media. Tidak perlu menyentuh file toko, checkout, atau halaman utama BisaBikinWeb.
