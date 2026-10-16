import { useEffect, useState } from "react";
import { Users, Radio } from "lucide-react";
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
  const chosen = channels.find((c) => c.id === selected);
  return (
    <section className="channel-selector" aria-label="Pilih channel">
      <h2>Pilih channel</h2>
      <p className="channel-lede">
        Dunia yang sama, teman baru. Progresmu ikut ke mana pun kamu pergi.
      </p>
      {!channels.length && listing ? (
        <AdventureSkeleton label="Mencari channel…" />
      ) : (
        <div className="channel-list" role="listbox" aria-label="Daftar channel">
          {channels.map((c) => {
            const active = selected === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={active}
                aria-pressed={active}
                disabled={busy || c.occupied >= c.capacity}
                onClick={() => setSelected(c.id)}
                className={active ? "is-selected" : undefined}
              >
                <Radio aria-hidden className={active ? "text-[#ffa415]" : "text-[#5f7d86]"} />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{c.id.replace("-", " ")}</strong>
                  <span className="channel-meta">
                    {c.occupied >= c.capacity
                      ? "Penuh · pilih channel lain"
                      : "Terbuka untuk petualangan"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold tabular-nums">
                  <Users className="size-4" aria-hidden />
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
        <ActionButton
          className="adventure-secondary"
          busy={listing}
          busyLabel="Memuat…"
          disabled={busy}
          onClick={() => {
            useChannels.setState({ error: "" });
            void listChannels();
          }}
        >
          Segarkan
        </ActionButton>
      </div>
    </section>
  );
}
