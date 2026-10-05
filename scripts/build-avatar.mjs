/** Reproducible original asset, not a downloaded third-party avatar. */
import { writeFile, mkdir } from "node:fs/promises";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createAvatarSource } from "../src/game/avatar/avatar-source.ts";
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const { scene, animations } = createAvatarSource();
const binary = await new GLTFExporter().parseAsync(scene, {
  binary: true,
  animations,
  onlyVisible: false,
});
await mkdir("public/assets/characters", { recursive: true });
await writeFile("public/assets/characters/base-avatar-v2.glb", Buffer.from(binary));
console.log(`Original BaseAvatarV2: ${binary.byteLength} bytes, ${animations.length} clips`);
