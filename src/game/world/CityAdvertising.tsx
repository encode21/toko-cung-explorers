/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useState } from "react";
import { Html } from "@react-three/drei";
import { CanvasTexture, SRGBColorSpace, Texture, TextureLoader } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { WORLD_HTML_LAYERS } from "@/game/engine/world-html-layers";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { loadActivePopupBanners, type CityPopupBanner } from "./city-banner";
import {
  CITY_AD_SLOTS,
  CITY_AD_POLE,
  CITY_AD_PANEL_HALF,
  CITY_AD_PANEL_Y,
  CITY_AD_LIFT,
  cityAdImageUrl,
  type CityAdSlot,
} from "./city-advertising";

const FRAME: OutdoorPart[] = [
  {
    p: [-1.02, 1.02 + CITY_AD_LIFT / 2, 0],
    s: [0.12, 2.04 + CITY_AD_LIFT, 0.14],
    color: "#27343b",
  },
  { p: [-0.89, 2.26 + CITY_AD_LIFT, 0], s: [0.12, 0.6, 0.14], rz: -0.45, color: "#27343b" },
  { p: [-0.76, 3.39 + CITY_AD_LIFT, 0], s: [0.12, 1.8, 0.14], color: "#27343b" },
  { p: [0, 4.34 + CITY_AD_LIFT, 0], s: [1.9, 0.1, 0.12], color: "#27343b" },
  { p: [-1.02, 0.13, 0], s: [0.29, 0.26, 0.29], color: "#4e5555" },
  { p: [0, CITY_AD_PANEL_Y, 0], s: [1.78, 2.64, 0.11], color: "#c9cdca" },
];

function housePoster(id: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 960;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f3f0e7";
  ctx.fillRect(0, 0, 640, 960);
  ctx.fillStyle = "#9f3430";
  ctx.fillRect(0, 0, 640, 24);
  ctx.fillStyle = "#263c3b";
  ctx.font = "600 28px sans-serif";
  ctx.fillText("TOKO CUNG EXPLORER", 48, 91);
  ctx.font = "700 83px sans-serif";
  ctx.fillText("RUANG", 44, 265);
  ctx.fillText("IKLAN", 44, 360);
  ctx.font = "29px sans-serif";
  ctx.fillText("Usaha Anda, di pusat kota.", 48, 427);
  ctx.fillStyle = "#9f3430";
  ctx.fillRect(48, 468, 84, 7);
  // A restrained city silhouette belongs to the empty ad space, not a third-party campaign.
  [110, 162, 130, 194, 148].forEach((h, i) => {
    const x = 48 + i * 110;
    ctx.fillStyle = i % 2 ? "#73857a" : "#c0c7b4";
    ctx.fillRect(x, 756 - h, 91, h);
    ctx.fillStyle = "#e9e9dd";
    for (let y = 774 - h; y < 735; y += 30) {
      ctx.fillRect(x + 15, y, 19, 15);
      ctx.fillRect(x + 55, y, 19, 15);
    }
  });
  ctx.fillStyle = "#263c3b";
  ctx.fillRect(0, 800, 640, 160);
  ctx.fillStyle = "#f3f0e7";
  ctx.font = "600 29px sans-serif";
  ctx.fillText("PUSAT KOTA", 48, 866);
  ctx.font = "23px sans-serif";
  ctx.fillText(id.toUpperCase(), 48, 913);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function CityAdBoard({ slot, campaign }: { slot: CityAdSlot; campaign?: CityPopupBanner }) {
  const poster = useMemo(() => housePoster(slot.id), [slot.id]);
  const [loaded, setLoaded] = useState<{ url: string; texture: Texture } | null>(null);
  const url = campaign ? null : cityAdImageUrl(slot.imageUrl);
  useEffect(() => () => poster.dispose(), [poster]);
  useEffect(() => {
    if (!url) return;
    let disposed = false;
    const texture = new TextureLoader().load(
      url,
      (image) => {
        if (disposed) return;
        image.colorSpace = SRGBColorSpace;
        image.anisotropy = 4;
        setLoaded({ url, texture: image });
      },
      undefined,
      () => {
        /* Keep the readable house poster when the campaign image is unavailable. */
      },
    );
    return () => {
      disposed = true;
      texture.dispose();
    };
  }, [url]);
  const image = loaded?.url === url ? loaded.texture : poster;
  // Show every part of the supplied artwork without cropping or changing its proportions.
  const source = image.image as { width: number; height: number };
  const aspect = source.width > 0 && source.height > 0 ? source.width / source.height : 2 / 3;
  const width = Math.min(1.68, 2.52 * aspect);
  const height = width / aspect;
  return (
    <group
      name={`city-ad-${slot.id}`}
      position={slot.position}
      rotation-y={slot.yaw}
      userData={{
        label: slot.label,
        imageLoaded: Boolean(campaign) || image !== poster,
        adSlot: slot.id,
        campaignId: campaign?.id ?? null,
      }}
    >
      <OutdoorBatch items={FRAME} />
      {[0, Math.PI].map((yaw) => (
        <mesh key={yaw} position={[0, CITY_AD_PANEL_Y, yaw ? -0.063 : 0.063]} rotation-y={yaw}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial map={image} roughness={0.87} metalness={0} />
        </mesh>
      ))}
      {campaign &&
        [0, Math.PI].map((yaw) => (
          <Html
            key={`campaign-${yaw}`}
            transform
            center
            distanceFactor={4}
            position={[0, CITY_AD_PANEL_Y, yaw ? -0.072 : 0.072]}
            rotation={[0, yaw, 0]}
            pointerEvents="none"
            occlude
            zIndexRange={WORLD_HTML_LAYERS.screen}
            style={{ pointerEvents: "none" }}
          >
            <div
              style={{
                width: 168,
                height: 252,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                background: "#c9cdca",
              }}
            >
              <img
                src={campaign.imageUrl}
                alt={campaign.name}
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          </Html>
        ))}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[CITY_AD_POLE.half, CITY_AD_POLE.height / 2, CITY_AD_POLE.half]}
          position={[CITY_AD_POLE.x, CITY_AD_POLE.height / 2, 0]}
        />
        <CuboidCollider args={[...CITY_AD_PANEL_HALF]} position={[0, CITY_AD_PANEL_Y, 0]} />
      </RigidBody>
    </group>
  );
}

export function CityAdvertising() {
  const [campaigns, setCampaigns] = useState<CityPopupBanner[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    loadActivePopupBanners(controller.signal)
      .then((next) => {
        setCampaigns(next);
      })
      .catch(() => {
        /* Keep the local poster when the public campaign feed is unavailable. */
      });
    return () => controller.abort();
  }, []);
  return (
    <group name="CityAdvertising">
      {CITY_AD_SLOTS.map((slot, index) => (
        <CityAdBoard
          key={slot.id}
          slot={slot}
          {...(campaigns.length ? { campaign: campaigns[index % campaigns.length]! } : {})}
        />
      ))}
    </group>
  );
}
