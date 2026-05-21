/* Generate resources/icon.ico (256x256, blue background with white "PB"). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const SIZE = 256;
const BG = { r: 30, g: 58, b: 138 };
const FG = { r: 255, g: 255, b: 255 };

const LETTERS = {
  P: [
    '##########..',
    '##........#.',
    '##........#.',
    '##........#.',
    '##........#.',
    '##.......##.',
    '##########..',
    '##..........',
    '##..........',
    '##..........',
    '##..........',
    '##..........',
    '##..........',
    '##..........',
  ],
  B: [
    '##########..',
    '##........#.',
    '##........#.',
    '##........#.',
    '##........#.',
    '##.......##.',
    '##########..',
    '##........#.',
    '##........#.',
    '##........#.',
    '##........#.',
    '##........#.',
    '##.......##.',
    '##########..',
  ],
};

const LETTER_W = 12;
const LETTER_H = 14;
const SCALE = 12;
const GAP = 16;
const TOTAL_LETTER_W = LETTER_W * SCALE;
const TOTAL_LETTER_H = LETTER_H * SCALE;
const TOTAL_W = TOTAL_LETTER_W * 2 + GAP;
const ORIGIN_X = Math.floor((SIZE - TOTAL_W) / 2);
const ORIGIN_Y = Math.floor((SIZE - TOTAL_LETTER_H) / 2);

function isInsideLetter(letter, lx, ly) {
  if (lx < 0 || ly < 0 || lx >= LETTER_W || ly >= LETTER_H) return false;
  return LETTERS[letter][ly][lx] === '#';
}

function isForeground(x, y) {
  const ly = Math.floor((y - ORIGIN_Y) / SCALE);
  if (ly < 0 || ly >= LETTER_H) return false;
  const localX = x - ORIGIN_X;
  if (localX < 0) return false;
  if (localX < TOTAL_LETTER_W) {
    const lx = Math.floor(localX / SCALE);
    return isInsideLetter('P', lx, ly);
  }
  const offsetIntoB = localX - TOTAL_LETTER_W - GAP;
  if (offsetIntoB < 0 || offsetIntoB >= TOTAL_LETTER_W) return false;
  const lx = Math.floor(offsetIntoB / SCALE);
  return isInsideLetter('B', lx, ly);
}

function buildPixelData() {
  const data = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const fg = isForeground(x, y);
      const c = fg ? FG : BG;
      const targetY = SIZE - 1 - y;
      const offset = (targetY * SIZE + x) * 4;
      data[offset + 0] = c.b;
      data[offset + 1] = c.g;
      data[offset + 2] = c.r;
      data[offset + 3] = 0xff;
    }
  }
  return data;
}

function buildDIB() {
  const headerSize = 40;
  const pixels = buildPixelData();
  const maskRowBytes = Math.ceil(SIZE / 32) * 4;
  const maskSize = maskRowBytes * SIZE;
  const total = headerSize + pixels.length + maskSize;

  const buf = Buffer.alloc(total);
  buf.writeUInt32LE(headerSize, 0);
  buf.writeInt32LE(SIZE, 4);
  buf.writeInt32LE(SIZE * 2, 8);
  buf.writeUInt16LE(1, 12);
  buf.writeUInt16LE(32, 14);
  buf.writeUInt32LE(0, 16);
  buf.writeUInt32LE(pixels.length, 20);
  buf.writeInt32LE(0, 24);
  buf.writeInt32LE(0, 28);
  buf.writeUInt32LE(0, 32);
  buf.writeUInt32LE(0, 36);
  pixels.copy(buf, headerSize);
  return buf;
}

function buildICO() {
  const dib = buildDIB();
  const dirSize = 6;
  const entrySize = 16;
  const imageOffset = dirSize + entrySize;
  const buf = Buffer.alloc(dirSize + entrySize + dib.length);
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(1, 4);
  buf.writeUInt8(0, dirSize + 0);
  buf.writeUInt8(0, dirSize + 1);
  buf.writeUInt8(0, dirSize + 2);
  buf.writeUInt8(0, dirSize + 3);
  buf.writeUInt16LE(1, dirSize + 4);
  buf.writeUInt16LE(32, dirSize + 6);
  buf.writeUInt32LE(dib.length, dirSize + 8);
  buf.writeUInt32LE(imageOffset, dirSize + 12);
  dib.copy(buf, imageOffset);
  return buf;
}

const out = path.resolve(__dirname, '..', 'resources', 'icon.ico');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buildICO());
console.log(`Wrote ${out} (${fs.statSync(out).size} bytes)`);
