/*
 * Generate resources/icon.ico from resources/icon-source.png.
 *
 * Resizes the source to all the sizes Windows expects (16/32/48/64/128/256)
 * and bundles them into a single multi-resolution .ico. Run via `npm run icon`.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;

const SIZES = [16, 32, 48, 64, 128, 256];

async function main() {
  const source = path.resolve(__dirname, '..', 'resources', 'icon-source.png');
  const out = path.resolve(__dirname, '..', 'resources', 'icon.ico');

  if (!fs.existsSync(source)) {
    throw new Error(`Source icon not found: ${source}`);
  }

  const buffers = await Promise.all(
    SIZES.map((size) =>
      sharp(source)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer()
    )
  );

  const ico = await pngToIco(buffers);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, ico);
  console.log(`Wrote ${out} (${fs.statSync(out).size} bytes, ${SIZES.length} sizes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
