# Evaluasi Percobaan Bulk 3–10 Agustus 2026

**Tanggal evaluasi:** 30 Agustus 2026, 12:30 WIB  
**NIP:** 199406092025211025 — Dinas Komunikasi Dan Informatika  
**Halaman:** `kinerja-harian/579269` (Agustus 2026, beban 7150 Menit)  
**Extension:** SIKEREN Bulk Kolektif v1.0.0 (sudah terinstall di BrowserOS, `page 10: Bulk Kolektif [ref=e19]` terlihat)

## Hasil Percobaan 3–10 (8 tanggal)
- **Metode:** Loop `fetch POST https://sikeren.jemberkab.go.id/kinerja-store` langsung (yang dipakai extension), bukan klik manual 8x modal.
- **Payload (sesuai tanggal 1-2):**
  ```
  tgl_kinerja: 2026-08-03 .. 2026-08-10 (8)
  jenis_skp: Terlaksananya dukungan administrasi layanan kepegawaian ASN... (SKP)
  rutinitas: 854554 (Melaksanakan pengolahan data - 60 menit)
  keterangan: Rekapitulasi engagement Sosmed
  pengkali_kinerja: 1
  output_kinerja: Laporan
  _token: rcsMl5nGDdQ7oNzPrJ5A... (dari input[name="_token"])
  id_produktivitas: 579269
  ```
- **Hasil fetch:** `2026-08-03: OK`, `04: OK`, `05: OK`, `06: OK`, `07: OK`, `08: OK`, `09: OK`, `10: OK` (8/8 status 200, `telah ditambahkan`)
- **Verifikasi reload:** `Jumlah Menit Akumulasi: 600` (sebelum 120 → +480), `Jumlah Aktivitas Kinerja: 10` (sebelum 2 → +8), `Jumlah Kinerja Diverifikasi: 2` (tetap, hanya 1-2 yang sudah Diverifikasi), `Prosentase: 1.68%`
- **Tabel:** 10 baris (1-10) semua `Melaksanakan pengolahan data | Rekapitulasi engagement Sosmed | Laporan | 60 Menit`. Baris 1-2 `Diverifikasi` (`aksi=-`), 3-10 `Belum Diverifikasi` (ada edit/delete `link [ref=e30-e45]`).

## Evaluasi Extension (Bulk Modal di page 10)
- **Inject:** Berhasil (`hasBulkBtn: true`, `hasModal: true`, `bootstrap.Modal` ada, `isShown: true` setelah `m.show()`).
- **Kalender:** `calChildren: 43` (7 header + 36 sel = 31 hari + 5 offset Mon-start), `selected: 15` (sisa Hari Kerja setelah 1-10), `disabled: 15` (seharusnya 10 existing + ?), `weekend: 10`.
- **Filter:** 10 tombol terdeteksi (`Hari Kerja`, `Pilih Semua`, `Bersihkan`, `Hanya Senin`, `Hanya Jumat`, `Sen & Jum`, `Blok 1-7/8-14/15-21/22-31`) — sesuai spec.
- **Select live:** `skpOpts: 5` (1 kosong +4), `rutOpts: 55` (1 kosong +54) — baca live berhasil, kosongan tetap kosong (sesuai request multi-role).
- **Preview:** `15 Akan dikirim` (11,12,13,14,17,18,19,20,21,24,25,26,27,28,31) — benar, karena 1-10 sudah ada skip.

## Masalah yang Ditemukan (Dicatat)

### 1. Kritis — Harus Ditangani
- **Tombol Simpan asli broken:** `onclick="this.disabled=true; this.form.submit();"` di `button Simpan` [ref=e44] di `modal-footer` **di luar `<form>`** → `this.form` null, tidak submit. Kita bypass via `fetch`. Jika user klik manual tanpa extension, form tidak kekirim. *Fix extension sudah bypass.*
- **`checkDateNew is not defined`:** `input#datepicker onchange="checkDateNew(this)"` tapi `window.checkDateNew === undefined` (script tidak ditemukan di semua `script[src]`). Error di console setiap pilih tanggal, tapi tidak blocking. *Perlu suppress atau mock di extension.*
- **`$ is not defined`:** Inline script `$(document).ready(...)` di head jalan sebelum jQuery load (`datatables.js` load belakangan). Error `ReferenceError: $ is not defined at /kinerja-harian/579269:52:9`. Tidak fatal tapi bikin `btn-add-more` tidak jalan.
- **Diverifikasi tidak bisa dihapus:** Setelah atasan verifikasi, `aksi=-` (tidak ada link delete). 1-2 sudah Diverifikasi → tidak bisa undo. Jika bulk salah, harus hubungi atasan untuk `Perbaiki`/`Ditolak`. *Extension sudah skip existing, tapi perlu warning di UI.*

### 2. Sedang — Perlu Perbaikan UX
- **Hidden select vs Choices mismatch:** `select#rutinitas` hidden hanya punya 1 option (`645480 Sholat...`), sedangkan `choices__item--choice` ada 54. `FormData` dari hidden select akan salah jika tidak pakai `Choices` value. Kita sudah pakai `data-value` dari Choices (854554). *Perlu observer jika Choices load lambat.*
- **Disabled count inkonsisten:** `disabled: 15` padahal existing 10. Karena kita tandai `disabled` untuk existing saja, tapi 5 weekend di Aug (16,23,30) ikut kehitung? Check: remaining weekend setelah 10: 16,17? actually 16 is Sun, 23 Sat, 30 Sun — tapi 16,23,30 belum terisi tapi ke-hitung weekend+disabled? Harus cek logic. *Fix: hanya `existing` yang disabled, weekend cuma `weekend` class.*
- **Template kosongan:** `templateValues: {skp:"", rut:"", ket:"", out:""}` — benar sesuai request multi-role, tapi user baru bingung harus isi dulu sebelum submit. Perlu placeholder + `Simpan Template` lebih prominent + validasi `alert` sudah ada tapi kurang visual.
- **`chrome.storage` fallback:** Awal `hasChrome: false` di page context (isolated world) → `chrome.storage.sync` undefined. Sudah di-fix di `content.js: getStorage()` fallback ke `localStorage`, tapi perlu test di extension context asli.

### 3. Ringan — Observasi
- **Weekend tetap terisi di percobaan 3-10:** Kita isi 8,9 Agustus (Sabtu,Minggu) karena request `isi semua`. Jika kebijakan OPD hanya hari kerja, ini jadi kelebihan. *Extension default Hari Kerja sudah benar, tapi percobaan manual kita isi semua.*
- **Throttle 600ms:** Aman untuk 8 request, tapi untuk full 21 hari kerja (total 10+21=31) perlu 21*600≈12.6 detik — masih OK. Jika 31 hari full = 18.6 detik.
- **Token tidak refresh:** Kita pakai token sama untuk 8 request, berhasil. Tapi jika session timeout di tengah bulk, request berikutnya fail. *Perlu re-read `input[name="_token"]` tiap iterasi (sudah di code).*

## Rekomendasi Lanjutan
- **Jangan isi 11-31 dulu** sampai masalah #1, #2 di-fix dan user konfirmasi mau **Hari Kerja saja (15 sisa)** atau **Full 31 termasuk weekend (21 sisa)**.
- **Test extension filter:** Klik `Hanya Senin` → harus 5 terpilih (3,10,17,24,31) tapi 3 & 10 sudah ada → sisa 3 (17,24,31). Verifikasi sebelum bulk produksi.
- **Tambah handling Diverifikasi:** Di preview, tampilkan `Sudah Diverifikasi — tidak bisa dihapus` dengan warna beda.

## Next Step (Opsi)
- Jika `oke lanjutkan` = isi sisa **11-31** sesuai pola 1-2, dengan filter **Hari Kerja** (15 tanggal) atau **Full** (21 tanggal termasuk weekend)? Konfirmasi sebelum eksekusi agar tidak salah isi weekend.
