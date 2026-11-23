import { Bike, Building2, ShoppingBasket, Store } from "lucide-react";

/** The hustle ladder pitched on landing and auth. */
export const FEATURES = [
  {
    Icon: Bike,
    title: "Narik ojol dulu",
    copy: "Sewa motor juragan, setoran dibayar dari hasil narik. Uang pertamamu datang dalam hitungan menit.",
  },
  {
    Icon: ShoppingBasket,
    title: "Grosir di Toko Cung",
    copy: "Ambil barang di rak, bayar di kasir. Toko grosirnya beneran ada di Mampang, Jakarta Selatan.",
  },
  {
    Icon: Store,
    title: "Warung Teras → Agen → Grosir",
    copy: "Mulai dari etalase Mbah, kulakan di Toko Cung, layani pelanggan, dan naik kelas pelan-pelan.",
  },
  {
    Icon: Building2,
    title: "Jadi juragan kos",
    copy: "Puncaknya buat yang sabar. Tetangga dan pemain lain ramai di kota yang sama.",
  },
] as const;
