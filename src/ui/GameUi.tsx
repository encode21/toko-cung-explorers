import { useEffect } from "react";
import { useGame } from "@/state/game-store";
import { useProfile } from "@/identity/profile-store";
import { Hud } from "@/ui/hud/Hud";
import { DialogueOverlay } from "@/ui/dialogue/DialogueOverlay";
import { ShelfOverlay } from "@/ui/product/ShelfOverlay";
import { PosOverlay } from "@/ui/pos/PosOverlay";
import { PaymentOverlay } from "@/ui/payment/PaymentOverlay";
import { SuccessOverlay } from "@/ui/payment/SuccessOverlay";
import { WorldChat } from "@/ui/chat/WorldChat";
import { MobileControls } from "@/ui/hud/MobileControls";

export function GameUi({ mobileControlsEnabled = true }: { mobileControlsEnabled?: boolean }) {
  const overlay = useGame((s) => s.overlay);
  const loadProfile = useProfile((s) => s.load);
  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);
  return (
    <>
      <Hud />
      <WorldChat />
      {mobileControlsEnabled && <MobileControls />}
      {overlay === "dialogue" && <DialogueOverlay />}
      {overlay === "shelf" && <ShelfOverlay />}
      {overlay === "pos" && <PosOverlay />}
      {overlay === "payment" && <PaymentOverlay />}
      {overlay === "success" && <SuccessOverlay />}
    </>
  );
}
