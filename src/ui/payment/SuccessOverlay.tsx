import { formatIdr } from "@/commerce/products/catalog";
import { useGame } from "@/state/game-store";
import { OverlayShell } from "@/ui/OverlayShell";

export function SuccessOverlay() {
  const order = useGame((s) => s.order);
  const close = useGame((s) => s.closeOverlay);
  if (!order) return null;

  return (
    <OverlayShell
      title="Pembayaran berhasil"
      subtitle="Terima kasih sudah belanja di Toko Cung"
      footer={
        <button
          type="button"
          onClick={close}
          className="w-full rounded-lg bg-world-accent px-5 py-3 font-semibold text-world-accent-foreground transition hover:brightness-110"
        >
          Kembali jalan-jalan
        </button>
      }
    >
      <div className="rounded-lg border border-world-outline p-4">
        <p className="text-world-muted text-xs uppercase tracking-widest">Struk</p>
        <p className="font-display text-3xl tracking-wide">{formatIdr(order.total)}</p>
        <p className="mt-1 text-sm">
          {order.id} · {order.method} ·{" "}
          {new Date(order.paidAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="mt-3 text-world-muted text-sm">
          Barangmu sudah dibungkus nakama packing. Silakan lanjut menjelajah atau mampir ke gudang.
        </p>
      </div>
    </OverlayShell>
  );
}
