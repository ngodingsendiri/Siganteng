# SIKEREN Bulk Kolektif — Extension Chrome MV3

Input kinerja harian SIKEREN Jember secara kolektif (banyak tanggal sekaligus) tanpa ubah server. Membaca **Jenis SKP** & **Aktivitas** live per role, kalender klik fleksibel, default **Senin–Jumat**, kosongan.

## Verifikasi Desain (30 Aug 2026, NIP 199406092025211025)
- **Halaman:** `kinerja-harian/579269` (Bulan Agustus 2026, beban 7150 Menit)
- **SKP:** 4 opsi (`NON-SKP` + 3 SKP panjang, contoh tanggal 1: `Terlaksananya dukungan administrasi layanan kepegawaian ASN...`)
- **Rutinitas:** 54 opsi via `Choices.js` (`854554 = Melaksanakan pengolahan data (60 menit)` untuk tanggal 1-2 Diverifikasi)
- **Submit:** `POST https://sikeren.jemberkab.go.id/kinerja-store` dengan `FormData {_token, id_produktivitas=579269, tgl_kinerja=YYYY-MM-DD, jenis_skp, rutinitas, keterangan, pengkali_kinerja, output_kinerja}` + `credentials: include` → `Swal.fire "telah ditambahkan"` (verified via fetch)
- **Existing:** `td.tanggal` → `1 Agustus 2026`, `2 Agustus 2026` (sudah Diverifikasi, `aksi=-` tidak bisa delete) → extension skip otomatis
- **Kalender:** `flatpickr` single di `input#datepicker` (data-bulan 08, data-tahun 2026) — extension buat grid sendiri multi-select

## Fitur
- **Tombol `Bulk Kolektif`** di sebelah `Tambah Kinerja Harian` (`page 6: btn-success`)
- **Kalender grid** 31 hari, klik toggle, weekend abu-abu, sudah ada dicoret
- **Filter cepat:** `Hari Kerja (Sen–Jum)` (default, 21 hari di Aug 2026), `Pilih Semua` (31), `Bersihkan`, `Hanya Senin` (5), `Hanya Jumat` (4), `Sen & Jum` (9), `Blok 1-7/8-14/15-21/22-31`
- **Template kosongan:** Jenis SKP & Aktivitas dibaca live (beda role auto-sync), Keterangan/Output/Pengkali kosong — isi sekali, `Simpan Template` ke `chrome.storage.sync` (fallback `localStorage`)
- **Preview:** `Tanggal | Status (Akan dikirim/Sudah ada — skip)` + counter
- **Submitter:** Loop `fetch` sekuensial (600ms throttle), progress bar, log `✓ 2026-08-03 berhasil`, auto-reload jika 100% sukses, skip duplikat

## Instalasi (untuk teman)
1. Download `sikeren-bulk-extension.zip` → Extract
2. Chrome → `chrome://extensions` → aktifkan `Developer mode` (kanan atas)
3. `Load unpacked` → pilih folder `sikeren-bulk-extension`
4. Buka `https://sikeren.jemberkab.go.id/kinerja-harian/579269` → muncul tombol **Bulk Kolektif** (biru info di sebelah hijau)
5. Klik → kalender muncul (default Sen-Jum terpilih) → pilih filter (`Hanya Senin` untuk coba) → isi Template (kosongan) → `Simpan Kolektif`

## Cara Pakai Kolektif
- **Full bulan hari kerja:** Buka Bulk → default sudah Sen–Jum (21) → isi SKP/Aktivitas/Keterangan=`Rekapitulasi engagement Sosmed`/Output=`Laporan`/Pengkali=1 → `Simpan Kolektif (21)` → confirm → tunggu progress → reload lihat `Jumlah Menit Akumulasi` 120→1320
- **Hanya Senin:** Klik `Hanya Senin` → 5 terpilih → submit
- **Blok 1 minggu:** Klik `Blok 1-7` → 5 kerja (3-7) karena 1-2 sudah ada skip
- **Custom Senin+Jumat:** Klik `Sen & Jum`

## File
- `manifest.json` — MV3, host `sikeren.jemberkab.go.id/kinerja-harian/*`
- `src/content.js` — 464 baris, vanilla JS, `MutationObserver` untuk Choices.js late load
- `src/content.css` — Falcon theme
- `src/popup.html/js` — simpan template

## Catatan
- Tidak butuh `cookies` permission — reuse session login yang sudah ada
- Jika SIKEREN ganti ID rutinitas, extension auto-baca ulang (jangan hardcode)
- Jika tanggal Diverifikasi (`aksi=-`), tidak bisa di-delete lagi — extension skip
