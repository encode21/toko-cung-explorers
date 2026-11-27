import {
  closeShowroomSales,
  SHOWROOM_SALES_AVATAR,
  SHOWROOM_SALES_NAME,
  SHOWROOM_SALES_ROLE,
  useShowroomSales,
} from "@/game/showroom/sales";
import { openShowroomCatalog } from "@/game/showroom/shop";
import { NpcDialogueShell } from "./NpcDialogueShell";

export function ShowroomSalesDialogue() {
  const open = useShowroomSales((s) => s.open);
  if (!open) return null;

  return (
    <NpcDialogueShell
      name={SHOWROOM_SALES_NAME}
      role={SHOWROOM_SALES_ROLE}
      avatar={SHOWROOM_SALES_AVATAR}
      onClose={closeShowroomSales}
      footer={
        <button
          type="button"
          className="npc-dialogue-next"
          onClick={() => {
            closeShowroomSales();
            openShowroomCatalog();
          }}
        >
          Lihat koleksi
        </button>
      }
    >
      <p className="npc-dialogue-line">
        Selamat datang di Cung Motor! Ada dua mobil dan satu motor edisi eksklusif. Mau lihat
        koleksinya?
      </p>
    </NpcDialogueShell>
  );
}
