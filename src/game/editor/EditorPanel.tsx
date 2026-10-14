import { GameDropdown } from "@/ui/game-ui/GameDropdown";
import { useEffect, useState } from "react";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";
import { categories, useWorldEditor, type WorldTarget, type Vector } from "./store";
const names = {
  POI: "POI",
  WORLD_OBJECT: "Quest Target",
  NPC: "NPC Spawn",
  CLUE: "Clue",
  TRIGGER: "Trigger Zone",
  TELEPORT: "Teleport",
  SPAWN: "Spawn Point",
  DUNGEON: "Dungeon Entrance",
  CLUB_ENTRANCE: "Club Entrance / Exit",
  DJ_BOOTH: "DJ Booth",
  DANCE_ZONE: "Dance Zone",
  MUSIC_SCREEN: "Music Screen",
  CLUB_SPAWN: "Club Spawn",
  LIGHT_CONTROLLER: "Light Controller",
};
export function EditorPanel({ dungeon }: { dungeon: boolean }) {
  const s = useWorldEditor(),
    [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mobile } = useMobileHudLayout();
  const dirty = JSON.stringify(s.targets) !== s.saved;
  useEffect(() => {
    void s.load();
    return () => {
      useWorldEditor.setState({
        mode: "PLAYER",
        canEdit: false,
        loaded: false,
        saved: "[]",
        targets: [],
        past: [],
        future: [],
      });
    };
  }, []);
  useEffect(() => {
    if (s.loaded && s.canEdit && new URLSearchParams(location.search).get("mode") === "editor")
      useWorldEditor.setState({ mode: "EDITOR" });
  }, [s.loaded, s.canEdit]);
  useEffect(() => {
    if (dungeon) useWorldEditor.setState({ mode: "PLAYER" });
  }, [dungeon]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  if (!s.canEdit || dungeon) return null;
  const selected = s.targets.find((t) => t.id === s.selected);
  const patch = (p: Partial<WorldTarget>) => {
    if (selected) s.update(selected.id, p);
  };
  // Mobile: collapse bloated PLAYER/DEBUG/EDITOR strip unless Dev is opened.
  if (mobile && s.mode === "PLAYER" && !mobileOpen) {
    return (
      <button
        type="button"
        data-ui-panel
        className="pointer-events-auto absolute left-2 top-2 z-[60] rounded-lg border border-white/20 bg-slate-950/90 px-2 py-1 text-[10px] text-white/80"
        aria-label="Open world developer tools"
        onClick={() => setMobileOpen(true)}
      >
        Dev
      </button>
    );
  }
  return (
    <section
      data-ui-panel
      className={`absolute z-[60] max-h-[94dvh] overflow-y-auto rounded-xl border border-white/20 bg-slate-950/95 p-3 text-xs text-white shadow-xl ${
        mobile ? "left-2 top-2 w-[min(18rem,calc(100vw-1rem))]" : "left-3 top-3 w-80"
      }`}
      aria-label="World developer tools"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {(["PLAYER", "DEBUG", "EDITOR"] as const).map((mode) => (
            <button
              key={mode}
              className={`rounded p-2 ${s.mode === mode ? "bg-cyan-700" : "bg-slate-800"}`}
              onClick={() => {
                useWorldEditor.setState({ mode });
                if (mobile && mode === "PLAYER") setMobileOpen(false);
              }}
            >
              {mobile ? mode.slice(0, 3) : `${mode} MODE`}
            </button>
          ))}
        </div>
        {mobile && (
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-1"
            aria-label="Close developer tools"
            onClick={() => {
              useWorldEditor.setState({ mode: "PLAYER" });
              setMobileOpen(false);
            }}
          >
            ✕
          </button>
        )}
      </div>
      {s.mode !== "PLAYER" && (
        <>
          <p className="my-3">World Dev Mode · {dirty ? "Unsaved changes" : "Saved"}</p>
          {s.mode === "EDITOR" && (
            <fieldset disabled={s.busy} className="space-y-3">
              <div className="flex flex-wrap gap-1">
                <button
                  className="rounded bg-slate-700 p-2"
                  onClick={() => useWorldEditor.setState({ tool: "select" })}
                >
                  Select
                </button>
                {categories.map((type) => (
                  <button
                    key={type}
                    className={`rounded p-2 ${s.tool === type ? "bg-cyan-700" : "bg-slate-800"}`}
                    onClick={() => useWorldEditor.setState({ tool: type })}
                  >
                    Create {names[type]}
                  </button>
                ))}
              </div>
              <p>
                {s.tool !== "select"
                  ? "Click a floor, terrain or object to place the target."
                  : "Select a marker or registry entry. Drag to orbit; right-drag to pan; scroll to zoom."}
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["translate", "Move"],
                    ["rotate", "Rotate"],
                    ["scale", "Scale"],
                  ] as const
                ).map(([transform, label]) => (
                  <button
                    key={transform}
                    onClick={() => useWorldEditor.setState({ transform })}
                    className={s.transform === transform ? "text-cyan-300" : ""}
                  >
                    {label}
                  </button>
                ))}
                <button disabled={!selected} onClick={s.duplicate}>
                  Duplicate
                </button>
                <button disabled={!selected} onClick={s.remove}>
                  Delete
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => void s.save()} disabled={!dirty}>
                  Save
                </button>
                <button onClick={s.undo} disabled={!s.past.length}>
                  Undo
                </button>
                <button onClick={s.redo} disabled={!s.future.length}>
                  Redo
                </button>
                <button
                  onClick={() => {
                    if (!dirty || window.confirm("Discard unsaved changes and reload?"))
                      void s.load();
                  }}
                >
                  Reload
                </button>
              </div>
            </fieldset>
          )}
          {s.error && (
            <p role="alert" className="my-2 text-red-300">
              {s.error}
            </p>
          )}
          <details className="my-3">
            <summary>Visualization</summary>
            <div className="grid grid-cols-2 gap-2 py-2">
              {Object.entries(s.show).map(([key, value]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      useWorldEditor.setState({ show: { ...s.show, [key]: e.target.checked } })
                    }
                  />{" "}
                  Show{" "}
                  {(
                    {
                      POI: "POIs",
                      WORLD_OBJECT: "Quest Targets",
                      TRIGGER: "Trigger Zones",
                      SPAWN: "Spawn Points",
                      npcIds: "NPC IDs",
                      objectIds: "object IDs",
                    } as Record<string, string>
                  )[key] ?? key}
                </label>
              ))}
            </div>
          </details>
          <label className="block">
            World Target Registry
            <input
              className="my-2 w-full rounded bg-slate-800 p-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, type or tags"
            />
          </label>
          <div className="max-h-36 overflow-auto">
            {s.targets
              .filter((t) =>
                `${t.name} ${t.id} ${t.type} ${t.tags.join(" ")}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((t) => (
                <button
                  key={t.id}
                  className="block w-full truncate p-2 text-left hover:bg-slate-800"
                  onClick={() => useWorldEditor.setState({ selected: t.id })}
                >
                  {t.name} · {t.type}
                </button>
              ))}
          </div>
          {selected && s.mode === "EDITOR" && (
            <fieldset disabled={s.busy} className="mt-3 space-y-2 border-t border-white/20 pt-3">
              <legend>Properties</legend>
              <label className="block">
                Name
                <input
                  className="w-full bg-slate-800 p-2"
                  value={selected.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </label>
              <label className="block">
                ID
                <input className="w-full bg-slate-800 p-2" readOnly value={selected.id} />
              </label>
              <label className="block">
                Type
                <GameDropdown
                  className="w-full bg-slate-800 p-2"
                  value={selected.type}
                  onValueChange={(value) => patch({ type: value as WorldTarget["type"] })}
                >
                  {categories.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </GameDropdown>
              </label>
              <p>Scene: {selected.scene}</p>
              {(["position", "rotation", "scale"] as const).map((vector) => (
                <div key={vector}>
                  {vector}
                  {vector === "rotation" ? " (radians)" : ""}
                  <div className="flex gap-1">
                    {(["x", "y", "z"] as const).map((axis) => (
                      <label key={axis} className="min-w-0 flex-1">
                        {axis}
                        <input
                          className="w-full bg-slate-800 p-1"
                          type="number"
                          step="0.1"
                          value={selected[vector][axis]}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber;
                            if (Number.isFinite(n))
                              patch({ [vector]: { ...selected[vector], [axis]: n } as Vector });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <label className="block">
                Radius (metres)
                <input
                  className="w-full bg-slate-800 p-2"
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.1"
                  value={selected.radius}
                  onChange={(e) => {
                    if (Number.isFinite(e.target.valueAsNumber))
                      patch({ radius: e.target.valueAsNumber });
                  }}
                />
              </label>
              <label className="block">
                Entity ID (moving NPC / existing object)
                <input
                  className="w-full bg-slate-800 p-2"
                  value={selected.entityId ?? ""}
                  onChange={(e) => patch({ entityId: e.target.value })}
                />
              </label>
              <label className="block">
                Interaction type
                <GameDropdown
                  className="w-full bg-slate-800 p-2"
                  value={selected.interactionType}
                  onValueChange={(value) => patch({ interactionType: value })}
                >
                  {[
                    "VISIT",
                    "INTERACT",
                    "TALK",
                    "FIND",
                    "COLLECT",
                    "DELIVER",
                    "SCAN",
                    "EXPLORE",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </GameDropdown>
              </label>
              <label className="block">
                Tags (comma separated)
                <input
                  className="w-full bg-slate-800 p-2"
                  value={selected.tags.join(",")}
                  onChange={(e) => patch({ tags: e.target.value.split(",").map((t) => t.trim()) })}
                />
              </label>
              <label className="block">
                <input
                  type="checkbox"
                  checked={selected.active}
                  onChange={(e) => patch({ active: e.target.checked })}
                />{" "}
                Active
              </label>
              <button
                className="rounded bg-cyan-700 p-2"
                onClick={async () => {
                  if ((!dirty || (await s.save())) && s.cmsUrl)
                    window.location.assign(
                      `${s.cmsUrl}?targetId=${encodeURIComponent(selected.id)}`,
                    );
                }}
              >
                Use as Quest Target
              </button>
            </fieldset>
          )}
        </>
      )}
    </section>
  );
}
