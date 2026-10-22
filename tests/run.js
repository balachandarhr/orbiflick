const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type()+': '+m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file:///workspace/orbiflick/orbiflick.html');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/workspace/orbiflick/start.png' });
  // claim reward
  await page.tap('#bReward'); await page.waitForTimeout(300);
  const coins1 = await page.evaluate(() => ORBIFLICK.save.coins);
  // shop
  await page.tap('#bShop'); await page.waitForTimeout(300);
  await page.screenshot({ path: '/workspace/orbiflick/test/shop.png' });
  await page.tap('.card[data-id="pink"]'); await page.waitForTimeout(200);
  const skin = await page.evaluate(() => ORBIFLICK.save.skin);
  await page.tap('#shop .closeBtn');
  await page.tap('#bBoard'); await page.waitForTimeout(200); await page.tap('#board .closeBtn');
  // play with simple bot via keyboard-free evaluate autopilot
  await page.tap('#bPlay');
  await page.evaluate(() => {
    const G = ORBIFLICK.G;
    window.__bot = setInterval(() => {
      if (G.state !== 'play') return;
      for (const o of G.obstacles) { const d = o.a - G.theta; if (!o.passed && d > 0 && d < 0.2 + G.omega * 0.13 && o.lane === G.lane) { ORBIFLICK.tap(); break; } }
    }, 16);
  });
  await page.waitForTimeout(9000);
  const st = await page.evaluate(() => ({ state: ORBIFLICK.G.state, score: ORBIFLICK.G.score, combo: ORBIFLICK.G.combo, coins: ORBIFLICK.G.runCoins }));
  await page.screenshot({ path: '/workspace/orbiflick/play.png' });
  // die deliberately
  await page.evaluate(() => { clearInterval(window.__bot); });
  await page.waitForFunction(() => ORBIFLICK.G.state === 'over', null, { timeout: 30000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/workspace/orbiflick/test/over.png' });
  const over = await page.evaluate(() => ({ score: ORBIFLICK.G.score, best: ORBIFLICK.save.best, board: ORBIFLICK.save.board.length }));
  await page.tap('#bRevive'); await page.waitForTimeout(1200);
  await page.screenshot({ path: '/workspace/orbiflick/test/ad.png' });
  await page.waitForTimeout(2400);
  const afterAd = await page.evaluate(() => ({ state: ORBIFLICK.G.state, revived: ORBIFLICK.G.revived }));
  await page.waitForFunction(() => ORBIFLICK.G.state === 'over', null, { timeout: 30000 });
  await page.waitForTimeout(400);
  const reviveHidden = await page.evaluate(() => document.getElementById('bRevive').classList.contains('hidden'));
  await page.mouse.click(195, 790); await page.waitForTimeout(200);
  const retry = await page.evaluate(() => ORBIFLICK.G.state);
  // daily determinism
  const layout = await page.evaluate(() => { ORBIFLICK.startRun('daily'); for(let i=0;i<30;i++) ORBIFLICK.spawnEvent(); return ORBIFLICK.G.obstacles.map(o => (o.a - ORBIFLICK.G.theta).toFixed(3) + o.lane).join(','); });
  const layout2 = await page.evaluate(() => { ORBIFLICK.startRun('daily'); for(let i=0;i<30;i++) ORBIFLICK.spawnEvent(); return ORBIFLICK.G.obstacles.map(o => (o.a - ORBIFLICK.G.theta).toFixed(3) + o.lane).join(','); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/workspace/orbiflick/test/daily.png' });
  const shareRes = await page.evaluate(async () => { ORBIFLICK.G.state='over'; document.getElementById('bShare').click(); await new Promise(r=>setTimeout(r,500)); return document.getElementById('toast').textContent; });
  // desktop viewport
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  p2.on('pageerror', e => errors.push('pageerror2: ' + e.message));
  await p2.goto('file:///workspace/orbiflick/orbiflick.html'); await p2.waitForTimeout(800);
  await p2.keyboard.press('Space'); await p2.waitForTimeout(1500);
  const dstate = await p2.evaluate(() => ORBIFLICK.G.state);
  await p2.screenshot({ path: '/workspace/orbiflick/test/desktop.png' });
  console.log(JSON.stringify({ coins1, skin, st, over, afterAd, reviveHidden, retry, dailySame: layout === layout2, layoutLen: layout.split(',').length, dstate, shareRes, errors }, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
