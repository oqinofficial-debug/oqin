// =============================================
// KONFIGURASI — GANTI SESUAI MILIKMU
// =============================================
const API_URL = "https://script.google.com/macros/s/AKfycbyMNWq9FBcHY2xBHQIDfJ57h1kLwJGNC-w_fKueLFFQiDJk29_e4QK2UZIzC8iEz6_F/exec";
// PERBAIKAN BUG #1: SECRET_KEY harus sama persis dengan Code.gs
const SECRET_KEY = "keluarga-rahasia-2026";

// =============================================
// HELPER FUNCTIONS
// =============================================

// Konversi "50k" → 50000, "1.5jt" → 1500000
// PERBAIKAN BUG #5: Handle titik ribuan dengan benar
function parseNominal(input) {
  if (!input) return 0;
  let str = input.toString().toLowerCase().trim();

  // Tentukan multiplier dulu sebelum strip karakter lain
  let multiplier = 1;
  if (str.includes("jt")) { multiplier = 1_000_000; str = str.replace("jt", ""); }
  else if (str.includes("k")) { multiplier = 1_000; str = str.replace("k", ""); }

  // Jika ada titik dan koma: format "1.500,50" → pakai titik sebagai ribuan
  // Jika hanya titik tanpa koma: bisa desimal ("1.5") atau ribuan ("1.500")
  if (str.includes(",")) {
    // Format: 1.500,50 → titik=ribuan, koma=desimal
    str = str.replace(/\./g, "").replace(",", ".");
  } else if ((str.match(/\./g) || []).length === 1) {
    // Satu titik: biarkan sebagai desimal
    // tidak perlu diubah
  } else {
    // Beberapa titik: titik sebagai ribuan
    str = str.replace(/\./g, "");
  }

  const angka = parseFloat(str.replace(/[^0-9.]/g, "")) || 0;
  return Math.round(angka * multiplier);
}

// Format angka → "Rp 50.000"
function formatRp(n) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

// PERBAIKAN BUG #6: Format tanggal yang ramah pengguna
function formatTanggal(serial) {
  if (!serial) return "-";
  let date;
  if (typeof serial === "number") {
    // Serial date dari Google Sheets
    date = new Date((serial - 25569) * 86400 * 1000);
  } else {
    // String tanggal (ISO atau "yyyy-MM-dd HH:mm:ss")
    date = new Date(serial.replace(" ", "T"));
  }
  if (isNaN(date.getTime())) return String(serial).substring(0, 10);
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// Tampilkan pesan toast sementara
function showToast(pesan, tipe = "ok") {
  const toast = document.getElementById("toast");
  toast.textContent = pesan;
  toast.className = "toast show " + (tipe === "error" ? "error" : "");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Tampilkan/sembunyikan loading overlay
function setLoading(aktif) {
  document.getElementById("loading").style.display = aktif ? "flex" : "none";
}

// PERBAIKAN BUG #4: Ganti confirm() native dengan dialog custom non-blocking
function showKonfirmasi(pesan, onYa) {
  const overlay = document.getElementById("konfirmasi-overlay");
  const teks = document.getElementById("konfirmasi-teks");
  teks.textContent = pesan;
  overlay.style.display = "flex";

  // Hapus listener lama agar tidak menumpuk
  const btnYa = document.getElementById("konfirmasi-ya");
  const btnTidak = document.getElementById("konfirmasi-tidak");
  const newBtnYa = btnYa.cloneNode(true);
  const newBtnTidak = btnTidak.cloneNode(true);
  btnYa.replaceWith(newBtnYa);
  btnTidak.replaceWith(newBtnTidak);

  newBtnYa.addEventListener("click", () => {
    overlay.style.display = "none";
    onYa();
  });
  newBtnTidak.addEventListener("click", () => {
    overlay.style.display = "none";
  });
}

// =============================================
// API CALLS KE APPS SCRIPT
// =============================================

async function apiGet(action) {
  const res = await fetch(`${API_URL}?action=${action}&key=${encodeURIComponent(SECRET_KEY)}`);
  if (!res.ok) throw new Error(`Gagal terhubung ke server (HTTP ${res.status})`);
  const json = await res.json();
  return json;
}

async function apiPost(body) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // Apps Script tidak perlu application/json
    body: JSON.stringify({ key: SECRET_KEY, ...body })
  });
  if (!res.ok) throw new Error(`Gagal terhubung ke server (HTTP ${res.status})`);
  return res.json();
}

// =============================================
// STATE APLIKASI
// =============================================
let _kategoriData = { masuk: [], keluar: [] };
let _transaksiData = [];
let _halamanAktif = "dashboard";

// =============================================
// NAVIGASI HALAMAN
// =============================================

function bukaHalaman(nama) {
  _halamanAktif = nama;

  document.querySelectorAll(".halaman").forEach(el => el.classList.remove("aktif"));
  document.getElementById("hal-" + nama).classList.add("aktif");

  document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("aktif"));
  document.querySelector(`.nav-tab[data-hal="${nama}"]`).classList.add("aktif");

  if (nama === "dashboard") muatDashboard();
  // PERBAIKAN BUG #2: Selalu reload kategori saat buka tab input
  if (nama === "input") muatKategori(false);
  // PERBAIKAN BUG #3: Gunakan cache tapi beri opsi paksa=true via tombol refresh
  if (nama === "riwayat") muatRiwayat(false);
}

// =============================================
// HALAMAN DASHBOARD
// =============================================

async function muatDashboard() {
  const el = document.getElementById("ringkasan");
  el.innerHTML = `
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  `;

  try {
    const res = await apiGet("getDashboard");
    if (res.status !== "ok") throw new Error(res.message);
    const d = res.data;

    el.innerHTML = `
      <div class="kartu-saldo green">
        <div><div class="ks-label">Bulan ini Masuk</div><div class="ks-nilai">${formatRp(d.summary.totalMasuk)}</div></div>
        <span style="font-size:28px">📈</span>
      </div>
      <div class="kartu-saldo red">
        <div><div class="ks-label">Bulan ini Keluar</div><div class="ks-nilai">${formatRp(d.summary.totalKeluar)}</div></div>
        <span style="font-size:28px">📉</span>
      </div>
      <div class="kartu-saldo blue">
        <div><div class="ks-label">Saldo Akhir</div><div class="ks-nilai">${formatRp(d.summary.totalSaldo)}</div></div>
        <span style="font-size:28px">💰</span>
      </div>
    `;

    const katMasukEl = document.getElementById("kat-masuk");
    const katKeluarEl = document.getElementById("kat-keluar");

    katMasukEl.innerHTML = !d.incomeChart.labels.length
      ? "<p class='kosong'>Belum ada data pemasukan</p>"
      : d.incomeChart.labels.map((label, i) => `
          <div class="kat-item">
            <span class="kat-nama">➕ ${label}</span>
            <span class="kat-nominal green">${formatRp(d.incomeChart.values[i])}</span>
          </div>
        `).join("");

    katKeluarEl.innerHTML = !d.expenseChart.labels.length
      ? "<p class='kosong'>Belum ada data pengeluaran</p>"
      : d.expenseChart.labels.map((label, i) => `
          <div class="kat-item">
            <span class="kat-nama">➖ ${label}</span>
            <span class="kat-nominal red">${formatRp(d.expenseChart.values[i])}</span>
          </div>
        `).join("");

  } catch (err) {
    el.innerHTML = `<p class="error">❌ ${err.message}</p>`;
  }
}

// =============================================
// HALAMAN INPUT TRANSAKSI
// =============================================

// PERBAIKAN BUG #2: Parameter paksa untuk force reload kategori
async function muatKategori(paksa = false) {
  if (!paksa && _kategoriData.masuk.length > 0) {
    updateDropdownKategori();
    return;
  }
  try {
    const res = await apiGet("getKategori");
    if (res.status !== "ok") throw new Error(res.message);
    _kategoriData = { masuk: res.masuk, keluar: res.keluar };
    updateDropdownKategori();
  } catch (err) {
    showToast("Gagal memuat kategori: " + err.message, "error");
  }
}

function updateDropdownKategori() {
  const tipe = document.getElementById("inp-tipe").value;
  const selectKat = document.getElementById("inp-kategori");
  const list = tipe === "masuk" ? _kategoriData.masuk : _kategoriData.keluar;

  selectKat.innerHTML =
    list.map(k => `<option value="${k}">${k}</option>`).join("") +
    `<option value="__baru__">✏️ Kategori baru...</option>`;

  // Sembunyikan input kategori baru saat tipe berubah
  document.getElementById("kategori-baru-wrap").style.display = "none";
}

// Warna tombol tipe transaksi
function updateTipeUI() {
  const tipe = document.getElementById("inp-tipe").value;
  const btnKeluar = document.getElementById("btn-tipe-keluar");
  const btnMasuk = document.getElementById("btn-tipe-masuk");
  btnKeluar.className = tipe === "keluar" ? "aktif-keluar" : "";
  btnMasuk.className = tipe === "masuk" ? "aktif-masuk" : "";
}

async function simpanTransaksi() {
  const tipe = document.getElementById("inp-tipe").value;
  const nominalRaw = document.getElementById("inp-nominal").value.trim();
  const keterangan = document.getElementById("inp-keterangan").value.trim();
  let kategori = document.getElementById("inp-kategori").value;

  if (kategori === "__baru__") {
    const baru = document.getElementById("inp-kategori-baru").value.trim();
    if (!baru) {
      showToast("Ketik nama kategori baru dulu", "error");
      return;
    }
    kategori = baru.toUpperCase();
  }

  const nominal = parseNominal(nominalRaw);
  if (nominal <= 0) {
    showToast("Nominal tidak valid. Contoh: 50000 atau 50k", "error");
    return;
  }

  setLoading(true);
  try {
    const res = await apiPost({ action: "create", tipe, kategori, nominal, keterangan });
    if (res.status === "ok") {
      showToast("✅ Transaksi tersimpan!");
      document.getElementById("inp-nominal").value = "";
      document.getElementById("inp-keterangan").value = "";
      document.getElementById("inp-kategori-baru").value = "";
      document.getElementById("kategori-baru-wrap").style.display = "none";
      // Paksa reload kategori agar kategori baru muncul di dropdown
      _kategoriData = { masuk: [], keluar: [] };
      _transaksiData = [];
    } else {
      showToast("❌ " + res.message, "error");
    }
  } catch (err) {
    showToast("❌ " + err.message, "error");
  } finally {
    setLoading(false);
  }
}

// =============================================
// HALAMAN RIWAYAT TRANSAKSI
// =============================================

async function muatRiwayat(paksa = false) {
  if (_transaksiData.length > 0 && !paksa) {
    renderRiwayat(_transaksiData);
    return;
  }

  const el = document.getElementById("list-riwayat");
  el.innerHTML = `
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  `;

  try {
    const res = await apiGet("getTransaksi");
    if (res.status !== "ok") throw new Error(res.message);
    _transaksiData = res.data;
    renderRiwayat(_transaksiData);
  } catch (err) {
    el.innerHTML = `<p class="error">❌ ${err.message}</p>`;
  }
}

function renderRiwayat(data) {
  const el = document.getElementById("list-riwayat");

  if (!data.length) {
    el.innerHTML = `<p class="kosong">Belum ada transaksi</p>`;
    return;
  }

  const tampil = [...data].reverse().slice(0, 30);

  el.innerHTML = tampil.map(t => {
    const isMasuk = t.pemasukan > 0;
    const nominal = isMasuk ? t.pemasukan : t.pengeluaran;
    // Escape untuk keamanan innerHTML
    const katEsc = t.kategori.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const ketEsc = (t.keterangan || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `
      <div class="item-transaksi">
        <div class="it-kiri">
          <span class="it-simbol">${isMasuk ? "➕" : "➖"}</span>
          <div class="it-info">
            <span class="it-kat">${katEsc}</span>
            <span class="it-ket">${ketEsc !== "-" ? ketEsc : ""}</span>
            <span class="it-tgl">${formatTanggal(t.tanggal)}</span>
          </div>
        </div>
        <div class="it-kanan">
          <span class="it-nominal ${isMasuk ? "green" : "red"}">${formatRp(nominal)}</span>
          <button class="btn-hapus" data-row="${t.rowIndex}" data-kat="${katEsc}" data-nominal="${nominal}" aria-label="Hapus transaksi">🗑️</button>
        </div>
      </div>
    `;
  }).join("");

  // Delegasi event untuk tombol hapus (lebih efisien)
  el.querySelectorAll(".btn-hapus").forEach(btn => {
    btn.addEventListener("click", () => {
      const rowIndex = parseInt(btn.dataset.row);
      const kat = btn.dataset.kat;
      const nominal = parseFloat(btn.dataset.nominal);
      // PERBAIKAN BUG #4: Pakai dialog custom, bukan confirm()
      showKonfirmasi(
        `Hapus transaksi?\n${kat} — ${formatRp(nominal)}`,
        () => hapusTransaksi(rowIndex)
      );
    });
  });
}

async function hapusTransaksi(rowIndex) {
  setLoading(true);
  try {
    const res = await apiPost({ action: "delete", rowIndex });
    if (res.status === "ok") {
      showToast("✅ Data dihapus");
      _transaksiData = [];
      await muatRiwayat(true);
    } else {
      showToast("❌ " + res.message, "error");
    }
  } catch (err) {
    showToast("❌ " + err.message, "error");
  } finally {
    setLoading(false);
  }
}

// =============================================
// PERBAIKAN BUG #7: Satukan semua DOMContentLoaded
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
      .then(() => console.log("✅ Service Worker terdaftar"))
      .catch(err => console.warn("Service Worker gagal:", err));
  }

  // Setup navigasi tab bawah
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => bukaHalaman(tab.dataset.hal));
  });

  // Setup toggle tipe transaksi (tombol)
  document.getElementById("btn-tipe-keluar").addEventListener("click", () => {
    document.getElementById("inp-tipe").value = "keluar";
    updateTipeUI();
    updateDropdownKategori();
  });
  document.getElementById("btn-tipe-masuk").addEventListener("click", () => {
    document.getElementById("inp-tipe").value = "masuk";
    updateTipeUI();
    updateDropdownKategori();
  });

  // Setup dropdown kategori
  document.getElementById("inp-kategori").addEventListener("change", (e) => {
    document.getElementById("kategori-baru-wrap").style.display =
      e.target.value === "__baru__" ? "block" : "none";
  });

  // Tombol simpan
  document.getElementById("btn-simpan").addEventListener("click", simpanTransaksi);

  // Tombol refresh riwayat
  document.getElementById("btn-refresh-riwayat").addEventListener("click", () => muatRiwayat(true));

  // Inisialisasi UI awal
  updateTipeUI();

  // Buka halaman dashboard
  bukaHalaman("dashboard");

  // Tanggal header
  document.getElementById("tgl-header").textContent =
    new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
});
