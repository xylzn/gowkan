# Revisi Arsitektur GOWKAN — Implementation Plan
## Task Queue (Dependency-Ordered)

---

## Task 1: Buat Supabase Client Helper + Utility Functions
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Buat `src/lib/supabase.ts` dengan 2 client instance:
    1. `supabasePublic`: pakai `import.meta.env.SUPABASE_ANON_KEY` — untuk dipanggil dari halaman publik (`/gallery`, `/blog`, homepage preview) & client-side select.
    2. `supabaseServer`: pakai `import.meta.env.SUPABASE_SERVICE_ROLE_KEY` — HANYA untuk dipakai DI DALAM `src/pages/api/*` (jangan di-export ke client!). Juga sediakan helper `createServerClient(request)` untuk cookie-based SSR auth via `@supabase/ssr`.
  - Buat `src/lib/markdown.ts` utility (GUNAKAN interface SUDAH ADA di `types.ts`):
    1. `parseMarkdown(content_md: string): { html: string; headings: ArticleHeading[] }` — render md ke HTML pakai `marked`, extract heading H2/H3, slugify pakai `github-slugger` (sama logic dengan Astro render untuk ToC).
    2. `estimateReadTime(content_md: string): string` — hitung kata / 200 wpm, return `${n} min baca`.
    3. `generateUniqueSlug(title: string, existingSlugs: string[]): string` — slugify title, jika duplikat append `-2`, `-3` dst sampai unique.
  - Update `src/env.d.ts` tambah type untuk 3 env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (sekarang env.d.ts cuma reference Astro types).
  - **PENTING**: Jangan export `supabaseServer` dari module level — buat function `getSupabaseServer()` yang cuma bisa dipanggil dalam server context.
- **Acceptance Criteria Addressed**: AC-9 (pondasi keamanan), AC-1, AC-2, AC-3 (pondasi query + render)
- **Test Requirements**:
  - `rule` TR-1.1: Import `supabasePublic` dari component client-side Astro TIDAK error & client bisa SELECT 1 baris dari `gallery_items` via anon key tanpa RLS error. Evidence: console.log hasil query test.
  - `rule` TR-1.2: `supabaseServer` HANYA bisa dipanggil dari dalam API route; TIDAK ada import statement `supabaseServer` di `src/components/*` atau di tag `<script>` tanpa konteks server. Evidence: `grep -r "supabaseServer" src/` hanya match di `src/pages/api/*` dan `src/lib/supabase.ts` (definisi).
  - `rule` TR-1.3: Function `parseMarkdown` untuk md string `"## Hello\nIsi *text*"` return HTML dengan tag `<h2 id="hello">Hello</h2>` + headings array = `[{ depth: 2, slug: 'hello', text: 'Hello' }]`. Evidence: unit test inline (atau console.log) output.
  - `rule` TR-1.4: `generateUniqueSlug("Test", ["test"])` return `"test-2"`; `generateUniqueSlug("Test", ["test","test-2"])` return `"test-3"`. Evidence: output console.log.
  - `rubric` TR-1.5: Code readability; scale 1-5; anchors: 1 = semua function campur aduk tanpa comment header, 3 = struktur OK tapi magic number (200 wpm) tidak ada comment, 5 = tiap function ada JSDoc singkat, magic number diberi label konstanta, interface dari `types.ts` dipakai SEMUA (bukan inline any); threshold >= 4. Evidence: review code file.
- **Notes**: Reuse SEMUA interface dari `src/lib/types.ts` yang sudah existing.

---

## Task 2: Auth API Routes + Middleware Proteksi `/admin/*`
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Buat `src/pages/api/auth/login.ts` (POST):
    - Terima `{ email, password }` dari body JSON.
    - Panggil `createServerClient(Astro.request).auth.signInWithPassword({ email, password })`.
    - Jika sukses: `return new Response(JSON.stringify({ success: true, redirect: '/admin' }))` — cookie auth otomatis di-set oleh `@supabase/ssr`.
    - Jika gagal: return `{ success: false, error: error.message }` (PASS pesan asli dari Supabase, JANGAN diganti generik).
  - Buat `src/pages/api/auth/logout.ts` (POST):
    - Panggil `signOut()` + clear cookie via ssr client, return redirect atau success JSON.
  - Buat `src/middleware.ts` (Astro middleware, run sebelum semua page render):
    - Jika `url.pathname` STARTS WITH `/admin` DAN BUKAN `/admin/login` dan BUKAN `/admin/api/*`:
      - Ambil sesi dari cookie (pakai ssr serverClient.getUser() / getSession()).
      - Jika TIDAK ada user valid → `return Astro.redirect('/admin/login', 302)`.
    - Semua path lain → next().
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `rule` TR-2.1: Buka `/admin` via incognito TANPA login → browser dapet 302 ke `/admin/login` (cek network tab). Evidence: Screenshot network panel.
  - `rule` TR-2.2: Buka `/admin/gallery` via incognito → juga 302 ke `/admin/login`. Buka `/admin/blog` → juga 302. Evidence: 2 network screenshot tambahan.
  - `rule` TR-2.3: Submit POST ke `/api/auth/login` dengan email salah → response JSON error.message mengandung string dari Supabase (mis. "Invalid login credentials"), BUKAN string custom kosong seperti "Error". Evidence: curl / Postman / fetch log.
  - `rule` TR-2.4: Submit login dengan kredensial BENAR → response `success: true` DAN browser menerima Set-Cookie header dengan nama cookie Supabase auth (biasanya `sb-xxx-auth-token`). Evidence: Network tab response headers.
  - `rule` TR-2.5: POST `/api/auth/logout` ketika sudah login → cookie auth dihapus (Expires = masa lalu). Evidence: Network tab logout response.

---

## Task 3: API Routes CRUD Gallery + Blog (Parse & Insert)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Gallery CRUD (semua pakai `supabaseServer`, AUTH DI-CHECK di setiap handler — selain middleware, double check user di API level juga untuk safety):
    - `src/pages/api/gallery/index.ts` POST — INSERT ke `gallery_items`, body = semua field tabel kecuali id/created_at.
    - `src/pages/api/gallery/[id].ts` PUT — UPDATE by id; DELETE — hapus by id.
    - (Optional GET list bisa langsung client pakai supabasePublic — tidak perlu API wrapper.)
  - Blog:
    - `src/pages/api/blog/parse-md.ts` (POST, multipart/form-data, AUTH):
      - Ambil file `.md` dari `Astro.request.formData()`.
      - Baca text file → parse pakai `gray-matter` → `{ data: frontmatter, content: contentMd }`.
      - Validate frontmatter: field `title`, `description`, `pubDate`, `category`, `heroImage` WAJIB ada — jika ada yang kurang return error SPESIFIK (mis. "Frontmatter field 'title' is required").
      - Mapping ke schema DB: `title→title, description→description, pubDate→pub_date, category→category, heroImage→hero_image_url, contentMd→content_md`.
      - Query `SELECT slug FROM articles` semua slug existing → generate slug unique pakai utility `generateUniqueSlug(title, existingSlugs)`.
      - Hitung readTime dari contentMd, parse headings dari contentMd (pakai utility dari Task 1).
      - RETURN JSON `{ parsed: {...all mapped field + slug}, preview: { headings, readTime, renderedHtmlPreview: (parseMarkdown sebagian / ambil first 500 chars rendered) } }`. **JANGAN INSERT ke DB dulu** (ini step preview).
    - `src/pages/api/blog/index.ts` (POST, AUTH):
      - Body = article object PARSED (sama format return parse-md tadi) — INSERT satu baris ke `articles`.
      - Jika unique constraint slug error (race condition) → return error.message dari Supabase.
    - `src/pages/api/blog/[id].ts` (PUT & DELETE, AUTH):
      - PUT: Update metadata article (title, slug, category, pub_date, hero_image_url, description) — TIDAK update content_md (sesuai spec).
      - DELETE: Hapus by id.
  - SEMUA API routes handler: wrap logic dalam try/catch, catch block return `{ success: false, error: (e as any).message ?? 'Unknown error' }` status 500. JANGAN throw tanpa catch.
- **Acceptance Criteria Addressed**: AC-7, AC-8, AC-12 (pondasi error message spesifik)
- **Test Requirements**:
  - `rule` TR-3.1: POST `/api/gallery` dengan body valid → return new row id valid; SELECT manual ke DB confirm baris ada. Evidence: response JSON + Supabase table screenshot.
  - `rule` TR-3.2: PUT `/api/gallery/:id` ganti `nama_proyek` → value di DB berubah. DELETE `/api/gallery/:id` → row hilang dari DB. Evidence: before/after select.
  - `rule` TR-3.3: POST `/api/blog/parse-md` dengan file test.md (frontmatter lengkap sesuai skema lama) → response JSON `parsed.title` == md title, `parsed.slug` == slugified title, `preview.headings.length` >= 1. Evidence: response body JSON.
  - `rule` TR-3.4: POST parse-md dengan file md yang TIDAK ADA field `title` di frontmatter → response error.message spesifik "Frontmatter field 'title' is required" / sejenis (dari code validator, bukan throw). Evidence: response error JSON.
  - `rule` TR-3.5: POST parse-md dengan file BUKAN .md (extension .txt) / file bukan text → error message spesifik (mis. "Only .md files are allowed") TIDAK generik. Evidence: response error.
  - `rule` TR-3.6: POST `/api/blog` dengan parsed object dari TR-3.3 → INSERT sukses; SELECT DB confirm baris ada dengan content_md value lengkap. Evidence: DB query.
  - `rule` TR-3.7: PUT `/api/blog/:id` ganti category → value category berubah di DB. DELETE → row hilang. Evidence: before/after.

---

## Task 4: Bangun Halaman Admin Full (Login, Dashboard, Gallery CRUD, Blog Upload)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - Buat `src/pages/admin/login.astro`:
    - Layout simple tapi tetap style GOWKAN (glass-card, background blob dari MainLayout).
    - Form email + password. Submit via fetch POST ke `/api/auth/login`.
    - Jika response `success: true` → `window.location.href = '/admin'`.
    - Jika gagal → tampilkan div error dengan isi `error.message` berwarna merah (TIDAK pakai alert()).
  - Buat `src/pages/admin/index.astro` (Dashboard):
    - Query server-side di frontmatter Astro: panggil `supabasePublic.from('gallery_items').select('count', { count: 'exact', head: true })` dan sama untuk `articles`.
    - Tampilkan 2 kartu stat: "Total Proyek Gallery" (count) + "Total Artikel Blog" (count).
    - 2 tombol CTA: "Kelola Gallery" → `/admin/gallery`, "Kelola Blog" → `/admin/blog`.
  - Buat `src/pages/admin/gallery/index.astro`:
    - Server-side select SEMUA gallery item.
    - Tampilkan sebagai list / tabel dengan kolom: thumbnail (gambar kecil), nama_proyek, kategori, url, urutan_tampil, Actions (Edit, Hapus).
    - Tombol "+ Tambah Proyek Baru" → link ke `/admin/gallery/new`.
    - Script delete: onclick confirm "Yakin hapus proyek [nama]? Data tidak bisa dikembalikan." → fetch DELETE ke `/api/gallery/:id` → jika sukses reload page / remove row DOM.
  - Buat `src/pages/admin/gallery/new.astro` + `src/pages/admin/gallery/[id]/edit.astro`:
    - Form dengan semua field: nama_proyek (input text), url (input text https://), kategori (text), thumbnail_url (input text https://), ringkasan (textarea 3 baris), detail_pekerjaan (textarea 8–10 baris), urutan_tampil (input number default 0).
    - New: Submit POST ke `/api/gallery` → redirect ke list.
    - Edit: Server-side load existing data by id (server select di frontmatter), prefill semua input. Submit PUT ke `/api/gallery/:id` → redirect ke list.
    - Error saat submit → tampilkan error.message di atas form.
  - Buat `src/pages/admin/blog/index.astro`:
    - Server-side select semua artikel, urut pub_date DESC.
    - Tabel kolom: hero_image (thumbnail kecil), title, category, pub_date, slug, Actions (Edit Metadata, Hapus).
    - Tombol "+ Upload Artikel Baru" → `/admin/blog/new`.
    - Delete confirm dialog seperti gallery.
  - Buat `src/pages/admin/blog/new.astro`:
    - Area drag-drop + file input `<input type="file" accept=".md">`.
    - UX flow:
      1. User pilih file / drop file → auto fetch POST FormData ke `/api/blog/parse-md`.
      2. Saat loading parse → spinner / "Memproses file..."
      3. Jika error → tampilkan error box dengan error.message.
      4. Jika sukses parse → HIDDEN form muncul dengan SEMUA field metadata SUDAH TERISI (bisa di-edit sebelum publish): title, slug, description, category, pub_date, hero_image_url. Tampilkan juga PREVIEW CARD: hero_image tampil, read time, list headings ToC, preview render markdown 500 karakter pertama dibawah form.
      5. Tombol "Publish Artikel" disabled sampai parse sukses. Klik Publish → fetch POST body = `parsed` object (dengan metadata ter-edit terbaru) ke `/api/blog` → jika sukses redirect ke `/admin/blog` list.
  - Buat `src/pages/admin/blog/[id]/edit.astro`:
    - Load article by id, prefill form HANYA field metadata: title, slug, description, category, pub_date, hero_image_url (content_md TIDAK ditampilkan / diedit, sesuai scope).
    - Submit PUT ke `/api/blog/:id` → redirect.
  - SEMUA halaman admin:
    - Import MainLayout / style global (tapi jangan pakai Navbar publik — buat admin navbar mini sendiri di atas: "GOWKAN ADMIN" di kiri, link ke Dashboard / Gallery / Blog di tengah, tombol "Logout" di kanan yang panggil POST `/api/auth/logout`).
    - **WAJIB** pakai style konsisten: glass-card, rounded-[2rem]/[3rem], text-[#6366f1] primary, font-bold scale sama existing.
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8, AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-4.1: Login admin sukses bisa akses `/admin` dan lihat 2 kartu count. Evidence: screenshot dashboard.
  - `rule` TR-4.2: Create gallery via form new → item muncul di list admin & muncul di halaman publik `/gallery` (cek AC-1 juga). Evidence: 2 screenshot.
  - `rule` TR-4.3: Edit gallery nama_proyek → perubahan muncul di list & publik. Delete → hilang dari keduanya. Evidence: before/after.
  - `rule` TR-4.4: Upload file test.md di blog new → preview parse muncul (title, heroImage, read time, ToC, preview html); klik Publish → artikel muncul di list admin & muncul di `/blog` publik grid. Evidence: screenshot preview + list admin + grid blog.
  - `rule` TR-4.5: Drop file non-.md (image / txt) ke upload area → error box muncul dengan pesan spesifik (bukan alert kosong). Evidence: screenshot error box.
  - `rule` TR-4.6: Klik Logout di admin navbar → redirect ke `/admin/login`. Buka `/admin` lagi → 302 kembali ke login. Evidence: flow test.
  - `rubric` TR-4.7: Konsistensi UI halaman admin dengan existing style GOWKAN; scale 1-5 (lihat AC-11 anchors); threshold >= 4. Evidence: screenshot side-by-side admin card vs Homepage Gallery card (rounded, border, typography, warna primary sama).

---

## Task 5: Halaman Publik `/gallery` + Refactor PreviewModal
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (butuh client public untuk query)
- **Description**:
  - Buat `src/pages/gallery/index.astro` (HALAMAN BARU):
    - Frontmatter: server-side `supabasePublic.from('gallery_items').select('*').order('urutan_tampil', { ascending: true }).order('created_at', { ascending: false })`.
    - Pakai MainLayout, Navbar, Footer.
    - Hero header section mirip `/blog/index.astro` existing: badge "Portfolio Kami", h1 "Karya <span>Terbaik</span> Kami", subtitle "Koleksi proyek website nyata yang telah kami kerjakan untuk klien."
    - Grid responsive `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8` (mirip grid blog existing) — SEMUA item dari DB dirender.
    - Kartu Gallery persis design sama seperti carousel card di `Gallery.astro` komponen homepage (ASPECT RATIO SAMA, rounded-[3rem], thumbnail image dengan hover scale, kategori badge, title, tombol "Lihat Demo"). HANYA saja ganti carousel → grid.
    - Tombol "Lihat Demo" pada KARTU: atribut data harus berisi PER-ITEM ID (bukan category!) — mis. `data-gallery-id={item.id}` & `data-ringkasan`, `data-detail`, `data-url`, dll inline di attribute, ATAU inject semua data sebagai JSON array ke script tag bottom lalu mapping by id.
  - REFACTOR `src/components/PreviewModal.astro` dari hardcoded:
    - **HAPUS** import `{ GOWKAN_MODAL_DATA } from '../data/modal-data'`.
    - Script modal: ketika button dengan `data-gallery-id` diklik, baca attribute terbaru per item:
      - `modalTitle.textContent = item.nama_proyek`
      - `modalCategory.textContent = item.kategori`
      - `modalImage.src = item.thumbnail_url`
      - **Bagian kiri (sekarang "Headline Utama" + "Fokus Utama" + "Keunggulan")** diubah jadi:
        1. H4 "Ringkasan Proyek" → body = `item.ringkasan`
        2. H4 "Detail Pekerjaan" → body = `item.detail_pekerjaan` (bisa new line / simple markdown text plain dulu, OK)
      - Footer modal: HAPUS tombol single sekarang. GANTI dengan 2 tombol BERSEBELAHAN (flex gap-4):
        1. **TOMBOL KUNJUNGI WEBSITE** (variant GHOST / GLASS): `<a id="modal-visit-url" target="_blank" rel="noopener noreferrer">Kunjungi Website</a>` — href di-set = `item.url`.
        2. **TOMBOL KONSULTASI PROJECT INI** (variant PRIMARY): link `/#contact` (tetap seperti sekarang, id="modal-cta").
    - JANGAN ubah style visual modal (rounded, backdrop blur, overlay, close button, dll). HANYA ubah logic sumber data dan struktur content body + 2 tombol footer.
  - Pastikan PreviewModal MASIH DIIMPOR di `src/pages/index.astro` (homepage) dan sekarang juga perlu di-import di `src/pages/gallery/index.astro`.
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `rule` TR-5.1: Buka `/gallery` → semua item dari DB tampil sebagai grid 1/2/3 kolom. Jumlah kartu = COUNT dari tabel gallery_items. Evidence: screenshot + count kartu vs count DB.
  - `rule` TR-5.2: Klik "Lihat Demo" di kartu X (nama = "Selasar Bahasa", url = "https://selasarbahasa.com") → modal title = "Selasar Bahasa", kategori benar, image = thumbnail_url, body menampilkan Ringkasan Proyek + Detail Pekerjaan dari field DB X. Evidence: screenshot modal content.
  - `rule` TR-5.3: Tombol "Kunjungi Website" di footer modal → DOM inspect punya `target="_blank" rel="noopener noreferrer"` dan `href = https://selasarbahasa.com` (persis DB field url). Click tombol → buka tab baru selasarbahasa.com. Evidence: DOM inspect + video click.
  - `rule` TR-5.4: PreviewModal di HOMEPAGE juga masih berfungsi dengan refactor data baru (tidak pakai modal-data.ts). Klik Lihat Demo di section Gallery homepage → modal buka dengan benar data dari DB. Evidence: click test di homepage.
  - `rubric` TR-5.5: Konsistensi kartu grid `/gallery` dengan kartu carousel existing; threshold >= 4 (rounded, padding, image overlay, typography scale sama persis). Evidence: side-by-side screenshot kartu homepage carousel vs grid fullpage.

---

## Task 6: Halaman Publik `/blog` Grid + `/blog/[slug]` Detail Dynamic DB
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - REFACTOR `src/pages/blog/index.astro`:
    - HAPUS `import { getCollection } from 'astro:content';` dan ganti source data → server-side `supabasePublic.from('articles').select('*').order('pub_date', { ascending: false })`.
    - Struktur UI (header badge + h1 "Edukasi Digital & Branding", grid 3 kolom kartu article, dll) TETAP 100% PERSIS.
    - Kartu mapping: `post.data.heroImage` → `artikel.hero_image_url`, `post.data.pubDate` → `artikel.pub_date`, `post.data.category` → `artikel.category`, `post.data.title` → `artikel.title`, dll. Link "Baca Selengkapnya" href = `/blog/${artikel.slug}`.
  - REFACTOR `src/pages/blog/[...slug].astro` (FILE YANG SUDAH ADA, DIUBAH BESARAN):
    - **HAPUS BARIS INI SEMUA**:
      ```astro
      export const prerender = true;
      export async function getStaticPaths() { ... }
      const { post } = Astro.props; // (baris ini diganti)
      ```
    - Ganti logic: Ambil `slug` dari `Astro.params.slug` — karena route sekarang named parameter, cek params: jika `slug` array, join; jika string pakai langsung.
    - Server-side query: `SELECT * FROM articles WHERE slug = {slug} LIMIT 1`.
    - Jika `data.length === 0` → `return Astro.redirect('/404')` / throw 404.
    - Ambil `article = data[0]`.
    - Render: gunakan `parseMarkdown(article.content_md)` utility dari Task 1 → dapat `{ html, headings }`. Render `<Fragment set:html={html} />` di dalam prose div (GANTI `<Content />` Astro yang lama).
    - Reading time: pakai `estimateReadTime(article.content_md)` utility (GANTI logic lama yang pakai `post.body`).
    - `pubDate` → `article.pub_date` (date, perlu parse ke Date object untuk `toLocaleDateString`).
    - Semua UI LAIN TETAP PERSIS 100%: breadcrumb items, scroll progress bar, fixed decoration background, author mini profile, prose class config, CTA footer section dengan Button Konsultasi + Lihat Portofolio, sidebar ToC pakai headings hasil parse, Mobile TOC Drawer button + drawer script, reveal observer script — SEMUA dipertahankan, HANYA source data yang diganti.
    - ToC prop `headings={headings}` → ini interface ArticleHeading[] SAMA PERSIS dengan yang dipakai sekarang.
    - CTA footer tombol "Lihat Portofolio" href sekarang = `/gallery` (bukan `/#gallery` — sama update dengan Navbar nanti).
- **Acceptance Criteria Addressed**: AC-3, AC-11
- **Test Requirements**:
  - `rule` TR-6.1: Build & run dev, TIDAK ada error di console tentang `getStaticPaths` / `prerender` pada blog slug. Buka `/blog/slug-artikel-DA ri-DB` → HALAMAN BISA DIAKSES tanpa 404. Evidence: console build + browser URL sukses.
  - `rule` TR-6.2: Detail artikel menampilkan SEMUA fitur existing: breadcrumb (Beranda › Blog › Judul), scroll progress bar muncul saat scroll, desktop sidebar ToC menampilkan H2/H3 dari artikel dengan link anchor yang WORK (klik → scroll ke heading), mobile drawer button + drawer muncul saat klik. Evidence: screenshot tiap fitur.
  - `rule` TR-6.3: Reading time menampilkan angka > 0 (mis. "3 min baca"), sesuai panjang content_md. Evidence: screenshot header metadata artikel.
  - `rule` TR-6.4: Markdown dirender BENAR: H2 besar & bold, H3 lebih kecil, paragraf line-height sesuai prose config, blockquote styling (border primary, rounded kanan) muncul jika ada `>` di md. Evidence: screenshot rendered content vs md source.
  - `rule` TR-6.5: META title & description OG image di `<head>` = `title + " | Gowkan Blog"` & description & heroImage — seperti spec MainLayout props. Evidence: inspect <title> & meta tags.
  - `rule` TR-6.6: Grid `/blog` menampilkan SEMUA artikel dari DB dengan urutan tanggal terbaru ATAS (pub_date DESC). Evidence: screenshot grid vs DB query order.

---

## Task 7: Homepage Section Preview Blog & Gallery (Query DB LIMIT + Tombol Lihat Semua)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 5 (Gallery query), Task 6 (Blog query)
- **Description**:
  - REFACTOR `src/components/Blog.astro` (section teaser homepage):
    - HAPUS `import { getCollection } from 'astro:content'`.
    - Ganti: server-side query `supabasePublic.from('articles').select('*').order('pub_date', { ascending: false }).limit(3)`.
    - Map posts array → persis struktur DOM existing (carousel item, kartu rounded-[3rem], dll). Semua style UI TETAP PERSIS, termasuk warna badge category mapping per kategori.
    - TAMBAHKAN TOMBOL "Lihat Semua Artikel" di bagian atas section (flex row kanan atas, di samping button prev-next carousel, atau di bawah subtitle — letakkan di div flex header section sebelah kanan, mirip posisi button carousel). Button style: variant glass dari Button.astro, href = `/blog`.
  - REFACTOR `src/components/Gallery.astro` (section teaser homepage):
    - HAPUS hardcoded `const portfolioItems = [...]` array di top frontmatter.
    - Ganti: server-side query `supabasePublic.from('gallery_items').select('*').order('urutan_tampil', { ascending: true }).order('created_at', { ascending: false }).limit(6)`.
    - Map items → persis struktur DOM existing carousel item.
    - Tombol trigger data attribute = pakai `data-gallery-id` + inline field lainnya (sesuai Task 5 refactor modal, bukan category).
    - TAMBAHKAN TOMBOL "Lihat Semua Karya" di section header kanan (sama posisi seperti Blog section button), href = `/gallery`, variant glass.
  - Test homepage: carousel harus tetap jalan dengan data baru (class `Carousel` dari `carousel.ts` inisialisasi di `index.astro` — tidak perlu ubah script carousel).
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-7.1: Count children `.carousel-track` di section Blog homepage = MAKSIMAL 3 (LIMIT 3). Jika di DB cuma ada 2 artikel → count = 2. Evidence: inspect DOM.
  - `rule` TR-7.2: Count children carousel track di Gallery homepage = MAKSIMAL 6. Evidence: inspect DOM.
  - `rule` TR-7.3: Tombol "Lihat Semua Artikel" ada di section Blog, href = `/blog` (inspect). Click → pindah halaman ke `/blog` penuh. Evidence: inspect + click result.
  - `rule` TR-7.4: Tombol "Lihat Semua Karya" ada di section Gallery, href = `/gallery`. Click → `/gallery`. Evidence: inspect + click.
  - `rule` TR-7.5: Carousel arrow left/right & swipe mobile tetap work untuk section Blog & Gallery homepage (TIDAK rusak karena ganti data source). Evidence: manual click prev/next button work (opacity toggle, carousel slide).

---

## Task 8: Update Navbar Links + Hero CTA Links
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None (bisa jalan paralel dengan Task 5-7, tapi sebelum final test)
- **Description**:
  - EDIT `src/data/site-config.ts` ubah `navigation` array:
    ```ts
    // Sebelum:
    // { label: "Blog", href: "/#blog" },
    // { label: "Galeri", href: "/#gallery" },
    // Menjadi:
    { label: "Blog", href: "/blog" },
    { label: "Galeri", href: "/gallery" },
    ```
    (Anchor lainnya: /#home, /#about, /#packages — TETAP.)
  - EDIT `src/components/Hero.astro` baris CTA nomor 2:
    - Sebelum: `<Button href="#gallery" variant="glass">Lihat Website</Button>`
    - Menjadi: `<Button href="/gallery" variant="glass">Lihat Website</Button>`
  - Double-check: CTA di blog detail footer button "Lihat Portofolio" juga dari `/#gallery` → `/gallery` (sebutkan di Task 6 bagian akhir, jika belum diubah, ubah di Task 8 ini).
  - Juga check Button component `Hubungi Kami` di Navbar → masih `/#contact` (OK, TETAP anchor).
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `rule` TR-8.1: Inspect DOM Navbar link "Blog" → href === "/blog" (bukan "/#blog"). Click → URL berubah ke `/blog` (bukan scroll). Evidence: inspect + click.
  - `rule` TR-8.2: Inspect Navbar link "Galeri" → href === "/gallery". Click → ke `/gallery`. Evidence: inspect + click.
  - `rule` TR-8.3: Inspect Hero CTA "Lihat Website" button → href === "/gallery". Click → pindah halaman. Evidence: inspect + click.
  - `rule` TR-8.4: Mobile sidebar (click hamburger menu) link Blog & Galeri href juga berubah ke `/blog` & `/gallery` (karena loop dari SITE_CONFIG.navigation yang sama). Click → pindah halaman, sidebar auto-close seperti biasa. Evidence: inspect sidebar link href.

---

## Task 9: Cleanup Data Lama + Final Build Verification
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 5, Task 6, Task 7 (semua halaman publik sudah terbukti jalan dari DB)
- **Description**:
  - HAPUS file `src/data/modal-data.ts`.
  - HAPUS SEMUA file `.md` di `src/content/blog/`:
    - `pentingnya-website-responsif.md`
    - `teknik-seo-dasar-meningkatkan-traffic.md`
    - `teknik-seo-dasar.md`
  - (Optional hapus folder `src/content/` jika kosong total, tapi jangan paksa jika Astro masih butuh untuk fitur content collections lain — tapi karena sudah tidak dipakai, aman dihapus.)
  - HAPUS empty import / reference yang tersisa:
    - Cek jika `PreviewModal.astro` masih import `modal-data` → sudah dihapus di Task 5, tapi pastikan lagi.
    - Cek `Blog.astro` section, `blog/index.astro`, `blog/[...slug].astro` → semua sudah tidak ada import `astro:content` atau `getCollection`.
  - Grep seluruh `src/` untuk string: `"getCollection"`, `"modal-data"`, `"astro:content"`, `"prerender"` — hasilnya harus 0 match (kecuali comment).
  - Jalankan `astro build` / user command build — TIDAK ada error import, TIDAK ada type error, TIDAK ada reference to file yang dihapus.
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `rule` TR-9.1: `ls src/data/` TIDAK menampilkan `modal-data.ts`. Evidence: command output.
  - `rule` TR-9.2: `ls src/content/blog/` TIDAK menampilkan 3 file md, atau folder sudah tidak ada. Evidence: command output.
  - `rule` TR-9.3: `grep -rn "getCollection\|modal-data\|astro:content" src/` → 0 match result (hanya match di luar src atau tidak ada sama sekali). Evidence: grep output.
  - `rule` TR-9.4: Grep "prerender" → hanya TIDAK ada di `blog/[...slug].astro` (sudah dihapus). Jika masih ada di file lain yang tidak relevan, tidak apa — yang penting halaman artikel detail tidak prerender. Evidence: grep output.
  - `rule` TR-9.5: Build ASTRO (`npm run build` — executed by user jika perlu) exit code 0, TANPA error import unresolved, TANPA error undefined variable. Evidence: build log tail lines success.
  - `rule` TR-9.6: Setelah cleanup, halaman `/`, `/gallery`, `/blog`, `/blog/[slug-slug]` MASIH BISA DIAKSES semua tanpa error 500 (dibuktikan dengan dev mode). Evidence: screenshot 4 halaman sukses load.

---

## Task 10: Security Check — Service Key Bocor? + Cross-Cutting Requirement Verif
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**:
  - Audit keamanan:
    - Grep whole project (include `src/**/*.astro`, `src/**/*.ts`, `src/**/*.tsx`, `public/**`) untuk string `sb_secret_` (prefix service role key real di .env).
    - Setiap match harus di file `.env` ATAU di file yang HANYA dipakai server-side (`src/lib/supabase.ts` definisi, dan `src/pages/api/*` yang import function server).
    - TIDAK boleh ada match di dalam tag `<script>` client-side (tanpa `server` directive), atau dalam component Astro yang dirender client.
  - Cek juga: API routes CRUD di Task 3 — SELALU check user login sebelum INSERT/UPDATE/DELETE. Double check di setiap handler, bahkan kalau sudah ada middleware (defense in depth).
  - Verif semua tombol "Kunjungi Website" di modal punya `rel="noopener noreferrer"` (security best practice untuk external link).
  - Final check semua Acceptance Criteria (ringkasan checklist cepat, evidence dikumpulkan dari task-task sebelumnya).
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `rule` TR-10.1: `grep -rn "sb_secret_" .` (exclude `.git`, `node_modules`) → hasil match file: `.env`, `src/lib/supabase.ts` (mungkin jika dalam conditional server-side check), `src/pages/api/**/*.ts`. JANGAN ada match di `src/components/**/*`. Evidence: grep output.
  - `rule` TR-10.2: Setiap API Gallery POST/PUT/DELETE dan Blog POST/PUT/DELETE memiliki validasi session user di awal handler: `const { data: { user } } = await supabaseServer.auth.getUser()` / sejenis — jika `!user` return 401 Unauthorized dengan error message. Evidence: code inspection setiap file API route handler, screenshot code block auth check.
  - `rule` TR-10.3: PreviewModal tombol visit URL → inspect `rel` attribute mengandung setidaknya `noopener noreferrer`. Evidence: DOM inspect tombol di modal.
  - `rubric` TR-10.4: Overall error message specificity across seluruh path error (AC-12); scale 1-5; threshold >= 4. Evidence: kumpulan screenshot error dari Task 2 (login gagal), Task 3 (parse gagal, DB constraint), Task 4 (admin form submit gagal) — semuanya non-generik.

---

## Task Dependencies Graph (Quick Ref)
```
Task 1 (Supabase + Utils)
├─> Task 2 (Auth API + Middleware)
│   └─> Task 3 (CRUD API Gallery + Blog)
│       └─> Task 4 (Halaman Admin Full)
├─> Task 5 (/gallery page + Modal refactor)
├─> Task 6 (/blog + /blog/[slug] dynamic)
│   └─> Task 7 (Homepage preview sections LIMIT + Lihat Semua)
Task 8 (Navbar + Hero links update) ─────────────┐
Task 5+6+7 done ─────────> Task 9 (Cleanup old files + build)
Task 1+2+3+4 done ──────> Task 10 (Security audit)
```
