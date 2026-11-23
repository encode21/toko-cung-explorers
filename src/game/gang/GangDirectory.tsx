import { useEffect, useState } from "react";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import { useGang, enterGang, clearGang } from "./store";
import { gangText, homeAddress, type GangData, type GangDirectory as Directory } from "./model";

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
      subtitle={homeAddress(data)}
      onClose={() => useGang.setState({ board: false })}
    >
      <div className="gang-directory">
        <GameButton disabled={busy} onClick={() => void enterGang()}>
          {data.text["go_home"]}
        </GameButton>
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
          <GameButton type="submit">{data.text["search"]}</GameButton>
        </form>
        <div className="gang-directory-filters">
          <GameButton
            aria-pressed={!openOnly}
            onClick={() => {
              setOpenOnly(false);
              setPage(1);
            }}
          >
            {data.text["all_houses"]}
          </GameButton>
          <GameButton
            aria-pressed={openOnly}
            onClick={() => {
              setOpenOnly(true);
              setPage(1);
            }}
          >
            {data.text["open_now"]}
          </GameButton>
        </div>
        <h3>{data.text["all_gangs"]}</h3>
        <small>{data.text["directory_order"]}</small>
        <div className="gang-directory-filters">
          {result?.gangs.map((g) => (
            <GameButton
              key={g}
              disabled={busy}
              onClick={() => void enterGang(undefined, { gang: g })}
            >
              {gangText(data, "gang", { gang: g })}
            </GameButton>
          ))}
        </div>
        <div aria-busy={loading}>
          {result?.people.map((p) => (
            <div className="gang-directory-person" key={p.playerId}>
              <div>
                <strong>{p.name}</strong>
                <span>
                  {p.warungName} · {gangText(data, "address", { gang: p.gang, house: p.house })}
                </span>
                {p.inactive && <small>{data.text["inactive_shop"]}</small>}
              </div>
              <VisitHomeButton playerId={p.playerId} onVisit={() => {}} />
            </div>
          ))}
        </div>
        {!loading && result?.people.length === 0 && <p>{data.text["no_results"]}</p>}
        {(error || visitError) && <p role="alert">{error || visitError}</p>}
        <div className="gang-directory-filters">
          <GameButton disabled={loading || page === 1} onClick={() => setPage((p) => p - 1)}>
            {data.text["previous"]}
          </GameButton>
          <span>{page}</span>
          <GameButton disabled={loading || !result?.hasMore} onClick={() => setPage((p) => p + 1)}>
            {data.text["next"]}
          </GameButton>
        </div>
      </div>
    </GameModal>
  );
}
