import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { PrincipalBoard } from "./PrincipalBoard";
import { useDungeon, dungeonCommand } from "@/game/dungeon/store";
import { announceDungeonComplete } from "@/game/dungeon/announce-complete";
import { useHud } from "@/state/hud-store";

/** Transition and completion effects remain mounted independently of the journal. */
export function DungeonHud() {
  const { data, transition } = useDungeon();
  const photoActive = useHud((s) => s.sheet === "camera");
  const previous = useRef<string | undefined>(undefined);
  useEffect(() => {
    const next = data?.instance?.status;
    if (data && previous.current === "ACTIVE" && next === "COMPLETED")
      announceDungeonComplete("ACTIVE", data);
    previous.current = next;
  }, [data]);
  if (photoActive && !transition) return null;
  return (
    <>
      {!photoActive && <PrincipalBoard />}
      {transition && (
        <div
          className="absolute inset-0 z-[70] grid place-items-center bg-world-panel/95 text-world-panel-foreground"
          role="status"
        >
          <span className="flex items-center gap-3">
            <LoaderCircle className="size-5 animate-spin" />
            Menyambungkan area perjalanan…
          </span>
        </div>
      )}
    </>
  );
}
export function DungeonDetails() {
  const { data, busy, error } = useDungeon();
  const [confirm, setConfirm] = useState(false);
  const i = data?.instance,
    c = data?.config;
  useEffect(() => setConfirm(false), [i?.id]);
  if (!c) return <p>Belum ada perjalanan dungeon.</p>;
  const index = c.objectives.findIndex((o, n) => (i?.progress[n] ?? 0) < o.required);
  return (
    <section className="activity-details" aria-label="Detail dungeon">
      <h3>{c.questTitle ?? "Principal Dungeon"}</h3>
      <p>
        {i?.status === "COMPLETED"
          ? "Misi selesai · hadiah diterima"
          : i
            ? c.objectives[index]?.label
            : "Dekati pintu Principal untuk memilih misi."}
      </p>
      {i && (
        <>
          <p>
            {c.objectives.filter((o, n) => (i.progress[n] ?? 0) >= o.required).length}/
            {c.objectives.length} tujuan selesai{i.carrying ? " · Barang misi dibawa" : ""}
          </p>
          <p>{c.objectives[index]?.hint}</p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {i &&
        (confirm ? (
          <div role="group" aria-label="Konfirmasi keluar">
            <p>Keluar sekarang? Progres misi aktif dibatalkan tanpa reward penyelesaian.</p>
            <button
              disabled={busy}
              onClick={async () => {
                await dungeonCommand("exit");
                if (!useDungeon.getState().data?.instance) useHud.getState().setSheet(null);
              }}
            >
              Ya, keluar
            </button>
            <button onClick={() => setConfirm(false)}>Lanjutkan misi</button>
          </div>
        ) : (
          <button
            disabled={busy}
            onClick={async () => {
              if (i.status !== "COMPLETED") {
                setConfirm(true);
                return;
              }
              await dungeonCommand("exit");
              if (!useDungeon.getState().data?.instance) useHud.getState().setSheet(null);
            }}
          >
            {i.status === "COMPLETED" ? "Kembali ke World" : "Keluar Dungeon"}
          </button>
        ))}
      {(c.version ?? 1) >= 2 && (
        <button
          onClick={() => {
            useHud.setState({ sheet: null, principalPanel: "leaderboard" });
          }}
        >
          Peringkat
        </button>
      )}
    </section>
  );
}
