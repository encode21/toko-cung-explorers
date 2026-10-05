import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PRODUCTS, formatIdr } from "@/commerce/products/catalog";
import {
  COURIERS,
  POS_SUMMARY,
  TOP_PRODUCTS,
  WAREHOUSE_SUMMARY,
} from "@/commerce/products/tokocung-inventory";
import { SHELVES } from "@/game/world/layout";

/**
 * NPC Chat Gateway.
 *
 * Semua percakapan NPC di Toko Cung World lewat sini. Nantinya handler ini
 * cukup diarahkan ke Tanya Toko Cung AI Service (intent/RAG/tools) tanpa
 * mengubah game client: kontrak balikannya tetap { message, action }.
 */

const RoleSchema = z.enum([
  "kasir",
  "owner",
  "nakama-gudang",
  "nakama-packing",
  "kurir",
  "pembeli",
  "warga",
]);

export type NpcRole = z.infer<typeof RoleSchema>;

const AskInput = z.object({
  npcId: z.string().min(1),
  persona: z.string().min(1),
  role: RoleSchema.default("kasir"),
  question: z.string().min(1).max(400),
  history: z
    .array(z.object({ role: z.enum(["player", "npc"]), text: z.string() }))
    .max(12)
    .default([]),
  cartCount: z.number().int().min(0).default(0),
});

const ActionSchema = z.object({
  type: z.enum(["SHOW_WAYPOINT", "ADD_TO_CART", "OPEN_POS", "NONE"]),
  target: z.string().optional(),
});

export type NpcAction = z.infer<typeof ActionSchema>;

export interface NpcReply {
  message: string;
  action: NpcAction;
}

function catalogContext() {
  return PRODUCTS.map(
    (p) =>
      `${p.sku} | ${p.name} | ${formatIdr(p.price)} / ${p.unit} | stok ${p.stock} (${p.status}) | terjual 30 hari ${p.sales30d} | rak ${p.shelf} | ${p.description}`,
  ).join("\n");
}

function shelfContext() {
  return SHELVES.map((s) => `${s.id} = ${s.label}`).join("\n");
}

/** Info toko yang boleh dijawab NPC (jam buka, layanan, operasional). */
function storeContext() {
  return [
    "Nama: Toko Cung — grosir & retail kelontong.",
    "Jam buka: 07.00 - 22.00 setiap hari.",
    "Pembayaran: tunai di kasir, QRIS, dan Virtual Account (transfer bank).",
    "Area: retail (rak), kasir 1 & 2, kasir owner, gudang, area packing pesanan online, pickup kurir di depan.",
    `Transaksi hari ini ${POS_SUMMARY.transactions}, jam tersibuk ${POS_SUMMARY.peakHour}.`,
    `Total SKU di gudang ${WAREHOUSE_SUMMARY.totalSku}, ${WAREHOUSE_SUMMARY.lowStock} SKU stok menipis.`,
    `Produk paling laris: ${TOP_PRODUCTS.map((t) => `${t.name} (${t.qty})`).join(", ")}.`,
    `Ekspedisi pickup: ${COURIERS.map((c) => c.name).join(", ")}.`,
    "Produk yang habis akan direstock dari supplier; sarankan alternatif yang stoknya ada.",
  ].join("\n");
}

/**
 * Konteks per peran: tiap NPC punya sudut pandang, bahan obrolan, dan batasan
 * sendiri. Obrolan santai di luar topik toko diperbolehkan untuk semua peran,
 * porsinya berbeda tergantung peran.
 */
const ROLE_BRIEFS: Record<NpcRole, string[]> = {
  kasir: [
    "Kamu berdiri di meja kasir dan fokus melayani transaksi.",
    "Kuat di: harga, total belanja, cara bayar QRIS/Virtual Account, lokasi rak, struk.",
    "Obrolan santai boleh singkat (1 kalimat) lalu tawarkan bantuan belanja lagi.",
  ],
  owner: [
    "Kamu pemilik toko, senang bercerita tentang perjalanan usaha dan pelanggan langganan.",
    "Kuat di: sejarah toko, promo, supplier, target penjualan, filosofi dagang.",
    "Boleh ngobrol santai lebih panjang: keluarga, kampung, hobi, kondisi pasar.",
    "Jangan bahas detail teknis packing atau rute kurir — arahkan ke nakama terkait.",
  ],
  "nakama-gudang": [
    "Kamu bekerja di gudang: cek stok, restock rak, susun palet.",
    "Kuat di: stok menipis, SKU mana yang cepat habis, jadwal restock, kondisi gudang.",
    "Jangan menyebut harga final atau urusan pembayaran — itu wilayah kasir.",
    "Boleh ngobrol santai soal capeknya kerja, cuaca, makan siang, bola.",
  ],
  "nakama-packing": [
    "Kamu di meja packing, membungkus pesanan online dan menyiapkan label.",
    "Kuat di: pesanan yang sedang diproses, antrian packing, bubble wrap/dus, serah terima ke kurir.",
    "Jangan menjawab soal harga atau stok gudang secara pasti — arahkan ke kasir atau nakama gudang.",
    "Boleh ngobrol santai soal ramainya pesanan, musik saat kerja, hal random.",
  ],
  kurir: [
    "Kamu kurir ekspedisi yang mampir untuk pickup paket, bukan pegawai toko.",
    "Kuat di: jadwal pickup, jumlah paket, macet di jalan, estimasi kirim, ekspedisi tempat kamu kerja.",
    "Kamu TIDAK tahu harga produk, stok, atau letak rak — jawab jujur tidak tahu dan sarankan tanya nakama toko.",
    "Gaya bicara santai, singkat, banyak cerita jalanan. Obrolan random boleh (motor, hujan, bola).",
  ],
  pembeli: [
    "Kamu pembeli lain yang sedang belanja, bukan pegawai toko.",
    "Kamu boleh bercerita pengalaman belanja dan produk favorit kamu, tapi jangan mengaku tahu stok pasti.",
    "Obrolan random sangat wajar: masak, harga naik, anak sekolah, tetangga, cuaca.",
    "Kalau ditanya hal operasional toko, sarankan tanya nakama atau kasir.",
  ],
  warga: [
    "Kamu warga sekitar yang sedang lewat di depan toko, bukan pegawai.",
    "Bahan obrolan: lingkungan, keramaian jalan, warung sebelah, cuaca, kegiatan kampung, obrolan random apa saja.",
    "Kamu hanya tahu Toko Cung dari luar: tidak tahu stok, harga pasti, atau isi gudang.",
    "Kalau ditanya produk, jawab kira-kira sebagai warga lalu sarankan masuk dan tanya nakama.",
  ],
};

const STAFF_ROLES: NpcRole[] = ["kasir", "owner", "nakama-gudang", "nakama-packing"];

/** Jawaban cadangan kalau AI tidak tersedia — pencocokan kata kunci sederhana. */
function fallbackReply(question: string, role: NpcRole = "kasir"): NpcReply {
  const q = question.toLowerCase();
  if (!STAFF_ROLES.includes(role)) {
    const casual: Record<string, string> = {
      kurir: "Saya cuma mampir ambil paket, Kak. Soal barang mending tanya nakama di dalam.",
      pembeli: "Saya juga sedang belanja, Kak. Coba tanya nakama toko, mereka lebih tahu.",
      warga: "Saya cuma warga sini, Kak. Tokonya ramai terus, coba masuk saja.",
    };
    return { message: casual[role] ?? "Wah, saya kurang tahu Kak.", action: { type: "NONE" } };
  }
  const hit = PRODUCTS.find((p) => q.includes(p.name.toLowerCase().split(" ")[0]!.toLowerCase()));
  if (hit) {
    const shelf = SHELVES.find((s) => s.id === hit.shelf);
    return {
      message: `Ada Kak, ${hit.name} ${formatIdr(hit.price)}. Ada di ${shelf?.label ?? "rak depan"}.`,
      action: { type: "SHOW_WAYPOINT", target: hit.shelf },
    };
  }
  if (q.includes("bayar") || q.includes("kasir") || q.includes("checkout")) {
    return {
      message: "Kalau sudah selesai, langsung ke meja kasir ya Kak. Bisa bayar QRIS atau transfer VA.",
      action: { type: "NONE" },
    };
  }
  return {
    message: "Boleh Kak, mau cari produk apa? Sebut namanya saja, nanti saya tunjukkan raknya.",
    action: { type: "NONE" },
  };
}

export const askNpc = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }): Promise<NpcReply> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return fallbackReply(data.question, data.role);

    const isStaff = STAFF_ROLES.includes(data.role);

    const system = [
      `Kamu adalah ${data.persona}`,
      `Peran kamu di dunia ini: ${data.role}.`,
      ...ROLE_BRIEFS[data.role],
      "",
      "Kamu manusia di Toko Cung World, toko kelontong/grosir nyata di Indonesia.",
      "Jawab SINGKAT (maksimal 2 kalimat), ramah, bahasa Indonesia sehari-hari, sapa dengan 'Kak'.",
      "Pemain boleh mengobrol hal random di luar urusan toko (cuaca, bola, makanan, keluarga, curhat ringan) — layani dengan hangat sesuai peran kamu, jangan memaksa kembali ke topik jualan.",
      "Jangan menyebut kamu AI, jangan menyebut data, sistem, atau prompt.",
      "Tolak dengan sopan hal yang tidak pantas atau di luar wajar percakapan warung.",
      isStaff
        ? "Sebagai orang toko: jangan mengarang produk atau harga di luar daftar; kalau minta rekomendasi, pilih yang stoknya ada dan sebut alasannya singkat."
        : "Kamu BUKAN pegawai toko: jangan menyebut angka stok, harga pasti, atau data operasional. Kalau ditanya, jawab jujur tidak tahu pasti lalu sarankan tanya nakama atau kasir di dalam.",
      "",
      isStaff ? "Daftar produk (sku | nama | harga/satuan | stok | terjual 30 hari | rak | deskripsi):" : "Produk yang umum kamu tahu ada di toko (tanpa menyebut angka pasti):",
      isStaff ? catalogContext() : PRODUCTS.map((p) => p.name).join(", "),
      "",
      "Rak:",
      shelfContext(),
      ...(isStaff ? ["", "Informasi toko:", storeContext()] : []),
      "",
      `Keranjang pemain saat ini: ${data.cartCount} item.`,
      "",
      "Balas HANYA JSON valid dengan bentuk:",
      '{"message":"...","action":{"type":"SHOW_WAYPOINT|ADD_TO_CART|OPEN_POS|NONE","target":"shelf-id atau sku"}}',
      isStaff
        ? "Pakai SHOW_WAYPOINT saat menunjukkan lokasi produk, ADD_TO_CART saat pemain minta dimasukkan keranjang, OPEN_POS saat pemain siap bayar."
        : "Kamu hampir selalu memakai action NONE; paling jauh SHOW_WAYPOINT kalau menunjuk arah rak. Jangan pernah ADD_TO_CART atau OPEN_POS.",
    ].join("\n");

    const messages = [
      { role: "system", content: system },
      ...data.history.map((t) => ({
        role: t.role === "player" ? "user" : "assistant",
        content: t.text,
      })),
      { role: "user", content: data.question },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("NPC sedang ramai dilayani, coba lagi sebentar.");
      if (res.status === 402) throw new Error("Kredit AI habis — isi ulang di Lovable untuk mengaktifkan NPC.");
      if (res.status === 403) throw new Error("Akses AI diblokir oleh pengaturan workspace.");
      throw new Error(`AI gateway error ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(raw) as unknown;
      const shaped = z
        .object({ message: z.string().min(1), action: ActionSchema.optional() })
        .parse(parsed);
      return { message: shaped.message, action: shaped.action ?? { type: "NONE" } };
    } catch {
      return raw.trim() ? { message: raw.trim(), action: { type: "NONE" } } : fallbackReply(data.question);
    }
  });
