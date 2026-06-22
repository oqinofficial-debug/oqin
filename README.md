# 💰 Keuangan Keluarga — PWA

Aplikasi pencatatan keuangan keluarga berbasis PWA, menggunakan Google Spreadsheet sebagai database dan Google Apps Script sebagai backend API.

---

## 📁 Struktur File

```
keuangan-keluarga/
├── index.html          ← Halaman utama PWA
├── app.js              ← Logika aplikasi
├── style.css           ← Tampilan
├── manifest.json       ← Konfigurasi PWA
├── service-worker.js   ← Cache offline
├── Code.gs             ← Google Apps Script (backend)
└── icons/
    ├── icon-192.png    ← Ikon PWA (buat sendiri)
    └── icon-512.png    ← Ikon PWA besar (buat sendiri)
```

---

## 🚀 Cara Setup

### 1. Siapkan Google Spreadsheet

Buat Spreadsheet baru, lalu buat dua sheet:
- Sheet bernama **`Data`** dengan header di baris 1:
  - A: `Tanggal` | B: `Kategori` | C: `Pemasukan` | D: `Pengeluaran` | E: `Keterangan`
- (Sheet `Dashboard` tidak lagi diperlukan — data dihitung langsung dari sheet Data)

Salin **ID Spreadsheet** dari URL:
`https://docs.google.com/spreadsheets/d/` **[ID_INI]** `/edit`

### 2. Deploy Google Apps Script

1. Buka Spreadsheet → **Extensions → Apps Script**
2. Hapus kode default, paste seluruh isi `Code.gs`
3. Ganti `SS_ID` dengan ID Spreadsheet Anda
4. Klik **Deploy → New Deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Klik **Deploy**, salin **URL Web App**

### 3. Konfigurasi app.js

Buka `app.js`, ganti dua baris ini:
```js
const API_URL = "https://script.google.com/macros/s/XXXX/exec"; // ← URL dari langkah 2
const SECRET_KEY = "keluarga-rahasia-2026"; // ← Harus sama dengan Code.gs
```

### 4. Buat Ikon

Buat folder `icons/` dan taruh dua file:
- `icon-192.png` — ukuran 192×192 px
- `icon-512.png` — ukuran 512×512 px

Bisa pakai [favicon.io](https://favicon.io) atau buat di Canva.

### 5. Deploy ke Web

Opsi gratis:
- **GitHub Pages**: push ke repo, aktifkan Pages
- **Netlify**: drag & drop folder ke netlify.com
- **Vercel**: `vercel deploy`

PWA hanya bisa diinstall dari HTTPS (bukan `file://`).

---

## ⚠️ Catatan Penting

- **SECRET_KEY di `app.js` dan `Code.gs` harus sama persis**
- Setiap kali edit `Code.gs`, buat **deployment baru** (bukan update) agar perubahannya aktif
- Jika tambah kategori baru via input, langsung muncul di dropdown karena kategori diambil dari data nyata

---

## 🐛 Bug yang Diperbaiki (dari versi sebelumnya)

| # | File | Bug |
|---|------|-----|
| 1 | app.js | SECRET_KEY tidak cocok dengan Code.gs |
| 2 | app.js | Kategori tidak pernah diperbarui setelah tambah baru |
| 3 | app.js | Riwayat tidak reload saat pertama buka tab |
| 4 | app.js | `confirm()` native diblokir browser mobile |
| 5 | app.js | `parseNominal` salah handle format titik ribuan |
| 6 | app.js | `formatTanggal` tampilkan format ISO, tidak ramah |
| 7 | app.js | `DOMContentLoaded` didefinisikan dua kali |
| 8 | index.html | Tipe transaksi pakai `<select>`, tidak sesuai desain CSS |
| 9 | index.html | Tidak ada `apple-touch-icon` untuk iOS |
| 10 | index.html | Tiga elemen `<main>` (invalid HTML) |
| 11 | service-worker.js | Tidak ada event `activate`, cache lama tidak dibersihkan |
| 12 | service-worker.js | Icon di-cache saat install, jika tidak ada → install gagal total |
| 13 | Code.gs | `totalSaldo` salah karena pakai kolom keterangan (r[4]) |
| 14 | Code.gs | Kategori diambil dari sheet Dashboard yang bisa tidak sinkron |
| 15 | Code.gs | Tanggal dikembalikan sebagai Date object, tidak konsisten |
| 16 | Code.gs | `waitLock` tidak handle kegagalan lock dengan baik |
