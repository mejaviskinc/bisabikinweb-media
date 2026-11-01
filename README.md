# BisaBikinWeb — MEDIA

Repo khusus GitHub Pages untuk `media.bisabikinweb.site` (Artikel, berita, dan redaksi).

Source aplikasi: https://github.com/mejaviskinc/bisabikinweb

Workflow deploy di `.github/workflows/deploy-pages.yml` akan checkout source utama dan membuat `pages-media`. Jangan mengedit file build manual, karena perubahan sebaiknya dilakukan pada repo utama.

Untuk aktivasi: Settings → Pages → Source = GitHub Actions; Custom domain = `media.bisabikinweb.site`.

DNS: `CNAME media → mejaviskinc.github.io` (hanya record host tersebut, jangan mengganti record domain utama atau email).

SEO masih noindex selama perpindahan; canonical di domain utama tidak berubah sampai migrasi URL disetujui. 
