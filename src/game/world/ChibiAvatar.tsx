import { BaseAvatarV2, type AvatarV2Props } from "@/game/avatar/BaseAvatarV2";

/**
 * Legacy import adapter only. `gait` is treated as metres/second (same as
 * `BaseAvatarV2` speed) — do not rescale; playback already maps to walk/run refs.
 */
export function ChibiAvatar({
  gait = 0,
  ...props
}: Omit<AvatarV2Props, "speed"> & { gait?: number | { current: number } }) {
  return <BaseAvatarV2 {...props} speed={gait} groundToWorld />;
}
