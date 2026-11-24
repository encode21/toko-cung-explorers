import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, MapPin, RefreshCw, Store, Trophy, Users } from "lucide-react";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { useHud } from "@/state/hud-store";
import { enterWarung, loadDirectory, loadLeaderboard, useWarung } from "@/game/warung/store";
import {
  LEVEL_LOOK,
  rupiah,
  rupiahShort,
  type LeaderboardRow,
  type WarungCard,
} from "@/game/warung/model";
import { awningStripe, WALL_COLOR } from "@/game/warung/decor";
import "./warung-community.css";

type Section = "nearby" | "popular" | "leaderboard";
type Entry = WarungCard | LeaderboardRow;
const SECTIONS = [
  { id: "nearby", label: "Sekitar", title: "Warung di sekitarmu", icon: MapPin },
  { id: "popular", label: "Terlaris", title: "Warung terlaris", icon: Store },
  { id: "leaderboard", label: "Juara", title: "Papan juara minggu ini", icon: Trophy },
] as const;

function ShopIllustration({ entry }: { entry: Entry }) {
  const look = LEVEL_LOOK[Math.min(Math.max(entry.level - 1, 0), LEVEL_LOOK.length - 1)]!;
  const style = "style" in entry ? entry.style : undefined;
  const wall = WALL_COLOR[style?.wall ?? ""] ?? look.wall;
  return (
    <svg viewBox="0 0 320 260" fill="none" aria-hidden="true">
      <ellipse cx="160" cy="227" rx="132" ry="12" fill="#dbc9b3" />
      <path d="M54 91h212v129H54z" fill={wall} stroke="#a57d5f" strokeWidth="3" />
      <path d="M48 217h224v12H48z" fill="#bfa78d" />
      <rect
        x="75"
        y="124"
        width="103"
        height="69"
        rx="3"
        fill="#bbe4e8"
        stroke="#8c6e55"
        strokeWidth="4"
      />
      <path d="M82 184h89M82 157h89" stroke="#fffaf0" strokeWidth="5" />
      <path d="M127 126v65" stroke="#8c6e55" strokeWidth="3" />
      <path d="m83 137 17-10m42 48 21-16" stroke="#eaf9f5" strokeWidth="5" strokeLinecap="round" />
      <path d="M198 125h47v91h-47z" fill="#86644f" />
      <path d="M204 132h35v63h-35z" fill="#aad5d4" />
      <circle cx="232" cy="205" r="3" fill="#ffda81" />
      <path d="M48 87 62 57h196l14 30v20H48Z" fill="#fff6e8" />
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d={`M${62 + i * 24.5} 57h24.5L${76 + i * 28} 87v14a14 14 0 0 1-28 0V87Z`}
          fill={awningStripe(style?.awning ?? "", look.awning, i)}
        />
      ))}
      <path d="M62 57h196" stroke="#8c6e55" strokeWidth="4" strokeLinecap="round" />
      <rect
        x="107"
        y="26"
        width="106"
        height="31"
        rx="5"
        fill="#fffaf0"
        stroke="#a57d5f"
        strokeWidth="3"
      />
      <path d="M128 42h64" stroke={look.awning} strokeWidth="7" strokeLinecap="round" />
      <path d="M30 205h23l-4 23H34z" fill="#c38057" />
      <path
        d="M42 207v-38m0 21c-19 1-22-18-22-18 17-2 22 18 22 18Zm0-4c20 1 23-18 23-18-17-2-23 18-23 18Z"
        fill="#6eaa79"
        stroke="#4c8260"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M270 201h20v25h-20z" fill="#d9b377" stroke="#ab865b" strokeWidth="2" />
      <path d="M275 201v-20h20v20Z" fill="#edcd96" stroke="#ab865b" strokeWidth="2" />
    </svg>
  );
}

function OwnerBadge({ entry }: { entry: Entry }) {
  const name = entry.ownerName?.trim() || entry.name;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("");
  return (
    <span className="warung-community-avatar" aria-hidden="true">
      {initials.toLocaleUpperCase("id")}
      <b>Lv.{entry.level}</b>
    </span>
  );
}

/** Visiting lives outside the management workspace and keeps failed visits retryable. */
export function WarungCommunityPanel() {
  const [section, setSection] = useState<Section>(() =>
    useWarung.getState().panelTab === "juara" ? "leaderboard" : "nearby",
  );
  const [selected, setSelected] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [visitError, setVisitError] = useState("");
  const [visiting, setVisiting] = useState<number | null>(null);
  const directory = useWarung((s) => s.directory);
  const board = useWarung((s) => s.leaderboard);
  const ownId = useWarung((s) => s.data?.warung?.id) ?? directory?.mineId;
  const insideId = useWarung((s) => s.inside?.id);
  const busy = useWarung((s) => s.busy);
  const request = useRef(0);
  const mounted = useRef(true);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const rowRefs = useRef(new Map<number, HTMLButtonElement>());
  const isBoard = section === "leaderboard";
  const refresh = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setLoadError("");
    const result = isBoard ? await loadLeaderboard() : await loadDirectory();
    if (!mounted.current || id !== request.current) return;
    setLoading(false);
    if (!result)
      setLoadError(isBoard ? "Papan juara belum bisa dimuat." : "Daftar warung belum bisa dimuat.");
  }, [isBoard]);
  useEffect(() => {
    mounted.current = true;
    useWarung.setState({ panelTab: null });
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (selected) detailHeading.current?.focus();
  }, [selected]);

  const visit = async (entry: Entry) => {
    if (visiting !== null || busy) return;
    setVisitError("");
    setVisiting(entry.id);
    const entered = await enterWarung(entry.id);
    if (!mounted.current) return;
    setVisiting(null);
    if (entered) {
      if (useHud.getState().sheet === "warung-community") useHud.getState().setSheet(null);
    } else {
      setVisitError(useWarung.getState().error || "Belum bisa mengunjungi warung ini. Coba lagi.");
    }
  };
  const rows: Entry[] = isBoard
    ? [
        ...(board?.top ?? []),
        ...(board?.me && !board.top.some((w) => w.id === board.me?.id) ? [board.me] : []),
      ]
    : (section === "nearby" ? (directory?.online ?? []) : (directory?.top ?? [])).filter(
        (w) => w.id !== ownId,
      );
  const uniqueRows = rows.filter((w, i) => rows.findIndex((other) => other.id === w.id) === i);
  const hasData = isBoard ? !!board : !!directory;
  const title = SECTIONS.find((s) => s.id === section)!.title;
  const visitButton = (entry: Entry) => (
    <button
      type="button"
      className="warung-community-visit"
      disabled={busy || visiting !== null || insideId === entry.id}
      onClick={() => void visit(entry)}
      aria-label={`Kunjungi ${entry.name}`}
    >
      {visiting === entry.id ? "Mengunjungi…" : insideId === entry.id ? "Di sini" : "Kunjungi"}
      {visiting !== entry.id && insideId !== entry.id && <ArrowRight size={16} aria-hidden />}
    </button>
  );

  return (
    <GameModal
      title="Komunitas"
      className="warung-community-sheet"
      bodyClassName="game-scroll-flush"
      onClose={() => useHud.getState().setSheet(null)}
    >
      <div className="warung-community">
        <nav className="warung-community-nav" aria-label="Komunitas warung">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              aria-current={section === id ? "page" : undefined}
              disabled={visiting !== null}
              onClick={() => {
                setSection(id);
                setSelected(null);
                setVisitError("");
              }}
            >
              <Icon size={24} aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <section className="warung-community-main" aria-label={title}>
          <div className="warung-community-toolbar">
            {selected ? (
              <button
                type="button"
                className="warung-community-back"
                disabled={visiting !== null}
                onClick={() => {
                  const id = selected.id;
                  setSelected(null);
                  requestAnimationFrame(() => rowRefs.current.get(id)?.focus());
                }}
              >
                <ArrowLeft size={18} aria-hidden />
                Daftar warung
              </button>
            ) : (
              <div>
                <h3>{title}</h3>
                <p>
                  {isBoard
                    ? "Omzet sejak Senin · Kas game"
                    : section === "nearby"
                      ? "Pemilik online di channel ini"
                      : "Temukan warung pemain lain"}
                </p>
              </div>
            )}
            {!selected && (
              <button
                type="button"
                className="warung-community-refresh"
                aria-label="Muat ulang daftar warung"
                title="Muat ulang"
                disabled={loading || busy || visiting !== null}
                onClick={() => void refresh()}
              >
                <RefreshCw size={18} aria-hidden />
              </button>
            )}
          </div>
          {loadError && (
            <div className="warung-community-error" role="alert">
              <span>{loadError}</span>
              <button type="button" onClick={() => void refresh()} disabled={loading || busy}>
                {loading ? "Memuat…" : "Coba lagi"}
              </button>
            </div>
          )}
          {visitError && (
            <p className="warung-community-error" role="alert">
              {visitError}
            </p>
          )}
          {selected ? (
            <div className="warung-community-detail">
              <figure className="warung-community-preview">
                <ShopIllustration entry={selected} />
              </figure>
              <div className="warung-community-info">
                <div className="warung-community-owner">
                  <OwnerBadge entry={selected} />
                  <span>{selected.ownerName ?? "Pemain"}</span>
                </div>
                <h3 ref={detailHeading} tabIndex={-1}>
                  {selected.name}
                </h3>
                <p className="warung-community-level">
                  Lv. {selected.level} · {selected.levelName}
                </p>
                <dl>
                  <div>
                    <dt>{"total" in selected ? "Omzet minggu ini" : "Total penjualan"}</dt>
                    <dd>{rupiah("total" in selected ? selected.total : selected.totalSales)}</dd>
                  </div>
                  {"online" in selected && (
                    <div>
                      <dt>Pemilik</dt>
                      <dd>{selected.online ? "Online" : "Offline"}</dd>
                    </div>
                  )}
                  {"hiring" in selected && selected.hiring && (
                    <div>
                      <dt>Part-time</dt>
                      <dd>Lowongan tersedia</dd>
                    </div>
                  )}
                  {"npc" in selected && (
                    <>
                      <div>
                        <dt>Pembeli NPC</dt>
                        <dd>{rupiah(selected.npc)}</dd>
                      </div>
                      <div>
                        <dt>Pembeli pemain</dt>
                        <dd>{rupiah(selected.player)}</dd>
                      </div>
                    </>
                  )}
                </dl>
                <div className="warung-community-detail-action">{visitButton(selected)}</div>
              </div>
            </div>
          ) : (
            <div className="warung-community-list" aria-busy={loading}>
              {loading && !hasData ? (
                <p className="warung-community-empty" role="status">
                  Memuat warung…
                </p>
              ) : !uniqueRows.length && !loadError ? (
                <div className="warung-community-empty">
                  <Users size={40} aria-hidden />
                  <h4>
                    {isBoard
                      ? "Belum ada penjualan minggu ini"
                      : section === "nearby"
                        ? "Belum ada warung lain di sekitar"
                        : "Belum ada warung lain"}
                  </h4>
                  <p>
                    {section === "nearby"
                      ? "Coba lihat Terlaris untuk mengunjungi warung pemain lain."
                      : "Muat ulang untuk melihat daftar terbaru."}
                  </p>
                  {section === "nearby" && (
                    <button
                      type="button"
                      className="warung-community-visit"
                      onClick={() => setSection("popular")}
                    >
                      Lihat terlaris
                      <ArrowRight size={16} aria-hidden />
                    </button>
                  )}
                </div>
              ) : (
                <ul>
                  {uniqueRows.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) rowRefs.current.set(entry.id, el);
                          else rowRefs.current.delete(entry.id);
                        }}
                        className="warung-community-person"
                        disabled={visiting !== null}
                        aria-label={`Lihat ${entry.name}`}
                        onClick={() => setSelected(entry)}
                      >
                        {"rank" in entry ? (
                          <span
                            className="warung-community-rank"
                            data-podium={entry.rank <= 3 || undefined}
                          >
                            {entry.rank}
                          </span>
                        ) : (
                          <OwnerBadge entry={entry} />
                        )}
                        <span className="warung-community-name">
                          <strong>
                            {entry.name}
                            {entry.id === ownId && <small>Warungmu</small>}
                          </strong>
                          <span>
                            {entry.ownerName ?? "Pemain"} · {entry.levelName}
                          </span>
                          {"total" in entry ? (
                            <b className="warung-community-sales">{rupiahShort(entry.total)}</b>
                          ) : (
                            <span className="warung-community-status">
                              {entry.online && <span>Online</span>}
                              {entry.hiring && <span>Part-time</span>}
                            </span>
                          )}
                        </span>
                      </button>
                      {visitButton(entry)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </GameModal>
  );
}
