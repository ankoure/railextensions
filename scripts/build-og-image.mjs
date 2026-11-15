// Regenerates public/og-default.png from scripts/og-default.svg.
// Usage: node scripts/build-og-image.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('./og-default.svg', import.meta.url));
const out = fileURLToPath(new URL('../public/og-default.png', import.meta.url));

await sharp(src).png({ compressionLevel: 9 }).toFile(out);
console.log(`Wrote ${out}`);
