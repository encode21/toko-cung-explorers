import { useWarung } from "./store";
/** Hand-drawn product illustrations for Warungku (same flat style as PhoneAppArtwork). */
const STROKE = "#fff9e9";

function Art({ id }: { id: string }) {
  switch (id) {
    case "mi-instan":
      return (
        <g>
          <rect
            x="8"
            y="14"
            width="48"
            height="36"
            rx="6"
            fill="#f6c343"
            stroke={STROKE}
            strokeWidth="3"
          />
          <rect x="8" y="22" width="48" height="10" fill="#e2483d" />
          <path
            d="M16 40c4-4 8 4 12 0s8 4 12 0 8 4 12 0"
            fill="none"
            stroke="#fff4c8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="47" cy="17.5" r="2.5" fill="#e2483d" />
        </g>
      );
    case "kopi-sachet":
      return (
        <g>
          <path
            d="M14 10h36v44H14z"
            fill="#7a4b2a"
            stroke={STROKE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M14 10l4 3 4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3"
            fill="none"
            stroke="#c99a6a"
            strokeWidth="2"
          />
          <path d="M23 30h16v8a8 8 0 0 1-16 0z" fill="#fff4e0" />
          <path d="M39 32h3a3 3 0 0 1 0 6h-3" fill="none" stroke="#fff4e0" strokeWidth="2.5" />
          <path
            d="M27 22c-2 3 2 4 0 7M33 22c-2 3 2 4 0 7"
            stroke="#e9c9a0"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );
    case "teh-gelas":
      return (
        <g>
          <path
            d="M16 14h32l-4 40H20z"
            fill="#e9f6fb"
            stroke={STROKE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M18 24h28l-3 28H21z" fill="#d9772f" />
          <rect x="14" y="10" width="36" height="6" rx="3" fill="#7ac74f" />
          <path d="M24 34h16" stroke="#ffd7a8" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "air-mineral":
      return (
        <g>
          <rect x="26" y="6" width="12" height="7" rx="2" fill="#2f7fd0" />
          <path
            d="M24 13h16l4 8v31a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V21z"
            fill="#bfe6f7"
            stroke={STROKE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <rect x="20" y="30" width="24" height="12" fill="#2f7fd0" />
          <path d="M32 33c-3 4-3 6 0 6s3-2 0-6z" fill="#fff" />
        </g>
      );
    case "kerupuk":
      return (
        <g>
          <rect
            x="12"
            y="12"
            width="40"
            height="44"
            rx="5"
            fill="#d8dde3"
            stroke={STROKE}
            strokeWidth="3"
          />
          <rect x="16" y="22" width="32" height="26" rx="3" fill="#bfe6f7" opacity="0.7" />
          <circle cx="26" cy="32" r="6" fill="#f5e6b8" stroke="#e0c98a" strokeWidth="1.5" />
          <circle cx="38" cy="38" r="6" fill="#f5e6b8" stroke="#e0c98a" strokeWidth="1.5" />
          <rect x="10" y="8" width="44" height="7" rx="3" fill="#e2483d" />
        </g>
      );
    case "telur":
      return (
        <g>
          <path
            d="M8 44h48l-4 10H12z"
            fill="#c9a77a"
            stroke={STROKE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <ellipse
            cx="24"
            cy="34"
            rx="9"
            ry="12"
            fill="#f3d9b5"
            stroke={STROKE}
            strokeWidth="2.5"
          />
          <ellipse
            cx="40"
            cy="34"
            rx="9"
            ry="12"
            fill="#ead0a8"
            stroke={STROKE}
            strokeWidth="2.5"
          />
        </g>
      );
    case "gula":
      return (
        <g>
          <path
            d="M16 12h32l3 42H13z"
            fill="#fbfbf7"
            stroke="#d8d2c2"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M18 12l3-4h22l3 4" fill="#e9e4d6" />
          <rect x="18" y="28" width="28" height="12" rx="3" fill="#3fa7c9" />
          <text x="32" y="37.5" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff">
            GULA
          </text>
        </g>
      );
    case "minyak":
      return (
        <g>
          <rect x="27" y="5" width="10" height="6" rx="2" fill="#e2483d" />
          <path
            d="M22 11h20l4 10v30a5 5 0 0 1-5 5H23a5 5 0 0 1-5-5V21z"
            fill="#f6c343"
            stroke={STROKE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <rect x="18" y="28" width="28" height="12" fill="#59b36a" />
          <path d="M28 34c0-3 4-5 4-5s4 2 4 5a4 4 0 0 1-8 0z" fill="#fff4c8" />
        </g>
      );
    case "beras":
      return (
        <g>
          <path
            d="M14 14c6 3 30 3 36 0l4 38c0 4-44 4-44 0z"
            fill="#efe7d2"
            stroke={STROKE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M22 8h20l-2 7H24z" fill="#d8cdb0" />
          <rect x="18" y="28" width="28" height="12" rx="3" fill="#59b36a" />
          <text x="32" y="37.5" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff">
            BERAS
          </text>
        </g>
      );
    case "sabun":
      return (
        <g>
          <rect
            x="10"
            y="20"
            width="44"
            height="26"
            rx="8"
            fill="#8fd3c1"
            stroke={STROKE}
            strokeWidth="3"
          />
          <rect x="18" y="26" width="28" height="14" rx="5" fill="#d9f4ec" />
          <circle cx="16" cy="14" r="4" fill="#d9f4ec" />
          <circle cx="24" cy="10" r="2.5" fill="#d9f4ec" />
        </g>
      );
    case "es-krim":
      return (
        <g>
          <path
            d="M22 30h20L32 58z"
            fill="#e0a961"
            stroke={STROKE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M24 36l14 6M26 44l9 4" stroke="#c48a45" strokeWidth="2" />
          <circle cx="32" cy="22" r="12" fill="#f59ac0" stroke={STROKE} strokeWidth="3" />
          <circle cx="28" cy="18" r="2" fill="#fff" />
          <circle cx="37" cy="12" r="3" fill="#e2483d" />
        </g>
      );
    default:
      return <rect x="12" y="12" width="40" height="40" rx="8" fill="#e8d3ad" />;
  }
}

export function ProductArt({ id, size = 40 }: { id: string; size?: number }) {
  // Curated real products show their Toko Cung photo instead of a drawn icon.
  const image = useWarung((s) => s.data?.catalog.find((c) => c.id === id)?.image);
  if (image)
    return (
      <img
        className="warung-product-art warung-product-photo"
        src={image}
        width={size}
        height={size}
        alt=""
        loading="lazy"
        decoding="async"
      />
    );
  return (
    <svg
      className="warung-product-art"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <Art id={id} />
    </svg>
  );
}
