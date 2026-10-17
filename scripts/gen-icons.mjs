/**
 * Генерация PNG-иконок и OG-изображения для WEB-16 (без внешних зависимостей).
 * Брендовый квадрат #3b6cf6 с белой «галочкой».
 * Запуск: node scripts/gen-icons.mjs
 * Результат: apps/web/public/icons/{icon-192,icon-512}.png, apps/web/public/og-image.png
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps/web/public');
const BRAND = [0x3b, 0x6c, 0xf6, 0xff];
const WHITE = [0xff, 0xff, 0xff, 0xff];

// --- CRC32 ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function makeImage(width, height) {
  const data = new Uint8Array(width * height * 4); // transparent
  const px = (x, y, color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = color[3];
  };
  return { data, px };
}

function drawRect(px, width, height, color) {
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) px(x, y, color);
}

function drawSegment(px, width, height, x1, y1, x2, y2, radius, color) {
  const steps = Math.ceil(Math.max(width, height));
  for (let t = 0; t <= 1; t += 1 / steps) {
    const cx = x1 + (x2 - x1) * t;
    const cy = y1 + (y2 - y1) * t;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) px(Math.round(cx + dx), Math.round(cy + dy), color);
      }
    }
  }
}

function drawCheck(px, width, height, color) {
  const u = (v) => v * width; // x to px
  const v = (w) => w * height; // y to px
  const r = Math.max(1, Math.round(Math.min(width, height) * 0.05));
  drawSegment(px, width, height, u(0.28), v(0.52), u(0.44), v(0.68), r, color);
  drawSegment(px, width, height, u(0.44), v(0.68), u(0.72), v(0.34), r, color);
}

function gen(name, width, height) {
  const { data, px } = makeImage(width, height);
  drawRect(px, width, height, BRAND);
  drawCheck(px, width, height, WHITE);
  const buf = encodePng(width, height, data);
  const out = join(OUT, name);
  writeFileSync(out, buf);
  console.log('wrote', out, `${buf.length} bytes`);
}

mkdirSync(join(OUT, 'icons'), { recursive: true });
gen('icons/icon-192.png', 192, 192);
gen('icons/icon-512.png', 512, 512);
gen('og-image.png', 1200, 630);