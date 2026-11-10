import { useEffect, useState } from "react";
import { Flag, Trophy, X } from "lucide-react";
import { useMinigames, miniCommand, miniNow } from "@/game/minigames/store";
import { BADGE_NAMES, MINI_NAMES, inMiniArena } from "@/game/minigames/model";
import { connectionId } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import { useMobility, mobilityAvailable } from "@/game/mobility/store";
import { useGame } from "@/state/game-store";
import { isMountainPosition } from "@/game/mountain/model";
import { GameButton } from "@/ui/game-ui/GamePanel";
import "./minigames-hud.css";
export function MinigamesHud() {
  const s = useMinigames(),
    roster = useNet((v) => v.roster),
    near = useGame((v) => inMiniArena(v.playerPos));
  const mobility = useMobility();
  const mountain = useGame((v) => isMountainPosition(v.playerPos[0], v.playerPos[2]));
  const [, refresh] = useState(0),
    [dismissed, dismiss] = useState("");
  useEffect(() => {
    const t = setInterval(() => refresh((v) => v + 1), 500);
    return () => clearInterval(t);
  }, []);
  const r = s.round,
    schedule = s.schedule;
  if (
    mountain ||
    !schedule ||
    mobility.flying ||
    mobility.carries.length ||
    mobility.vehicles?.some((v) => v.occupants.some((p) => p.connectionId === connectionId))
  )
    return null;
  const own = r?.players.find((p) => p.connectionId === connectionId && !p.left);
  if (!own && (dismissed === schedule.id || !mobilityAvailable())) return null;
  const name = (id: string) =>
    id === connectionId ? "Kamu" : (roster.find((p) => p.id === id)?.name ?? "Pemain");
  const done = r?.phase === "finished" || r?.phase === "cancelled";
  const seconds = r ? Math.max(0, Math.ceil((r.deadline - miniNow()) / 1000)) : 0;
  const count = r?.players.filter((p) => !p.left).length ?? 0;
  return (
    <section className="minigames-hud" data-hud-control aria-label="Permainan alun-alun">
      <header>
        <Flag size={17} />
        <strong>{MINI_NAMES[schedule.game]}</strong>
        <span>
          {r?.phase === "countdown"
            ? `Mulai ${seconds}s`
            : r?.phase === "running"
              ? `${seconds}s`
              : done
                ? "Hasil ronde"
                : `${count}/8 pemain`}
        </span>
        {!own && (
          <button aria-label="Tutup info alun-alun" onClick={() => dismiss(schedule.id)}>
            <X size={16} />
          </button>
        )}
      </header>
      {!r && (
        <p>
          Mulai{" "}
          {new Date(schedule.startsAt).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta",
          })}{" "}
          WIB · panggung alun-alun.
        </p>
      )}
      {r &&
        (!own ? (
          <p>
            {near
              ? "Gabung bersama teman. Minimal 2 pemain."
              : "Datang ke panggung alun-alun di distrik Pasar."}
          </p>
        ) : (
          <>
            {r.phase === "lobby" && <p>Menunggu teman · minimal 2 pemain untuk mulai.</p>}
            {r.phase === "countdown" && (
              <p>
                Bersiap!{" "}
                {r.game === "QUIZ"
                  ? "Lari ke sisi B atau S saat soal muncul."
                  : r.game === "SACK"
                    ? "Space / tombol Lompat untuk maju."
                    : "Dekati ayam, lalu tekan F / Tangkap."}
              </p>
            )}
            {r.phase === "running" && (
              <p>
                {r.game === "QUIZ"
                  ? `${r.question + 1}/5 · ${r.prompt}`
                  : r.game === "SACK"
                    ? "Lompat sampai garis finis! Space / Lompat."
                    : "Dekati ayam lalu F / Tangkap. Kumpulkan sebanyak mungkin!"}
              </p>
            )}
            {own.eliminated && (
              <p className="minigames-muted">Kamu tersingkir. Tonton teman sampai ronde selesai.</p>
            )}
          </>
        ))}
      {r?.game === "QUIZ" && r.phase === "running" && own && (
        <div className="minigames-zones">
          <span>B · BENAR (barat)</span>
          <span>S · SALAH (timur)</span>
        </div>
      )}
      {r?.phase === "cancelled" && <p>Ronde dibatalkan: pemain aktif kurang dari dua.</p>}
      {r?.phase === "finished" && (
        <p>
          <Trophy size={15} />{" "}
          {r.winners.length ? r.winners.map(name).join(", ") + " menang!" : "Belum ada pemenang."}
          {r.winners.includes(connectionId) && (
            <strong className="minigames-reward">
              Badge tersimpan: {BADGE_NAMES[`alun-${r.game.toLowerCase()}-winner`]}
            </strong>
          )}
        </p>
      )}
      {r && own && (
        <ol className="minigames-scores">
          {[...r.players]
            .sort((a, b) => b.score - a.score)
            .map((p) => (
              <li key={p.connectionId}>
                <span>
                  {name(p.connectionId)}
                  {p.left ? " · keluar" : p.eliminated ? " · gugur" : ""}
                </span>
                <b>
                  {p.score}
                  {r.game === "SACK" ? "/12" : ""}
                </b>
              </li>
            ))}
        </ol>
      )}
      <footer>
        {!own && near && r && ["lobby", "countdown"].includes(r.phase) && (
          <GameButton disabled={s.busy} onClick={() => void miniCommand("join")}>
            Gabung ronde
          </GameButton>
        )}
        {own && !done && (
          <GameButton disabled={s.busy} onClick={() => void miniCommand("leave")}>
            Keluar ronde
          </GameButton>
        )}
        {done && own && (
          <GameButton
            onClick={() => {
              void miniCommand("leave");
              dismiss(schedule.id);
            }}
          >
            Selesai
          </GameButton>
        )}
        <small title={s.badges.map((b) => BADGE_NAMES[b]).join(", ")}>
          Hadiah badge · {s.badges.length} terkumpul
        </small>
      </footer>
    </section>
  );
}
