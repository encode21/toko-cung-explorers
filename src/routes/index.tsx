import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Clock,
  Compass,
  CreditCard,
  Dumbbell,
  Hand,
  Martini,
  MessagesSquare,
  Music,
  Package,
  ShoppingBasket,
  Sparkles as Spa,
  Store,
  Tent,
  TrendingUp,
  Users,
} from "lucide-react";
import { useSession } from "@/auth/useSession";
import { PRODUCTS, formatIdr } from "@/commerce/products/catalog";
import { COURIERS, POS_SUMMARY, TODAY_SUMMARY, WAREHOUSE_SUMMARY } from "@/commerce/products/tokocung-inventory";
import { pageMeta } from "@/lib/site-meta";
import heroImg from "@/assets/home-hero-world.jpg";
import storeImg from "@/assets/home-store.jpg";
import warehouseImg from "@/assets/home-warehouse.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: pageMeta({
      title: "Toko Cung World — Masuk ke Toko Cung dalam 3D",
      description:
        "Jalan-jalan di Toko Cung versi 3D: jelajahi rak, gudang, dan lingkungan sekitar, ngobrol dengan pemain lain, lalu bayar lewat QRIS atau Virtual Account.",
      path: "/",
    }),
  }),
  component: LandingPage,
});

const btnPrimary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-site-red px-6 font-semibold text-world-brand-foreground shadow-[0_10px_24px_-10px_var(--site-red)] transition hover:brightness-110";
const btnSecondary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-site-line bg-background px-6 font-semibold text-site-ink transition hover:border-site-ink";

function Pin({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`absolute flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 font-semibold text-[11px] text-site-ink shadow-md sm:text-xs ${className}`}
    >
      <span className="size-2 rounded-full bg-site-red" />
      {label}
    </span>
  );
}

const DESTINATIONS = [
  { name: "Toko Utama", desc: "Pintu masuk dan etalase utama Toko Cung.", live: "Ramai pengunjung", img: heroImg, pos: "30% 50%" },
  { name: "Rak Makanan Instan", desc: "Mi instan, kopi, dan camilan favorit.", live: `${PRODUCTS.filter((p) => p.shelf === "shelf-instant-noodle").length} produk siap ambil`, img: storeImg, pos: "35% 60%" },
  { name: "Rak Rumah Tangga & Rokok", desc: "Kebutuhan rumah dan rokok harian.", live: `${PRODUCTS.filter((p) => p.shelf === "shelf-snack").length} produk siap ambil`, img: storeImg, pos: "5% 70%" },
  { name: "Gudang", desc: "Nakama menumpuk dus dan memuat truk.", live: `${WAREHOUSE_SUMMARY.totalSku} SKU tersimpan`, img: warehouseImg, pos: "40% 50%" },
  { name: "Kasir", desc: "Bayar dengan QRIS atau Virtual Account.", live: `${POS_SUMMARY.transactions} transaksi hari ini`, img: storeImg, pos: "95% 55%" },
  { name: "JNE Drop Point", desc: "Paket online diserahkan ke kurir.", live: `${COURIERS[0]?.inTransit ?? 0} pengiriman berjalan`, img: heroImg, pos: "92% 70%" },
];

const FEATURES = [
  { Icon: Compass, title: "Explore", desc: "Jelajahi toko dan area sekitar dalam 3D." },
  { Icon: ShoppingBasket, title: "Shop", desc: "Ambil produk dan checkout seperti di toko asli." },
  { Icon: Hand, title: "Interact", desc: "Berinteraksi dengan rak, NPC, area, dan pemain lain." },
  { Icon: MessagesSquare, title: "Social", desc: "Chat dengan pemain lain dan lihat aktivitas dunia." },
  { Icon: CreditCard, title: "Pay", desc: "Selesaikan transaksi lewat QRIS atau Virtual Account." },
];

const FUTURE = [
  { Icon: Martini, name: "Lounge" },
  { Icon: Spa, name: "Spa" },
  { Icon: Music, name: "Event Venue" },
  { Icon: Building2, name: "Tenant District" },
  { Icon: Tent, name: "Entertainment Area" },
  { Icon: Dumbbell, name: "Sport Park" },
];

function LandingPage() {
  const session = useSession();
  const enterTo = session.user ? "/world" : "/auth";
  const pending = COURIERS.reduce((s, c) => s + c.awaitingPickup, 0);

  const pulse = [
    { Icon: TrendingUp, value: formatIdr(TODAY_SUMMARY.omzet), label: "Omzet hari ini" },
    { Icon: ShoppingBasket, value: `${TODAY_SUMMARY.transaksi}`, label: "Transaksi hari ini" },
    { Icon: Package, value: WAREHOUSE_SUMMARY.totalSku.toLocaleString("id-ID"), label: "SKU aktif" },
    { Icon: Clock, value: POS_SUMMARY.peakHour, label: "Jam tersibuk" },
  ];

  const activity = [
    "12 pemain sedang online",
    `${pending} paket menunggu pickup kurir`,
    `${COURIERS[0]?.name ?? "JNE"} Drop Point: ${COURIERS[0]?.inTransit ?? 0} pengiriman`,
    "Rak Makanan Instan sedang ramai",
    "3 pemain baru masuk world",
    "Truk ekspedisi menuju gudang",
  ];

  return (
    <main className="min-h-dvh bg-site-bg font-sans text-site-ink">
      {/* Header */}
      <header className="sticky top-0 z-30 border-site-line border-b bg-site-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-site-red text-world-brand-foreground">
              <Store className="size-5" />
            </span>
            <span className="font-display text-xl tracking-wide">TOKO CUNG WORLD</span>
          </Link>
          <nav className="hidden items-center gap-6 font-medium text-site-soft text-sm md:flex">
            <a href="#world" className="hover:text-site-ink">World</a>
            <a href="#jelajah" className="hover:text-site-ink">Jelajah</a>
            <a href="#belanja" className="hover:text-site-ink">Belanja</a>
            <a href="#aktivitas" className="hover:text-site-ink">Aktivitas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to={session.user ? "/world" : "/auth"} className="hidden min-h-11 items-center px-3 font-semibold text-sm sm:flex">
              {session.user ? session.displayName || "Profil" : "Masuk"}
            </Link>
            <Link to={enterTo} className="inline-flex min-h-11 items-center rounded-xl bg-site-red px-4 font-semibold text-sm text-world-brand-foreground">
              Masuk Dunia 3D
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="world" className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-8 pb-12 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pt-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-site-line bg-background px-3 py-1 font-semibold text-site-soft text-xs">
            <span className="size-2 animate-pulse rounded-full bg-site-green" /> Dunia sedang buka · 08:30 pagi
          </span>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-wide sm:text-6xl lg:text-7xl">
            Kunjungi Toko Cung Seperti Datang Sendiri ke Tokonya.
          </h1>
          <p className="mt-5 max-w-lg text-base text-site-soft leading-relaxed">
            Jalan-jalan di dalam toko virtual, lihat produk asli di raknya, ngobrol dengan nakama dan pemain lain, lalu
            bayar di kasir lewat QRIS atau Virtual Account.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to={enterTo} className={btnPrimary}>
              Masuk Dunia 3D <ArrowRight className="size-4" />
            </Link>
            <a href="#jelajah" className={btnSecondary}>
              Jelajahi Dunia
            </a>
          </div>
          <a href="https://tanya.tokocung.com" className="mt-4 inline-flex min-h-11 items-center gap-1 font-semibold text-sm text-site-soft underline-offset-4 hover:text-site-ink hover:underline">
            atau Tanya Toko Cung lewat chat <ArrowRight className="size-3.5" />
          </a>
        </div>

        <Link to={enterTo} className="group relative block overflow-hidden rounded-3xl border border-site-line bg-site-sky shadow-[0_30px_60px_-30px_var(--site-ink)]">
          <img src={heroImg} alt="Pratinjau dunia 3D Toko Cung di pagi hari" width={1600} height={912} className="aspect-video w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
          <Pin label="Toko Cung" className="top-[30%] left-[22%]" />
          <Pin label="Gudang" className="top-[12%] left-[62%]" />
          <Pin label="JNE Drop Point" className="top-[45%] right-[4%]" />
          <Pin label="Kasir" className="top-[56%] left-[40%]" />
          <Pin label="Explore" className="bottom-[14%] left-[8%]" />
          <span className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-xl bg-site-ink px-4 py-2 font-semibold text-sm text-site-bg shadow-lg transition group-hover:gap-3">
            Masuk World <ArrowRight className="size-4" />
          </span>
        </Link>
      </section>

      {/* World Pulse */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl tracking-wide">World Pulse</h2>
            <p className="text-site-soft text-sm">Aktivitas Toko Cung hari ini</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {pulse.map(({ Icon, value, label }) => (
            <div key={label} className="rounded-2xl border border-site-line bg-background p-4">
              <Icon className="size-4 text-site-red" />
              <p className="mt-2 truncate font-display text-2xl tracking-wide sm:text-3xl">{value}</p>
              <p className="text-site-soft text-xs">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Destinations */}
      <section id="jelajah" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6">
        <h2 className="font-display text-4xl tracking-wide">Tempat yang Bisa Kamu Kunjungi</h2>
        <p className="mt-1 text-site-soft text-sm">Setiap lokasi bisa kamu datangi langsung di dalam dunia.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map((d) => (
            <article key={d.name} className="group overflow-hidden rounded-3xl border border-site-line bg-background transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_var(--site-ink)]">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={d.img} alt={d.name} loading="lazy" width={800} height={500} style={{ objectPosition: d.pos }} className="size-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 font-semibold text-[11px]">
                  <span className="size-1.5 rounded-full bg-site-green" /> {d.live}
                </span>
              </div>
              <div className="flex items-end justify-between gap-3 p-4">
                <div className="min-w-0">
                  <h3 className="font-semibold">{d.name}</h3>
                  <p className="text-site-soft text-sm">{d.desc}</p>
                </div>
                <Link to={enterTo} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-site-sky px-3 font-semibold text-sm">
                  Kunjungi <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* What can you do */}
      <section id="belanja" className="scroll-mt-20 bg-site-ink py-16 text-site-bg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-4xl tracking-wide">Apa yang Bisa Kamu Lakukan di Sini?</h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map(({ Icon, title, desc }, i) => (
              <li key={title} className="relative rounded-2xl border border-world-outline p-5">
                <span className="absolute top-4 right-4 font-display text-world-muted text-sm">0{i + 1}</span>
                <span className="grid size-11 place-items-center rounded-full bg-site-red text-world-brand-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-2xl tracking-wide">{title}</h3>
                <p className="mt-1 text-sm text-world-muted">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Activity */}
      <section id="aktivitas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="font-display text-4xl tracking-wide">Yang Sedang Terjadi di Toko Cung World</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {activity.map((a, i) => (
            <li key={a} className="flex items-center gap-2 rounded-full border border-site-line bg-background px-4 py-2 text-sm">
              {i === 0 ? <Users className="size-4 text-site-green" /> : <span className="size-2 rounded-full bg-site-red" />}
              {a}
            </li>
          ))}
        </ul>
      </section>

      {/* Future */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl border border-site-line bg-site-sky/60 p-6 sm:p-10">
          <h2 className="font-display text-4xl tracking-wide">Dunia Ini Baru Dimulai.</h2>
          <p className="mt-2 max-w-2xl text-site-soft">
            Toko Cung World akan berkembang menjadi dunia virtual dengan area baru, event, layanan, hiburan, dan berbagai
            aktivitas interaktif.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {FUTURE.map(({ Icon, name }) => (
              <div key={name} className="rounded-2xl border border-dashed border-site-soft/40 bg-background/60 p-4 opacity-80">
                <Icon className="size-5 text-site-soft" />
                <p className="mt-3 font-semibold text-sm">{name}</p>
                <span className="mt-1 inline-block rounded-full bg-site-line px-2 py-0.5 font-semibold text-[10px] text-site-soft uppercase tracking-wider">
                  Coming Soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 text-center sm:px-6">
        <h2 className="font-display text-4xl tracking-wide sm:text-5xl">Tokonya sudah buka. Kamu kapan masuk?</h2>
        <Link to={enterTo} className={`${btnPrimary} mt-6`}>
          Masuk Dunia 3D <ArrowRight className="size-4" />
        </Link>
      </section>

      <footer className="border-site-line border-t py-6 text-center text-site-soft text-xs">
        © Toko Cung World · world.tokocung.com
      </footer>
    </main>
  );
}
