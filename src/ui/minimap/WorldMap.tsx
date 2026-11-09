import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Flag, MapPin, Mountain, Navigation } from "lucide-react";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useDungeon } from "@/game/dungeon/store";
import { useMountain } from "@/game/mountain/store";
import {
  isMountainPosition,
  MOUNTAIN_BOUNDS,
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_HELIPAD,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_TRAIL,
  type WorldLocation,
} from "@/game/mountain/model";
import { CityMap } from "./CityMap";
import "./location-map.css";

/** Two travel destinations; shops and checkpoints remain local landmarks. */
export function WorldMap() {
  const [view, setView] = useState<WorldLocation | null>(null);
  const position = useGame((s) => s.playerPos);
  const current = isMountainPosition(position[0], position[2]) ? "mountain" : "city";
  const dungeon = useDungeon((s) => !!s.data?.instance);
  const guideToHelipad = () => {
    if (dungeon || current === "mountain") return;
    useGame.getState().setWaypoint("venue-helicopter");
    useGame.getState().setToast("Ikuti petunjuk ke helipad kota, lalu naik helikopter.");
    useHud.getState().setSheet(null);
  };
  return (
    <section className="location-map" data-map-view={view ?? "world"} aria-label="Dua lokasi dunia">
      {view ? (
        <>
          {view === "city" ? <CityMap /> : <MountainMap current={current} />}
          <button className="location-map-back" onClick={() => setView(null)}>
            <ArrowLeft aria-hidden size={18} /> Dua lokasi
          </button>
        </>
      ) : (
        <>
          <div className="location-map-intro">
            <h3>Pilih petualanganmu</h3>
            <p>Dua lokasi, satu perjalanan dengan helikopter.</p>
          </div>
          <div className="location-map-world">
            <WorldArtwork />
            {(
              [
                ["city", "1", "Pusat Kota", "Toko, taman & aktivitas warga"],
                ["mountain", "2", "Pegunungan", "Basecamp, 4 checkpoint & puncak"],
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
              Helikopter berangkat dari helipad kota dan mendarat di basecamp. Perjalanan tersedia
              pulang-pergi.
            </p>
            {current === "city" ? (
              <button onClick={guideToHelipad} disabled={dungeon}>
                <Navigation aria-hidden size={18} /> Petunjuk ke helipad
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
    <svg className="location-map-art" viewBox="0 0 1000 490" aria-hidden="true">
      <path
        d="M63 303 Q25 206 120 150 Q208 87 332 134 Q449 161 437 275 Q423 390 285 405 Q121 426 63 303Z"
        fill="#d3dfa1"
        stroke="#f5e6bd"
        strokeWidth="15"
      />
      <path
        d="M558 279 Q504 194 574 112 Q647 26 810 65 Q960 96 948 220 Q955 328 832 356 Q661 394 558 279Z"
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
      <path d="M582 250 L672 110 L759 251Z" fill="#6c995f" />
      <path d="M670 251 L776 69 L897 251Z" fill="#497d57" />
      <path d="M776 69 L744 125 L773 112 L803 129Z" fill="#d7e3ba" />
      <path
        d="M735 279 Q857 231 788 207 Q724 187 787 161 Q824 147 777 115"
        fill="none"
        stroke="#edcc91"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path d="M778 77V43 M778 43H806V57H778" stroke="#a44d40" strokeWidth="4" fill="#dd6e54" />
      {[
        [99, 224],
        [365, 302],
        [342, 163],
        [606, 252],
        [864, 268],
        [887, 195],
        [700, 310],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0 0v26" stroke="#7d7251" strokeWidth="6" />
          <path d="M0 -39L-19 8H19Z" fill="#386e54" />
          <path d="M0 -20L-24 20H24Z" fill="#4e8b61" />
        </g>
      ))}
      <g fill="#f9f4d9" stroke="#e2b350" strokeWidth="5">
        <ellipse cx="384" cy="226" rx="28" ry="18" />
        <ellipse cx="596" cy="305" rx="28" ry="18" />
      </g>
      <g fill="#626b58" textAnchor="middle" fontSize="23" fontWeight="800">
        <text x="384" y="234">
          H
        </text>
        <text x="596" y="313">
          H
        </text>
      </g>
      <path
        d="M408 223 C515 139 475 337 571 308"
        fill="none"
        stroke="#fbf8e9"
        strokeWidth="6"
        strokeDasharray="11 9"
      />
      <g transform="translate(490 240) rotate(18)">
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
      <g fill="#f6faf0" opacity=".75">
        <ellipse cx="80" cy="90" rx="54" ry="10" />
        <ellipse cx="444" cy="80" rx="65" ry="10" />
        <ellipse cx="903" cy="368" rx="76" ry="13" />
        <ellipse cx="500" cy="422" rx="64" ry="9" />
      </g>
    </svg>
  );
}

function MountainMap({ current }: { current: WorldLocation }) {
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
        <h3>Pegunungan</h3>
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
        aria-label="Jalur dari helipad basecamp melewati empat checkpoint menuju puncak"
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
