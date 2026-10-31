import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generateTennisPng(size, isMaskable = false) {
  const width = size;
  const height = size;

  const raw = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  const cx = width / 2;
  const cy = height / 2;
  const ballR = isMaskable ? width * 0.28 : width * 0.34;

  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      // Calculate distance to center
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Wimbledon deep forest green
      let r = 16, g = 58, b = 43, a = 255;

      // Subtle court grid lines
      const inCourtX = Math.abs(x - cx) < width * 0.38;
      const inCourtY = Math.abs(y - cy) < height * 0.38;
      if (inCourtX && inCourtY) {
        if (Math.abs(dx) <= 2 || Math.abs(dy) <= 2) {
          r = 45; g = 100; b = 75;
        }
      }

      // Ball
      if (dist <= ballR) {
        // Tennis ball optic yellow / lime
        const shade = 1 - (dist / ballR) * 0.3;
        r = Math.floor(212 * shade);
        g = Math.floor(249 * shade);
        b = Math.floor(51 * shade);

        // Seams on ball
        const seam1 = Math.abs(Math.sqrt((x - (cx - ballR * 0.5)) ** 2 + dy ** 2) - ballR * 0.7);
        const seam2 = Math.abs(Math.sqrt((x - (cx + ballR * 0.5)) ** 2 + dy ** 2) - ballR * 0.7);
        const seamWidth = Math.max(2, size * 0.015);
        if (seam1 < seamWidth || seam2 < seamWidth) {
          r = 255; g = 255; b = 255;
        }
      }

      // Small analytics chart pill badge in bottom right
      if (x >= width * 0.6 && x <= width * 0.88 && y >= height * 0.6 && y <= height * 0.85) {
        r = 30; g = 41; b = 59;
        // Bars
        const bx = (x - width * 0.6) / (width * 0.28);
        const by = 1 - (y - height * 0.6) / (height * 0.25);
        if (bx >= 0.15 && bx <= 0.3 && by <= 0.4) {
          r = 56; g = 189; b = 248; // Cyan
        } else if (bx >= 0.38 && bx <= 0.53 && by <= 0.65) {
          r = 34; g = 197; b = 94; // Green
        } else if (bx >= 0.61 && bx <= 0.76 && by <= 0.85) {
          r = 250; g = 204; b = 21; // Yellow
        }
      }

      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // No interlace

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateTennisPng(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateTennisPng(512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generateTennisPng(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateTennisPng(180));

console.log('PNG Icons generated successfully.');
