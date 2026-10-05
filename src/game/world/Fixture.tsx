/** @jsxImportSource @/game/jsx */
import { Component, Suspense, type ReactNode } from "react";
import { Model } from "./Model";

class AssetFallback extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Asset replacement only affects visuals: fixture collider and gameplay stay outside. */
export function Fixture({
  assetUrl,
  height,
  children,
}: {
  assetUrl?: string;
  height: number;
  children: ReactNode;
}) {
  if (!assetUrl) return <>{children}</>;
  return (
    <AssetFallback key={assetUrl} fallback={children}>
      <Suspense fallback={children}>
        <Model url={assetUrl} height={height} />
      </Suspense>
    </AssetFallback>
  );
}
