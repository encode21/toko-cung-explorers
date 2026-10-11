export type DungeonDialogueLine = { speaker: "npc" | "player" | "narrator"; text: string };

export type DungeonDialogueKind = "talk" | "discover";

export interface DungeonDialogueScript {
  id: string;
  name: string;
  role: string;
  kind: DungeonDialogueKind;
  lines: DungeonDialogueLine[];
  /** Quest interact target completed after the last line. */
  completeTarget?: string;
  /** Button label on the final line when completing an objective. */
  completeLabel?: string;
}

const RAMA = { name: "Rama", role: "Koordinator", kind: "talk" as const };
const BIMA = { name: "Bima", role: "Supplier", kind: "talk" as const };

function discover(
  id: string,
  name: string,
  role: string,
  lines: string[],
  completeLabel: string,
): DungeonDialogueScript {
  return {
    id,
    name,
    role,
    kind: "discover",
    completeTarget: id,
    completeLabel,
    lines: lines.map((text) => ({ speaker: "narrator" as const, text })),
  };
}

/** Scripted MMORPG-style talks + discovery beats for every Principal objective target. */
export const DUNGEON_DIALOGUES: Record<string, DungeonDialogueScript> = {
  briefing: {
    id: "briefing",
    ...RAMA,
    completeTarget: "briefing",
    completeLabel: "Selesai bicara",
    lines: [
      {
        speaker: "npc",
        text: "Akhirnya ada penjelajah yang masuk. Aku Rama, koordinator shift di Distribution Center.",
      },
      {
        speaker: "player",
        text: "Aku di sini untuk misi. Mulai dari mana?",
      },
      {
        speaker: "npc",
        text: "Bagus dulu. Manifest dan jejak batch ada di kantor lantai dua — ikuti petunjuk di tracker sebelum turun ke Storage B.",
      },
      {
        speaker: "npc",
        text: "Jangan lewatkan nomor batch. Kalau petinya salah, principal akan tahu. Siap bergerak?",
      },
      { speaker: "player", text: "Siap. Aku mulai dari kantor." },
      {
        speaker: "npc",
        text: "Bagus. Laporkan lagi kalau sudah punya jejak. Tangga ada di sisi timur aula penerimaan.",
      },
    ],
  },
  "principal-report": {
    id: "principal-report",
    ...RAMA,
    completeTarget: "principal-report",
    completeLabel: "Selesai bicara",
    lines: [
      { speaker: "npc", text: "Kamu kembali. Bagaimana jejaknya di lapangan?" },
      {
        speaker: "player",
        text: "Sudah kutelusuri. Ada temuan yang perlu masuk laporan principal.",
      },
      {
        speaker: "npc",
        text: "Bagus. Aku catat di log shift. Principal akan meninjau kontribusimu — jangan lengah di misi berikutnya.",
      },
      {
        speaker: "npc",
        text: "Kalau masih ada waktu, cek ulang area dispatch sebelum keluar. Kerja bagus.",
      },
    ],
  },
  "supplier-confirm": {
    id: "supplier-confirm",
    ...BIMA,
    completeTarget: "supplier-confirm",
    completeLabel: "Selesai bicara",
    lines: [
      {
        speaker: "npc",
        text: "Pos supplier sementara. Aku Bima — manifest keluar lewat sini sebelum masuk Toko Cung.",
      },
      {
        speaker: "player",
        text: "Ada kiriman dari Principal yang belum sampai. Bisa dikonfirmasi?",
      },
      {
        speaker: "npc",
        text: "Batch itu sempat tertahan. Cek cap waktu di catatanmu, lalu laporkan ke Rama di dalam Principal.",
      },
      { speaker: "player", text: "Mengerti. Aku kembali ke Distribution Center." },
      {
        speaker: "npc",
        text: "Hati-hati di jalan. Jangan biarkan peti itu “hilang” dua kali.",
      },
    ],
  },
  manifest: discover(
    "manifest",
    "Manifest Pengiriman",
    "Dokumen · Kantor Lt. 2",
    [
      "Di meja koordinator lantai dua, selembar manifest masih terbuka — cap tinta belum kering.",
      "Nomor batch dan tujuan Toko Cung tercetak jelas. Ada catatan: “Salinan dibawa ke arsip barat.”",
      "Kamu menyimpan salinan mental rute itu. Langkah berikutnya: baca catatan tangan di meja arsip.",
    ],
    "Ambil petunjuk",
  ),
  "office-note": discover(
    "office-note",
    "Catatan Tangan",
    "Arsip · Meja barat",
    [
      "Kertas kecil terselip di bawah klip manifest. Tulisan tergesa, tinta biru pudar.",
      "“Rak B — jangan campur promo. Batch salah sudah dua kali minggu ini.”",
      "Petunjuk mengarah ke Storage B di lantai dasar, di balik partisi.",
    ],
    "Simpan catatan",
  ),
  "storage-b": discover(
    "storage-b",
    "Storage B",
    "Area penyimpanan",
    [
      "Partisi membuka ke lorong rak B. Bau kardus dan debu tipis memenuhi udara.",
      "Lampu strip berkedip pelan di ujung lorong. Label batch tersebar di beberapa peti.",
      "Kamu menandai area ini. Saatnya mencari label yang cocok dengan manifest.",
    ],
    "Tandai area",
  ),
  "batch-label": discover(
    "batch-label",
    "Label Batch",
    "Temuan · Lorong B",
    [
      "Di antara dua rak, label plastik mengilat — nomornya cocok dengan manifest.",
      "Ada coretan kecil: “Pindah ke ujung utara sebelum loading.”",
      "Jejak mengarah ke peti di ujung lorong. Siapkan tangan untuk mengangkat.",
    ],
    "Ambil label",
  ),
  "missing-crate": discover(
    "missing-crate",
    "Peti Pengiriman",
    "Barang misi",
    [
      "Peti bertanda batch yang sama berdiri di ujung lorong utara — masih tersegel.",
      "Kamu mengangkatnya. Beratnya pas untuk satu orang; tali pengikat masih utuh.",
      "Bawa ke loading bay untuk mencatat keberangkatan sebelum keluar ke World.",
    ],
    "Angkat peti",
  ),
  "loading-exit": discover(
    "loading-exit",
    "Loading Bay",
    "Keberangkatan",
    [
      "Meja dispatch di loading bay menunggu stempel keberangkatan.",
      "Kamu mencatat waktu, tujuan Toko Cung, dan nomor batch. Pintu loading siap dibuka.",
      "Lanjut ke World — konfirmasi supplier atau antar ke gudang sesuai misi.",
    ],
    "Catat & lanjut",
  ),
  "world-warehouse": discover(
    "world-warehouse",
    "Gudang Toko Cung",
    "Penerimaan",
    [
      "Area penerimaan utara toko — Nakama Gudang mengangguk saat melihat peti Principal.",
      "Kamu menyerahkan batch sesuai manifest. Stempel masuk tercetak di log gudang.",
      "Sisa tugas: kembali ke Principal dan laporkan ke Rama.",
    ],
    "Serahkan peti",
  ),
  "fix-label": discover(
    "fix-label",
    "Meja Sortir",
    "Koreksi label",
    [
      "Meja sortir penuh label yang tertukar. Scanner kecil masih menyala.",
      "Kamu mencocokkan label batch ke peti yang benar — bunyi bip hijau terdengar.",
      "Urutan rak pulih. Laporkan ke koordinator agar log shift ditutup.",
    ],
    "Cocokkan label",
  ),
  "promo-pack": discover(
    "promo-pack",
    "Promo Pack",
    "Barang misi",
    [
      "Karton promo berlabel Principal tersusun rapi di dekat zona packing.",
      "Isinya lengkap sesuai manifest singkat. Kamu mengangkat pack itu dengan hati-hati.",
      "Bawa lewat loading bay, lalu antar ke gudang Toko Cung.",
    ],
    "Ambil promo pack",
  ),
  "b07-key": discover(
    "b07-key",
    "Kartu Akses B-07",
    "Temuan",
    [
      "Di sela tumpukan label batch, kartu akses B-07 terselip hampir tak terlihat.",
      "Chip masih aktif — lampu indikator berkedip hijau saat kamu menyentuhnya.",
      "Pintu ruang B-07 di belakang rak utara seharusnya terbuka sekarang.",
    ],
    "Ambil kartu",
  ),
  "b07-room": discover(
    "b07-room",
    "Ruang B-07",
    "Eksplorasi",
    [
      "Lorong sempit di belakang rak utara membuka ke ruang B-07 yang sunyi.",
      "Di dalam: papan status lama, kabel rapi, dan jejak debu yang baru diganggu.",
      "Kamu mencatat kondisi ruang. Cukup bukti untuk laporan ke Rama.",
    ],
    "Selesai memeriksa",
  ),
  "catwalk-audit": discover(
    "catwalk-audit",
    "Audit Catwalk",
    "Pengawasan",
    [
      "Dari catwalk, seluruh lantai distribusi terlihat seperti peta hidup.",
      "Kamu memindai alur rak, loading, dan lorong B — mencatat titik bottleneck.",
      "Laporan audit singkat siap. Turun dan lanjutkan sesuai tracker misi.",
    ],
    "Selesai audit",
  ),
  archive: discover(
    "archive",
    "Arsip Tersembunyi",
    "Rahasia · Perintis",
    [
      "Di balik panel arsip, map tua berlabel “Sang Perintis” menunggu.",
      "Isinya sketsa jalur distribusi awal — jauh sebelum Toko Cung berdiri seperti sekarang.",
      "Simpan jejak ini. Masih ada tanda tangan yang harus dicari di kantor.",
    ],
    "Baca arsip",
  ),
  signature: discover(
    "signature",
    "Tanda Tangan",
    "Kantor · Bukti",
    [
      "Di sudut meja kantor, paraf pudar menandai halaman terakhir arsip.",
      "Tanda tangan itu cocok dengan legenda perintis di cerita staf lama.",
      "Bukti cukup. Laporkan penemuanmu kepada Rama.",
    ],
    "Catat bukti",
  ),
  "founder-seal": discover(
    "founder-seal",
    "Segel Perintis",
    "Rahasia opsional",
    [
      "Kilau emas di sudut tersembunyi — segel perintis yang hampir dilupakan.",
      "Menyentuhnya terasa dingin. Bonus akan dihitung saat misi utama selesai.",
      "Kamu menyimpan temuan ini tanpa mengganggu alur utama.",
    ],
    "Ambil segel",
  ),
  coordinator: {
    id: "coordinator",
    ...RAMA,
    lines: [
      {
        speaker: "npc",
        text: "Mulai dari briefing. Ikuti petunjuk manifest sebelum mencari kiriman di Storage B.",
      },
      {
        speaker: "npc",
        text: "Kalau sudah dapat misi aktif, bicara lagi denganku untuk update progres.",
      },
    ],
  },
  warehouse: {
    id: "warehouse",
    name: "Dedi",
    role: "Petugas Gudang",
    kind: "talk",
    lines: [
      {
        speaker: "npc",
        text: "Lorong rak harus tetap kosong. Periksa nomor batch sesuai manifest.",
      },
      {
        speaker: "npc",
        text: "Storage B di balik partisi barat. Jangan campur peti promo dengan peti reguler.",
      },
    ],
  },
  technician: {
    id: "technician",
    name: "Nina",
    role: "Teknisi",
    kind: "talk",
    lines: [
      {
        speaker: "npc",
        text: "Kantor ada di lantai ini. Catwalk menghadap ke area distribusi.",
      },
      {
        speaker: "npc",
        text: "Kalau terminal error, jangan dipaksa. Laporkan ke koordinator dulu.",
      },
    ],
  },
  dispatch: {
    id: "dispatch",
    name: "Sari",
    role: "Staf Distribusi",
    kind: "talk",
    lines: [
      {
        speaker: "npc",
        text: "Catat keberangkatan di meja dispatch sebelum melanjutkan pengiriman ke World.",
      },
      {
        speaker: "npc",
        text: "Truk tidak menunggu lama. Siapkan peti sebelum pintu loading dibuka.",
      },
    ],
  },
};

export function resolveDungeonDialogue(
  questTarget?: string | null,
  staffId?: string | null,
): DungeonDialogueScript | null {
  if (questTarget && DUNGEON_DIALOGUES[questTarget]) return DUNGEON_DIALOGUES[questTarget];
  if (staffId && DUNGEON_DIALOGUES[staffId]) return DUNGEON_DIALOGUES[staffId];
  return null;
}
