/**
 * Pose animasi lokal yang di-broadcast ke pemain lain (Sit, Hit, Fall, Wave, …).
 * Diisi tiap frame dari Player; dibaca oleh RemotePlayers saat sync.
 */

let anim: string | undefined;

export function setLocalNetAnim(next: string | undefined) {
  anim = next;
}

export function getLocalNetAnim() {
  return anim;
}
