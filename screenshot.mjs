/**
 * screenshot.mjs
 * Usage:
 *   node screenshot.mjs <url> [label]
 *
 * Saves to ./temporary screenshots/screenshot-N[-label].png
 * Auto-increments; never overwrites.
 */
import puppeteer from 'puppeteer';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

// Ensure output dir
const outDir = join(__dirname, 'temporary screenshots');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// Next screenshot number
const existing = readdirSync(outDir);
const nums = existing
  .map(f => f.match(/^screenshot-(\d+)/))
  .filter(Boolean)
  .map(m => parseInt(m[1], 10));
const next = nums.length ? Math.max(...nums) + 1 : 1;

const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const filepath = join(outDir, filename);

// Try known Chrome paths; add yours if different
const chromePaths = [
  'C:/Users/HP/.cache/puppeteer/chrome/win64-130.0.6723.116/chrome-win64/chrome.exe',
  'C:/Users/nateh/.cache/puppeteer/chrome/win64-130.0.6723.116/chrome-win64/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

const executablePath = chromePaths.find(p => existsSync(p));
if (!executablePath) {
  console.error('Chrome not found. Update chromePaths in screenshot.mjs.');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

// Scroll through page to trigger IntersectionObserver animations
await page.evaluate(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const step = window.innerHeight;
  const maxScroll = document.body.scrollHeight;
  for (let y = 0; y <= maxScroll; y += step) {
    window.scrollTo(0, y);
    await delay(200);
  }
  window.scrollTo(0, 0);
  await delay(1500);
});

await page.screenshot({ path: filepath, fullPage: true });
await browser.close();

console.log(`\n  Screenshot saved: ${filepath}\n`);
