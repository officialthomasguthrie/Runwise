/**
 * Regenerates public favicons with inner padding so circular masks (Google SERP,
 * some browsers) do not clip the logo.
 *
 * Source image (first match):
 *   1) public/favicon.source-fullbleed.png — full-bleed logo (add this locally to re-tune)
 *   2) public/favicon.png
 *
 * Outputs: favicon.png (512), favicon-32.png, favicon-48.png, apple-touch-icon.png
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '../public');
const masterPath = path.join(pub, 'favicon.source-fullbleed.png');
const fallbackPath = path.join(pub, 'favicon.png');

async function main() {
  let inputPath = fs.existsSync(masterPath) ? masterPath : fallbackPath;
  if (!fs.existsSync(fallbackPath)) {
    console.error('Missing public/favicon.png');
    process.exit(1);
  }

  if (inputPath === fallbackPath) {
    const meta = await sharp(fallbackPath).metadata();
    const stat = fs.statSync(fallbackPath);
    const looksPadded =
      meta.width === 512 &&
      meta.height === 512 &&
      stat.size < 200_000;
    if (looksPadded) {
      console.error(
        'public/favicon.png is already the padded export. To regenerate, add your full-bleed logo as public/favicon.source-fullbleed.png (gitignored) and run again.'
      );
      process.exit(1);
    }
    console.warn(
      'Using public/favicon.png as source. For future runs, save the full-bleed logo as public/favicon.source-fullbleed.png'
    );
  }

  const TARGET = 512;
  /** Fraction of canvas left empty on each side (~66% diameter for the mark) */
  const inset = 0.17;
  const inner = Math.round(TARGET * (1 - 2 * inset));

  const resized = await sharp(inputPath)
    .resize(inner, inner, {
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  const padded512 = await sharp({
    create: {
      width: TARGET,
      height: TARGET,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp(padded512).toFile(path.join(pub, 'favicon.png'));
  await sharp(padded512).resize(32, 32).png().toFile(path.join(pub, 'favicon-32.png'));
  await sharp(padded512).resize(48, 48).png().toFile(path.join(pub, 'favicon-48.png'));
  await sharp(padded512).resize(180, 180).png().toFile(path.join(pub, 'apple-touch-icon.png'));

  console.log(
    'Wrote favicon.png (512), favicon-32.png, favicon-48.png, apple-touch-icon.png (padded for circular crops)'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
