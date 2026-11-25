// node tools/zoomshot.mjs out.png x y w h [scale]  -> high-res crop of a screen region
import fs from 'node:fs';
import { connect } from './cdp-lib.mjs';
const [out, x, y, w, h, scale = 4] = process.argv.slice(2);
const { send, close } = await connect();
const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: +x, y: +y, width: +w, height: +h, scale: +scale } });
if (!r.result) { console.error('capture failed:', JSON.stringify(r.error)); process.exit(1); }
fs.writeFileSync(out, Buffer.from(r.result.data, 'base64')); console.log('saved', out); close(); process.exit(0);
