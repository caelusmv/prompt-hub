// curate.js — 把策展评分/中译合并进数据并重建站点。
// 用法：node scripts/curate.js data/_curation.json
//   _curation.json 是数组，每项至少含 id；可含：
//     score(1-5), difficulty('入门'|'进阶'|'专家'), useCase(字符串),
//     editorPick(bool), descZh(中文翻译，用于英文仓库)
//   若某项未给 score 但来源数据有 stars，则按 stars 估算（人气代理）。
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'data', 'generated.json');
const PR = path.join(ROOT, 'data', 'prompts.json');
const BATCH = process.argv[2];

function today() { return new Date().toISOString().slice(0, 10); }
function scoreFromStars(s) { return s >= 10000 ? 5 : s >= 1000 ? 4 : s >= 100 ? 3 : s >= 10 ? 2 : 1; }

if (!BATCH) { console.error('[curate] 用法：node scripts/curate.js <curation.json>'); process.exit(1); }
const cur = JSON.parse(fs.readFileSync(BATCH, 'utf8'));
let g = JSON.parse(fs.readFileSync(GEN, 'utf8'));
let p = JSON.parse(fs.readFileSync(PR, 'utf8'));
const gMap = new Map(g.map(x => [x.id, x]));
const pMap = new Map(p.map(x => [x.id, x]));

let n = 0;
for (const e of cur) {
  const it = gMap.get(e.id) || pMap.get(e.id);
  if (!it) { console.warn('[curate] 未找到 id:', e.id); continue; }
  const stars = it.stars || 0;
  // 仅当显式给出 score 时才覆盖；否则保留已有评分（避免撤下精选时把评分误重置为按 stars 估算）
  if (typeof e.score === 'number') it.score = e.score;
  else if (typeof it.score !== 'number' && 'stars' in it) it.score = scoreFromStars(stars);
  if (typeof e.difficulty === 'string') it.difficulty = e.difficulty;
  if (typeof e.useCase === 'string') it.useCase = e.useCase;
  if (typeof e.editorPick === 'boolean') it.editorPick = e.editorPick;
  if (typeof e.descZh === 'string') it.descZh = e.descZh;
  it.lang = it.generated ? 'zh' : 'en';
  it.curated = true;
  it.curatedAt = today();
  n++;
}
fs.writeFileSync(GEN, JSON.stringify(g, null, 2));
fs.writeFileSync(PR, JSON.stringify(p, null, 2));
if (n > 0) fs.writeFileSync(BATCH, '[]', 'utf8'); // 仅成功合并后清空，避免误清批次
console.log(`[curate] 已策展 ${n} 条，generated=${g.length} prompts=${p.length}`);
const b = spawnSync(process.execPath, ['scripts/build.js'], { cwd: ROOT, stdio: 'inherit' });
process.exit(b.status || 0);
