// 临时后台脚本：轮询 GitHub 配额，额度足够时自动 collect + build（避免手动等限流重置）
const { spawnSync } = require('child_process');
const NP = process.execPath;
const ROOT = __dirname;

async function coreRemaining() {
  const r = await fetch('https://api.github.com/rate_limit', { headers: { 'User-Agent': 'prompt-hub' } });
  const j = await r.json();
  return j.resources.core.remaining;
}

(async () => {
  const MAX_WAIT_MS = 40 * 60 * 1000; // 最多等 40 分钟
  const START = Date.now();
  while (Date.now() - START < MAX_WAIT_MS) {
    let rem = 0;
    try { rem = await coreRemaining(); } catch (e) { rem = 0; }
    const mins = Math.ceil((MAX_WAIT_MS - (Date.now() - START)) / 60000);
    console.log(`[waitrun] core 剩余 ${rem} / 60，还需等待（最多 ${mins} 分钟）`);
    if (rem >= 40) {
      console.log('[waitrun] 额度充足，开始采集…');
      const a = spawnSync(NP, ['collect.js'], { cwd: ROOT, stdio: 'inherit' });
      if (a.status !== 0) { console.log('[waitrun] collect 失败'); process.exit(1); }
      const b = spawnSync(NP, ['build.js'], { cwd: ROOT, stdio: 'inherit' });
      if (b.status !== 0) { console.log('[waitrun] build 失败'); process.exit(1); }
      console.log('[waitrun] 完成 ✓');
      process.exit(0);
    }
    await new Promise(s => setTimeout(s, 60000));
  }
  console.log('[waitrun] 超时：额度仍未恢复，请稍后手动运行 node scripts/collect.js');
  process.exit(1);
})();
