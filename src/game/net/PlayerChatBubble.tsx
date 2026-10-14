/** @jsxImportSource @/game/jsx */
import { Billboard, Text } from "@react-three/drei";
import { useEffect, useState } from "react";
import { Shape } from "three";
import { useNet } from "@/net/net-store";

const LIFETIME = 8000;
const outline = new Shape();
outline.moveTo(0.2, -0.38);
outline.lineTo(0, -0.6);
outline.lineTo(0.5, -0.38);
outline.lineTo(2.6, -0.38);
outline.quadraticCurveTo(2.75, -0.38, 2.75, -0.23);
outline.lineTo(2.75, 0.67);
outline.quadraticCurveTo(2.75, 0.82, 2.6, 0.82);
outline.lineTo(0.3, 0.82);
outline.quadraticCurveTo(0.15, 0.82, 0.15, 0.67);
outline.lineTo(0.15, -0.23);
outline.quadraticCurveTo(0.15, -0.38, 0.2, -0.38);
outline.closePath();

/** Attached to the rendered avatar root, so movement stays interpolated.
 * Local and remote messages use the existing room chat, with no second transport.
 */
export function PlayerChatBubble({
  senderId,
  height = 2.5,
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
      <mesh renderOrder={2} raycast={() => null}>
        <shapeGeometry args={[outline]} />
        <meshBasicMaterial
          color="#14242e"
          transparent
          opacity={0.92}
          depthTest
          depthWrite={false}
        />
      </mesh>
      <Text
        position={[0.33, 0.67, 0.015]}
        fontSize={0.16}
        lineHeight={1.2}
        maxWidth={2.22}
        overflowWrap="break-word"
        anchorX="left"
        anchorY="top"
        color="#fff2d5"
        renderOrder={3}
        raycast={() => null}
        material-depthTest
        material-depthWrite={false}
      >
        {text}
      </Text>
    </Billboard>
  );
}
