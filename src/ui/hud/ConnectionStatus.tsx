import { useChannels } from "@/net/channel-store";
import { reconnectWorldChannel } from "@/net/useWorldChannel";
import { useNet } from "@/net/net-store";
export function ConnectionStatus() {
  const lease = useChannels((s) => s.lease);
  const busy = useChannels((s) => s.busy);
  const connected = useNet((s) => s.connected);
  const error = useNet((s) => s.connectionError);
  if (!lease || connected) return null;
  return (
    <div
      role="status"
      data-hud-control
      className="absolute left-1/2 top-20 z-40 w-[min(90vw,28rem)] -translate-x-1/2 rounded-xl bg-world-panel p-3 text-sm text-world-panel-foreground shadow-lg"
    >
      <p>{error || "Menyambungkan multiplayer…"}</p>
      <p className="mt-1 text-xs text-world-muted">
        Kendaraan dan pemain lain menunggu koneksi channel.
      </p>
      {error && (
        <button disabled={busy} className="mt-2 min-h-11 underline" onClick={reconnectWorldChannel}>
          Sambungkan ulang
        </button>
      )}
    </div>
  );
}
