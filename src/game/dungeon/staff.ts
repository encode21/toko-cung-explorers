import { DEFAULT_AVATAR, type AvatarConfig } from "@/identity/avatar";
export const DUNGEON_STAFF: {
  id: string;
  name: string;
  role: string;
  position: [number, number, number];
  avatar: AvatarConfig;
  line: string;
}[] = [
  {
    id: "coordinator",
    name: "Rama",
    role: "Koordinator",
    // South of reception counter (counter z≈11.6) — not inside the desk volume.
    position: [-10, 0, 9.35],
    avatar: {
      ...DEFAULT_AVATAR,
      outfit: "smart",
      outfitColor: "#4fb39a",
      hair: "sidepart",
      accessory: "glasses",
    },
    line: "Mulai dari briefing. Ikuti petunjuk manifest sebelum mencari kiriman di Storage B.",
  },
  {
    id: "warehouse",
    name: "Dedi",
    role: "Petugas Gudang",
    position: [-12, 0, -1],
    avatar: { ...DEFAULT_AVATAR, outfit: "warehouse", hair: "cap", skin: "#d9a47a" },
    line: "Lorong rak harus tetap kosong. Periksa nomor batch sesuai manifest.",
  },
  {
    id: "technician",
    name: "Nina",
    role: "Teknisi",
    position: [15.8, 4, -4],
    avatar: {
      ...DEFAULT_AVATAR,
      outfit: "smart",
      outfitColor: "#5c6b80",
      hair: "ponytail",
      accessory: "headset",
    },
    line: "Kantor ada di lantai ini. Catwalk menghadap ke area distribusi.",
  },
  {
    id: "dispatch",
    name: "Sari",
    role: "Staf Distribusi",
    position: [11, 0, 12],
    avatar: { ...DEFAULT_AVATAR, outfit: "driver", hair: "bob" },
    line: "Catat keberangkatan di meja dispatch sebelum melanjutkan pengiriman ke World.",
  },
];
