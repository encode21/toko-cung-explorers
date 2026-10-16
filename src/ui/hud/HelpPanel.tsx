import { useTouchControls } from "@/hooks/use-touch";
import { PhoneAppArtwork } from "./PhoneAppArtwork";
import "./help-panel.css";

/** Control guide — warm Play Together panel (Panduan). */
export function HelpPanel() {
  const touch = useTouchControls();
  const rows = touch
    ? [
        { title: "Analog kiri", detail: "Jalan maju, mundur, kiri, dan kanan" },
        {
          title: "Geser kanan layar",
          detail: "Putar kamera; bisa bersamaan dengan analog",
        },
        { title: "Tombol tangan", detail: "Interaksi lewat panel konteks" },
      ]
    : [
        { title: "Klik kanan + geser", detail: "Jalan dan putar arah sekaligus" },
        { title: "WASD · Shift", detail: "Jalan dan lari" },
        { title: "Q / E", detail: "Putar kamera" },
        { title: "F · Esc", detail: "Interaksi dan tutup panel" },
      ];

  return (
    <div className="help-panel" data-help-panel>
      <div className="help-panel-intro">
        <span className="help-panel-badge" aria-hidden="true">
          <PhoneAppArtwork kind="help" />
        </span>
        <div>
          <span>Panduan kontrol</span>
          <strong>{touch ? "Layar sentuh" : "Keyboard & mouse"}</strong>
          <small>Ikuti input yang aktif di perangkatmu</small>
        </div>
      </div>
      <ul className="help-panel-list" aria-label="Daftar kontrol">
        {rows.map((row) => (
          <li key={row.title} className="help-panel-item">
            <span className="help-panel-key">{row.title}</span>
            <p>{row.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
