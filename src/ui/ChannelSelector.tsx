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
    <section aria-label="Pilih channel" className="channel-selector">
      <p className="adventure-eyebrow">02 / Pilih tempat bertemu</p>
      <h2 className="mt-3 font-display text-4xl">PILIH CHANNEL</h2>
      <p className="mt-2 text-sm leading-6 text-world-muted">
        Dunia yang sama, teman baru. Progresmu ikut ke mana pun kamu pergi.
      </p>
      {!channels.length && listing ? (
        <AdventureSkeleton label="Mencari channel…" />
      ) : (
        <div className="channel-list my-6 space-y-3">
          {channels.map((c) => (
            <button
              key={c.id}
              aria-pressed={selected === c.id}
              disabled={busy || c.occupied >= c.capacity}
              onClick={() => setSelected(c.id)}
              className={`flex min-h-20 w-full items-center gap-4 rounded-xl border p-4 text-left transition active:scale-[.99] disabled:opacity-50 ${selected === c.id ? "border-world-brand bg-world-brand/15" : "border-world-outline bg-black/15 hover:border-world-accent/60"}`}
            >
              <Radio className={selected === c.id ? "text-world-accent" : "text-world-muted"} />
              <span className="flex-1">
                <strong className="block">{c.id.replace("-", " ")}</strong>
                <span className="text-xs text-world-muted">
                  {c.occupied >= c.capacity
                    ? "Penuh · pilih channel lain"
                    : "Terbuka untuk petualangan"}
                </span>
              </span>
              <span className="flex items-center gap-2 text-sm">
                <Users className="size-4" />
                {c.occupied}/{c.capacity}
              </span>
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="channel-actions flex flex-wrap gap-3">
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
