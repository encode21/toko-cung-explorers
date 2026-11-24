/** Pure: short everyday lines per role x situation (casual Jakarta). No React, no store. */
export type BarkRole =
  | "warga"
  | "pembeli"
  | "kasir"
  | "kurir"
  | "nakama-gudang"
  | "nakama-packing"
  | "owner"
  | "ibu"
  | "ojol"
  | "galon"
  | "anak"
  | "walikota"
  | "gorengan"
  | "satpam";
export type BarkSituation = "pagi" | "siang" | "malam" | "hujan" | "banjir" | "warung";
export interface BarkWeather {
  rain: number;
  flood: number;
}
type Pool = Partial<Record<BarkSituation, string[]>>;

const POOLS: Record<string, Pool> = {
  warga: {
    pagi: ["Pagi... udah rame aja ya.", "Waduh, macet lagi kayaknya hari ini."],
    siang: ["Panas banget, astaga.", "Enaknya es teh nih siang-siang."],
    malam: ["Udah malem, pulang ah.", "Adem ya kalau malem gini."],
    hujan: ["Yah, ujan lagi...", "Duh, jemuran gue!"],
    banjir: ["Air naik nih, hati-hati ya!", "Banjir lagi, ya ampun."],
    warung: ["Tokonya rame ya hari ini.", "Mampir ah, butuh beli sesuatu."],
  },
  pembeli: {
    pagi: ["Stok sembako masih ada nggak ya?"],
    siang: ["Cari yang promo ah, hemat dikit."],
    malam: ["Beli mi instan dulu buat nanti."],
    warung: ["Eh, harganya naik nggak nih?", "Bentar, bandingin dulu ya."],
  },
  kasir: {
    pagi: ["Selamat pagi, semangat ya!"],
    siang: ["Antrean aman, silakan kak."],
    warung: ["Mau bayar pakai apa, kak?"],
  },
  kurir: {
    pagi: ["Paket numpuk banget pagi ini."],
    siang: ["Alamatnya di mana lagi nih..."],
    hujan: ["Paket aman, tapi gue basah kuyup."],
    warung: ["Ada paket buat toko nih."],
  },
  ibu: {
    pagi: ["Bayam sama tempe dulu, bang!", "Tukang sayur lewat belum ya?"],
    siang: ["Duh, cabe naik lagi.", "Masak apa ya buat makan siang..."],
    malam: ["Anak-anak udah makan belum ya."],
    hujan: ["Cucian belum kering, ujan deh."],
    banjir: ["Ya Allah, dapur gue kemasukan air."],
    warung: ["Minyak goreng lagi diskon nggak ya?", "Telur sekilo dong, Mbak."],
  },
  ojol: {
    pagi: ["Orderan sepi dari tadi.", "Semoga ada yang order, deh."],
    siang: ["Nunggu orderan sambil ngadem."],
    malam: ["Satu orderan lagi baru pulang."],
    hujan: ["Ujan gini orderan malah ramai.", "Jas hujan mana jas hujan..."],
    banjir: ["Jalan banjir, motor gue mogok nih."],
    warung: ["Ngopi dulu ah sambil nunggu."],
  },
  galon: {
    pagi: ["Galon, galon! Ada yang kosong?"],
    siang: ["Berat nih, tapi lumayan buat nambah-nambah."],
    hujan: ["Galon aman, yang penting jangan licin."],
    warung: ["Bang, galonnya taruh mana?"],
  },
  anak: {
    pagi: ["Aduh, telat nih! Pak guru galak.", "Bu, uang jajan hari ini mana?"],
    siang: ["Pulang sekolah beli es dulu ah!"],
    malam: ["PR belum dikerjain, mati gue."],
    hujan: ["Asik, ujan! Boleh main air nggak?"],
    banjir: ["Wih, jalannya jadi kolam!"],
    warung: ["Beli permen satu, Bang."],
  },
  walikota: {
    pagi: ["Selamat pagi, warga! Ada tugas kota buat kalian."],
    siang: ["Kota kita makin ramai, terima kasih ya, warga."],
    malam: ["Kota aman terkendali. Istirahat yang cukup, ya."],
    banjir: ["Warga, got-nya tolong dibersihin ya!"],
    warung: ["Ada tugas kota hari ini, mau bantu?"],
  },
  gorengan: {
    pagi: ["Gorengan anget, gorengan anget!", "Bakwan, tahu isi, pisang goreng!"],
    siang: ["Gorengan, Bang? Masih panas lho."],
    malam: ["Sisa dikit nih, diskon deh."],
    hujan: ["Ujan-ujan gini enaknya gorengan!"],
    warung: ["Mampir, Kak, sepuluh ribu dapet lima."],
  },
  satpam: {
    pagi: ["Pagi, selamat datang!", "Parkirnya rapihin ya, Pak."],
    siang: ["Kendaraan jangan parkir di depan ya."],
    malam: ["Hati-hati pulangnya ya."],
    hujan: ["Payungnya ada di pos kalau butuh."],
    banjir: ["Jangan lewat sana, lagi banjir!"],
    warung: ["Silakan masuk, Kak."],
  },
};

/** Minutes are game-clock minutes (0..1440). Weather wins, then nearness, then time of day. */
export function barkSituation(
  minutes: number,
  near: boolean,
  weather?: BarkWeather,
): BarkSituation {
  if (weather && weather.flood > 0.3) return "banjir";
  if (weather && weather.rain > 0.3) return "hujan";
  if (near) return "warung";
  return minutes >= 300 && minutes < 660
    ? "pagi"
    : minutes >= 660 && minutes < 1080
      ? "siang"
      : "malam";
}

export function pickBark(role: BarkRole, situation: BarkSituation, seed: number): string {
  const pool = POOLS[role]?.[situation] ?? POOLS["warga"]![situation]!;
  return pool[Math.abs(Math.floor(seed)) % pool.length]!;
}
