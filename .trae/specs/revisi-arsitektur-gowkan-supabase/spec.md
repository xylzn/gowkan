# Revisi Arsitektur GOWKAN — Supabase DB + Admin Panel
## Product Requirements Document

---

## Overview
- **Summary**: Merevisi website GOWKAN dari 100% statis (hardcoded + Astro Content Collections dari file `.md` lokal) menjadi dynamic dengan database Supabase (Postgres + Auth), halaman Gallery & Blog full-page terpisah, dan panel admin sederhana untuk CRUD Gallery item serta upload artikel `.md`.
- **Purpose**: GOWKAN butuh kelola konten (proyek & artikel) tanpa harus commit file ke repo + redeploy. Admin cukup login ke panel, input data, dan konten langsung tayang.
- **Target Users**:
  - **Pengunjung publik**: Akses `/`, `/gallery`, `/blog`, `/blog/[slug]` — baca konten dari DB.
  - **Admin (1 user)**: Login di `/admin/login`, kelola Gallery & Blog via `/admin/*`.

---

## Goals
1. Gallery pindah dari hardcoded carousel di homepage jadi halaman penuh `/gallery` dengan data dari tabel `gallery_items` (proyek nyata GOWKAN, bukan dummy).
2. Modal Preview tetap dipakai, tapi isinya dari DB: detail_pekerjaan + tombol "Kunjungi Website" ke URL proyek asli.
3. Blog pindah sumber data dari Astro Content Collections (file `.md` lokal) ke tabel `articles` di Supabase — artikel disimpan sebagai teks markdown di kolom `content_md`.
4. Panel Admin (1 akun via Supabase Auth) untuk:
   - CRUD item Gallery (nama_proyek, url, kategori, thumbnail_url, ringkasan, detail_pekerjaan)
   - Upload artikel via drag-drop file `.md` (parse frontmatter + isi, preview sebelum publish, INSERT ke DB)
   - Edit metadata artikel, hapus artikel
5. Homepage tetap punya section Gallery & Blog sebagai **preview/teaser** (beberapa item terbaru), dengan tombol "Lihat Semua" ke halaman penuh. Menu Navbar link ke `/gallery` & `/blog` (bukan anchor scroll).
6. Fitur ToC, breadcrumb, reading time, scroll progress bar di halaman `/blog/[slug]` TETAP dipertahankan 100% — cuma sumber data pindah dari file lokal ke DB.

---

## Non-Goals (Di Luar Scope)
1. Perbaikan lead capture form kontak (tetap redirect WhatsApp langsung seperti sekarang).
2. Upload file gambar ke storage bucket — semua gambar tetap URL eksternal (admin tempel link Unsplash/CDN).
3. Multi-admin / role management — cukup 1 akun.
4. Pencatatan log / audit trail admin.
5. Sistem komentar pada blog.
6. Pagination pada `/blog` & `/gallery` (asumsi jumlah item masih sedikit; grid biasa tanpa pagination cukup).

---

## Background & Context
### Kondisi Eksisting (Sudah Diverifikasi dari Codebase)
1. **Stack**: Astro 6.1.7 + Tailwind 3.4 + Adapter Vercel, `output: 'server'` ✅ (config sudah siap SSR).
2. **Dependencies SUDAH TERINSTAL** (skip step install npm):
   - `@supabase/supabase-js` ^2.115.0
   - `@supabase/ssr` ^0.12.6
   - `gray-matter` ^4.0.3
   - `marked` ^18.0.11 (render markdown ke HTML)
   - `github-slugger` ^2.0.0 (buat slug heading untuk ToC)
3. **Environment variables di `.env`** (nama variabel real di codebase, SESUAIKAN ini, JANGAN pakai nama dari brief user yang beda):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (= publishable key, untuk client-side & query publik)
   - `SUPABASE_SERVICE_ROLE_KEY` (= secret key, HANYA untuk API routes server-side)
4. **`src/lib/types.ts` SUDAH ADA** interface `GalleryItem`, `Article`, `ArticleHeading`, `ParsedArticle` 100% sesuai skema DB — pakai ini, jangan duplicate.
5. **Tabel DB di Supabase "Gowkan-Company"** (region ap-south-1) sudah dibuat + RLS:
   - `gallery_items` (id uuid PK, nama_proyek, url, kategori, thumbnail_url, ringkasan, detail_pekerjaan, urutan_tampil int, created_at)
   - `articles` (id uuid PK, slug text unique, title, description, category, pub_date date, updated_date date nullable, hero_image_url, content_md text, created_at)
6. **Struktur halaman lama**:
   - `/` (index.astro): single page dengan section carousel Gallery (hardcoded array) + Blog (getCollection 3 md files)
   - `/blog/index.astro`: grid semua artikel dari getCollection
   - `/blog/[...slug].astro`: detail artikel dengan `prerender = true` + `getStaticPaths()` (ini HARUS dihapus karena jadi dynamic DB route)
7. **Frontmatter schema artikel lama** (skema ini harus tetap didukung parser gray-matter):
   ```yaml
   title: "..."
   description: "..."
   pubDate: 2024-04-15
   category: "Tips & Trick"
   heroImage: "https://..."
   ```
8. **`PreviewModal.astro`** sekarang pakai data dari `modal-data.ts` (hardcoded) dengan trigger `data-preview-trigger={category}` — perlu di-refactor ambil data per-id item DB.
9. **SITE_CONFIG.navigation** sekarang: `#blog`, `#gallery` (anchor scroll) → ubah jadi `/blog`, `/gallery`.
10. **Hero.astro** CTA "Lihat Website" masih `href="#gallery"` → ubah ke `/gallery`.

---

## Functional Requirements

### Publik (Tanpa Login)
- **FR-P1**: Route `/gallery` menampilkan grid SEMUA item dari tabel `gallery_items`, urut berdasarkan `urutan_tampil` ASC + `created_at` DESC fallback.
- **FR-P2**: Klik kartu Gallery → buka `PreviewModal` dengan data dari DB: nama_proyek (title), kategori, thumbnail_url, ringkasan, detail_pekerjaan. Footer modal punya 2 tombol: "Kunjungi Website" (buka `url` di tab baru `target="_blank"` rel="noopener noreferrer") + "Konsultasi Project Ini" (ke form kontak, seperti sekarang).
- **FR-P3**: Route `/blog` menampilkan grid SEMUA artikel dari tabel `articles`, urut `pub_date` DESC (terbaru dulu).
- **FR-P4**: Route `/blog/[slug]` menampilkan detail artikel:
  - Ambil 1 baris dari `articles` WHERE `slug` = param.
  - Render `content_md` ke HTML (pakai `marked` atau setara).
  - Parse headings H2/H3 dari hasil render untuk Table of Contents (sama seperti logic sekarang yang pakai `render(post)` dari Astro Content Collections — implementasi custom untuk markdown string).
  - Fitur: breadcrumb, ToC (desktop sidebar + mobile drawer), reading time estimation, scroll progress bar — SEMUA harus tetap jalan.
  - **TIDAK ADA** `prerender = true` dan `getStaticPaths()` (dynamic server route).
- **FR-P5**: Homepage `/`:
  - Section `Blog.astro` tetap ada sebagai carousel preview, ambil N=3 artikel TERBARU dari `articles` (LIMIT 3, ORDER pub_date DESC).
  - Section `Gallery.astro` tetap ada sebagai carousel preview, ambil N=4/6 proyek TERBARU dari `gallery_items` (LIMIT sesuai jumlah item lama, fallback LIMIT 6).
  - Kedua section preview masing-masing punya tombol CTA baru: "Lihat Semua Artikel" → `/blog`, "Lihat Semua Karya" → `/gallery`.
- **FR-P6**: `Navbar.astro` link navigasi:
  - "Blog" → `/blog` (bukan `/#blog`)
  - "Galeri" → `/gallery` (bukan `/#gallery`)
  - Section anchor lain di homepage (/#home, /#about, /#packages, /#contact) TETAP anchor scroll.
  - `Hero.astro` tombol "Lihat Website" → `/gallery` (bukan `#gallery`)

### Admin (Butuh Login)
- **FR-A1**: Route `/admin/login` — form email + password, submit via API route yang panggil `supabase.auth.signInWithPassword()`. Jika berhasil → redirect ke `/admin` + set cookie sesi (pakai `@supabase/ssr` cookie-based auth). Jika gagal → tampilkan error message (dari Supabase error.message, JANGAN generik).
- **FR-A2**: Route `/admin/logout` (via API) — panggil `signOut()`, hapus cookie, redirect ke `/admin/login`.
- **FR-A3**: SEMUA route `/admin/*` (kecuali `/admin/login`) diproteksi: middleware atau server-side check di setiap page — jika tidak ada sesi valid → redirect 302 ke `/admin/login`.
- **FR-A4**: Dashboard `/admin` — ringkasan: jumlah total `gallery_items`, jumlah total `articles`, link ke `/admin/gallery` dan `/admin/blog`.
- **FR-A5**: CRUD Gallery di `/admin/gallery`:
  - List semua item dengan aksi Edit / Hapus.
  - Form Create (`/admin/gallery/new`) & Edit: field nama_proyek (text), url (text), kategori (text), thumbnail_url (text input URL), ringkasan (textarea), detail_pekerjaan (textarea / input panjang), urutan_tampil (number, default 0).
  - Delete: confirm dialog sebelum `DELETE` via API.
- **FR-A6**: Blog Management di `/admin/blog`:
  - List semua artikel dengan aksi Edit metadata / Hapus.
  - Create new via `/admin/blog/new`: drag & drop area + file input untuk file `.md`.
  - Workflow upload:
    1. User drop file `.md` → file dikirim (via fetch FormData) ke API route parse.
    2. API parse frontmatter + isi pakai `gray-matter`, mapping field:
       - `title` → title
       - `description` → description
       - `pubDate` → pub_date (Date object)
       - `category` → category
       - `heroImage` → hero_image_url
       - isi markdown setelah frontmatter → content_md
    3. API return hasil parse + slug auto-generate dari title (slugify + append counter jika duplikat).
    4. Client menampilkan PREVIEW hasil parse: title, category, pub_date, heroImage preview, perkiraan reading time, list heading untuk ToC, preview render markdown parsial.
    5. User klik "Publish" → fetch ke API insert yang beneran `INSERT` ke tabel `articles`.
  - Edit metadata artikel: ubah title, slug, category, pub_date, hero_image_url, description (TIDAK edit content_md via form — karena desainnya upload .md; tapi edit metadata saja boleh untuk koreksi).
  - Hapus artikel: confirm dialog, `DELETE` dari DB.

### API Routes (src/pages/api/*)
- **FR-API1**: `POST /api/auth/login` → body { email, password } → signInWithPassword via service role client, set cookie via @supabase/ssr, return { success: true, redirect: '/admin' } atau { success: false, error: string }.
- **FR-API2**: `POST /api/auth/logout` → signOut, clear cookie.
- **FR-API3**: Gallery CRUD (RLS di Supabase butuh JWT dari sesi login):
  - `GET /api/gallery` → list semua (sudah bisa publik select, tapi admin side boleh tetap lewat API / langsung client query).
  - `POST /api/gallery` → create item (AUTH REQUIRED, pakai service role).
  - `PUT /api/gallery/:id` → update item (AUTH REQUIRED).
  - `DELETE /api/gallery/:id` → delete item (AUTH REQUIRED).
- **FR-API4**: Blog:
  - `POST /api/blog/parse-md` → terima FormData file `.md`, parse dengan gray-matter, slugify, hitung headings & read time, RETURN JSON hasil parse (BELUM INSERT ke DB).
  - `POST /api/blog` → INSERT parsed article ke DB (AUTH REQUIRED).
  - `PUT /api/blog/:id` → UPDATE metadata artikel (AUTH REQUIRED).
  - `DELETE /api/blog/:id` → DELETE artikel (AUTH REQUIRED).

---

## Non-Functional Requirements
- **NFR-1**: Keamanan — `SUPABASE_SERVICE_ROLE_KEY` HANYA dipakai di Astro API routes server-side & middleware. TIDAK BOLEH bocor ke client bundle. Query publik (halaman `/gallery`, `/blog`) pakai `SUPABASE_ANON_KEY`.
- **NFR-2**: Graceful degradation — semua error API menampilkan pesan spesifik dari `error.message` Supabase / gray-matter parsing, bukan pesan generik.
- **NFR-3**: Token/Payload efficiency — query DB hanya ambil kolom yang dibutuhkan (tidak select * jika tidak perlu).
- **NFR-4**: Reusable logic — Buat helper parser markdown string → HTML + headings + readTime (mirip Astro `render()` tapi untuk string mentah dari DB).
- **NFR-5**: SEO — Halaman `/blog/[slug]` tetap set meta title/description OG image dari data artikel (seperti sekarang).
- **NFR-6**: Existing UI style TETAP dipertahankan — JANGAN ganti warna, spacing, rounded, font. Tambahkan class Tailwind yang sama dengan komponen existing (mis. `glass-card`, `rounded-[3rem]`, `cta-glow`, dll).

---

## Constraints
### Teknis
- **Wajib pakai instance Supabase existing "Gowkan-Company"** (URL & keys di .env lokal), JANGAN buat project baru.
- **TIDAK BOLEH ubah logic bisnis/validasi existing**: form kontak (ke WA), paket pricing, carousel, animasi reveal, navbar scroll, global CSS.
- **TIDAK BOLEH hapus / ubah data existing sebelum halaman publik confirm jalan dari DB**: `modal-data.ts` dan 3 file `.md` di `src/content/blog/` HANYA dihapus di step TERAKHIR (setelah testing jalan).
- **Auth WAJIB pakai cookie-based SSR dengan `@supabase/ssr`** (bukan localStorage JWT — karena Astro server middleware butuh baca sesi dari cookie).
- **Slug artikel**: WAJIB unique di DB; generate fallback jika duplicate (mis. `judul-artikel`, `judul-artikel-2`, `judul-artikel-3`).
### Bisnis
- 1 akun admin saja — tidak perlu register page / forgot password page (admin reset password via Supabase dashboard jika lupa).
- Semua gambar = URL input (text field), TIDAK ada upload file handler.

### Dependencies
- Wajib pakai dependency SUDAH ADA: `@supabase/supabase-js`, `@supabase/ssr`, `gray-matter`, `marked`, `github-slugger`. JANGAN `npm install` apapun lagi.

---

## Assumptions
- RLS di Supabase untuk tabel `gallery_items` & `articles` sudah benar: policy `SELECT` allow public anon, `INSERT/UPDATE/DELETE` hanya allow authenticated user.
- Akun admin 1 orang sudah dibuat manual di Supabase Auth.
- Environment variables Vercel production akan diisi manual user sebelum deploy (step 8 brief — diluar implementasi code).
- Halaman `/blog/[slug]` yang tadinya `prerender = true` tanpa dynamic route akan bekerja normal sebagai SSR page tanpa masalah build.

---

## Acceptance Criteria

### AC-1: Halaman `/gallery` tampilkan data dari DB
- **Type**: `rule`
- **Given**: Terdapat N baris data di tabel `gallery_items`
- **When**: Pengunjung buka `/gallery`
- **Then**: Semua N item muncul sebagai grid kartu (thumbnail, nama_proyek, kategori, ringkasan preview), tombol "Lihat Demo" per kartu.
- **Pass Condition**: Data pada kartu 100% sesuai baris DB yang sama; tidak ada referensi ke `modal-data.ts` atau hardcoded array.
- **Evidence**: Screenshot `/gallery` + inspect element bukti tidak ada hardcoded data di bundle; atau curl ke halaman show data dinamis.

### AC-2: PreviewModal render data DB + tombol Kunjungi Website
- **Type**: `rule`
- **Given**: Item Gallery X ada di DB dengan `url = "https://example.com"` dan `detail_pekerjaan = "..."`
- **When**: Klik tombol "Lihat Demo" kartu X
- **Then**: Modal terbuka, title = nama_proyek, category, image = thumbnail_url, body menampilkan detail_pekerjaan, footer ada 2 tombol: "Kunjungi Website" (klik buka https://example.com di tab BARU) & "Konsultasi Project Ini".
- **Pass Condition**: Semua field dari AC tampil; tombol Kunjungi Website punya `target="_blank" rel="noopener noreferrer"` dan href persis `url` dari DB.
- **Evidence**: Screenshot modal + DOM inspect href attribute tombol Kunjungi Website.

### AC-3: Halaman `/blog` dan `/blog/[slug]` full dynamic dari DB
- **Type**: `rule`
- **Given**: Artikel dengan slug `artikel-test` ada di DB dengan `content_md = "## Heading 1\n\nIsi artikel."`
- **When**: Buka `/blog` → buka kartu artikel → buka `/blog/artikel-test`
- **Then**:
  1. `/blog` menampilkan kartu artikel test (title, description, category, hero_image_url, pub_date)
  2. `/blog/artikel-test` menampilkan breadcrumb, heading H2 "Heading 1" muncul + di sidebar ToC, reading time > 0 min, scroll progress bar ada di atas.
  3. TIDAK ADA error 404 / route tidak ditemukan; TIDAK ADA `prerender` di source code halaman detail.
- **Pass Condition**: 3 sub-condition terpenuhi SEMUA. Source code [...slug].astro tidak mengimport `getCollection` / `getStaticPaths` / `prerender`.
- **Evidence**: Screenshot grid blog, screenshot detail artikel (ToC, breadcrumb, progress bar visible), diff source [...slug].astro.

### AC-4: Navbar + Hero CTA redirect ke halaman penuh (bukan anchor)
- **Type**: `rule`
- **Given**: Website dibuka di browser
- **When**: Klik link "Blog" di Navbar, klik "Galeri" di Navbar, klik "Lihat Website" di Hero
- **Then**: Navigasi pindah HALAMAN ke `/blog` dan `/gallery` masing-masing (bukan scroll di homepage); URL address bar berubah ke `/blog` atau `/gallery`.
- **Pass Condition**: SITE_CONFIG.navigation entry Blog.href === `/blog`, Galeri.href === `/gallery`; Hero Button href === `/gallery`.
- **Evidence**: DOM inspect href attribute ketiga link, atau video click.

### AC-5: Homepage preview sections query DB dengan LIMIT
- **Type**: `rule`
- **Given**: Terdapat 10 gallery item & 10 artikel di DB
- **When**: Buka homepage `/`, scroll ke section Blog & Gallery
- **Then**: Section Blog carousel hanya menampilkan MAKSIMAL 3 artikel terbaru; Section Gallery carousel hanya menampilkan MAKSIMAL 6 item terbaru; masing-masing section punya tombol "Lihat Semua Artikel" (href `/blog`) dan "Lihat Semua Karya" (href `/gallery`).
- **Pass Condition**: Count DOM element carousel item <= 3 (blog) & <= 6 (gallery); tombol Lihat Semua muncul dan href benar.
- **Evidence**: Screenshot section preview, count DOM children carousel-track.

### AC-6: Login admin berfungsi + proteksi route `/admin/*`
- **Type**: `rule`
- **Given**: Email & password admin valid (dibuat di Supabase Auth)
- **When**:
  1. Buka `/admin` TANPA login →
  2. Buka `/admin/login`, submit kredensial valid →
  3. Submit kredensial INVALID →
- **Then**:
  1. Redirect 302 ke `/admin/login` (bukan render halaman kosong / error)
  2. Login sukses → redirect ke `/admin` dashboard; cookie sesi ada; halaman `/admin` menampilkan count artikel & gallery
  3. Login gagal → tetap di `/admin/login`, pesan error SPESIFIK muncul (mis. "Invalid login credentials")
- **Pass Condition**: 3 sub-condition terpenuhi. `/admin/gallery` tanpa login juga redirect ke login.
- **Evidence**: Network tab 302 redirect tanpa login, screenshot dashboard sukses, screenshot error message gagal login.

### AC-7: CRUD Gallery via Admin Panel (Create + Edit + Delete)
- **Type**: `rule`
- **Given**: Admin sudah login di `/admin`
- **When**:
  1. Create item baru via `/admin/gallery/new` dengan data test →
  2. Edit item yang baru dibuat via `/admin/gallery/:id/edit` ganti nama_proyek →
  3. Delete item tersebut via button hapus →
- **Then**:
  1. Setelah create: baris baru muncul di `/admin/gallery` list + halaman `/gallery` publik menampilkan kartu baru
  2. Setelah edit: nama_proyek berubah di list + di `/gallery` publik juga berubah
  3. Setelah delete: baris hilang dari list + hilang dari `/gallery` publik
- **Pass Condition**: Ke-3 operasi berhasil tanpa error generik; setiap perubahan tercermin di HALAMAN PUBLIK (bukan cuma di admin).
- **Evidence**: Screenshot before/after create-edit-delete di admin + di halaman publik `/gallery`.

### AC-8: Upload artikel `.md` dengan preview sebelum publish
- **Type**: `rule`
- **Given**: Admin sudah login; ada file test.md dengan frontmatter sesuai skema:
  ```yaml
  title: "Test Upload"
  description: "desc"
  pubDate: 2026-09-07
  category: "Tips & Trick"
  heroImage: "https://images.unsplash.com/test.jpg"
  ---
  ## Sub Heading
  Isi paragraf.
  ```
- **When**:
  1. Drag-drop file ke area upload di `/admin/blog/new` →
  2. Lihat preview parse → klik Publish →
- **Then**:
  1. Preview menampilkan: title = "Test Upload", category = Tips & Trick, pub_date = 7 Sep 2026, hero_image_url benar, slug auto-generate = `test-upload`, ada estimasi read time, ToC menampilkan "Sub Heading".
  2. Setelah Publish: baris baru muncul di `/admin/blog` list, halaman `/blog` menampilkan kartu artikel, `/blog/test-upload` bisa diakses tanpa 404 dan merender heading H2 "Sub Heading" + isi paragraf + ToC sesuai.
- **Pass Condition**: Sub-condition 1 & 2 keduanya lolos. Slug duplikat (jika ada artikel title sama) mendapatkan suffix `-2`, `-3` dst (unique).
- **Evidence**: Screenshot preview parse before publish, list admin after, halaman publik detail artikel baru.

### AC-9: `SUPABASE_SERVICE_ROLE_KEY` tidak bocor ke client bundle
- **Type**: `rule`
- **Given**: Build production atau dev mode berjalan
- **When**: Inspect semua file JS yang dikirim ke browser + semua Astro file client-side
- **Then**: Tidak ada string yang mengandung value `sb_secret_` (prefix SUPABASE_SERVICE_ROLE_KEY) di bundle client; service role key HANYA muncul di import dalam `src/pages/api/*` & file helper khusus server-side yang TIDAK pernah di-import dari component/page client.
- **Pass Condition**: Grep seluruh project untuk `sb_secret_` hanya match di `.env` + file helper server-side + di dalam `src/pages/api/*`; TIDAK ada match di dalam `src/components/*` atau tag `<script>` tanpa `server` / API route context.
- **Evidence**: Output grep command (perlihatkan file mana saja yang match `sb_secret_` / env import service role).

### AC-10: Data lama dihapus setelah implementasi + test selesai
- **Type**: `rule`
- **Given**: Semua halaman publik (/, /gallery, /blog, /blog/[slug]) sudah di-test dan tampilkan data DB dengan BENAR
- **When**: Cleanup step dijalankan
- **Then**:
  1. File `src/data/modal-data.ts` terhapus
  2. Semua file `.md` di `src/content/blog/` terhapus
  3. Tidak ada import / referensi ke `modal-data.ts` atau `getCollection('blog')` yang tersisa di seluruh codebase (grep 0 match untuk `modal-data`, `getCollection`, `astro:content`)
- **Pass Condition**: 3 sub-condition terpenuhi SEMUA; build project tidak error (tsc / astro build berhasil tanpa unresolved imports).
- **Evidence**: `ls src/data/` (modal-data.ts tidak ada), `ls src/content/blog/` (folder kosong atau tidak ada), grep hasil 0.

### AC-11: Konsistensi UI / styling dengan design existing
- **Type**: `rubric`
- **Dimension**: Kesesuaian visual panel admin & halaman baru terhadap UI existing GOWKAN (glass-card, rounded-[3rem], gradient purple-pink, typography Inter/Plus Jakarta Sans, spacing scale, button style, dll).
- **Scale**: 1-5
- **Anchors**:
  - 1 = Panel admin & halaman baru TIDAK PUNYA style yang sama dengan existing (warna beda, rounded beda, font beda, tampak beda produk).
  - 3 = Sebagian style match (mis. rounded sama tapi warna/typography beda, atau ada beberapa komponen match tapi banyak enggak).
  - 5 = SEMUA halaman baru (`/gallery`, `/blog`, `/admin/*` beserta form & list di admin) 100% konsisten: pakai `glass-card`, border `white/10`, rounded `[3rem]` / `[2rem]` sesuai komponen induk, button class `cta-highlight cta-glow` sesuai `Button.astro` existing, font weight sama (font-black, font-semibold scale), warna primary `#6366f1` / secondary `#a855f7` / accent `#ec4899` sama persis.
- **Pass Threshold**: >= 4
- **Evidence**: Screenshot side-by-side halaman existing (mis. `/blog` existing grid card) vs halaman baru `/gallery` grid card & panel admin list table/form.

### AC-12: Error handling spesifik (tidak generik)
- **Type**: `rubric`
- **Dimension**: Kualitas pesan error pada admin upload parse, login gagal, CRUD gagal — apakah user pesan error yang SPESIFIK dari sumber asli (Supabase error.message, gray-matter error tentang frontmatter invalid), bukan "Terjadi kesalahan" generik.
- **Scale**: 1-5
- **Anchors**:
  - 1 = Semua error muncul sebagai alert generik "Gagal" / "Error" tanpa penjelasan apapun.
  - 3 = Sebagian error ada detail (mis. login gagal menampilkan alasan), tapi parse md gagal atau DB constraint error masih generik.
  - 5 = SEMUA error path yang ditest (login wrong password, upload file non-.md, frontmatter md tidak ada title, slug duplicate DB error, RLS policy violation) menampilkan pesan SPESIFIK dari error.message upstream dengan user-friendly framing (tanpa expose stack trace / query SQL).
- **Pass Threshold**: >= 4
- **Evidence**: Screenshot tiap jenis error — login gagal, upload non-md, frontmatter kurang field, save slug duplicate.
