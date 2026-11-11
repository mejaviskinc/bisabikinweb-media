# BisaBikinWeb Media V2 — portal berita

Source V2 untuk **`media.bisabikinweb.site`**. Desain baru, tetapi tetap membaca konten yang sudah terbit di Supabase BisaBikinWeb utama (`bbweb_articles`). Tidak ada perubahan database atau CMS utama.

## Mode produksi

- Homepage editorial, kategori, halaman artikel, pencarian, mode gelap, halaman redaksi, mobile layout.
- GitHub Pages build per jam dan pada setiap push ke `main`, serta manual melalui Actions.
- GitHub Action mengambil source Media sendiri **dan** file konfigurasi publishable dari repository `mejaviskinc/bisabikinweb` secara read-only.
- Build mengambil data publik artikel (`published`, `is_active`) melalui REST dengan public/publishable API key. **Tidak menggunakan service-role key.**
- Validasi build membatalkan deployment jika Supabase tidak dapat diakses atau data kosong, sehingga situs terakhir yang berhasil di-deploy tetap aman.
- Dashboard admin **asli** tersedia di `https://media.bisabikinweb.site/admin/`, dengan login akun admin BisaBikinWeb yang terverifikasi. Dashboard dapat mengelola artikel `bbweb_articles` melalui RLS yang sudah ada, tanpa database redaksi kedua.
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

## Dashboard Redaksi Media

Dashboard `/admin/` menampilkan ringkasan status artikel, filter dan pencarian, editor untuk draft/publikasi/arsip, pratinjau, serta upload gambar ke bucket `bbweb-article-images` (5 MB). Semua mutasi dibatasi backend Supabase Auth + policy `bbweb_admin_full_access` dan admin allowlist. Login memakai akun admin BisaBikinWeb yang sama, bukan membuat akun baru. Draft tidak ditampilkan di website publik; konten published akan masuk saat build GitHub Actions berikutnya. **Jangan** menjalankan `supabase/media_schema.sql` di produksi: file itu arsip opsi CMS independen, bukan dashboard aktif.

**Batasan saat ini:** penjadwalan artikel otomatis per tanggal, analitik traffic riil, pengelolaan iklan, dan editor berlapis persetujuan belum diaktifkan. Aksi publish langsung menyimpan status published di database utama; perubahan website publik menunggu build. Karena Media masih mirror situs utama, noindex tetap aktif.

## Deployment GitHub Pages

- Repo: `mejaviskinc/bisabikinweb-media`
- GitHub Pages Source: GitHub Actions
- Custom Domain: `media.bisabikinweb.site`
- DNS `media` CNAME `mejaviskinc.github.io` (jika belum ada)
- Workflow: `.github/workflows/deploy-pages.yml`
- Validasi HTTPS dan build di GitHub Actions setelah push.

Tampilan berubah lewat deployment repo Media. Tidak perlu menyentuh file toko, checkout, atau halaman utama BisaBikinWeb.

## Pembaruan newsroom (November 2026)

Portal Media kini menambahkan rubrik Politik, Pemerintahan, Olahraga, Otomotif, Hiburan, dan Opini (data akan muncul jika tersedia dalam CMS), sorotan kabar terbaru dari artikel yang berlabel berita, arsip berdasarkan bulan, feed RSS di `/feed.xml`, serta halaman transparansi redaksi: Pedoman Media Siber, Kode Etik, Koreksi, Privasi, Kontak, Kerja Sama, dan Pasang Iklan.

Dashboard `/admin/` kini menampilkan **Audit Editorial** sebagai pemeriksaan heuristik metadata (bukan verifikasi kebenaran), **ekspor CSV**, indikator panjang konten, dan **checklist konfirmasi editor** sebelum menerbitkan berita. Checklist bersifat konfirmasi manual dan tidak disimpan sebagai riwayat persetujuan. Draft tetap dapat disimpan tanpa checklist.

### Aturan SEO yang dipertahankan

Situs Media masih mirror artikel utama dan **noindex**. Sitemap normal dan `news-sitemap.xml` hanya dibuat jika `MEDIA_INDEXABLE=true` dalam kondisi konten produksi. Jangan mengaktifkannya sebelum kanonikal dan migrasi SEO diselesaikan. Feed RSS bukan bukti kelayakan Google News.

### Batas implementasi

Belum ada role Editor/Journalist terpisah yang didukung RLS, jadwal publikasi per artikel, berita otomatis dari feed eksternal, verifikasi fakta otomatis, iklan yang dapat dibeli langsung, newsletter aktif, dan data analitik trafik nyata. Jangan menampilkan fitur tersebut sebagai aktif. Sistem masih menggunakan dashboard administrator dengan allowlist yang sudah tersedia.

Kriteria tes tambahan: `npm test` harus memvalidasi policy pages, feed RSS, dan alat audit admin. Deployment produksi tetap dilindungi validasi build serta memakai artikel sungguhan dari CMS utama.
