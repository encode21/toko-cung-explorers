import { useDailyTalk } from "@/game/daily/talk";
import { DailyTalkOverlay } from "./DailyTalkOverlay";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { interactableById } from "@/game/interactions/interactables";
import { askNpc } from "@/services/aiApi/npc.functions";
import { addSkuToCart, cartCount, useGame } from "@/state/game-store";
import type { ShelfId } from "@/game/world/layout";
import { LoaderCircle, Send } from "lucide-react";
import { NpcDialogueShell } from "./NpcDialogueShell";
import { npcAppearance } from "./npc-appearance";

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
  "nakama-gudang": [
    "Stok apa yang menipis?",
    "Capek nggak kerjanya?",
    "Restock kapan?",
    "Udah makan?",
  ],
  "nakama-packing": [
    "Banyak pesanan hari ini?",
    "Kurir udah datang?",
    "Dengerin musik apa?",
    "Susah nggak packing?",
  ],
  kurir: [
    "Ramai nggak jalanan?",
    "Hari ini banyak paket?",
    "Kerja di ekspedisi mana?",
    "Hujan terus ya",
  ],
  pembeli: [
    "Belanja apa hari ini?",
    "Ada rekomendasi enak?",
    "Harga naik ya sekarang",
    "Sering ke sini?",
  ],
  warga: [
    "Ramai ya di sini?",
    "Lingkungan sini gimana?",
    "Cuacanya panas ya",
    "Ada apa aja di sekitar?",
  ],
};

/** Percakapan NPC — ambient, ringkas, dan bisa mengembalikan action ke dunia. */
export function DialogueOverlay() {
  const talk = useDailyTalk((s) => s.questId);
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

  if (talk && npcId === useDailyTalk.getState().targetId) return <DailyTalkOverlay />;
  if (!npc) return null;

  const role: NpcRole = npc.role ?? "kasir";
  const quick = QUICK_BY_ROLE[role];
  const [name = npc.label, npcRole] = npc.label.split(" · ");
  const greeting =
    role === "kasir"
      ? "Selamat datang di Toko Cung, Kak. Mau cari apa hari ini?"
      : role === "owner"
        ? "Halo! Selamat datang di Toko Cung. Ada yang bisa kubantu?"
        : "Hei, halo! Ada yang ingin kamu tanyakan?";

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
    <NpcDialogueShell
      name={name}
      role={npcRole}
      avatar={npcAppearance(npc.id, npc.avatarId)}
      onClose={() => useGame.getState().closeOverlay()}
      footer={
        <>
          <div className="npc-dialogue-quick" aria-label="Pertanyaan cepat">
            {quick.map((question) => (
              <button
                key={question}
                type="button"
                disabled={thinking}
                onClick={() => void send(question)}
              >
                {question}
              </button>
            ))}
          </div>
          <form
            className="npc-dialogue-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send(text);
            }}
          >
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Tulis pertanyaan…"
              aria-label={`Pertanyaan untuk ${name}`}
              autoComplete="off"
            />
            <button type="submit" className="npc-dialogue-send" disabled={thinking || !text.trim()}>
              {thinking ? (
                <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <Send aria-hidden />
              )}
              <span>Kirim</span>
            </button>
          </form>
        </>
      }
    >
      <div
        ref={scroller}
        className="npc-dialogue-log"
        role="log"
        aria-label={`Percakapan dengan ${name}`}
        aria-live="polite"
        aria-busy={thinking}
      >
        {dialogue.length === 0 && <p className="npc-dialogue-line">{greeting}</p>}
        {dialogue.map((turn, index) => (
          <p
            key={index}
            className={turn.role === "player" ? "npc-dialogue-question" : "npc-dialogue-line"}
          >
            {turn.text}
          </p>
        ))}
        {thinking && (
          <p className="npc-dialogue-thinking" role="status">
            {name} sedang berpikir…
          </p>
        )}
        {error && (
          <p role="alert" className="npc-dialogue-error">
            {error}
          </p>
        )}
      </div>
    </NpcDialogueShell>
  );
}
