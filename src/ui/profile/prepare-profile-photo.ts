import { PROFILE_PHOTO_JPEG_PREFIX } from "./profile-photos";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_PHOTO_BYTES = 32 * 1024;
const PHOTO_SIZE = 256;

/** Crop and re-encode locally so only a small portrait, without file metadata, is saved. */
export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!PHOTO_TYPES.includes(file.type)) {
    throw new Error("Pilih foto JPG, PNG, atau WebP.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Ukuran foto maksimal 12 MB.");
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const { naturalWidth: width, naturalHeight: height } = image;
    if (!width || !height || width * height > 40_000_000) {
      throw new Error("Resolusi foto terlalu besar. Pilih gambar yang lebih kecil.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Foto tidak bisa disiapkan di perangkat ini.");
    const crop = Math.min(width, height);
    context.fillStyle = "#f8f2e9";
    context.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
    context.drawImage(
      image,
      (width - crop) / 2,
      (height - crop) / 2,
      crop,
      crop,
      0,
      0,
      PHOTO_SIZE,
      PHOTO_SIZE,
    );

    for (const quality of [0.85, 0.72, 0.58, 0.45, 0.32]) {
      const photo = canvas.toDataURL("image/jpeg", quality);
      const bytes = ((photo.length - PROFILE_PHOTO_JPEG_PREFIX.length) * 3) / 4;
      if (photo.startsWith(PROFILE_PHOTO_JPEG_PREFIX) && bytes <= MAX_PHOTO_BYTES) return photo;
    }
    throw new Error("Foto tidak bisa diperkecil. Coba pilih foto lain.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
