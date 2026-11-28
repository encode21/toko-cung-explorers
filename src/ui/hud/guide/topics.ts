import type { GuideAction } from "@/game/story/guide-action";

export interface GuideTopic {
  id: string;
  title: string;
  summary: string;
  steps: { text: string; action?: Pick<GuideAction, "sheet" | "waypoint"> }[];
}

/** Button names follow the owning HUD components; prices are confirmed in the purchase panel. */
export const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: "warung-buka",
    title: "Warung: buka warung",
    summary: "Mulai jualan dari teras rumahmu.",
    steps: [
      {
        text: "Buka Handphone → Usaha. Di bagian Warung, pilih Buka warung.",
        action: { sheet: "usaha" },
      },
      {
        text: "Isi Nama warung, lalu pilih Buka warung. Kamu mulai dari Warung Teras dengan modal Kas Rp50.000. Ini modal awal yang diterima, bukan biaya pembukaan.",
      },
      {
        text: "Lokasi awal ada di rumahmu di gang. Pilihan kavling lain mengikuti ketersediaan dan harga yang ditampilkan. Periksa biaya lokasi sebelum membeli. Kelola warung lewat Warungku.",
        action: { sheet: "warung" },
      },
    ],
  },
  {
    id: "warung-kunci",
    title: "Warung: kunci warung",
    summary: "Amankan warung sebelum pergi.",
    steps: [
      {
        text: "Warung yang ditinggal tanpa dikunci bisa kemalingan. Dari dalam warung, pilih Kunci & keluar agar warung aman saat kamu pergi.",
      },
      {
        text: "Di depan warung sendiri, tombol Kunci mengunci pintu. Tombolnya berubah menjadi Buka untuk membuka kunci. Masuk warung membawa kamu ke dalam.",
        action: { waypoint: "usaha-warung", sheet: "warung" },
      },
      {
        text: "Jika muncul kabar maling kabur dari warungmu, kejar dan pukul 2× sebelum waktu habis. Mengunci pintu dan mengatur jam buka adalah dua hal berbeda.",
      },
    ],
  },
  {
    id: "warung-jam",
    title: "Warung: jam buka–tutup",
    summary: "Atur kapan pembeli boleh datang.",
    steps: [
      {
        text: "Di Warungku, pilih Operasional → Jadwal & pegawai. Pada Jam buka, atur Buka dan Tutup, lalu tekan Simpan.",
        action: { sheet: "warung" },
      },
      {
        text: "Jadwal memakai jam dunia: 1 hari berlangsung 48 menit. Pembeli hanya datang saat buka. Buka dan Tutup dengan jam yang sama berarti buka 24 jam.",
      },
      {
        text: "Kalender menandai jam buka dan tutup warung. Malam pukul 22–05 lebih sepi. Makin lama buka, makin besar biaya listrik. Periksa jadwal dan tagihanmu.",
        action: { sheet: "calendar" },
      },
    ],
  },
  {
    id: "warung-stok",
    title: "Warung: grosir & stok",
    summary: "Isi rak, atur harga, dan pilih pengiriman.",
    steps: [
      {
        text: "Datangi gedung Toko Cung untuk belanja Grosir. Belanja langsung aktif setelah sampai di toko. Ikuti petunjuk ke toko, lalu gunakan kiosk grosir.",
        action: { waypoint: "map-store", sheet: "map" },
      },
      {
        text: "Periksa satuan barang, seperti dus atau pack. Jumlah yang dipilih mengikuti satuan pada produk. Masukkan ke keranjang, periksa total, lalu bayar.",
      },
      {
        text: "Pilih Antar untuk pengiriman berongkir, atau Bawa sendiri untuk mengangkut belanjaan. Ongkir terlihat di tombol Antar sebelum kamu memilih.",
      },
      {
        text: "Di Warungku → Stok & harga, pakai tombol − dan + untuk mengatur harga jual. Bandingkan dengan harga pasar agar pembeli tetap tertarik.",
        action: { sheet: "warung" },
      },
      {
        text: "Jika pembeli meminta barang yang belum tersedia, pilih Belanjain di Toko Grosir. Pesanannya masuk rekomendasi Grosir; belanjakan, lalu kembali melayani pembeli yang menunggu.",
      },
    ],
  },
  {
    id: "warung-catatan",
    title: "Warung: pembeli & catatan",
    summary: "Layani pelanggan dan periksa arus kas.",
    steps: [
      {
        text: "Datangi warung terasmu dan pilih Masuk warung. Siapkan stok, lalu pilih Layani saat pembeli datang. Periksa barang yang diminta sebelum melanjutkan.",
        action: { waypoint: "usaha-warung", sheet: "warung" },
      },
      {
        text: "Buka Warungku → Catatan kas → Transaksi. Di sana ada pemasukan penjualan dan pengeluaran, termasuk grosir, iuran RT, serta palak.",
        action: { sheet: "warung" },
      },
      {
        text: "Buka Utang pelanggan di Catatan kas untuk melihat pembeli yang belum membayar. Kamu bisa menagih lewat chat atau mencari pembeli di jalan. Tombol Tagih muncul saat kamu dekat dengannya.",
      },
    ],
  },
  {
    id: "ojol-mulai",
    title: "Ojol: mulai narik",
    summary: "Siapkan motor dan buka aplikasi Ojek.",
    steps: [
      {
        text: "Belum punya motor? Gunakan motor umum milik juragan di parkiran. Setelah punya motor sendiri, lihat dan panggil motormu lewat aplikasi Ojek.",
        action: { sheet: "ojek" },
      },
      {
        text: "Naik motor sebagai pengemudi. Buka Handphone → Ojek → Narik untuk melihat status dan tawaran penumpang.",
      },
      {
        text: "Motor juragan memakai setoran. Periksa ongkos, setoran, dan hasil bersih yang ditampilkan sebelum mengambil perjalanan.",
      },
    ],
  },
  {
    id: "ojol-bid",
    title: "Ojol: on/off bid",
    summary: "Pilih kapan menerima tawaran penumpang.",
    steps: [
      {
        text: "Di Ojek → Narik, pilih Aktifkan untuk online. Tetap di atas motor saat mencari order. HP boleh ditutup. Nonaktifkan mengubah status menjadi offline.",
        action: { sheet: "ojek" },
      },
      {
        text: "Saat tawaran datang, pilih Terima · N dtk sebelum hitung mundur habis. Pilih Lewati jika tidak mau mengambilnya. Mematikan driver saat ada tawaran juga dihitung Lewati.",
      },
      {
        text: "Rating baik membuat bid lebih ramai. Dua tawaran berturut-turut boleh dilewati; mulai yang ketiga, rating turun 0,1. Menyelesaikan trip menaikkan rating 0,1.",
      },
    ],
  },
  {
    id: "ojol-antar",
    title: "Ojol: antar pesanan",
    summary: "Jemput, antar, dan jaga ratingmu.",
    steps: [
      {
        text: "Setelah menerima order, pilih Menuju titik jemput. Berhenti dekat penumpang NPC dan tunggu sampai ia naik. Untuk penumpang pemain, pilih Ajak bonceng di dunia game.",
        action: { sheet: "ojek" },
      },
      {
        text: "Pilih Lanjutkan perjalanan untuk petunjuk tujuan. Antar penumpang lalu berhenti di titik tujuan. Perjalanan selesai otomatis.",
      },
      {
        text: "Selesaikan order yang sudah diambil. Membatalkan perjalanan memutus rangkaian trip berturut-turut. Jaga rating dengan mengantar sampai tujuan.",
      },
    ],
  },
  {
    id: "summit",
    title: "Summit gunung",
    summary: "Lewati checkpoint sampai ke puncak.",
    steps: [
      {
        text: "Buka Peta Dunia dan pilih Petunjuk ke helipad. Datangi helipad kota, lalu naik helikopter menuju basecamp Pegunungan.",
        action: { waypoint: "venue-helicopter", sheet: "map" },
      },
      {
        text: "Ikuti jalur pendakian dan lewati checkpoint. Status CP x/N menunjukkan pos yang sudah kamu capai. Jika tersangkut, gunakan Kembali ke pos pendakian terakhir; ikonnya bertuliskan Pos CP atau Basecamp.",
      },
      {
        text: "Di puncak muncul Puncak tercapai! Pilih Tetap di puncak atau Kembali ke basecamp. Catatan summit dikirim saat terhubung dan masuk leaderboard. Setelah tercatat, papan Summit bisa dipakai dari slot Summit.",
      },
    ],
  },
  {
    id: "mancing",
    title: "Mancing",
    summary: "Tunggu sambaran, lalu tarik tepat waktu.",
    steps: [
      {
        text: "Cari ikon pancing Fishing Spot di peta, lalu menuju dermaga laut di belakang Halte Gerbang Kampung. Berjalan sampai ujung dermaga untuk memancing.",
        action: { waypoint: "venue-fishing", sheet: "map" },
      },
      {
        text: "Gunakan Lempar kail, lalu tunggu. Saat muncul Ikan menyambar! Tarik sekarang!, segera pilih Tarik kail. Di HP gunakan tombol kail; di keyboard bisa memakai Spasi.",
      },
      {
        text: "Terlambat menarik membuat ikan lepas. Saat muncul Ikan lepas · Lempar lagi, coba lagi. Hasil tangkapan yang berhasil bisa dilihat di Handphone → Inventory.",
      },
    ],
  },
  {
    id: "teleport",
    title: "Teleport instan",
    summary: "Kembali ke spawn, pos, atau rumah.",
    steps: [
      {
        text: "Tombol Spawn menjalankan Kembali ke spawn. Di gunung, tombol yang sama menjadi Kembali ke pos pendakian terakhir. Setelah summit, tersedia Kembali ke basecamp.",
      },
      {
        text: "Untuk pulang, lihat Rumahmu pada denah kampung di Peta Dunia. Datangi pintunya dan pilih Masuk rumah. Layar Rumah siap menandai perpindahan ke dalam rumah.",
        action: { sheet: "map" },
      },
      {
        text: "Peta menyediakan Petunjuk Jalan ke tempat yang dipilih. Perjalanan antarlokasi memakai halte, gerbang kampung, atau helikopter sesuai tujuan.",
      },
      {
        text: "Spawn disembunyikan saat mengemudi. Tombol kembali nonaktif saat penerbangan helikopter, perpindahan, atau proses kendaraan masih berlangsung. Turun dan tunggu proses selesai sebelum mencoba lagi.",
      },
    ],
  },
  {
    id: "transjakarta",
    title: "Halte TransCung",
    summary: "Tunggu bus dan pilih halte tujuanmu.",
    steps: [
      {
        text: "Datangi halte dan buka menu bus Mau turun di mana? Pilih tujuan saat bus berhenti dan pintunya siap. Halte menghubungkan Toko Cung, Gerbang Kampung, Pasar, dan kampung.",
        action: { sheet: "map" },
      },
      {
        text: "Bus di halte · berangkat N detik lagi menunjukkan waktu naik yang tersisa. Jika bus sedang berkeliling atau membawa pemain lain, tunggu bus kembali. Armada TransCung lain yang lewat hanya singgah; naik lewat menu bus saat busnya siap. Tombol tujuan belum aktif saat kamu belum bisa naik.",
      },
      {
        text: "Tarifnya Rp3.500 sekali perjalanan, termasuk keliling kota. Bus singgah di halte sepanjang rute untuk menaikkan penumpang. Lihat keterangan perjalanan agar tahu halte yang sedang didatangi.",
      },
    ],
  },
];

const SEEN_KEY = "tokocung:beginner-guide:seen:v1";
export function readSeenTopics(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
export function markTopicSeen(id: string): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...readSeenTopics(), id])]));
  } catch {
    /* Reading help remains available when browser storage is blocked. */
  }
}
