/** Visual phases share the order ETA; stock settlement remains exclusively on the server. */
export function deliveryPose(now: number, eta: number, doorZ: number, roadZ: number) {
  const seconds = (now - eta) / 1000;
  const smooth = (t: number) => {
    const k = Math.max(0, Math.min(1, t));
    return k * k * (3 - 2 * k);
  };
  const truckX =
    seconds < -20
      ? -40 * (1 - smooth((seconds + 30) / 10))
      : seconds > 5
        ? 40 * smooth((seconds - 5) / 15)
        : 0;
  const phase = Math.max(0, seconds + 20) % 10;
  const forward = phase < 5;
  const progress = forward ? phase / 5 : 2 - phase / 5;
  const dx = 6.3,
    dz = doorZ - roadZ + 1.65;
  return {
    visible: seconds >= -30 && seconds < 20,
    truckX,
    unloading: seconds >= -20 && seconds < 0,
    carrying: forward,
    porter: {
      x: -3.6 + progress * dx,
      z: roadZ - 1.65 + progress * dz,
      yaw: Math.atan2(dx, dz) + (forward ? 0 : Math.PI),
    },
  };
}
