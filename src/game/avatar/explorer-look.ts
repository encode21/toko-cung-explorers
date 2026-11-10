import * as T from "three";
import type { AvatarConfig } from "../../identity/avatar.ts";
import type { ExplorerAppearance } from "../../identity/explorer.ts";
import { CROWN_HATS } from "../../identity/wardrobe.ts";

/** Appearance belongs to the visual rig; the player's physics/network root stays unchanged. */
export function createExplorerLook(scene: T.Object3D) {
  const body = scene.getObjectByName("Body")!;
  const head = scene.getObjectByName("Head")!;
  const hip = scene.getObjectByName("LeftLeg")!;
  const frame = new T.Group();
  frame.name = "VisualAge";
  body.parent!.add(frame);
  frame.add(body);
  const point = new T.Vector3();
  return {
    apply(config: ExplorerAppearance, identity?: Pick<AvatarConfig, "hair" | "expression">) {
      const hair = identity?.hair === "cap" ? "short" : (identity?.hair ?? "short");
      const expression = identity?.expression ?? "smile";
      // Covering hats swap the full locks for the set that fits under a brim.
      const hat = CROWN_HATS.includes(config.headwear) && config.headwear !== "mini-crown";
      frame.scale.setScalar(config.age === "child" ? 0.8 : 1);
      frame.position.set(0, 0, 0);
      head.scale.setScalar(config.age === "child" ? 1.14 : 0.88);
      scene.traverse((object) => {
        const data = object.userData;
        if (data["hairStyle"]) object.visible = data["hairStyle"] === hair;
        if (data["hairCrown"]) object.visible = !hat;
        if (data["hairUnderHat"]) object.visible = hat;
        if (data["mouthExpression"])
          object.visible =
            data["mouthExpression"] === (expression === "wink" ? "smile" : expression);
        const closed = expression === "calm" || (expression === "wink" && data["eyeSide"] === -1);
        if (data["eyeSide"]) object.visible = !closed;
        if (data["closedEyeSide"])
          object.visible =
            expression === "calm" || (expression === "wink" && data["closedEyeSide"] === -1);
        if (
          object instanceof T.Mesh &&
          object.morphTargetDictionary &&
          object.morphTargetInfluences
        ) {
          for (const [name, index] of Object.entries(object.morphTargetDictionary))
            object.morphTargetInfluences[index] =
              name === config.build || (name === "female" && config.gender === "female") ? 1 : 0;
        }
      });
    },
    pose(animation: string) {
      frame.position.set(0, 0, 0);
      if (/^(Sit|Ride|Piggyback|Swim)/.test(animation) && frame.scale.y !== 1) {
        scene.updateMatrixWorld(true);
        frame.worldToLocal(hip.getWorldPosition(point));
        frame.position.y = (1 - frame.scale.y) * point.y;
        // A smaller driver sits forward on the cushion so the unchanged grips stay reachable.
        if (/^Ride(Drive|Bike)$/.test(animation)) frame.position.z = (1 - frame.scale.y) * 0.55;
      }
    },
  };
}
