import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import "./hud-balance.css";

const compactNumber = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** The same read-only resource capsule in the world and behind the counter. */
export function HudBalance({
  kind,
  value,
}: {
  kind: "point" | "kas";
  value: number | null | undefined;
}) {
  const label =
    value == null
      ? `${kind === "point" ? "Point" : "Kas usaha"} belum tersedia`
      : kind === "point"
        ? `${value.toLocaleString("id-ID")} Point`
        : `Kas usaha Rp${value.toLocaleString("id-ID")}`;
  return (
    <div
      className="mmo-resource"
      data-hud-resource={kind}
      role="img"
      aria-label={label}
      title={kind === "kas" ? `${label} (simulasi)` : label}
    >
      {kind === "point" ? (
        <PointCoinIcon className="mmo-resource-art" />
      ) : (
        <KasMoneyIcon className="mmo-resource-art" />
      )}
      <span className="mmo-resource-value" aria-hidden="true">
        {value == null ? "—" : `${kind === "kas" ? "Rp" : ""}${compactNumber.format(value)}`}
      </span>
    </div>
  );
}
