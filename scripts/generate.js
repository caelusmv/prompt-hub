// generate.js — 将一批新生成的中文提示词追加进 data/generated.json，并重新构建站点。
// 用法：node scripts/generate.js data/_newbatch.json
//   _newbatch.json 是一个 JSON 数组，每项可包含：
//     title, description, content, category, tags[], targetModel
//   id / kind / generated / license / author / stars / sourceUrl / fetchedAt
//   由本脚本自动补全，避免手写出错。
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'data', 'generated.json');
const BATCH = process.argv[2];

if (!BATCH) {
  console.error('[generate] 用法：node scripts/generate.js <batch.json>');
  process.exit(1);
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function load(arr) {
  try { return JSON.parse(fs.readFileSync(arr, 'utf8')); } catch (e) { return null; }
}

const existing = load(GEN) || [];
let maxN = 0;
existing.forEach(it => { const m = /^g-(\d+)$/.exec(it.id || ''); if (m) maxN = Math.max(maxN, +m[1]); });

const batch = load(BATCH);
if (!Array.isArray(batch)) { console.error('[generate] batch 文件必须是 JSON 数组'); process.exit(1); }

const seenTitles = new Set(existing.map(it => (it.title || '').trim()));
const added = [];
for (const b of batch) {
  if (!b || !b.title || !b.content || !b.category) {
    console.warn('[generate] 跳过缺字段条目:', JSON.stringify(b).slice(0, 80));
    continue;
  }
  if (seenTitles.has(b.title.trim())) { console.warn('[generate] 跳过重复标题:', b.title); continue; }
  maxN += 1;
  added.push({
    id: `g-${maxN}`,
    kind: 'prompt',
    category: b.category,
    generated: true,
    title: b.title,
    description: b.description || '',
    content: b.content,
    tags: Array.isArray(b.tags) ? b.tags : [],
    targetModel: b.targetModel || '',
    author: '提示词搭子（AI 生成）',
    license: 'CC-BY 4.0',
    stars: 0,
    score: (typeof b.score === 'number') ? b.score : 4,
    editorPick: !!b.editorPick,
    difficulty: b.difficulty || '入门',
    useCase: b.useCase || '',
    curated: true,
    sourceUrl: '',
    fetchedAt: todayISO()
  });
  seenTitles.add(b.title.trim());
}

if (added.length === 0) { console.log('[generate] 没有新增条目'); process.exit(0); }

const merged = existing.concat(added);
fs.writeFileSync(GEN, JSON.stringify(merged, null, 2), 'utf8');
fs.writeFileSync(BATCH, '[]', 'utf8'); // 清空批次，避免重复追加

console.log(`[generate] 已追加 ${added.length} 条，generated.json 现共 ${merged.length} 条`);
console.log('[generate] 本次新增分类:', JSON.stringify(added.reduce((a, x) => { a[x.category] = (a[x.category] || 0) + 1; return a; }, {})));

// 重新构建站点
const np = process.execPath;
const b = spawnSync(np, ['scripts/build.js'], { cwd: ROOT, stdio: 'inherit' });
process.exit(b.status || 0);
