import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { interactableById } from "@/game/interactions/interactables";
import { askNpc } from "@/services/aiApi/npc.functions";
import { addSkuToCart, cartCount, useGame } from "@/state/game-store";
import type { ShelfId } from "@/game/world/layout";
import { OverlayShell } from "@/ui/OverlayShell";

import type { NpcRole } from "@/game/interactions/interactables";

const STAFF_QUICK = [
  "Ada Indomie Goreng?",
  "Rekomendasi minuman dingin?",
  "Di mana rak minuman?",
  "Toko buka sampai jam berapa?",
  "Saya mau bayar",
];

/** Pertanyaan cepat menyesuaikan siapa yang diajak bicara. */
const QUICK_BY_ROLE: Record<NpcRole, string[]> = {
  kasir: STAFF_QUICK,
  owner: ["Ceritain dong awal buka toko", "Ada promo?", "Gimana jualan hari ini?", "Suka bola?"],
  "nakama-gudang": ["Stok apa yang menipis?", "Capek nggak kerjanya?", "Restock kapan?", "Udah makan?"],
  "nakama-packing": ["Banyak pesanan hari ini?", "Kurir udah datang?", "Dengerin musik apa?", "Susah nggak packing?"],
  kurir: ["Ramai nggak jalanan?", "Hari ini banyak paket?", "Kerja di ekspedisi mana?", "Hujan terus ya"],
  pembeli: ["Belanja apa hari ini?", "Ada rekomendasi enak?", "Harga naik ya sekarang", "Sering ke sini?"],
  warga: ["Ramai ya di sini?", "Lingkungan sini gimana?", "Cuacanya panas ya", "Ada apa aja di sekitar?"],
};

/** Percakapan NPC — ambient, ringkas, dan bisa mengembalikan action ke dunia. */
export function DialogueOverlay() {
  const npcId = useGame((s) => s.activeNpc);
  const dialogue = useGame((s) => s.dialogue);
  const thinking = useGame((s) => s.npcThinking);
  const cart = useGame((s) => s.cart);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const ask = useServerFn(askNpc);
  const npc = npcId ? interactableById(npcId) : undefined;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [dialogue.length, thinking]);

  if (!npc) return null;

  const role: NpcRole = npc.role ?? "kasir";
  const quick = QUICK_BY_ROLE[role];
  const subtitle =
    role === "kasir"
      ? "Tanya produk, harga, lokasi rak, atau cara bayar"
      : role === "owner"
        ? "Ngobrol soal toko, promo, atau hal santai"
        : role === "nakama-gudang"
          ? "Tanya stok, restock, atau ngobrol santai"
          : role === "nakama-packing"
            ? "Tanya pesanan, packing, atau ngobrol santai"
            : role === "kurir"
              ? "Ngobrol soal pengiriman dan jalanan"
              : "Ngobrol santai apa saja";

  const send = async (question: string) => {
    const store = useGame.getState();
    if (!question.trim() || store.npcThinking) return;
    setError(null);
    setText("");
    store.pushDialogue({ role: "player", text: question });
    store.setNpcThinking(true);
    try {
      const reply = await ask({
        data: {
          npcId: npc.id,
          persona: npc.persona ?? "Nakama Toko Cung yang ramah.",
          role: npc.role ?? "kasir",
          question,
          history: store.dialogue.slice(-8),
          cartCount: cartCount(cart),
        },
      });
      const s = useGame.getState();
      s.pushDialogue({ role: "npc", text: reply.message });
      if (reply.action.type === "SHOW_WAYPOINT" && reply.action.target) {
        s.setWaypoint(reply.action.target as ShelfId);
        s.setToast("Arah rak ditandai di dunia");
      } else if (reply.action.type === "ADD_TO_CART" && reply.action.target) {
        addSkuToCart(reply.action.target);
      } else if (reply.action.type === "OPEN_POS") {
        s.setOverlay("pos");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "NPC tidak bisa menjawab sekarang.");
    } finally {
      useGame.getState().setNpcThinking(false);
    }
  };

  return (
    <OverlayShell title={npc.label} subtitle={subtitle}>
      <div ref={scroller} className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
        {dialogue.length === 0 && (
          <p className="text-world-muted text-sm">
            &ldquo;Selamat datang di Toko Cung, Kak. Mau cari apa hari ini?&rdquo;
          </p>
        )}
        {dialogue.map((turn, i) => (
          <p
            key={i}
            className={
              turn.role === "player"
                ? "ml-auto max-w-[80%] rounded-lg bg-world-accent px-3 py-2 text-sm text-world-accent-foreground"
                : "max-w-[85%] rounded-lg border border-world-outline px-3 py-2 text-sm"
            }
          >
            {turn.text}
          </p>
        ))}
        {thinking && <p className="text-world-muted text-sm italic">…</p>}
        {error && <p className="text-sm text-world-accent">{error}</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {quick.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void send(q)}
            className="rounded-full border border-world-outline px-3 py-1 text-world-muted text-xs transition hover:text-world-panel-foreground"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis pertanyaan…"
          autoFocus
          className="flex-1 rounded-lg border border-world-outline bg-transparent px-3 py-2 text-sm outline-none placeholder:text-world-muted focus:border-world-accent"
        />
        <button
          type="submit"
          disabled={thinking}
          className="rounded-lg bg-world-accent px-4 py-2 font-semibold text-sm text-world-accent-foreground disabled:opacity-50"
        >
          Kirim
        </button>
      </form>
    </OverlayShell>
  );
}
