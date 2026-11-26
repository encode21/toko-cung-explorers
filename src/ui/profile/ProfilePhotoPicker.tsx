import { useRef, useState } from "react";
import { Camera, Check } from "lucide-react";
import { useProfile, type PlayerProfile } from "@/identity/profile-store";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { AvatarPortrait } from "./AvatarPortrait";
import { prepareProfilePhoto } from "./prepare-profile-photo";
import { PROFILE_PHOTOS, PROFILE_PHOTO_JPEG_PREFIX, profilePhotoSource } from "./profile-photos";
import "./profile-photo-picker.css";

type PortraitProfile = Pick<PlayerProfile, "avatar" | "equippedCharacter">;

export function ProfilePhotoPortrait({
  profile,
  photo,
  label,
}: {
  profile: PortraitProfile;
  photo: string | null | undefined;
  label: string;
}) {
  const source = profilePhotoSource(photo);
  return source ? (
    <img className="profile-photo-image" src={source} alt={label} />
  ) : (
    <AvatarPortrait avatar={profile.avatar} character={profile.equippedCharacter} label={label} />
  );
}

export function ProfilePhotoPicker({
  profile,
  onClose,
}: {
  profile: PlayerProfile;
  onClose: () => void;
}) {
  const save = useProfile((s) => s.save);
  const saved = profilePhotoSource(profile.photo) ? (profile.photo ?? null) : null;
  const [selected, setSelected] = useState(saved);
  const [custom, setCustom] = useState(saved?.startsWith(PROFILE_PHOTO_JPEG_PREFIX) ? saved : null);
  const [preparing, setPreparing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const busy = preparing || applying;

  function select(photo: string | null) {
    setSelected(photo);
    setError(null);
  }

  async function chooseFile(file: File) {
    setPreparing(true);
    setError(null);
    try {
      const photo = await prepareProfilePhoto(file);
      setCustom(photo);
      select(photo);
    } catch (error) {
      setError(
        error instanceof Error && !(error instanceof DOMException)
          ? error.message
          : "Foto tidak bisa dibuka. Coba pilih foto lain.",
      );
    } finally {
      setPreparing(false);
    }
  }

  async function apply() {
    if (busy || selected === saved) return;
    setApplying(true);
    setError(null);
    const result = await save({ photo: selected });
    if (result) {
      setError(result);
      setApplying(false);
    } else onClose();
  }

  const choices = [
    { value: null, label: "Avatar game" },
    ...PROFILE_PHOTOS,
    ...(custom ? [{ value: custom, label: "Foto sendiri" }] : []),
  ];
  const selectedLabel = choices.find(({ value }) => value === selected)?.label;

  return (
    <GameModal
      title="Foto profil"
      className="profile-photo-modal"
      bodyClassName="profile-photo-body"
      onClose={() => {
        if (!applying) onClose();
      }}
    >
      <div className="profile-photo-content">
        <div
          className="profile-photo-options"
          role="group"
          aria-label="Pilihan foto profil"
          aria-busy={busy}
        >
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void chooseFile(file);
            }}
          />
          <button
            type="button"
            aria-label="Pilih foto sendiri"
            className="profile-photo-option profile-photo-upload"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <span className="profile-photo-thumb">
              <Camera aria-hidden />
            </span>
            <span>Pilih foto</span>
          </button>
          {choices.map(({ value, label }) => (
            <button
              key={label}
              type="button"
              className="profile-photo-option"
              aria-label={label}
              aria-pressed={selected === value}
              disabled={busy}
              onClick={() => select(value)}
            >
              <span className="profile-photo-thumb">
                <ProfilePhotoPortrait profile={profile} photo={value} label="" />
                {selected === value && <Check className="profile-photo-check" aria-hidden />}
              </span>
            </button>
          ))}
        </div>
        <div className="profile-photo-preview-pane">
          <figure className="profile-photo-preview" aria-label="Pratinjau foto profil">
            <div className="profile-photo-preview-image">
              <ProfilePhotoPortrait
                profile={profile}
                photo={selected}
                label="Pratinjau foto profil"
              />
            </div>
            <figcaption aria-live="polite">{selectedLabel}</figcaption>
          </figure>
          <button
            type="button"
            className="profile-pill profile-primary"
            disabled={busy || selected === saved}
            onClick={() => void apply()}
          >
            {applying ? "Menyimpan…" : "Terapkan"}
          </button>
          {(error || preparing) && (
            <p className="profile-photo-feedback" role={error ? "alert" : "status"}>
              {error ?? "Menyiapkan foto…"}
            </p>
          )}
        </div>
      </div>
    </GameModal>
  );
}
