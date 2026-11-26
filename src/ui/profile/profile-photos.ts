import explorer from "./photos/explorer.webp";
import kokoCung from "./photos/koko-cung.webp";
import ojol from "./photos/ojol.webp";
import warung from "./photos/warung.webp";
import musisi from "./photos/musisi.webp";

export const PROFILE_PHOTOS = [
  { value: "preset:explorer", label: "Penjelajah", src: explorer },
  { value: "preset:koko-cung", label: "Koko Cung", src: kokoCung },
  { value: "preset:ojol", label: "Pengemudi", src: ojol },
  { value: "preset:warung", label: "Pemilik Warung", src: warung },
  { value: "preset:musisi", label: "Musisi", src: musisi },
] as const;

export const PROFILE_PHOTO_JPEG_PREFIX = "data:image/jpeg;base64,";

export function profilePhotoSource(photo?: string | null) {
  if (photo?.startsWith(PROFILE_PHOTO_JPEG_PREFIX)) return photo;
  return PROFILE_PHOTOS.find(({ value }) => value === photo)?.src;
}
