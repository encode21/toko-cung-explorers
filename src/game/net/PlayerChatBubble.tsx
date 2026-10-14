/** @jsxImportSource @/game/jsx */
import { Billboard, Text } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Shape } from "three";
import { useNet } from "@/net/net-store";

const LIFETIME = 8000;
const FONT_SIZE = 0.23;
const MAX_WIDTH = 3;
const PADDING_X = 0.2;
const PADDING_Y = 0.12;
const TAIL_HEIGHT = 0.16;
const BODY_LIFT = 0.03;
const ignoreRaycast = () => null;

function bubbleShape(width: number, height: number) {
  const shape = new Shape();
  const left = -width / 2;
  const right = width / 2;
  const bottom = TAIL_HEIGHT;
  const top = bottom + height;
  const radius = Math.min(0.2, height / 2, width / 2);
  const tailHalf = 0.11;
  shape.moveTo(left + radius, bottom);
  shape.lineTo(-tailHalf, bottom);
  shape.lineTo(0, 0);
  shape.lineTo(tailHalf, bottom);
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
}

type SyncedText = {
  text: string;
  textRenderInfo?: {
    blockBounds: readonly [number, number, number, number];
    parameters?: { text?: string };
  } | null;
};

function SpeechBubble({
  senderId,
  text,
  height,
}: {
  senderId: string;
  text: string;
  height: number;
}) {
  const active = useRef(true);
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
  const width = measured?.width ?? 0.78;
  const bodyHeight = measured?.height ?? 0.52;
  const shapes = useMemo(
    () => ({
      shadow: bubbleShape(width + 0.07, bodyHeight + 0.045),
      border: bubbleShape(width + 0.03, bodyHeight + 0.03),
      body: bubbleShape(width, bodyHeight),
    }),
    [width, bodyHeight],
  );
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const onSync = useCallback(
    (mesh: SyncedText) => {
      const info = mesh.textRenderInfo;
      if (
        !active.current ||
        mesh.text !== text ||
        !info ||
        (info.parameters?.text !== undefined && info.parameters.text !== text) ||
        !info.blockBounds.every(Number.isFinite)
      )
        return;
      const [left, bottom, right, top] = info.blockBounds;
      const next = {
        width: Math.max(0.78, Math.min(MAX_WIDTH, right - left + PADDING_X * 2)),
        height: Math.max(0.5, top - bottom + PADDING_Y * 2),
      };
      setMeasured((previous) =>
        previous &&
        Math.abs(previous.width - next.width) < 0.002 &&
        Math.abs(previous.height - next.height) < 0.002
          ? previous
          : next,
      );
    },
    [text],
  );
  return (
    <Billboard
      position={[0, height, 0]}
      visible={measured !== null}
      name={`chat-bubble-${senderId}`}
      userData={{ ignoreCameraCollision: true }}
    >
      <mesh renderOrder={2} raycast={ignoreRaycast}>
        <shapeGeometry args={[shapes.shadow]} />
        <meshBasicMaterial
          color="#52616a"
          transparent
          opacity={0.12}
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.015, 0.002]} renderOrder={3} raycast={ignoreRaycast}>
        <shapeGeometry args={[shapes.border]} />
        <meshBasicMaterial
          color="#dce1e3"
          transparent
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, BODY_LIFT, 0.004]} renderOrder={4} raycast={ignoreRaycast}>
        <shapeGeometry args={[shapes.body]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Text
        position={[0, BODY_LIFT + TAIL_HEIGHT + bodyHeight / 2, 0.012]}
        fontSize={FONT_SIZE}
        fontWeight={700}
        lineHeight={1.25}
        maxWidth={MAX_WIDTH - PADDING_X * 2}
        overflowWrap="break-word"
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color="#202627"
        strokeColor="#202627"
        strokeWidth={0.003}
        renderOrder={5}
        raycast={ignoreRaycast}
        onSync={onSync}
        material-depthTest
        material-depthWrite={false}
        material-toneMapped={false}
      >
        {text}
      </Text>
    </Billboard>
  );
}

/** Attached to the rendered avatar root, so movement stays interpolated.
 * Local and remote messages use the existing room chat, with no second transport.
 */
export function PlayerChatBubble({
  senderId,
  height = 2.48,
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
  if (!text) return null;
  return <SpeechBubble key={message.id} senderId={senderId} text={text} height={height} />;
}
