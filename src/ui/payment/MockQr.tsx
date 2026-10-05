/** Visual QR simulasi (deterministik dari payload) — bukan QR Xendit sebenarnya. */
export function MockQr({ payload, size = 168 }: { payload: string; size?: number }) {
  const cells = 21;
  let seed = 0;
  for (let i = 0; i < payload.length; i++) seed = (seed * 31 + payload.charCodeAt(i)) % 2147483647;

  const rects: string[] = [];
  let s = seed || 12345;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      s = (s * 1103515245 + 12345) % 2147483648;
      const corner = (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
      const ring = corner && (x % 6 === 0 || y % 6 === 0 || (x > 1 && x < 5 && y > 1 && y < 5));
      if (corner ? ring : s % 100 > 52) rects.push(`${x},${y}`);
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${cells} ${cells}`}
      role="img"
      aria-label="Kode QRIS simulasi"
      className="rounded-lg bg-white p-1"
    >
      {rects.map((c) => {
        const [x, y] = c.split(",");
        return <rect key={c} x={Number(x)} y={Number(y)} width={1} height={1} fill="#151312" />;
      })}
    </svg>
  );
}
