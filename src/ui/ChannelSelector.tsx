import { useEffect, useState } from "react";
import { RefreshCw, Users, Radio } from "lucide-react";
import { useChannels, listChannels, joinChannel } from "@/net/channel-store";
import { ActionButton, AdventureSkeleton } from "@/ui/adventure/ActionButton";

export function ChannelSelector() {
  const channels = useChannels((s) => s.channels);
  const busy = useChannels((s) => s.busy);
  const listing = useChannels((s) => s.listing);
  const error = useChannels((s) => s.error);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    // Recover from a stuck listing lock left by dungeon resume / handoff races.
    useChannels.setState({ listing: false });
    void listChannels();
    const timer = setInterval(() => void listChannels(), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selected) return;
    const open = channels.find((c) => c.occupied < c.capacity);
    if (open) setSelected(open.id);
  }, [channels, selected]);

  const chosen = channels.find((c) => c.id === selected);

  return (
    <section className="channel-selector" aria-label="Pilih channel">
      <div className="channel-heading">
        <h2>Pilih Channel</h2>
        <p className="channel-lede">Satu dunia · Progres ikut ke mana pun kamu pergi</p>
      </div>
      {!channels.length && listing ? (
        <AdventureSkeleton label="Mencari channel…" />
      ) : (
        <div className="channel-list" role="listbox" aria-label="Daftar channel">
          {channels.map((c) => {
            const active = selected === c.id;
            const full = c.occupied >= c.capacity;
            const fill = Math.min(100, Math.round((c.occupied / Math.max(1, c.capacity)) * 100));
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={active}
                aria-pressed={active}
                disabled={busy || full}
                onClick={() => setSelected(c.id)}
                className={active ? "is-selected" : undefined}
                data-full={full || undefined}
              >
                <span className="channel-icon" aria-hidden>
                  <Radio />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <strong className="block truncate">{c.id.replace("-", " ")}</strong>
                  <span className="channel-meta">
                    {full ? "Penuh · pilih channel lain" : "Siap petualangan"}
                  </span>
                  <span className="channel-fill" aria-hidden>
                    <span style={{ width: `${fill}%` }} />
                  </span>
                </span>
                <span className="channel-count">
                  <Users aria-hidden />
                  {c.occupied}/{c.capacity}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="channel-error">
          {error}
        </p>
      )}
      <div className="channel-actions">
        <ActionButton
          busy={busy}
          busyLabel="Bergabung…"
          disabled={!chosen || chosen.occupied >= chosen.capacity}
          onClick={() => void joinChannel(selected)}
        >
          Masuk Dunia
        </ActionButton>
        <button
          type="button"
          className="channel-refresh"
          aria-label="Segarkan daftar channel"
          disabled={busy || listing}
          aria-busy={listing}
          onClick={() => {
            useChannels.setState({ error: "" });
            void listChannels();
          }}
        >
          <RefreshCw
            aria-hidden
            className={listing ? "size-5 animate-spin motion-reduce:animate-none" : "size-5"}
          />
        </button>
      </div>
    </section>
  );
}
