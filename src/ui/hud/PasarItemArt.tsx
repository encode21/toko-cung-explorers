const OUTLINE = "#704f3f";

export function PasarItemArt({
  id,
  size = 56,
  className = "",
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={"pasar-item-art " + className}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="60" cy="60" r="54" fill="#fff1ce" />
      <Artwork id={id} />
    </svg>
  );
}

function Artwork({ id }: { id: string }) {
  switch (id) {
    case "bakwan":
      return (
        <g>
          <Tray />
          <path
            d="M25 59c-3-11 7-20 18-17 11 2 15 16 7 24-8 8-22 4-25-7Z"
            fill="#e8a733"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <path
            d="M48 53c2-12 15-17 24-9 10 8 5 24-7 27-11 3-20-7-17-18Z"
            fill="#f0b13d"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <path
            d="M72 59c-3-11 7-20 18-17 11 2 15 16 7 24-8 8-22 4-25-7Z"
            fill="#dc8e2e"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <circle cx="38" cy="52" r="2" fill="#78a444" />
          <circle cx="63" cy="57" r="2" fill="#d46e2b" />
          <circle cx="87" cy="51" r="2" fill="#78a444" />
        </g>
      );
    case "tahu-isi":
      return (
        <g>
          <Tray />
          <path d="M27 69 42 39l19 31Z" fill="#f0b44c" stroke={OUTLINE} strokeWidth="3" />
          <path d="M50 70 67 36l22 34Z" fill="#e19a36" stroke={OUTLINE} strokeWidth="3" />
          <path d="m58 59 9-18 10 18Z" fill="#80a84d" />
        </g>
      );
    case "pisang-goreng":
      return (
        <g>
          <Tray />
          <path
            d="M24 46c9 20 25 24 39 10-3 19-21 28-35 18-9-7-10-18-9-28Z"
            fill="#f6c24d"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <path
            d="M44 41c8 18 22 22 35 9-2 18-18 27-32 18-8-6-9-17-8-27Z"
            fill="#efad36"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <path
            d="M64 47c8 17 21 20 34 8-2 17-18 25-30 16-8-5-9-15-9-24Z"
            fill="#f8ce58"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
        </g>
      );
    case "martabak-telor":
      return (
        <g>
          <Plate />
          <g transform="rotate(-6 60 58)">
            <rect
              x="33"
              y="38"
              width="18"
              height="15"
              rx="2"
              fill="#efb844"
              stroke={OUTLINE}
              strokeWidth="1.5"
            />
            <rect
              x="52"
              y="38"
              width="18"
              height="15"
              rx="2"
              fill="#d58b2d"
              stroke={OUTLINE}
              strokeWidth="1.5"
            />
            <rect
              x="71"
              y="38"
              width="18"
              height="15"
              rx="2"
              fill="#efb844"
              stroke={OUTLINE}
              strokeWidth="1.5"
            />
            <rect
              x="33"
              y="54"
              width="18"
              height="15"
              rx="2"
              fill="#d58b2d"
              stroke={OUTLINE}
              strokeWidth="1.5"
            />
            <rect
              x="52"
              y="54"
              width="18"
              height="15"
              rx="2"
              fill="#efb844"
              stroke={OUTLINE}
              strokeWidth="1.5"
            />
            <rect
              x="71"
              y="54"
              width="18"
              height="15"
              rx="2"
              fill="#d58b2d"
              stroke={OUTLINE}
              strokeWidth="1.5"
            />
            <circle cx="43" cy="45" r="1.8" fill="#5f934a" />
            <circle cx="67" cy="59" r="1.8" fill="#5f934a" />
            <circle cx="80" cy="48" r="1.8" fill="#5f934a" />
          </g>
        </g>
      );
    case "martabak-manis":
      return (
        <g>
          <Plate />
          <path
            d="M27 62c2-22 17-34 35-34 18 0 31 11 34 30-16 14-52 17-69 4Z"
            fill="#d98a36"
            stroke={OUTLINE}
            strokeWidth="3"
          />
          <path d="M34 57c11-10 41-16 55-5-12 9-41 15-55 5Z" fill="#f5ce65" />
          <path d="m43 48 4 3m8-7 5 3m8-4 4 3m7 1 4 3" stroke="#6e432e" strokeWidth="3" />
        </g>
      );
    case "pisang":
      return (
        <g>
          <path
            d="M42 31c-7 25 1 48 23 58 10 5 20 1 25-7-22 0-34-16-31-49Z"
            fill="#f4bd32"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <path
            d="M50 29c-3 25 8 45 29 51 10 3 18-2 21-10-21 4-35-9-38-40Z"
            fill="#ffd75d"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <path
            d="M34 36c-8 23-1 42 17 52 10 5 19 3 24-4-20-2-29-17-27-46Z"
            fill="#f8ca41"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <path d="M51 27c6-7 12-7 17-1" fill="none" stroke="#5f8a3c" strokeWidth="6" />
        </g>
      );
    case "jeruk":
      return (
        <g>
          <circle cx="59" cy="63" r="31" fill="#f49b2f" stroke={OUTLINE} strokeWidth="3" />
          <path
            d="M57 34c8-15 19-16 29-7-9 8-18 11-29 7Z"
            fill="#61a552"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <path d="M58 33v8" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
          <circle cx="48" cy="54" r="4" fill="#ffc85c" opacity=".7" />
        </g>
      );
    case "mangga":
      return (
        <g>
          <path
            d="M72 30c21 14 18 49-2 62-20 14-43-2-42-24 2-22 18-42 44-38Z"
            fill="#efb63f"
            stroke={OUTLINE}
            strokeWidth="3"
          />
          <path
            d="M67 31c4-15 17-18 29-9-8 10-17 14-29 9Z"
            fill="#5c9f4d"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <path
            d="M39 62c4-12 11-19 21-23"
            fill="none"
            stroke="#ffd76c"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>
      );
    case "ikan-bakar":
      return (
        <g>
          <Plate />
          <path d="m27 58-13-12v25Z" fill="#d16b36" stroke={OUTLINE} strokeWidth="3" />
          <path
            d="M27 58c17-24 49-24 69 0-20 24-52 24-69 0Z"
            fill="#c96a38"
            stroke={OUTLINE}
            strokeWidth="3"
          />
          <circle cx="83" cy="53" r="3" fill="#fff3d0" />
          <path d="m43 43 12 29m2-34 12 37m2-32 9 28" stroke="#7c432d" strokeWidth="3" />
        </g>
      );
    case "pecel-lele":
      return (
        <g>
          <Plate />
          <circle cx="38" cy="51" r="14" fill="#f4efe0" stroke={OUTLINE} strokeWidth="2" />
          <path d="m46 69-11-9v18Z" fill="#9c633a" stroke={OUTLINE} strokeWidth="2" />
          <path
            d="M46 69c14-17 34-18 49-2-14 18-35 19-49 2Z"
            fill="#79513e"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <circle cx="84" cy="64" r="2" fill="#fff1ce" />
          <circle cx="76" cy="42" r="10" fill="#e05334" stroke={OUTLINE} strokeWidth="2" />
          <path d="M28 72c6-1 10 2 13 7" stroke="#5f9b4b" strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case "sell-fruit":
      return (
        <g>
          <path d="M25 54h70l-9 38H34Z" fill="#d69543" stroke={OUTLINE} strokeWidth="3" />
          <path d="M39 55c2-26 40-26 42 0" fill="none" stroke={OUTLINE} strokeWidth="5" />
          <circle cx="43" cy="52" r="13" fill="#f39a31" stroke={OUTLINE} strokeWidth="2" />
          <circle cx="63" cy="47" r="14" fill="#e75945" stroke={OUTLINE} strokeWidth="2" />
          <path
            d="M72 57c3-18 17-25 28-15-2 15-12 25-28 15Z"
            fill="#f4c63d"
            stroke={OUTLINE}
            strokeWidth="2"
          />
          <path
            d="M35 67h54M33 79h55M48 58l-4 34m20-35v35m17-34-5 34"
            stroke="#8a5a32"
            strokeWidth="2"
          />
        </g>
      );
    case "sell-fish":
      return (
        <g>
          <path d="M35 48h50l-6 46H41Z" fill="#65b7c6" stroke={OUTLINE} strokeWidth="3" />
          <path d="M42 49c1-25 35-25 36 0" fill="none" stroke={OUTLINE} strokeWidth="5" />
          <path d="m33 51-15-13v26Z" fill="#7ba0ad" stroke={OUTLINE} strokeWidth="2.5" />
          <path
            d="M33 51c13-18 34-18 50 0-16 18-37 18-50 0Z"
            fill="#83bfbe"
            stroke={OUTLINE}
            strokeWidth="2.5"
          />
          <circle cx="71" cy="47" r="2.5" fill="#2f3d43" />
          <path d="M45 79h30" stroke="#d9f0ed" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    default:
      return (
        <g>
          <path d="M30 30h60l-5 64H35Z" fill="#e5b873" stroke={OUTLINE} strokeWidth="3" />
          <path d="M42 30c1-20 35-20 36 0" fill="none" stroke={OUTLINE} strokeWidth="5" />
        </g>
      );
  }
}

function Plate() {
  return (
    <ellipse cx="60" cy="71" rx="46" ry="23" fill="#f8e8c9" stroke={OUTLINE} strokeWidth="3" />
  );
}

function Tray() {
  return (
    <path
      d="M18 64h84L91 91H29Z"
      fill="#f2d28c"
      stroke={OUTLINE}
      strokeWidth="3"
      strokeLinejoin="round"
    />
  );
}
