import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMissions } from "@/game/missions/store";
import { DEFINITIONS } from "@/game/missions/model";
import { requestMission } from "@/game/missions/runtime";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";
import { useHud } from "@/state/hud-store";
import { useTouchDrive } from "@/game/player/touch-drive";

/** Optional mission region; no overlay or keyboard-only mission controls. */
export function MissionTracker() {
  const { session, available, pending, ready, error } = useMissions();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const expanded = useHud((s) => s.tracker === "mission");
  const toggleTracker = useHud((s) => s.toggleTracker);
  const { touch } = useMobileHudLayout();
  const moving = useTouchDrive((s) => s.active);
  const active = session.active;

  useEffect(() => {
    if (!touch || !moving || !expanded) return;
    useHud.setState({ tracker: null });
  }, [touch, moving, expanded]);

  if (!active && !available.length && !error) return null;

  const compact = !expanded;

  return (
    <section
      data-hud-control
      data-ui-panel
      aria-label="Misi opsional"
      className={`mmo-tracker ${compact ? "" : "mmo-tracker-expanded"}`}
    >
      {compact ? (
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-2 text-left"
          aria-expanded={false}
          onClick={() => toggleTracker("mission")}
        >
          <span className="min-w-0 flex-1">
            <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-widest text-world-muted">
              Misi
            </span>
            {active ? (
              <>
                <strong className="block truncate leading-tight">
                  {DEFINITIONS[active.type].title}
                </strong>
                <span className="mt-0.5 block truncate text-[11px] text-world-muted">
                  {active.progress} / {DEFINITIONS[active.type].target}
                  {active.carrying ? " · Bawa paket" : ""}
                </span>
              </>
            ) : (
              <span className="block text-[11px] text-world-muted">
                {available.length} misi tersedia
              </span>
            )}
          </span>
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-world-muted" aria-hidden />
        </button>
      ) : (
        <>
          {expanded && (
            <div className="mb-1 flex justify-end">
              <button
                type="button"
                aria-label="Ciutkan misi"
                className="grid size-9 place-items-center rounded-lg text-world-muted"
                onClick={() => toggleTracker("mission")}
              >
                <ChevronUp className="size-4" />
              </button>
            </div>
          )}
          {active ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <strong>{DEFINITIONS[active.type].title}</strong>
                <span>
                  {active.progress} / {DEFINITIONS[active.type].target}
                </span>
              </div>
              <div className="mt-1 text-world-muted">
                {active.carrying
                  ? "Bawa paket ke meja packing"
                  : DEFINITIONS[active.type].objective}
              </div>
              <div className="mt-1 text-[10px] text-world-muted">
                {active.type === "STORE_RUSH_HELP_CASHIER"
                  ? "Dekati sisi depan kasir"
                  : active.carrying
                    ? "Meja packing di tengah gudang"
                    : "Ambil paket dari tumpukan kiri gudang"}
              </div>
              {active.sourceEndedAt !== null && (
                <div className="mt-1">Event selesai · waktu tambahan untuk menuntaskan misi.</div>
              )}
              <div className="mt-2 flex items-center gap-2">
                {confirmCancel ? (
                  <>
                    <button
                      disabled={pending}
                      onClick={() => {
                        requestMission("cancel");
                        setConfirmCancel(false);
                      }}
                      className="min-h-8 underline"
                    >
                      Ya, batalkan
                    </button>
                    <button onClick={() => setConfirmCancel(false)} className="min-h-8">
                      Lanjutkan misi
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="min-h-8 text-world-muted underline"
                  >
                    Batalkan Misi
                  </button>
                )}
                {pending && <span role="status">Memproses…</span>}
              </div>
              {!!available.length && (
                <div className="border-t border-world-outline pt-1 text-[10px]">
                  {available.map((o) => DEFINITIONS[o.type].title).join(" · ")} tersedia. Tuntaskan
                  misi aktif terlebih dahulu.
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-world-muted">
                Bantuan opsional · Kontribusi +1
              </div>
              {available.map((offer) => (
                <div
                  key={offer.sourceEventId}
                  className="flex items-center justify-between gap-2 py-1"
                >
                  <div>
                    <strong>
                      {offer.type === "STORE_RUSH_HELP_CASHIER"
                        ? "🔥 Bantu Kasir"
                        : "📦 Bantu Gudang"}
                    </strong>
                    <div className="text-[10px] text-world-muted">
                      {offer.type === "STORE_RUSH_HELP_CASHIER"
                        ? "Toko ramai · proses 5 item"
                        : "Gudang sibuk · antar 3 paket"}
                    </div>
                  </div>
                  <button
                    disabled={pending || !ready}
                    onClick={() => {
                      setConfirmCancel(false);
                      requestMission("accept", offer.sourceEventId);
                    }}
                    aria-label={`Ambil Misi ${DEFINITIONS[offer.type].title}`}
                    className="min-h-10 shrink-0 rounded-lg bg-world-accent px-2 text-world-accent-foreground disabled:opacity-50"
                  >
                    Ambil Misi
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      )}
      {!ready && !compact && <div className="mt-1 text-world-muted">Menunggu koneksi dunia…</div>}
      {error && (
        <div role="status" className="mt-1 text-world-muted">
          {error}
        </div>
      )}
    </section>
  );
}
