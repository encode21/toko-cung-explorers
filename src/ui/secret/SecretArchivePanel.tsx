import { RAHASIA_ARCHIVES } from "@/game/secret/archive";
import { useGameCore } from "@/game/core/store";
import { PhoneAppArtwork } from "@/ui/hud/PhoneAppArtwork";
import "./archive-panel.css";

/** Collectible archive for Rahasia Dunia — Play Together purple/cream panel. */
export function SecretArchivePanel() {
  const metrics = useGameCore((s) => s.snapshot?.profile.secretMetrics);
  const found = metrics?.secretsFound ?? 0;
  const total = metrics?.archiveTotal || RAHASIA_ARCHIVES.length;
  const known = new Set(metrics?.archives ?? []);

  return (
    <div className="archive-panel" data-archive-panel>
      <div className="archive-panel-summary">
        <span className="archive-panel-summary-icon" aria-hidden="true">
          <PhoneAppArtwork kind="archive" />
        </span>
        <div>
          <span>Rahasia Dunia Toko Cung</span>
          <strong>
            {found} / {total} arsip
          </strong>
          <small>
            {metrics
              ? `Perfect answers: ${metrics.perfectAnswers}${
                  metrics.secretQuestCompletionTime != null
                    ? ` · Clear ${metrics.secretQuestCompletionTime}s`
                    : ""
                }`
              : "Kumpulkan jejak rahasia di dunia"}
          </small>
        </div>
      </div>
      <ul className="archive-panel-list" aria-label="Daftar arsip rahasia">
        {RAHASIA_ARCHIVES.map((entry) => {
          const unlocked = known.has(entry.id);
          return (
            <li
              key={entry.id}
              className={`archive-panel-item${unlocked ? "" : " is-locked"}`}
            >
              <span className="archive-panel-index">
                #{String(entry.index).padStart(2, "0")}
              </span>
              <p className="archive-panel-title">{unlocked ? entry.title : "???"}</p>
              <p className="archive-panel-lore">
                {unlocked ? entry.lore : "Belum ditemukan."}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
