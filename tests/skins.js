const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  await p.goto('file:///workspace/orbiflick/orbiflick.html');
  for (const id of ['sun','violet','ghost','rainbow']) {
    await p.evaluate(id => { const s=ORBIFLICK.save; s.owned.push(id); s.skin=id; ORBIFLICK.startRun('classic'); }, id);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `/workspace/orbiflick/test/skin_${id}.png` });
  }
  await p.reload(); await p.waitForTimeout(300);
  const persisted = await p.evaluate(() => ORBIFLICK.save.skin);
  console.log(JSON.stringify({ errs, persisted })); await b.close();
})();
