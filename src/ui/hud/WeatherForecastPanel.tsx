import { useEffect, useState } from "react";
import { Clock3, CloudRain, MapPin, Sun, Waves } from "lucide-react";
import { buildWeatherTimeline } from "@/game/weather/timeline";
import { GameModal, type PanelProps } from "@/ui/game-ui/GamePanel";
import { useHud } from "@/state/hud-store";
import { useTravelScene } from "./travel-loader";
import "./weather-forecast.css";

const conditions = {
  clear: { label: "Cerah", icon: Sun },
  rain: { label: "Hujan", icon: CloudRain },
  flood: { label: "Banjir", icon: Waves },
} as const;

const jakartaTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function WeatherForecastPanel({ onCloseAutoFocus }: Pick<PanelProps, "onCloseAutoFocus">) {
  const [now, setNow] = useState(Date.now);
  const art = useTravelScene((s) => s.mounted?.art);
  const active =
    art === "gang" || art === "rumah"
      ? "gang"
      : art === "gunung"
        ? "mountain"
        : !art || art === "kota"
          ? "city"
          : null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const { start, end, ticks, rows } = buildWeatherTimeline(now);
  const percent = (time: number) => ((time - start) / (end - start)) * 100;
  const nowPosition = percent(now) + "%";

  return (
    <GameModal
      title="Ramalan cuaca"
      className="game-weather-sheet"
      bodyClassName="weather-forecast-body"
      onClose={() => useHud.getState().setSheet(null)}
      {...(onCloseAutoFocus ? { onCloseAutoFocus } : {})}
      headerAccessory={
        <time className="weather-header-time" dateTime={new Date(now).toISOString()}>
          <Clock3 size={15} aria-hidden />
          {jakartaTime.format(now)} WIB
        </time>
      }
    >
      <section className="weather-timeline" tabIndex={0} aria-label="Prakiraan per lokasi">
        <div className="weather-grid">
          <div className="weather-grid-row weather-axis" aria-hidden="true">
            <div className="weather-location weather-axis-label">Lokasi</div>
            <div className="weather-ticks">
              {ticks.map((tick) => (
                <time
                  key={tick}
                  dateTime={new Date(tick).toISOString()}
                  style={{ insetInlineStart: percent(tick) + "%" }}
                >
                  {jakartaTime.format(tick)}
                </time>
              ))}
            </div>
          </div>
          {rows.map(({ id, label, periods }) => (
            <div
              key={id}
              className="weather-grid-row"
              data-weather-location={id}
              data-weather-current={active === id || undefined}
            >
              <div className="weather-location">
                <h3>{label}</h3>
                {active === id && (
                  <span className="weather-current-location">
                    <MapPin size={11} aria-hidden /> Kamu di sini
                  </span>
                )}
              </div>
              <ol className="weather-track" aria-label={`Prakiraan ${label}`}>
                {periods.map((period) => {
                  const { label: condition, icon: Icon } = conditions[period.condition];
                  const range = `${jakartaTime.format(period.start)}–${jakartaTime.format(period.end)} WIB`;
                  const width = percent(period.end) - percent(period.start);
                  return (
                    <li
                      key={period.start}
                      className="weather-period"
                      data-weather-condition={period.condition}
                      title={`${condition}, ${range}`}
                      style={{ insetInlineStart: percent(period.start) + "%", width: width + "%" }}
                    >
                      {width >= 6 && <Icon aria-hidden size={15} />}
                      {width >= 17 && <span aria-hidden>{condition}</span>}
                      <span className="sr-only">{`${condition}, ${range}`}</span>
                    </li>
                  );
                })}
                {periods.length === 0 && (
                  <li className="weather-unavailable">Prakiraan belum tersedia</li>
                )}
                <li
                  className="weather-now-line"
                  aria-hidden="true"
                  style={{ insetInlineStart: nowPosition }}
                />
              </ol>
            </div>
          ))}
        </div>
      </section>
      <ul className="weather-legend" aria-label="Keterangan cuaca">
        {Object.entries(conditions).map(([id, { label, icon: Icon }]) => (
          <li key={id} data-weather-condition={id}>
            <span className="weather-legend-icon">
              <Icon size={14} aria-hidden />
            </span>
            {label}
          </li>
        ))}
        <li>
          <span className="weather-legend-now" aria-hidden="true" />
          Sekarang
        </li>
      </ul>
    </GameModal>
  );
}
