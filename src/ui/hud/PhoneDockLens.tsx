import { useEffect, useId, useRef, type RefObject } from "react";

// R/G encode horizontal/vertical sampling offsets; neutral pixels preserve the source.
function capsuleMap(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const pixels = ctx.createImageData(width, height);
  const radius = height / 2;
  const rim = Math.min(11, radius * 0.36);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5;
      const dx = px - Math.max(radius, Math.min(px, width - radius));
      const dy = y + 0.5 - radius;
      const distance = Math.hypot(dx, dy);
      const depth = radius - distance;
      // Bend the image towards the outer surface of the bevel, easing into the flat center.
      const bend =
        depth >= 0 && depth < rim ? (Math.pow(1 - depth / rim, 1.45) * 127) / distance : 0;
      const i = (y * width + x) * 4;
      pixels.data[i] = 128 + dx * bend;
      pixels.data[i + 1] = 128 + dy * bend;
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Filter the artwork that scrolls behind the dock. Its four controls stay on a separate crisp layer. */
export function PhoneDockLens({
  content,
  dock,
}: {
  content: RefObject<HTMLDivElement | null>;
  dock: RefObject<HTMLElement | null>;
}) {
  const id = useId();
  const map = useRef<SVGFEImageElement>(null);
  useEffect(() => {
    const source = content.current;
    const nav = dock.current;
    const image = map.current;
    if (!source || !nav || !image) return;
    let lastSize = "";
    function fit() {
      if (!source || !nav || !image) return;
      const width = nav.offsetWidth;
      const height = nav.offsetHeight;
      if (!width || !height) return;
      image.setAttribute("x", String(nav.offsetLeft - source.offsetLeft));
      image.setAttribute("y", String(nav.offsetTop - source.offsetTop));
      const size = width + "x" + height;
      if (size === lastSize) return;
      const url = capsuleMap(width, height);
      if (!url) return;
      lastSize = size;
      image.setAttribute("width", String(width));
      image.setAttribute("height", String(height));
      image.setAttribute("href", url);
      source.style.setProperty("--phone-lens", 'url("#' + id + '")');
    }
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(nav);
    observer.observe(source);
    return () => {
      observer.disconnect();
      source.style.removeProperty("--phone-lens");
    };
  }, [id, content, dock]);
  return (
    <svg className="phone-lens-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id={id} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feFlood floodColor="#808000" result="neutral" />
          <feImage ref={map} preserveAspectRatio="none" result="rim" />
          <feMerge>
            <feMergeNode in="neutral" />
            <feMergeNode in="rim" />
          </feMerge>
          <feComponentTransfer result="offsets">
            <feFuncR type="linear" intercept={0.5 - 128 / 255} />
            <feFuncG type="linear" intercept={0.5 - 128 / 255} />
          </feComponentTransfer>
          <feDisplacementMap
            in="SourceGraphic"
            in2="offsets"
            scale="32"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
