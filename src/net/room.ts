/** Kode ruangan diambil dari URL (?room=). Default: satu dunia bersama. */
export const DEFAULT_ROOM = "TOKOCUNG";

export function roomCodeFromUrl(): string {
  if (typeof window === "undefined") return DEFAULT_ROOM;
  const code = new URL(window.location.href).searchParams.get("room");
  return (code || DEFAULT_ROOM).toUpperCase().slice(0, 12);
}

export function shareLinkFor(room: string) {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("room", room);
  return url.toString();
}
