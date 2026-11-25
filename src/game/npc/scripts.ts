import { create } from "zustand";

/**
 * Scripted, memorable small talk for every NPC (no AI): an opener that changes per game day and three
 * replies the player can pick. `quest` links an NPC to a town-event host (server config/world-events.php)
 * so talking leads to a job that fits the game. Ids: city NPC_CONFIG, pasar vendorId, `gang-<resident id>`.
 */
export type NpcScript = {
  name: string;
  role: string;
  avatar?: string;
  openers: string[];
  options: { label: string; reply: string }[];
  quest?: "kades" | "walikota" | "mang-udin" | "bu-sri" | "pak-rt";
};

const s = (
  name: string,
  role: string,
  openers: string[],
  options: [string, string][],
  extra: Partial<NpcScript> = {},
): NpcScript => ({
  name,
  role,
  openers,
  options: options.map(([label, reply]) => ({ label, reply })),
  ...extra,
});

export const NPC_SCRIPTS: Record<string, NpcScript> = {
  // City
  "npc-ko-asu": s(
    "Ko Asu",
    "Pemilik Toko Cung",
    [
      "Ayo masuk, masuk! Hari ini ada promo, jangan sampai kehabisan ya.",
      "Haiya, rame juga hari ini. Mau kulakan atau belanja harian?",
    ],
    [
      [
        "Salam, Ko Asu",
        "Wah, sopan sekali! Anak muda rajin begini pasti warungnya laris. Semangat ya!",
      ],
      [
        "Ada tips dagang, Ko?",
        "Stok jangan sampai kosong, harga jangan kemahalan, sama pembeli harus senyum. Itu saja, dari dulu begitu.",
      ],
      ["Dadah, Ko Asu", "Hati-hati di jalan. Besok mampir lagi, ya!"],
    ],
  ),
  "npc-koko-cung": s(
    "Koko Cung",
    "Toko Cung",
    [
      "Halo! Kulakan di Toko Cung aja, harga grosir, bisa diantar truk.",
      "Warungmu gimana, lancar? Jangan lupa bayar tagihan tepat waktu ya.",
    ],
    [
      [
        "Kulakan di mana, Ko?",
        "Masuk aja ke toko, ambil barang di rak, bayar di kasir. Mau diantar? Pilih antar truk.",
      ],
      [
        "Kalau nunggak gimana, Ko?",
        "Nunggak 2 hari, saya sama dua satpam mampir ke kavlingmu. Nunggak 3 hari, warungnya disegel sampai lunas. Jadi jangan sampai ya!",
      ],
      ["Sampai jumpa, Ko", "Siap! Semoga laris manis hari ini."],
    ],
  ),
  "npc-shopper-1": s(
    "Bu Sari",
    "Ibu belanja sayur",
    [
      "Aduh, harga cabai naik lagi. Warung kamu jual cabai nggak?",
      "Saya tiap pagi ke pasar dulu, baru ke Toko Cung. Kebiasaan dari muda.",
    ],
    [
      ["Nanti saya stok, Bu", "Nah gitu! Ibu-ibu sini pasti mampir ke warungmu."],
      ["Di pasar lebih murah, Bu?", "Kadang. Tapi di Toko Cung nggak usah nawar, hemat tenaga."],
      ["Semangat belanjanya, Bu", "Makasih, Nak. Jangan lupa makan sayur ya."],
    ],
  ),
  "npc-shopper-2": s(
    "Mas Dedi",
    "Pembeli rantau",
    [
      "Gajian, Bro! Tapi kok cepet habis ya…",
      "Lagi nyari mi instan yang promo. Kamu tau rasa paling enak?",
    ],
    [
      ["Coba nabung dikit, Mas", "Iya ya… mulai besok deh. Eh, besoknya kapan ya, hehe."],
      ["Mi goreng lah, Mas!", "Setuju! Pakai telur, nikmat dunia."],
      ["Mampir warung saya, Mas", "Boleh! Asal ada kopi sachet, saya pelanggan tetap."],
    ],
  ),
  "npc-shopper-3": s(
    "Mbak Ayu",
    "Pemburu promo",
    [
      "Psst… promo minggu ini beli dua gratis satu. Jangan bilang-bilang!",
      "Saya hafal semua jadwal diskon kota ini.",
    ],
    [
      [
        "Wah, bagi info dong, Mbak",
        "Pantau Toko Grosir tiap pagi. Harga kulakan paling murah jam segitu.",
      ],
      ["Diskon terus, kapan untungnya?", "Hehe, untung buat saya, Kak."],
      ["Mbak cocok jadi sales", "Udah pernah! Dulu SPG susu, makanya jago."],
    ],
  ),
  "npc-cashier": s(
    "Mbak Rina",
    "Kasir Toko Cung",
    [
      "Selamat datang di Toko Cung! Udah bawa daftar belanja?",
      "Kalau belanja banyak, pakai Toko Grosir di HP aja, diantar truk.",
    ],
    [
      [
        "Tips kulakan dong, Mbak",
        "Beli yang cepat laku dulu: mi, kopi, teh gelas. Jangan numpuk barang lambat.",
      ],
      ["Capek jaga kasir, Mbak?", "Lumayan, tapi senang lihat warung-warung kecil pada maju."],
      ["Makasih, Mbak Rina", "Sama-sama! Semoga laris manis."],
    ],
  ),
  "npc-store-staff": s(
    "Bang Tono",
    "Pramuniaga",
    [
      "Rak mi instan baru saya isi. Jangan diacak-acak ya, hehe.",
      "Gudang lagi penuh, truk logistik baru datang.",
    ],
    [
      [
        "Butuh bantuan angkat, Bang?",
        "Kalau mau kerja angkat-angkat, jadi kuli di pasar aja. Bayarannya lumayan.",
      ],
      ["Barang apa yang paling laku?", "Teh gelas sama kopi sachet. Nggak pernah sepi."],
      ["Semangat, Bang", "Siap! Kamu juga ya."],
    ],
  ),
  "npc-courier": s(
    "Kang Ujang",
    "Kurir pickup",
    [
      "Paket hari ini banyak banget, sampai lupa makan.",
      "Truk Toko Grosir sekarang antar 30 detik lho, cepet kan?",
    ],
    [
      ["Makan dulu, Kang", "Iya, nanti mampir warungmu, beli roti."],
      ["Paketnya ke mana aja?", "Ke warung-warung gang. Kalau warungmu belanja, saya yang antar!"],
      ["Hati-hati di jalan", "Siap, makasih!"],
    ],
  ),
  "npc-pedestrian-1": s(
    "Mas Ucup",
    "Tukang galon",
    ["Galon, galon! Air isi ulang, Kak?", "Galon kosong di warungmu udah numpuk belum?"],
    [
      ["Berapa sekali antar, Mas?", "Buat warung, saya kasih harga langganan."],
      [
        "Berat nggak tiap hari angkat galon?",
        "Lumayan buat olahraga. Badan saya jadi kuat begini.",
      ],
      ["Nanti saya pesan", "Siap, panggil aja Mas Ucup!"],
    ],
  ),
  "npc-pedestrian-2": s(
    "Pak Darto",
    "Ojol senior",
    [
      "Sepi orderan siang begini. Ngopi dulu lah.",
      "Saya narik ojol udah sepuluh tahun, hafal semua jalan tikus.",
    ],
    [
      [
        "Coba narik ojek di game ini, Pak?",
        "Hehe, kamu juga bisa jadi ojol lho. Buka menu Ojek di HP.",
      ],
      ["Jalan tikus mana yang paling cepat?", "Lewat Jalan Kampung, potong ke gang. Rahasia ya."],
      ["Sehat selalu, Pak", "Aamiin. Kamu juga, jangan begadang."],
    ],
  ),
  "npc-resident-left": s(
    "Mpok Atun",
    "Jualan gorengan",
    [
      "Gorengan, gorengan! Bakwan masih anget!",
      "Minyak goreng naik, tapi gorengan saya tetap seribu.",
    ],
    [
      ["Beli bakwan satu, Mpok", "Nih, yang paling garing buat kamu."],
      ["Gimana caranya tetap seribu?", "Belanja grosir, Nak. Kayak warungmu juga."],
      ["Laris manis, Mpok!", "Aamiin! Kamu juga ya."],
    ],
  ),
  "npc-resident-chat-a": s(
    "Mbak Nita",
    "Warga",
    [
      "Eh, kamu yang buka warung itu ya? Saya pernah lewat.",
      "Lagi ngobrolin harga sewa ruko sama tetangga.",
    ],
    [
      ["Iya, Mbak. Mampir dong!", "Pasti! Ada kerupuk nggak? Itu wajib."],
      ["Sewa ruko mahal ya?", "Banget. Makanya mulai dari warung teras dulu."],
      ["Salam kenal, Mbak", "Salam kenal juga!"],
    ],
  ),
  "npc-resident-chat-b": s(
    "Mas Arif",
    "Warga",
    [
      "Bro, tau nggak, katanya Pak Wali Kota bikin acara bersih kota.",
      "Saya baru pindah ke sini, masih nyari tempat makan enak.",
    ],
    [
      ["Ikut yuk, Mas!", "Boleh, lumayan dapat uang lelah dari Pak Wali Kota."],
      ["Coba warteg… eh, belum buka", "Hehe, nanti kalau udah buka kabarin ya."],
      ["Selamat datang, Mas", "Makasih! Kota ini ramah juga ya."],
    ],
  ),
  "npc-resident-crossing": s(
    "Dek Nayla",
    "Anak SD",
    [
      "Kak, Kak! Aku dapat bintang lima dari bu guru!",
      "Kak, permen yang rasa stroberi ada nggak di warung Kakak?",
    ],
    [
      ["Hebat! Pertahankan ya", "Iya Kak! Nanti aku jadi dokter."],
      ["Ada, mampir ya", "Asik! Aku bilang ke mama."],
      ["Hati-hati nyebrang, Dek", "Iya Kak, aku tengok kanan-kiri kok."],
    ],
  ),
  "npc-resident-loading": s(
    "Pak Joni",
    "Satpam ruko",
    [
      "Aman terkendali. Ada yang mencurigakan, lapor saya.",
      "Semalam ada maling kabur ke arah gang. Kunci warungmu ya!",
    ],
    [
      ["Siap, Pak. Saya kunci terus", "Bagus. Maling itu cari warung yang lengah."],
      ["Bisa kejar maling, Pak?", "Bisa, tapi kamu juga bisa. Lari, tangkap sebelum dia kabur!"],
      ["Makasih, Pak Joni", "Sama-sama. Hati-hati pulang."],
    ],
  ),
  "npc-visitor-west": s(
    "Bu Lina",
    "Pengunjung",
    [
      "Saya dari Bekasi, sengaja ke sini karena katanya grosirnya murah.",
      "Anak saya minta dibelikan es krim. Ada yang jual dekat sini?",
    ],
    [
      ["Warung saya jual es krim, Bu", "Wah, nanti saya mampir!"],
      ["Jauh juga dari Bekasi, Bu", "Demi hemat, Nak. Ibu-ibu mah gitu."],
      ["Selamat belanja, Bu", "Makasih, Nak."],
    ],
  ),
  "npc-visitor-south": s(
    "Mas Rizky",
    "Tukang ngopi",
    [
      "Kopi sachet terbaik itu yang diseduh pakai air galon Mas Ucup.",
      "Pagi belum ngopi, rasanya belum hidup.",
    ],
    [
      ["Saya jual kopi sachet, Mas", "Nah, langganan deh saya."],
      ["Kopi apa favoritnya?", "Yang ada gula arennya. Mantap."],
      ["Jangan kebanyakan kopi, Mas", "Hehe, iya, nanti jantungan."],
    ],
  ),
  "npc-visitor-window": s(
    "Mbak Dewi",
    "Pengunjung",
    [
      "Saya lagi lihat-lihat etalase. Cuci mata aja.",
      "Kalau punya modal, saya mau buka warung kayak kamu.",
    ],
    [
      ["Mulai kecil aja, Mbak", "Iya ya. Modal kecil, yang penting konsisten."],
      ["Mau saya ajarin?", "Serius? Nanti saya mampir tanya-tanya!"],
      ["Cuci mata gratis kan, Mbak", "Hahaha, betul!"],
    ],
  ),
  "npc-courier-waiting": s(
    "Bang Yusuf",
    "Kurir menunggu",
    [
      "Nunggu paket siap. Kurir itu kerjanya separuh nunggu.",
      "Kemarin saya antar ke gang, banjir sebetis!",
    ],
    [
      ["Banjir di gang parah, Bang?", "Lumayan. Jalan jadi pelan, hati-hati kalau hujan."],
      ["Sabar ya, Bang", "Udah biasa. Sambil main HP."],
      ["Mau kopi, Bang?", "Wah, boleh banget!"],
    ],
  ),
  "npc-nakama-warehouse": s(
    "Mas Bagas",
    "Staf gudang",
    [
      "Stok gudang aman. Truk logistik pasar juga lagi bongkar.",
      "Kalau warungmu butuh barang cepat, pesan lewat Toko Grosir.",
    ],
    [
      ["Kapan truk datang lagi?", "Tiap hari. Kuli di pasar pasti kebagian kerja."],
      ["Gudang segede ini, nggak capek?", "Capek, tapi gajinya cukup buat kuliahin adik."],
      ["Semangat, Mas", "Makasih!"],
    ],
  ),
  "npc-nakama-packing": s(
    "Mbak Siska",
    "Staf packing",
    [
      "Satu dus isinya sepuluh. Jangan sampai salah hitung!",
      "Packing pesanan warung-warung dari pagi.",
    ],
    [
      ["Pesanan saya udah dipacking?", "Kalau udah bayar, langsung naik truk. 30 detik sampai."],
      ["Pernah salah packing, Mbak?", "Sekali. Pelanggannya ngedumel, saya kapok."],
      ["Makasih, Mbak", "Sama-sama, laris ya!"],
    ],
  ),
  // Pasar vendors
  "npc-mang-udin": s(
    "Mang Udin",
    "Gorengan pasar",
    [
      "Pesanan gorengan buat arisan numpuk, Mang kewalahan!",
      "Gorengan anget! Tahu isi, bakwan, pisang goreng!",
    ],
    [
      ["Butuh bantuan antar, Mang?", "Wah, kebetulan! Ayo, bantu Mang antar pesanan."],
      [
        "Rahasia garingnya apa, Mang?",
        "Tepungnya dicampur sedikit tepung beras. Jangan bilang-bilang!",
      ],
      ["Satu bakwan, Mang", "Nih, bonus cabe rawit."],
    ],
    { quest: "mang-udin" },
  ),
  "npc-bang-jali": s(
    "Bang Jali",
    "Martabak",
    [
      "Martabak telor spesial, telornya tiga!",
      "Dulu saya kuli di pasar ini, sekarang punya gerobak sendiri.",
    ],
    [
      ["Wah, dari kuli jadi juragan!", "Kerja keras, Bos. Kamu juga bisa."],
      ["Martabak manis ada, Bang?", "Ada, cokelat keju paling laris."],
      ["Laris, Bang!", "Aamiin!"],
    ],
  ),
  "npc-bu-sri": s(
    "Bu Sri",
    "Buah segar",
    [
      "Buahnya baru datang dari truk, masih segar!",
      "Ada yang pesan parsel buah buat hajatan, tapi Ibu nggak bisa ninggal lapak.",
    ],
    [
      ["Saya antar parselnya, Bu", "Ya Allah, terima kasih! Ini alamatnya."],
      [
        "Buah apa yang lagi musim?",
        "Mangga sama rambutan. Petik sendiri juga bisa di kebun dekat pasar.",
      ],
      ["Semoga laris, Bu", "Aamiin, makasih, Nak."],
    ],
    { quest: "bu-sri" },
  ),
  "npc-pak-darman": s(
    "Pak Darman",
    "Ikan bakar",
    [
      "Ikan dari empang gang paling enak dibakar.",
      "Kamu suka mancing? Jual ikannya ke pengepul, jangan kebanyakan, nanti penuh.",
    ],
    [
      ["Pengepul cuma terima sepuluh ekor ya?", "Iya, sehari segitu. Sisanya simpan buat besok."],
      ["Bumbu bakarnya apa, Pak?", "Kecap, bawang, sedikit jeruk nipis. Sederhana."],
      ["Satu ikan bakar, Pak", "Siap, tunggu sebentar ya."],
    ],
  ),
  // Kampung residents
  "gang-child-a": s(
    "Dek Bima",
    "Anak kampung",
    ["Kak, main layangan yuk!", "Kak, tadi aku lihat maling lari ke ujung gang!"],
    [
      ["Ayo main!", "Yeay! Kakak yang pegang benang ya."],
      ["Maling? Ke mana?", "Ke ujung gang! Kejar, Kak, pasti ketangkep!"],
      ["Jangan main jauh-jauh", "Iya Kak."],
    ],
    { avatar: "npc-shopper-2" },
  ),
  "gang-child-b": s(
    "Dek Salsa",
    "Anak kampung",
    ["Kak, aku mau jajan permen. Warung Kakak buka?", "Kak, tadi banjir, sendalku hanyut!"],
    [
      ["Buka, mampir ya", "Asik! Aku bawa uang jajan seribu."],
      ["Nanti dibeliin sendal baru", "Beneran? Makasih Kak!"],
      ["Pulang, nanti dicari ibu", "Iya Kak, dadah!"],
    ],
    { avatar: "npc-shopper-3" },
  ),
  "gang-neighbor-a": s(
    "Pak RT Kosim",
    "Ketua RT",
    [
      "Iuran sampah bulan ini belum kekumpul semua. Pusing saya.",
      "Warga gang ini baik-baik, cuma kadang lupa bayar iuran.",
    ],
    [
      ["Saya bantu tarik iuran, Pak", "Wah, bagus! Ayo, Bapak tunjukkan rumahnya."],
      ["Iuran buat apa aja, Pak?", "Gaji tukang sampah sama lampu jalan gang."],
      ["Semangat, Pak RT", "Makasih. Warga kayak kamu bikin Bapak semangat."],
    ],
    { avatar: "npc-pedestrian-2", quest: "pak-rt" },
  ),
  "gang-neighbor-b": s(
    "Bu Romlah",
    "Tetangga",
    [
      "Eh, kamu udah makan? Ibu masak sayur asem kebanyakan.",
      "Anak Ibu kerja di kota, jarang pulang.",
    ],
    [
      ["Belum, Bu. Mau dong", "Sini, Ibu bungkusin. Anggap anak sendiri."],
      ["Telepon aja anaknya, Bu", "Iya ya. Nanti Ibu coba."],
      ["Makasih, Bu Romlah", "Sama-sama, Nak."],
    ],
    { avatar: "npc-shopper-3" },
  ),
  "gang-vegetable-seller": s(
    "Mang Asep",
    "Tukang sayur keliling",
    ["Sayur, sayuuur! Kangkung, bayam, tempe!", "Mang keliling gang tiap pagi, hujan atau panas."],
    [
      ["Kangkung seikat, Mang", "Siap, tiga ribu. Seger baru petik."],
      ["Nggak capek keliling, Mang?", "Capek, tapi langganan nungguin. Itu yang bikin semangat."],
      ["Hati-hati banjir, Mang", "Iya, gerobak Mang udah kebal banjir, hehe."],
    ],
    { avatar: "npc-courier" },
  ),
  "gang-neighbor-c": s(
    "Bu Endah",
    "Penjahit",
    ["Ibu lagi jahit baju seragam anak-anak gang.", "Kalau bajumu robek, bawa ke Ibu ya."],
    [
      ["Berapa ongkos jahitnya, Bu?", "Buat tetangga, bayar pakai senyum aja."],
      ["Ibu jahit dari kapan?", "Dari gadis. Mesin jahit ini warisan nenek."],
      ["Makasih, Bu Endah", "Sama-sama, Nak."],
    ],
    { avatar: "npc-shopper-1" },
  ),
  "gang-passer-a": s(
    "Kang Dadang",
    "Tukang ojek pangkalan",
    [
      "Ojek, Neng? Eh, Mas? Hehe, maaf, matahari silau.",
      "Pangkalan ojek gang sekarang kalah sama ojol.",
    ],
    [
      ["Coba ikut ojol, Kang", "Hmm, mungkin. Tapi Akang setia sama pangkalan."],
      ["Antar saya ke kota, Kang", "Siap! Eh, kamu kan bisa jalan sendiri, hehe."],
      ["Semangat, Kang", "Makasih!"],
    ],
    { avatar: "npc-store-staff" },
  ),
  "gang-passer-b": s(
    "Teh Yuli",
    "Penjual pulsa",
    ["Pulsa, kuota, token listrik! Teteh lengkap.", "Kuota habis? Teteh ada paket murah."],
    [
      ["Token listrik ada, Teh?", "Ada! Warung butuh listrik buat kulkas es krim kan."],
      ["Laku nggak, Teh?", "Laku, semua orang butuh internet."],
      ["Nanti saya beli, Teh", "Teteh tunggu ya!"],
    ],
    { avatar: "npc-cashier" },
  ),
  "gang-passer-c": s(
    "Mas Joko",
    "Karyawan pabrik",
    [
      "Baru pulang shift malam. Ngantuk berat.",
      "Gaji UMR, tapi cukup kalau belanja di warung tetangga.",
    ],
    [
      ["Tidur dulu, Mas", "Iya, habis beli kopi di warungmu, hehe."],
      ["Kerja di pabrik apa, Mas?", "Pabrik mi instan. Iya, yang kamu jual itu."],
      ["Semangat, Mas Joko", "Makasih!"],
    ],
    { avatar: "npc-shopper-2" },
  ),
  "gang-neighbor-d": s(
    "Nek Ijah",
    "Nenek gang",
    [
      "Nenek udah tinggal di gang ini dari jaman belum ada listrik.",
      "Cucu nenek suka jajan di warungmu.",
    ],
    [
      ["Dulu gang ini kayak apa, Nek?", "Sawah semua, Nak. Sekarang rumah semua."],
      ["Cucunya pintar, Nek", "Iya, kayak kakeknya dulu."],
      ["Sehat selalu, Nek", "Aamiin. Kamu juga, jangan lupa sholat."],
    ],
    { avatar: "npc-shopper-3" },
  ),
};

/** Opener for today: rotates through the NPC's lines one per game day. */
export const scriptOpener = (sc: NpcScript, gameDay: number) =>
  sc.openers[((gameDay % sc.openers.length) + sc.openers.length) % sc.openers.length]!;

export const useNpcScript = create<{ id: string | null }>(() => ({ id: null }));
export const openNpcScript = (id: string) => useNpcScript.setState({ id });
export const closeNpcScript = () => useNpcScript.setState({ id: null });

const TALK_KEY = "world.npcTalk";
/** What the player answered today, per NPC: once talked, the NPC closes instead of restarting the chat. */
export function talkedToday(id: string, gameDay: number): number | null {
  try {
    const all = JSON.parse(globalThis.localStorage?.getItem(TALK_KEY) ?? "{}");
    return all[id]?.day === gameDay ? all[id].pick : null;
  } catch {
    return null;
  }
}
export function rememberTalk(id: string, gameDay: number, pick: number) {
  try {
    const all = JSON.parse(globalThis.localStorage?.getItem(TALK_KEY) ?? "{}");
    for (const k of Object.keys(all)) if (all[k].day !== gameDay) delete all[k];
    all[id] = { day: gameDay, pick };
    globalThis.localStorage?.setItem(TALK_KEY, JSON.stringify(all));
  } catch {
    // Private mode: the chat just restarts next time.
  }
}
