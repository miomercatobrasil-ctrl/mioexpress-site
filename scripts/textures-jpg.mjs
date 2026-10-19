// Texturas do .glb: opacas -> JPEG, com transparência -> PNG com paleta; máximo 1024 px.
// (O WebP dentro do .glb não funciona na prévia publicada; JPEG/PNG funcionam em qualquer lugar.)
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import sharp from "sharp";

const [src, out] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
let jpg = 0, png = 0;
for (const tex of doc.getRoot().listTextures()) {
  const img = tex.getImage();
  if (!img) continue;
  const s = sharp(Buffer.from(img)).resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true });
  const { channels, isOpaque } = await sharp(Buffer.from(img)).stats();
  if (channels < 4 || isOpaque) {
    tex.setImage(new Uint8Array(await s.flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer())).setMimeType("image/jpeg");
    jpg++;
  } else {
    tex.setImage(new Uint8Array(await s.png({ palette: true, quality: 85, compressionLevel: 9 }).toBuffer())).setMimeType("image/png");
    png++;
  }
}
await io.write(out, doc);
console.log(`texturas: ${jpg} jpeg, ${png} png`);
