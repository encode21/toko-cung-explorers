/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { fishLook, type FishLook } from "./fish-look";

// Body is 1 unit long along x: tail at -0.5, head (+x) at 0.5. t runs 0 (tail) .. 1 (head).
const RING = 16,
  SEG = 28,
  WIDTH = 0.5;
const prof = (t: number) => 0.18 + 0.82 * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.3)), 0.7);
const half = (l: FishLook, t: number) => l.aspect * prof(t);

function bodyGeometry(l: FishLook) {
  const pos: number[] = [],
    col: number[] = [],
    idx: number[] = [];
  const back = new T.Color(l.back),
    belly = new T.Color(l.belly),
    bar = new T.Color(l.bars?.color ?? "#000"),
    patch = new T.Color(l.patches ?? "#000"),
    c = new T.Color();
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG,
      h = half(l, t);
    for (let j = 0; j < RING; j++) {
      const a = (j / RING) * Math.PI * 2,
        s = Math.sin(a),
        y = h * s * (s < 0 ? 0.8 : 1);
      pos.push(t - 0.5, y, h * WIDTH * Math.cos(a));
      c.copy(back).lerp(belly, T.MathUtils.smoothstep(-s, -0.25, 0.45));
      if (l.bars && t > 0.25 && t < 0.78) {
        const k = Math.max(0, Math.sin(t * l.bars.count * Math.PI * 1.6));
        c.lerp(bar, k * l.bars.strength * T.MathUtils.smoothstep(s, -0.5, 0.2));
      }
      if (l.patches && Math.sin(t * 17 + Math.sin(a * 3) * 2) * Math.sin(t * 5 + a * 2 + 1) > 0.25)
        c.copy(patch);
      if (l.scales) c.multiplyScalar(0.92 + 0.08 * Math.sin(t * l.scales * 6) * Math.sin(a * 12));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < SEG; i++)
    for (let j = 0; j < RING; j++) {
      const a = i * RING + j,
        b = i * RING + ((j + 1) % RING);
      idx.push(a, a + RING, b, b, a + RING, b + RING);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Fin along the body edge: base on the outline, tip `fh` away; sign +1 top, -1 bottom. */
function ridgeFin(l: FishLook, [t0, t1, fh]: [number, number, number], sign: 1 | -1) {
  const s = new T.Shape(),
    edge = (t: number) => sign * half(l, t) * 0.92;
  s.moveTo(t0 - 0.5, edge(t0));
  s.quadraticCurveTo(
    t0 - 0.5 + (t1 - t0) * 0.3,
    edge(t0) + sign * fh * 1.6,
    t1 - 0.5,
    edge(t1) + sign * fh * 0.3,
  );
  s.lineTo(t1 - 0.5, edge(t1));
  s.closePath();
  return new T.ShapeGeometry(s, 8);
}
function tailFin(l: FishLook) {
  const n = l.tailLen,
    w = l.aspect * (l.patches ? 1.3 : 1.15),
    p = half(l, 0) * 0.9,
    s = new T.Shape();
  s.moveTo(0, p);
  s.quadraticCurveTo(-n * 0.5, p + w * 0.6, -n, w);
  s.quadraticCurveTo(-n * 0.55, w * 0.25, -n * 0.6, 0);
  s.quadraticCurveTo(-n * 0.55, -w * 0.25, -n, -w);
  s.quadraticCurveTo(-n * 0.5, -p - w * 0.6, 0, -p);
  s.closePath();
  return new T.ShapeGeometry(s, 8);
}
function pectoralFin(l: FishLook) {
  const s = new T.Shape(),
    r = l.aspect * 0.8;
  s.moveTo(0, 0);
  s.quadraticCurveTo(-r * 0.6, r * 0.2, -r * 1.4, -r * 0.9);
  s.quadraticCurveTo(-r * 0.4, -r * 0.3, 0, -r * 0.1);
  return new T.ShapeGeometry(s, 6);
}

interface Parts {
  look: FishLook;
  body: T.BufferGeometry;
  tail: T.BufferGeometry;
  dorsal: T.BufferGeometry;
  anal: T.BufferGeometry;
  pect: T.BufferGeometry;
  bodyMat: T.MeshStandardMaterial;
  finMat: T.MeshStandardMaterial;
  tailMat: T.MeshStandardMaterial;
}
const cache = new Map<FishLook, Parts>();
function parts(l: FishLook): Parts {
  let p = cache.get(l);
  if (!p) {
    const fin = (color: string) =>
      new T.MeshStandardMaterial({
        color,
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.82,
        roughness: 0.6,
        depthWrite: false,
        emissive: l.glow ?? "#000",
        emissiveIntensity: l.glow ? 0.9 : 0,
      });
    p = {
      look: l,
      body: bodyGeometry(l),
      tail: tailFin(l),
      dorsal: ridgeFin(l, l.dorsal, 1),
      anal: ridgeFin(l, l.anal, -1),
      pect: pectoralFin(l),
      bodyMat: new T.MeshStandardMaterial({
        vertexColors: true,
        metalness: l.metal,
        roughness: l.rough,
      }),
      finMat: fin(l.fin),
      tailMat: fin(l.tail),
    };
    cache.set(l, p);
  }
  return p;
}

const DARK = "#1d1a17";
/** Procedural side-view fish, head toward +x. `glow` adds a subtle rarity rim. */
export function FishModel({
  fishId,
  sizeCm,
  glow,
}: {
  fishId?: string | null | undefined;
  sizeCm: number;
  glow?: string;
}) {
  const p = useMemo(() => parts(fishLook(fishId)), [fishId]),
    l = p.look,
    tail = useRef<T.Group>(null),
    body = useRef<T.Group>(null),
    mat = useMemo(() => {
      const m = p.bodyMat.clone();
      if (glow) {
        m.emissive = new T.Color(glow);
        m.emissiveIntensity = 0.18;
      }
      return m;
    }, [p, glow]);
  // 8 cm -> ~0.6 units, 130 cm -> ~1.3, so small fish stay visible in hand.
  const len = 0.55 + Math.min(sizeCm, 130) * 0.006;
  useFrame(({ clock }) => {
    const w = Math.sin(clock.elapsedTime * 14);
    if (tail.current) tail.current.rotation.y = w * 0.4;
    if (body.current) body.current.rotation.y = -w * 0.06;
  });
  const eyeT = 0.88,
    eyeY = half(l, eyeT) * 0.35,
    eyeZ = half(l, eyeT) * WIDTH * 0.92,
    mouthY = l.upturned ? half(l, 1) * 0.5 : -half(l, 0.96) * 0.15,
    gillZ = half(l, 0.78) * WIDTH * 1.02;
  return (
    <group scale={len}>
      <group ref={body}>
        <mesh geometry={p.body} material={mat} />
        <group ref={tail} position={[-0.5, 0, 0]}>
          <mesh geometry={p.tail} material={p.tailMat} />
        </group>
        <mesh geometry={p.dorsal} material={p.finMat} />
        <mesh geometry={p.anal} material={p.finMat} />
        {[1, -1].map((side) => (
          <group key={side}>
            <mesh
              geometry={p.pect}
              material={p.finMat}
              position={[0.78 - 0.5, -half(l, 0.78) * 0.4, side * half(l, 0.78) * WIDTH * 0.9]}
              rotation={[side * 0.9, 0, 0]}
            />
            <group position={[eyeT - 0.5, eyeY, side * eyeZ]}>
              <mesh>
                <sphereGeometry args={[l.aspect * 0.2, 10, 8]} />
                <meshStandardMaterial color="#e9c46a" roughness={0.3} />
              </mesh>
              <mesh position={[0.004, 0, side * l.aspect * 0.12]}>
                <sphereGeometry args={[l.aspect * 0.11, 8, 6]} />
                <meshBasicMaterial color={DARK} />
              </mesh>
            </group>
            <mesh position={[0.78 - 0.5, 0, side * gillZ]} rotation={[0, 0, Math.PI - 0.8]}>
              <torusGeometry args={[half(l, 0.78) * 0.75, 0.004, 4, 10, 1.6]} />
              <meshBasicMaterial color={DARK} />
            </mesh>
            <mesh
              position={[0.49, mouthY, side * half(l, 0.96) * WIDTH * 0.5]}
              rotation={[0, 0, l.upturned ? 0.5 : 0]}
            >
              <boxGeometry args={[0.05, 0.006, 0.006]} />
              <meshBasicMaterial color={DARK} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
