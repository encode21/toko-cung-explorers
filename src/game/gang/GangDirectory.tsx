import { useEffect, useState } from "react";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import { useGang, enterGang, clearGang } from "./store";
import { gangText, homeAddress, type GangData, type GangDirectory as Directory } from "./model";
import "./gang.css";

export function VisitHomeButton({
  playerId,
  onVisit,
}: {
  playerId: string | undefined;
  onVisit: () => void;
}) {
  const data = useGang((s) => s.data),
    busy = useGang((s) => s.busy);
  if (!data || !playerId) return null;
  return (
    <GameButton
      disabled={busy}
      onClick={() => {
        onVisit();
        void enterGang(undefined, { playerId });
      }}
    >
      {data.text["visit_home"]}
    </GameButton>
  );
}
export function GangDirectory({ data }: { data: GangData }) {
  const [draft, setDraft] = useState(""),
    [search, setSearch] = useState(""),
    [openOnly, setOpenOnly] = useState(false),
    [page, setPage] = useState(1);
  const [result, setResult] = useState<Directory | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const busy = useGang((s) => s.busy),
    visitError = useGang((s) => s.error);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void worldRequest<Directory | { enabled: false }>("gang", {
      action: "directory",
      requestId: createId(),
      search,
      openOnly,
      page,
    })
      .then((r) => {
        if (!active) return;
        if (!r.enabled) clearGang();
        else setResult(r);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, openOnly, page]);
  return (
    <GameModal
      title={data.text["directory"]!}
      subtitle="Temukan rumah dan warung warga"
      className="game-light gang-directory-modal"
      onClose={() => useGang.setState({ board: false })}
      footer={
        <div className="gang-directory-pagination">
          <GameButton
            className="game-button-soft"
            disabled={loading || page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {data.text["previous"]}
          </GameButton>
          <span aria-live="polite">Halaman {page}</span>
          <GameButton
            className="game-button-soft"
            disabled={loading || !result?.hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            {data.text["next"]}
          </GameButton>
        </div>
      }
    >
      <div className="gang-directory">
        <div className="game-light-card">
          <span className="game-light-icon" aria-hidden>
            🏡
          </span>
          <div>
            <strong>Rumahmu</strong>
            <small>{homeAddress(data)}</small>
          </div>
          <GameButton disabled={busy} onClick={() => void enterGang()}>
            {data.text["go_home"]}
          </GameButton>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(draft.trim());
            setPage(1);
          }}
        >
          <input
            aria-label={data.text["search"]}
            placeholder={data.text["search"]}
            maxLength={80}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <GameButton type="submit" aria-label={data.text["search"]}>
            Cari
          </GameButton>
        </form>
        <div className="gang-directory-filters">
          <GameButton
            className="game-button-soft"
            aria-pressed={!openOnly}
            onClick={() => {
              setOpenOnly(false);
              setPage(1);
            }}
          >
            {data.text["all_houses"]}
          </GameButton>
          <GameButton
            className="game-button-soft"
            aria-pressed={openOnly}
            onClick={() => {
              setOpenOnly(true);
              setPage(1);
            }}
          >
            {data.text["open_now"]}
          </GameButton>
        </div>
        <div className="gang-directory-heading">
          <h3 className="game-light-heading">{data.text["all_gangs"]}</h3>
          <small>{data.text["directory_order"]}</small>
        </div>
        <div className="gang-directory-gangs">
          {result?.gangs.map((g) => (
            <GameButton
              key={g}
              className="game-button-soft"
              disabled={busy}
              onClick={() => void enterGang(undefined, { gang: g })}
            >
              {gangText(data, "gang", { gang: g })}
            </GameButton>
          ))}
        </div>
        {loading && <p role="status">Memuat daftar warga…</p>}
        <div className="game-light-grid" aria-busy={loading}>
          {result?.people.map((p) => (
            <div className="game-light-card gang-directory-person" key={p.playerId}>
              <div>
                <strong>{p.name}</strong>
                <span>
                  {p.warungName && `${p.warungName} · `}
                  {gangText(data, "address", { gang: p.gang, house: p.house })}
                </span>
                {p.inactive && <small>{data.text["inactive_shop"]}</small>}
              </div>
              <VisitHomeButton playerId={p.playerId} onVisit={() => {}} />
            </div>
          ))}
        </div>
        {!loading && result?.people.length === 0 && <p>{data.text["no_results"]}</p>}
        {(error || visitError) && <p role="alert">{error || visitError}</p>}
      </div>
    </GameModal>
  );
}
