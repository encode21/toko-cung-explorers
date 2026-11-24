import type { AmbientProfile } from "./ambient-profiles";
import { CASHIER_NPC_POS, COURIER_POS, type Vec3 } from "../world/layout";
import type { NpcRole } from "../interactions/interactables";
import type { AvatarAnimation } from "../avatar/avatar-source";
import type { BarkRole } from "./barks";
export interface NpcConfig {
  id: string;
  label: string;
  role: NpcRole;
  persona: string;
  zone: string;
  points: Vec3[];
  speed: number;
  seed: number;
  yaw: number;
  activity: AvatarAnimation;
  carry?: boolean;
  /** Optional activity stops on a temporary one-way visit. */
  workStops?: number[];
  /** Activity per route point (same index as `points`); falls back to `activity`/profile. */
  stops?: AvatarAnimation[];
  /** Bark pool; defaults to `role`. */
  bark?: BarkRole;
  profile?: AmbientProfile;
  desktopOnly?: boolean;
  avatarId?: string;
  seat?: boolean;
  seatBenchId?: string;
  /** Stands still, never joins quarrels or punches; wears the "!" marker. */
  questGiver?: boolean;
}
/** Desktop: 19 ambient + 2 workers. Mobile: 13 ambient + 2 workers. */
export const NPC_CONFIG: NpcConfig[] = [
  {
    id: "npc-ko-asu",
    label: "Ko Asu · Maskot Toko Cung",
    role: "owner",
    zone: "storefront",
    persona:
      "Ko Asu adalah maskot senior Toko Cung yang hangat dan ramah. Mengenakan cheongsam marun, berkacamata, dan berambut abu-abu. Menyambut pengunjung, bercerita tentang toko, dan mengajak mereka menemui Koko Cung untuk misi harian.",
    points: [[-3.2, 0, 6.2]],
    speed: 0,
    seed: 251,
    yaw: 0,
    activity: "Idle",
  },
  {
    id: "npc-shopper-1",
    label: "Bu Sari · Ibu Belanja Sayur",
    role: "pembeli",
    bark: "ibu",
    zone: "retail",
    persona:
      "Bu Sari, ibu rumah tangga yang belanja sayur dan sembako buat keluarga. Ngomongnya santai dan blak-blakan, suka nawar dan ngebanding-bandingin harga, sering curhat soal harga cabe dan telur.",
    points: [
      [-3.6, 0, -3],
      [-3.6, 0, -7],
    ],
    speed: 0.65,
    seed: 11,
    yaw: -Math.PI / 2,
    activity: "PickItem",
  },
  {
    id: "npc-shopper-2",
    label: "Mas Dedi · Pembeli",
    role: "pembeli",
    zone: "retail",
    persona:
      "Mas Dedi, karyawan kantoran yang mampir cari minuman dingin dan mi instan buat stok kosan. Santai, suka bercanda, pakai gue/lo ke orang seumuran.",
    points: [
      [3.6, 0, -4],
      [3.6, 0, -9.8],
    ],
    speed: 0.75,
    seed: 31,
    yaw: Math.PI / 2,
    activity: "PickItem",
  },
  {
    id: "npc-shopper-3",
    label: "Mbak Ayu · Promo",
    role: "pembeli",
    zone: "promo",
    persona:
      "Mbak Ayu, anak kos yang hobi berburu promo dan voucher. Cerewet soal diskon, sering bilang 'lumayan hemat' dan 'checkout dulu ah'.",
    points: [
      [-2.6, 0, 2.3],
      [-4.1, 0, 2.3],
    ],
    speed: 0.55,
    seed: 53,
    yaw: Math.PI,
    activity: "PickItem",
  },
  {
    id: "npc-cashier",
    label: "Mbak Rina · Kasir",
    role: "kasir",
    zone: "cashier",
    persona: "Rina membantu checkout dan pembayaran di Toko Cung.",
    points: [CASHIER_NPC_POS],
    speed: 0,
    seed: 17,
    yaw: -Math.PI / 2,
    activity: "Checkout",
  },
  {
    id: "npc-store-staff",
    label: "Pramuniaga",
    role: "nakama-gudang",
    zone: "retail",
    persona:
      "Pramuniaga toko yang ramah dan sigap, nata rak sambil nanya 'cari apa, Kak?'. Bicara sopan tapi tetap luwes.",
    points: [
      [-7.4, 0, -3],
      [-7.4, 0, -9],
    ],
    speed: 0.7,
    seed: 71,
    yaw: Math.PI / 2,
    activity: "PickItem",
    carry: true,
  },
  {
    id: "npc-courier",
    label: "Kurir · Pickup",
    role: "kurir",
    zone: "pickup",
    persona: "Kurir memeriksa manifest dan menunggu paket di pickup.",
    points: [COURIER_POS, [11.7, 0, 9]],
    speed: 0.7,
    seed: 41,
    yaw: Math.PI,
    activity: "UsePhone",
  },
  {
    id: "npc-pedestrian-1",
    profile: "walker",
    label: "Mas Ucup · Tukang Galon",
    role: "warga",
    bark: "galon",
    carry: true,
    stops: ["CarryBox", "Drink"],
    zone: "sidewalk",
    persona:
      "Mas Ucup, tukang antar galon keliling kompleks. Badannya kuat, bicaranya ceplas-ceplos tapi ramah, sering minta ngopi dulu habis angkat galon. Hafal siapa saja langganannya.",
    points: [
      [-8, 0, 11.7],
      [-5.7, 0, 11.7],
    ],
    speed: 0.5,
    seed: 83,
    yaw: Math.PI,
    activity: "Idle",
  },
  {
    id: "npc-pedestrian-2",
    profile: "observer",
    label: "Pak Darto · Ojol",
    role: "warga",
    bark: "ojol",
    zone: "sidewalk",
    persona:
      "Pak Darto, driver ojol yang nunggu orderan sambil ngecek HP. Suka ngeluh soal macet, bensin, dan orderan sepi, tapi gampang akrab dan hafal jalan tikus Jabodetabek.",
    points: [[5.8, 0, 11.6]],
    speed: 0,
    seed: 97,
    yaw: -Math.PI / 2,
    activity: "UsePhone",
  },
  {
    id: "npc-resident-left",
    label: "Mpok Atun · Jualan Gorengan",
    role: "warga",
    bark: "gorengan",
    stops: ["Wave", "Idle"],
    zone: "sidewalk-left",
    persona:
      "Mpok Atun, jualan gorengan di depan rumah. Betawi asli, ceplas-ceplos dan hangat, suka nyapa tetangga dan nawarin 'cobain dulu, Bang'.",
    profile: "walker",
    points: [
      [-34.2, 0, -15],
      [-34.2, 0, -9],
    ],
    speed: 0.65,
    seed: 109,
    yaw: 0,
    activity: "Idle",
    avatarId: "npc-shopper-1",
  },
  {
    id: "npc-wali-kota",
    label: "Pak Wali Kota · Pemberi Quest",
    role: "warga",
    bark: "walikota",
    stops: ["Wave"],
    zone: "bench",
    persona:
      "Pak Wali Kota, wali kota yang ramah dan merakyat. Berdiri santai di trotoar, menyapa warga, dan memberi tugas-tugas kota untuk dibantu.",
    questGiver: true,
    points: [[26.8, 0, 12.6]],
    speed: 0,
    seed: 127,
    yaw: Math.PI / 2,
    activity: "Idle",
    avatarId: "npc-wali-kota",
  },
  {
    id: "npc-resident-chat-a",
    label: "Mbak Nita · Warga",
    role: "warga",
    zone: "sidewalk-right",
    persona:
      "Mbak Nita lagi ngobrol sama tetangga soal harga belanjaan, arisan, dan gosip ringan kompleks.",
    profile: "chat-pair",
    desktopOnly: true,
    points: [[26.2, 0, 0]],
    speed: 0,
    seed: 139,
    yaw: 0,
    activity: "Talk",
    avatarId: "npc-shopper-3",
  },
  {
    id: "npc-resident-chat-b",
    label: "Mas Arif · Warga",
    role: "warga",
    zone: "sidewalk-right",
    persona:
      "Mas Arif ngobrol santai sama Mbak Nita, sambil sesekali ngeluh soal macet dan cicilan motor.",
    profile: "chat-pair",
    desktopOnly: true,
    points: [[26.2, 0, 1.5]],
    speed: 0,
    seed: 151,
    yaw: Math.PI,
    activity: "Talk",
    avatarId: "npc-shopper-2",
  },
  {
    id: "npc-resident-crossing",
    label: "Dek Nayla · Anak SD",
    role: "warga",
    bark: "anak",
    zone: "crosswalk",
    persona:
      "Dek Nayla, anak SD kelas 4 yang nyeberang ke warung beli jajan. Polos, ceriwis, panggil orang 'Kak' atau 'Om', takut telat masuk sekolah.",
    profile: "crossing-pedestrian",
    points: [
      [-23.6, 0, 12.6],
      [-23.6, 0, 27.4],
    ],
    speed: 1.2,
    seed: 167,
    yaw: Math.PI,
    activity: "Idle",
    avatarId: "npc-pedestrian-1",
  },
  {
    id: "npc-resident-loading",
    label: "Satpam Ruko",
    role: "warga",
    bark: "satpam",
    stops: ["Idle", "Wave"],
    zone: "service-walk",
    persona:
      "Satpam ruko yang patroli jalur samping gudang. Tegas tapi ramah, suka nyapa 'Selamat datang' dan ngingetin soal parkir.",
    profile: "shop-visitor",
    points: [
      [9.9, 0, -19.5],
      [9.9, 0, -21.8],
    ],
    speed: 0.5,
    seed: 181,
    yaw: -Math.PI / 2,
    activity: "UsePhone",
    avatarId: "npc-pedestrian-2",
  },
  {
    id: "npc-visitor-west",
    label: "Bu Lina · Pengunjung",
    role: "pembeli",
    zone: "neighbor-storefront",
    desktopOnly: true,
    persona:
      "Bu Lina lihat-lihat toko tetangga dulu sebelum belanja, nanya 'ini berapaan ya?' ke siapa saja.",
    profile: "shop-visitor",
    points: [
      [-25.8, 0, -7],
      [-25.8, 0, -4],
    ],
    speed: 0.55,
    seed: 193,
    yaw: Math.PI / 2,
    activity: "Idle",
    avatarId: "npc-shopper-1",
  },
  {
    id: "npc-visitor-south",
    label: "Mas Rizky · Ngopi",
    stops: ["Drink", "UsePhone"],
    role: "pembeli",
    zone: "neighbor-storefront",
    desktopOnly: true,
    persona:
      "Mas Rizky, anak muda yang jalan sambil ngopi kekinian dan scroll HP. Santai, bahasanya gaul Jakarta.",
    profile: "shop-visitor",
    points: [
      [10, 0, 27.4],
      [13, 0, 27.4],
    ],
    speed: 0.6,
    seed: 211,
    yaw: 0,
    activity: "UsePhone",
    avatarId: "npc-shopper-2",
  },
  {
    id: "npc-visitor-window",
    label: "Mbak Dewi · Pengunjung",
    role: "pembeli",
    zone: "storefront",
    desktopOnly: true,
    persona: "Dewi melihat pilihan produk dari sisi etalase toko.",
    profile: "observer",
    points: [[-7.4, 0, 3.9]],
    speed: 0,
    seed: 223,
    yaw: Math.PI,
    activity: "Idle",
    avatarId: "npc-shopper-3",
  },
  {
    id: "npc-courier-waiting",
    label: "Kurir · Menunggu",
    role: "kurir",
    zone: "pickup-surroundings",
    desktopOnly: true,
    persona: "Kurir menunggu pesanan sambil menjaga jalur pickup tetap kosong.",
    profile: "observer",
    points: [[18, 0, 7]],
    speed: 0,
    seed: 239,
    yaw: -Math.PI / 2,
    activity: "UsePhone",
    avatarId: "npc-courier",
  },
];
export const WORKER_IDS = ["npc-nakama-warehouse", "npc-nakama-packing"] as const;

export function populationForQuality(lowQuality: boolean) {
  return NPC_CONFIG.filter((npc) => !lowQuality || !npc.desktopOnly);
}
