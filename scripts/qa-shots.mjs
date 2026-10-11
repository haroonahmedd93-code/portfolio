// Screenshots at the spec widths. Run: node scripts/qa-shots.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:4173';
const widths = [1440, 1024, 768, 390];
mkdirSync('qa', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
for (const path of ['/', '/cases/bayut/']) {
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: w < 800 ? 844 : 900 }, deviceScaleFactor: 1 });
    page.on('console', (m) => m.type() === 'error' && errors.push(`${path}@${w}: ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`${path}@${w}: ${e.message}`));
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const name = (path === '/' ? 'home' : 'case') + `-${w}`;
    await page.screenshot({ path: `qa/${name}-fold.png` });
    await page.screenshot({ path: `qa/${name}-full.png`, fullPage: true });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > w) errors.push(`${path}@${w}: horizontal overflow (${sw} > ${w})`);
    await page.close();
  }
}
await browser.close();
console.log(errors.length ? 'ISSUES:\n' + errors.join('\n') : 'no console errors, no horizontal overflow');
