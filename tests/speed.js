const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  await p.goto('file:///workspace/orbiflick/orbiflick.html'); await p.waitForTimeout(500);
  const menuOmega = await p.evaluate(() => ORBIFLICK.G.omega);
  const table = await p.evaluate(() => [0,149,150,299,300,450,2250,2399,2400,5000].map(s => [s, +ORBIFLICK.omegaForScore(s).toFixed(4)]));
  // live: start run, invulnerable, set score and watch step + ease
  const live = [];
  await p.evaluate(() => { ORBIFLICK.startRun('classic'); ORBIFLICK.G.invuln = 1e9; });
  await p.waitForTimeout(300);
  live.push(['score0', await p.evaluate(() => ORBIFLICK.G.omega)]);
  for (const sc of [150, 300, 2400]) {
    await p.evaluate(sc => { ORBIFLICK.G.score = sc; }, sc);
    await p.waitForTimeout(200);
    const mid = await p.evaluate(() => ORBIFLICK.G.omega);
    await p.waitForTimeout(500);
    live.push([sc, { at200ms: +mid.toFixed(3), settled: +(await p.evaluate(() => ORBIFLICK.G.omega)).toFixed(4), level: await p.evaluate(() => ORBIFLICK.G.speedLevel) }]);
  }
  // gap check at cap: min angular gap between consecutive obstacles (excluding same-lane twins)
  const gaps = await p.evaluate(() => {
    const G = ORBIFLICK.G; const res = {};
    for (const [name, w] of [['start', 0.725], ['cap', 3.0]]) {
      ORBIFLICK.startRun('classic'); G.omegaTo = G.omega = w; G.obstacles = []; G.nextA = G.theta; G.ev = 0;
      for (let i = 0; i < 400; i++) ORBIFLICK.spawnEvent();
      const o = G.obstacles.slice().sort((a, b) => a.a - b.a); let minDiff = 9, early = [];
      for (let i = 1; i < o.length; i++) { const d = o[i].a - o[i - 1].a; if (o[i].lane !== o[i - 1].lane) minDiff = Math.min(minDiff, d); if (i < 6) early.push(+(d / w).toFixed(2)); }
      res[name] = { minOppositeLaneGapRad: +minDiff.toFixed(3), minGapSec: +(minDiff / w).toFixed(3), firstGapsSec: early };
    }
    ORBIFLICK.toMenu(); return res;
  });
  console.log(JSON.stringify({ errs, menuOmega, table, live, gaps }, null, 1)); await b.close();
})();
