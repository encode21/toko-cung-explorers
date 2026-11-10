import { useEffect } from "react";
import { Check, Shirt } from "lucide-react";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useMountain } from "@/game/mountain/store";
import { isMountainPosition } from "@/game/mountain/model";
import { MOUNTAIN_OUTFITS, nearMountainOutfits } from "@/game/mountain/outfits";
import { GameModal, GameButton } from "@/ui/game-ui/GamePanel";
import "./mountain-hud.css";

/** Same hats, pocket layout and palettes as the loan mannequins beside the beach. */
function OutfitArt({ outfit }: { outfit: (typeof MOUNTAIN_OUTFITS)[number] }) {
  return (
    <svg viewBox="0 0 120 154" aria-hidden="true" className="mountain-outfit-art">
      <ellipse cx="60" cy="145" rx="38" ry="5" fill="#d5c7ad" />
      <path d="M38 95h20v43H37Zm24 0h20l1 43H62Z" fill={outfit.pants} />
      <path d="M36 133h23v12H34Zm25 0h23l2 12H61Z" fill="#352f28" />
      <path d="M34 49h52v53H34Z" fill={outfit.jacket} />
      <path d="M18 50h16v39H17Zm68 0h16l1 39H86Z" fill={outfit.jacket} />
      <path d="M17 89h17v15H17Zm69 0h17v15H86Z" fill="#ead2b2" />
      <rect x="43" y="19" width="34" height="34" rx="10" fill="#ead2b2" />
      <ellipse cx="60" cy="21" rx="35" ry="6" fill={outfit.hat} />
      <path d="M38 20 43 5h34l5 15Z" fill={outfit.hat} />
      <path d="M39 17h42" stroke={outfit.trim} strokeWidth="4" />
      <path d="M43 53v42m34-42v42" stroke="#493d2b" strokeWidth="5" />
      <path d="M38 72h17v16H38Zm27 0h17v16H65Z" fill={outfit.trim} />
      <path d="M38 73h17m10 0h17" stroke="#493d2b" strokeWidth="2" />
      <path d="M34 96h52" stroke="#493d2b" strokeWidth="5" />
      <rect x="56" y="92" width="8" height="8" fill="#c1ac72" />
      {outfit.goggles && (
        <g fill="#6f8c8c" stroke="#302923" strokeWidth="3">
          <circle cx="51" cy="13" r="7" />
          <circle cx="69" cy="13" r="7" />
          <path d="M58 13h4" />
        </g>
      )}
      {outfit.id === "ranger" && (
        <path d="m37 24 8 28h30l8-28" fill="none" stroke="#4b422d" strokeWidth="2" />
      )}
    </svg>
  );
}
export function MountainOutfitPanel() {
  const position = useGame((s) => s.playerPos),
    selected = useMountain((s) => s.outfit);
  const close = () => useHud.getState().setSheet(null);
  const valid = isMountainPosition(position[0], position[2]) && nearMountainOutfits(position);
  useEffect(() => {
    if (!valid) useHud.getState().setSheet(null);
  }, [valid]);
  if (!valid) return null;
  return (
    <GameModal
      title="Outfit pendaki"
      subtitle="Pinjam gratis selama menjelajahi Gunung Cung."
      onClose={close}
      className="mountain-outfit-panel"
      footer={
        <GameButton
          onClick={() => {
            useMountain.getState().chooseOutfit(null);
            close();
          }}
        >
          <Shirt size={18} aria-hidden />
          Pakai outfit sendiri
        </GameButton>
      }
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>("[data-mountain-outfits]")?.focus(),
        );
      }}
    >
      <div className="mountain-outfit-options" role="group" aria-label="Pilihan outfit pendaki">
        {MOUNTAIN_OUTFITS.map((outfit) => (
          <button
            key={outfit.id}
            type="button"
            className="mountain-outfit-option"
            data-outfit={outfit.id}
            aria-pressed={selected === outfit.id}
            onClick={() => {
              useMountain.getState().chooseOutfit(outfit.id);
              close();
            }}
          >
            <OutfitArt outfit={outfit} />
            <strong>{outfit.name}</strong>
            <span>{outfit.description}</span>
            <b>
              {selected === outfit.id ? (
                <>
                  <Check size={16} aria-hidden />
                  Dipakai
                </>
              ) : (
                "Pakai outfit"
              )}
            </b>
          </button>
        ))}
      </div>
    </GameModal>
  );
}
