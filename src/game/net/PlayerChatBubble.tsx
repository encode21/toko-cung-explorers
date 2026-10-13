/** @jsxImportSource @/game/jsx */
import { Billboard, Text } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shape } from "three";
import { useNet } from "@/net/net-store";

const LIFETIME = 8000;
/** Attached to the rendered avatar root, so movement stays interpolated.
 * Local and remote messages use the existing room chat, with no second transport.
 */
export function PlayerChatBubble({
  senderId,
  height = 2.2,
}: {
  senderId: string;
  height?: number;
}) {
  const message = useNet((s) => [...s.chat].reverse().find((entry) => entry.from === senderId));
  const [expired, setExpired] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const remaining = Math.min(LIFETIME, Math.max(0, LIFETIME - (Date.now() - message.at)));
    const timer = window.setTimeout(() => setExpired(message.id), remaining);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message || expired === message.id || Date.now() - message.at >= LIFETIME) return null;
  const characters = Array.from(message.text.replace(/\s+/g, " ").trim());
  const text =
    characters.length > 64 ? `${characters.slice(0, 61).join("")}…` : characters.join("");
  return (
    <Billboard
      position={[0, height, 0]}
      name={`chat-bubble-${senderId}`}
      userData={{ ignoreCameraCollision: true }}
    >
      <BubbleContent key={message.id} text={text} />
    </Billboard>
  );
}

/** Size to the actual wrapped glyph layout, not a fixed character-count box. */
function BubbleContent({ text }: { text: string }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const measure = useCallback((mesh: { textRenderInfo?: { blockBounds: number[] } }) => {
    const bounds = mesh.textRenderInfo?.blockBounds;
    if (!bounds || bounds.length < 4) return;
    const width = Math.max(0.2, bounds[2]! - bounds[0]!);
    const height = Math.max(0.16, bounds[3]! - bounds[1]!);
    setSize((previous) =>
      previous &&
      Math.abs(previous.width - width) < 0.001 &&
      Math.abs(previous.height - height) < 0.001
        ? previous
        : { width, height },
    );
  }, []);
  const outline = useMemo(() => {
    const left = 0.12,
      bottom = 0.1,
      right = left + (size?.width ?? 0.2) + 0.28;
    const top = bottom + (size?.height ?? 0.16) + 0.24;
    const radius = 0.08;
    const shape = new Shape();
    shape.moveTo(left + radius, bottom);
    shape.lineTo(0, -0.08);
    shape.lineTo(left + 0.25, bottom);
    shape.lineTo(right - radius, bottom);
    shape.quadraticCurveTo(right, bottom, right, bottom + radius);
    shape.lineTo(right, top - radius);
    shape.quadraticCurveTo(right, top, right - radius, top);
    shape.lineTo(left + radius, top);
    shape.quadraticCurveTo(left, top, left, top - radius);
    shape.lineTo(left, bottom + radius);
    shape.quadraticCurveTo(left, bottom, left + radius, bottom);
    shape.closePath();
    return shape;
  }, [size]);
  return (
    <group visible={size !== null}>
      <mesh name="chat-bubble-background" renderOrder={2} raycast={() => null}>
        <shapeGeometry args={[outline]} />
        <meshBasicMaterial
          color="#14242e"
          transparent
          opacity={0.92}
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Text
        position={[0.26, 0.22, 0.015]}
        fontSize={0.16}
        lineHeight={1.2}
        maxWidth={2.22}
        overflowWrap="break-word"
        anchorX="left"
        anchorY="bottom"
        color="#fff2d5"
        onSync={measure}
        renderOrder={3}
        raycast={() => null}
        material-transparent
        material-depthTest
        material-depthWrite={false}
        material-toneMapped={false}
      >
        {text}
      </Text>
    </group>
  );
}
