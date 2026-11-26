import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BusFront,
  Check,
  Flag,
  MapPin,
  Mountain,
  Navigation,
} from "lucide-react";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useProfile } from "@/identity/profile-store";
import { markMapAnnouncementSeen } from "@/ui/hud/announcements";
import { useDungeon } from "@/game/dungeon/store";
import { useMountain } from "@/game/mountain/store";
import { useHome } from "@/game/home/store";
import { GangMap } from "@/game/gang/GangMap";
import { gangName } from "@/game/gang/model";
import { gangCommand, useGang } from "@/game/gang/store";
import {
  isMountainPosition,
  MOUNTAIN_BOUNDS,
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_CHECKPOINT_COUNT,
  MOUNTAIN_NAME,
  MOUNTAIN_HELIPAD,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_TRAIL,
  type WorldLocation,
} from "@/game/mountain/model";
import { CityMap } from "./CityMap";
import { useMapFocus } from "./map-focus";
import "./location-map.css";

type WorldMapRegion = WorldLocation | "kampung";

/** Three travel regions; shops, homes and checkpoints remain local landmarks. */
export function WorldMap() {
  const [view, setView] = useState<WorldMapRegion | null>(() =>
    useMapFocus.getState().lots ? "city" : null,
  );
  const uid = useProfile((s) => s.profile?.id);
  useEffect(() => markMapAnnouncementSeen(uid), [uid]);
  const position = useGame((s) => s.playerPos);
  const gang = useGang((s) => s.data);
  const gangBusy = useGang((s) => s.busy);
  const gangRetry = useGang((s) => s.retry);
  const insideGang = useGang((s) => s.inside !== null);
  const insideHome = useHome((s) => s.inside);
  const current: WorldMapRegion =
    insideGang || insideHome
      ? "kampung"
      : isMountainPosition(position[0], position[2])
        ? "mountain"
        : "city";
  const dungeon = useDungeon((s) => !!s.data?.instance);
  const kampung = gang && (insideGang || gang.gang === gang.home.gang) ? gang : null;
  const openWarungs = kampung?.houses.filter((house) => house.warung?.open).length ?? 0;
  useEffect(() => {
    if (view !== "kampung" || insideGang || !gang || gang.gang === gang.home.gang || gangBusy)
      return;
    void gangCommand("read", { gang: gang.home.gang });
  }, [gang, gangBusy, insideGang, view]);
  const retryKampung = () =>
    void (gangRetry ? gangCommand(gangRetry.action, gangRetry) : gangCommand("read"));
  const guideToHelipad = () => {
    if (dungeon || current === "mountain") return;
    useGame.getState().setWaypoint("venue-helicopter");
    useGame.getState().setToast("Ikuti petunjuk ke helipad kota, lalu naik helikopter.");
    useHud.getState().setSheet(null);
  };
  return (
    <section
      className="location-map"
      data-map-view={view ?? "world"}
      aria-label="Tiga lokasi dunia"
    >
      {view ? (
        <>
          {view === "city" ? (
            <CityMap forceCity />
          ) : view === "kampung" ? (
            <div className="kampung-map-detail" data-kampung-map-detail>
              <aside className="kampung-map-info">
                <h3>{kampung ? gangName(kampung) : "Kampung"}</h3>
                <p>Denah rumah warga, warung, jalan utama, gerbang, dan halte Kampung.</p>
                {kampung ? (
                  <dl>
                    <div>
                      <dt>Rumah</dt>
                      <dd>{kampung.houses.length}</dd>
                    </div>
                    <div>
                      <dt>Warung buka</dt>
                      <dd>{openWarungs}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="kampung-map-loading">
                    {gangBusy ? "Memuat denah Kampung…" : "Denah Kampung belum tersambung."}
                  </p>
                )}
                <ul aria-label="Legenda peta Kampung">
                  <li>
                    <i data-kind="home" /> Rumah warga
                  </li>
                  <li>
                    <i data-kind="mine" /> Rumahmu
                  </li>
                  <li>
                    <i data-kind="open" /> Warung buka
                  </li>
                </ul>
              </aside>
              <div className="kampung-map-stage">
                {kampung ? (
                  <GangMap overview />
                ) : (
                  <div className="kampung-map-empty" role="status">
                    <BusFront aria-hidden size={36} />
                    <strong>{gangBusy ? "Denah sedang disiapkan" : "Denah belum tersedia"}</strong>
                    <span>Rumah dan jalan akan muncul setelah data Kampung tersambung.</span>
                    {!gangBusy && (
                      <button type="button" onClick={retryKampung}>
                        Coba lagi
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <MountainMap current={current} />
          )}
          <button className="location-map-back" onClick={() => setView(null)}>
            <ArrowLeft aria-hidden size={18} /> Kembali
          </button>
        </>
      ) : (
        <>
          <div className="location-map-intro">
            <h3>Pilih petualanganmu</h3>
            <p>Kota, kampung, dan pegunungan dalam satu peta.</p>
          </div>
          <div className="location-map-world">
            <WorldArtwork />
            {(
              [
                ["city", "1", "Pusat Kota", "Toko, taman & aktivitas warga"],
                [
                  "kampung",
                  "2",
                  "Kampung",
                  kampung
                    ? `${kampung.houses.length} rumah · ${openWarungs} warung buka`
                    : "Rumah warga & gang",
                ],
                [
                  "mountain",
                  "3",
                  "Pegunungan",
                  `Basecamp, ${MOUNTAIN_CHECKPOINT_COUNT} checkpoint & puncak`,
                ],
              ] as const
            ).map(([id, number, name, description]) => (
              <button
                key={id}
                type="button"
                className={`location-map-destination location-map-destination--${id}`}
                data-destination={id}
                data-world-location={id}
                aria-label={`Lihat ${name}`}
                onClick={() => setView(id)}
              >
                <span className="location-map-number">{number}</span>
                <span>
                  <strong>{name}</strong>
                  <small>{description}</small>
                  {current === id && (
                    <em>
                      <MapPin aria-hidden size={13} /> Kamu di sini
                    </em>
                  )}
                </span>
                <ArrowRight aria-hidden size={21} />
              </button>
            ))}
          </div>
          <footer className="location-map-footer">
            <p>
              Kampung terhubung lewat bus dan Gerbang Kampung. Pegunungan dicapai dengan helikopter
              dari helipad kota.
            </p>
            {current === "city" ? (
              <button onClick={guideToHelipad} disabled={dungeon}>
                <Navigation aria-hidden size={18} /> Petunjuk ke helipad
              </button>
            ) : current === "kampung" ? (
              <button onClick={() => setView("kampung")}>
                <BusFront aria-hidden size={18} /> Lihat denah kampung
              </button>
            ) : (
              <button onClick={() => setView("mountain")}>
                <Mountain aria-hidden size={18} /> Lihat jalur pendakian
              </button>
            )}
            {dungeon && (
              <small>Selesaikan atau keluar dari misi Principal untuk mengganti petunjuk.</small>
            )}
          </footer>
        </>
      )}
    </section>
  );
}

function WorldArtwork() {
  return (
    <svg className="location-map-art" viewBox="0 0 1340 490" aria-hidden="true">
      <path
        d="M63 303 Q25 206 120 150 Q208 87 332 134 Q449 161 437 275 Q423 390 285 405 Q121 426 63 303Z"
        fill="#d3dfa1"
        stroke="#f5e6bd"
        strokeWidth="15"
      />
      <path
        d="M908 279 Q854 194 924 112 Q997 26 1160 65 Q1310 96 1298 220 Q1305 328 1182 356 Q1011 394 908 279Z"
        fill="#a8c97c"
        stroke="#f5e6bd"
        strokeWidth="15"
      />
      <path
        d="M118 263 H363 M224 174 V326"
        stroke="#fdf5df"
        strokeWidth="24"
        strokeLinecap="round"
      />
      <path
        d="M118 263 H363 M224 174 V326"
        stroke="#d8d1bb"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {[
        [142, 191, "#dd977a"],
        [272, 187, "#e5b85d"],
        [141, 289, "#7faeb4"],
        [281, 291, "#c1998a"],
      ].map(([x, y, color], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect width="62" height="44" rx="4" fill={String(color)} />
          <path d="M-7 0 L31 -25 L69 0Z" fill="#a25743" />
          <rect x="25" y="19" width="13" height="25" fill="#fcf1cf" />
          <path d="M7 12h10v10H7zM45 12h10v10H45z" fill="#f9e5b5" />
        </g>
      ))}
      <path
        d="M437 300 Q399 224 463 157 Q527 95 637 119 Q724 81 821 143 Q895 192 875 283 Q844 379 704 384 Q521 406 437 300Z"
        fill="#c6d89a"
        stroke="#f5e6bd"
        strokeWidth="15"
      />
      <path d="M485 178H826V329H485Z" fill="#b6cf85" />
      <path d="M502 188H590V255H502ZM711 188H807V255H711Z" fill="#d9c878" />
      <path d="M502 267H590V317H502ZM711 267H807V317H711Z" fill="#93bd78" />
      <path d="M623 151H682V342H623Z" fill="#f4efdd" />
      <path d="M644 151H661V342H644Z" fill="#e8e4da" />
      <path d="M608 220H697" stroke="#fff9e9" strokeWidth="6" strokeDasharray="9 7" />
      {[
        [550, 219, "#d9926e"],
        [756, 219, "#7faeb4"],
        [552, 291, "#e4b65f"],
        [756, 291, "#bf9181"],
      ].map(([x, y, color], i) => (
        <g key={`kampung-${i}`} transform={`translate(${x} ${y})`}>
          <rect x="-25" y="-15" width="50" height="34" rx="4" fill={String(color)} />
          <path d="M-31-15L0-36L31-15Z" fill="#985340" />
          <rect x="-6" y="2" width="12" height="17" fill="#fff0c9" />
        </g>
      ))}
      <path d="M932 250 L1022 110 L1109 251Z" fill="#6c995f" />
      <path d="M1020 251 L1126 69 L1247 251Z" fill="#497d57" />
      <path d="M1126 69 L1094 125 L1123 112 L1153 129Z" fill="#d7e3ba" />
      <path
        d="M1085 279 Q1207 231 1138 207 Q1074 187 1137 161 Q1174 147 1127 115"
        fill="none"
        stroke="#edcc91"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path d="M1128 77V43 M1128 43H1156V57H1128" stroke="#a44d40" strokeWidth="4" fill="#dd6e54" />
      {[
        [99, 224],
        [365, 302],
        [342, 163],
        [956, 252],
        [1214, 268],
        [1237, 195],
        [1050, 310],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0 0v26" stroke="#7d7251" strokeWidth="6" />
          <path d="M0 -39L-19 8H19Z" fill="#386e54" />
          <path d="M0 -20L-24 20H24Z" fill="#4e8b61" />
        </g>
      ))}
      <g fill="#f9f4d9" stroke="#e2b350" strokeWidth="5">
        <ellipse cx="384" cy="226" rx="28" ry="18" />
        <ellipse cx="946" cy="305" rx="28" ry="18" />
      </g>
      <g fill="#626b58" textAnchor="middle" fontSize="23" fontWeight="800">
        <text x="384" y="234">
          H
        </text>
        <text x="946" y="313">
          H
        </text>
      </g>
      <path
        d="M408 223 C642 74 746 337 921 308"
        fill="none"
        stroke="#fbf8e9"
        strokeWidth="6"
        strokeDasharray="11 9"
      />
      <g transform="translate(670 196) rotate(13)">
        <path
          d="M-35-12H34 M-3-12V-4 M-28 19H22 M-16 10V19 M12 10V19"
          fill="none"
          stroke="#5e6459"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="M-26-4H12Q37-1 27 11H-22Z" fill="#d3614f" />
        <path d="M-22 0L-46-6V6L-22 8" fill="#eee8d6" />
        <path d="M8-3H14Q28 0 25 5H8Z" fill="#b8e2e5" />
      </g>
      <path
        d="M400 327 C468 362 527 352 609 327"
        fill="none"
        stroke="#8e735c"
        strokeWidth="5"
        strokeDasharray="10 8"
      />
      <g transform="translate(506 343)">
        <rect x="-24" y="-10" width="48" height="23" rx="6" fill="#e5a74e" />
        <rect x="-16" y="-5" width="11" height="8" rx="2" fill="#d8eef0" />
        <rect x="1" y="-5" width="11" height="8" rx="2" fill="#d8eef0" />
        <circle cx="-14" cy="15" r="5" fill="#5e6459" />
        <circle cx="14" cy="15" r="5" fill="#5e6459" />
      </g>
      <g fill="#f6faf0" opacity=".75">
        <ellipse cx="80" cy="90" rx="54" ry="10" />
        <ellipse cx="444" cy="80" rx="65" ry="10" />
        <ellipse cx="1253" cy="368" rx="76" ry="13" />
        <ellipse cx="665" cy="422" rx="64" ry="9" />
      </g>
    </svg>
  );
}

function MountainMap({ current }: { current: WorldMapRegion }) {
  const checkpoint = useMountain((s) => s.checkpoint);
  const completed = useMountain((s) => s.completed);
  const position = useGame((s) => s.playerPos);
  const point = (p: readonly number[]) => ({
    x: 50 + ((p[0]! - MOUNTAIN_BOUNDS.minX) / (MOUNTAIN_BOUNDS.maxX - MOUNTAIN_BOUNDS.minX)) * 660,
    y: 35 + ((p[2]! - MOUNTAIN_BOUNDS.minZ) / (MOUNTAIN_BOUNDS.maxZ - MOUNTAIN_BOUNDS.minZ)) * 430,
  });
  const base = point(MOUNTAIN_HELIPAD.position),
    summit = point(MOUNTAIN_SUMMIT.position),
    me = point(position);
  return (
    <div className="mountain-map-detail">
      <div className="mountain-map-info">
        <h3>{MOUNTAIN_NAME}</h3>
        <p>Dari basecamp, ikuti jalur hingga puncak. Sentuh setiap CP secara berurutan.</p>
        <ol>
          {MOUNTAIN_CHECKPOINTS.map((cp) => (
            <li key={cp.id} data-complete={checkpoint >= cp.id}>
              <span>{checkpoint >= cp.id ? <Check aria-label="Aktif" size={17} /> : cp.id}</span>
              {cp.name}
            </li>
          ))}
          <li data-complete={completed}>
            <span>
              <Flag aria-hidden size={16} />
            </span>
            Puncak{completed ? " tercapai" : ""}
          </li>
        </ol>
        <p className="mountain-map-return">
          Untuk pulang ke kota, naik helikopter di helipad basecamp.
        </p>
      </div>
      <svg
        viewBox="0 0 760 500"
        className="mountain-map-route"
        role="img"
        aria-label={`Jalur dari helipad basecamp melewati ${MOUNTAIN_CHECKPOINT_COUNT} checkpoint menuju puncak ${MOUNTAIN_NAME}`}
      >
        <path
          d="M70 398Q-5 276 85 155Q170 14 361 22Q606-15 701 179Q789 346 624 454Q306 543 70 398Z"
          fill="#a7bd7f"
        />
        {[0, 1, 2, 3].map((i) => (
          <ellipse
            key={i}
            cx="368"
            cy={210 - i * 19}
            rx={245 - i * 42}
            ry={175 - i * 30}
            fill="none"
            stroke="#78975f"
            strokeWidth="2"
            opacity=".5"
          />
        ))}
        <polyline
          points={MOUNTAIN_TRAIL.map((p) => {
            const v = point(p);
            return `${v.x},${v.y}`;
          }).join(" ")}
          fill="none"
          stroke="#b9965e"
          strokeWidth="15"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={MOUNTAIN_TRAIL.map((p) => {
            const v = point(p);
            return `${v.x},${v.y}`;
          }).join(" ")}
          fill="none"
          stroke="#fff0ce"
          strokeWidth="9"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g transform={`translate(${base.x} ${base.y})`}>
          <circle r="18" fill="#fff5da" stroke="#ad8738" strokeWidth="3" />
          <text textAnchor="middle" y="7" fill="#79584d" fontSize="22" fontWeight="800">
            H
          </text>
          <text textAnchor="middle" y="43" fill="#40583a" fontSize="19" fontWeight="800">
            Basecamp
          </text>
        </g>
        {MOUNTAIN_CHECKPOINTS.map((cp) => {
          const p = point(cp.position);
          return (
            <g key={cp.id} transform={`translate(${p.x} ${p.y})`}>
              <circle
                r="17"
                fill={checkpoint >= cp.id ? "#46744c" : "#fff5da"}
                stroke="#fff9e9"
                strokeWidth="4"
              />
              <text
                textAnchor="middle"
                y="7"
                fill={checkpoint >= cp.id ? "white" : "#79584d"}
                fontSize="20"
                fontWeight="800"
              >
                {cp.id}
              </text>
              <text
                x={cp.id % 2 ? -27 : 27}
                y="7"
                textAnchor={cp.id % 2 ? "end" : "start"}
                fill="#344f32"
                fontSize="18"
                fontWeight="800"
              >
                {cp.name}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${summit.x} ${summit.y})`}>
          <path d="M0 6V-25H25V-10H0" stroke="#8b4c39" strokeWidth="3" fill="#d9654c" />
          <text x="37" y="0" fill="#344f32" fontSize="20" fontWeight="800">
            Puncak
          </text>
        </g>
        {current === "mountain" && (
          <g transform={`translate(${me.x} ${me.y})`}>
            <circle r="11" fill="#2485a3" stroke="#fff" strokeWidth="4" />
            <text
              x="17"
              y="-14"
              fontSize="16"
              fontWeight="800"
              fill="#134e63"
              stroke="#fff9e9"
              strokeWidth="4"
              paintOrder="stroke"
            >
              Kamu
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
