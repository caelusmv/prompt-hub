// scripts/collect.js
// 合规采集：从 GitHub 开源 prompt 仓库抓取「单条 prompt 内容」（而不仅是仓库描述）。
// - 实时拉仓库列表，按 stars 取Top，递归读文件树，解析 CSV/Markdown/文本中的单条提示词
// - 每条 prompt 指向「具体文件」blob 链接，保留作者与协议，便于合规署名
// - 含真实仓库兜底（kind=repo）+ 标注「示例」占位（kind=prompt）
const fs = require('fs');
const path = require('path');

// 可选：设置 GITHUB_TOKEN 环境变量可将 GitHub API 限额从 60/hr 提升到 5000/hr
const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const AUTH = GH_TOKEN ? { Authorization: 'Bearer ' + GH_TOKEN } : {};

// 简单磁盘缓存：避免重复抓取耗尽匿名配额，也让定时重跑几乎免费
const CACHE_DIR = path.join(DATA_DIR, '.cache');
const CACHE_TTL = 24 * 3600 * 1000;
function cacheGet(key) {
  try {
    const f = path.join(CACHE_DIR, key.replace(/[^a-zA-Z0-9._-]/g, '_') + '.json');
    if (fs.existsSync(f)) {
      const o = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (Date.now() - o.t < CACHE_TTL) return o.v;
    }
  } catch (e) {}
  return undefined;
}
function cacheSet(key, v) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, key.replace(/[^a-zA-Z0-9._-]/g, '_') + '.json'), JSON.stringify({ t: Date.now(), v }));
  } catch (e) {}
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT = path.join(DATA_DIR, 'prompts.json');

const CATEGORIES = ['编程', '营销', '图像', '视频', '综合'];
const FILES_PER_REPO = 3;  // 每个仓库最多解析的文件数
const PROMPTS_PER_REPO = 12;
const REPOS_PER_CATEGORY = 2; // 每个分类解析的仓库数（控制 API 用量，4 分类 × 2 = 8 仓库）

function categorize(text) {
  const t = (text || '').toLowerCase();
  if (/(midjourney|stable[-\s]?diffusion|dall[-\s]?e|flux|ideogram|绘图|画像|painting|image|图片|插画|illustration|logo|poster|photo|摄影)/.test(t)) return '图像';
  if (/(marketing|copywriting|copy|seo|social|广告|营销|文案|品牌|brand|内容运营|小红书|种草)/.test(t)) return '营销';
  if (/(video|tiktok|youtube|短视频|视频|reel|movie|film|抖音)/.test(t)) return '视频';
  if (/(code|coding|cursor|dev|developer|编程|程序|gpt|chatgpt|llm|prompt|agent)/.test(t)) return '编程';
  return '综合';
}

// 真实存在的开源仓库（MIT / 公开协议），作为基线「仓库」条目
const FALLBACK = [
  {
    title: 'Awesome ChatGPT Prompts',
    description: 'Curated community list of ChatGPT prompts across roles and tasks.',
    sourceUrl: 'https://github.com/f/awesome-chatgpt-prompts',
    author: 'f', license: 'MIT', stars: 112000,
    category: '编程', content: '社区维护的 ChatGPT 提示词清单，覆盖写作、编程、角色扮演等场景。完整提示词请在源仓库查看。'
  }
];

// 标注「示例」的占位单条 prompt：仅用于演示各分类页面，运行 collect 抓取真实数据后建议移除
const SAMPLES = [
  { title: 'Midjourney 绘画提示词（示例）', category: '图像',
    content: '油画风格，黄昏海岸线，柔和逆光，8k，细腻笔触，电影感 --ar 16:9', license: '示例', author: '示例', stars: 0, sourceUrl: '' },
  { title: '小红书种草文案提示词（示例）', category: '营销',
    content: '你是一位资深种草文案专家，请为「{产品}」写一篇 300 字小红书笔记：吸引眼球的标题 + 3 个 emoji + 痛点开头 + 使用体验 + 行动号召。', license: '示例', author: '示例', stars: 0, sourceUrl: '' },
  { title: '抖音短视频脚本提示词（示例）', category: '视频',
    content: '你是一位短视频编导，为「{主题}」写一个 30 秒口播脚本：前 3 秒钩子 + 反转 + 结尾行动号召。', license: '示例', author: '示例', stars: 0, sourceUrl: '' },
  { title: 'Cursor 项目脚手架提示词（示例）', category: '编程',
    content: '你是一位资深全栈工程师，根据「{需求}」给出：技术选型、项目目录结构、关键文件代码与依赖清单。', license: '示例', author: '示例', stars: 0, sourceUrl: '' }
];

async function ghJson(apiPath) {
  const ck = 'gh' + apiPath;
  const cached = cacheGet(ck);
  if (cached !== undefined) return cached;
  const r = await fetch('https://api.github.com' + apiPath, {
    headers: { 'User-Agent': 'prompt-hub', 'Accept': 'application/vnd.github+json', ...AUTH }
  });
  if (r.status === 403 && r.headers.get('x-ratelimit-remaining') === '0') throw new Error('rate_limit');
  if (!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  cacheSet(ck, j);
  return j;
}
// 通过 GitHub Contents API 取文件内容（走 api.github.com，避免 raw.githubusercontent.com 被拦）
async function fetchFileContent(owner, name, branch, filePath) {
  const ck = 'fc' + owner + '/' + name + '/' + branch + '/' + filePath;
  const cached = cacheGet(ck);
  if (cached !== undefined) return cached;
  const r = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/${encodeURIComponent(filePath)}?ref=${branch}`, {
    headers: { 'User-Agent': 'prompt-hub', 'Accept': 'application/vnd.github+json', ...AUTH }
  });
  if (r.status === 403 && r.headers.get('x-ratelimit-remaining') === '0') throw new Error('rate_limit');
  if (!r.ok) throw new Error('contents ' + r.status);
  const j = await r.json();
  const txt = j.content ? Buffer.from(j.content, 'base64').toString('utf8') : '';
  cacheSet(ck, txt);
  return txt;
}

function splitCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const rows = text.split(/\r?\n/).filter(Boolean);
  if (!rows.length) return [];
  const header = splitCsvLine(rows[0]).map(h => h.toLowerCase());
  const pIdx = header.findIndex(h => /prompt|指令|内容/.test(h));
  const tIdx = header.findIndex(h => /act|title|name|角色|主题/.test(h));
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = splitCsvLine(rows[i]);
    const content = (pIdx >= 0 ? cols[pIdx] : cols[cols.length - 1] || '').trim();
    const title = (tIdx >= 0 ? cols[tIdx] : '').trim() || content.slice(0, 40);
    if (content.length > 10) out.push({ title, content });
  }
  return out;
}

function parseMarkdown(text) {
  const lines = text.split(/\r?\n/);
  // 1) 按标题拆分
  const heads = []; let curTitle = ''; let cur = [];
  const push = () => {
    const body = cur.join('\n').trim();
    if (body.length > 20 && body.length < 4000) heads.push({ title: curTitle || body.slice(0, 40), content: body });
    cur = [];
  };
  for (const ln of lines) {
    if (/^#{2,4}\s+/.test(ln)) { push(); curTitle = ln.replace(/^#{2,4}\s+/, '').trim(); }
    else cur.push(ln);
  }
  push();
  if (heads.length >= 2) return heads;
  // 2) 按列表项拆分
  const items = [];
  for (const ln of lines) {
    const m = ln.match(/^\s*[-*]\s+(.*)/) || ln.match(/^\s*\d+\.\s+(.*)/);
    if (m) { const t = m[1].trim(); if (t.length > 10) items.push({ title: t.slice(0, 40), content: t }); }
  }
  if (items.length >= 2) return items;
  // 3) 按空行拆分
  return text.split(/\n\s*\n/)
    .map(b => ({ title: b.slice(0, 40).replace(/\n/g, ' '), content: b.trim() }))
    .filter(x => x.content.length > 20 && x.content.length < 4000);
}

function parseFile(filePath, text) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.csv')) return parseCsv(text);
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return parseMarkdown(text);
  if (lower.endsWith('.txt')) return text.split(/\n\s*\n/)
    .map(b => ({ title: b.slice(0, 40).replace(/\n/g, ' '), content: b.trim() }))
    .filter(x => x.content.length > 20 && x.content.length < 4000);
  return [];
}

async function parseRepoPrompts(repo, catHint) {
  const owner = repo.owner.login, name = repo.name, branch = repo.default_branch || 'main';
  let tree;
  try {
    const t = await ghJson(`/repos/${owner}/${name}/git/trees/${branch}?recursive=1`);
    tree = t.tree || [];
  } catch (e) { if (/rate_limit/.test(e.message)) throw e; return []; }
  const blobs = tree.filter(n => n.type === 'blob' && /\.(md|txt|csv)$/i.test(n.path)
    && !/^(node_modules|\.github|docs\/)/i.test(n.path) && n.size > 300 && n.size < 60000);
  // 优先选文件名含 prompt/act/role 的文件
  blobs.sort((a, b) =>
    ((/prompt|act|role/i.test(a.path) ? -1 : 1)) - ((/prompt|act|role/i.test(b.path) ? -1 : 1)));
  const picked = blobs.slice(0, FILES_PER_REPO);
  const out = [];
  for (const f of picked) {
    try {
      const text = await fetchFileContent(owner, name, branch, f.path);
      const cands = parseFile(f.path, text);
      for (const c of cands) {
        out.push({
          kind: 'prompt',
          title: c.title || '未命名提示词',
          description: c.content.slice(0, 90).replace(/\n/g, ' '),
          content: c.content,
          category: catHint || categorize([c.title, c.content, f.path].join(' ')),
          sourceUrl: `https://github.com/${owner}/${name}/blob/${branch}/${encodeURIComponent(f.path)}`,
          author: owner,
          license: repo.license && repo.license.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : '未知',
          stars: repo.stargazers_count || 0,
          fetchedAt: new Date().toISOString().slice(0, 10)
        });
      }
      if (out.length >= PROMPTS_PER_REPO) break;
    } catch (e) { if (/rate_limit/.test(e.message)) throw e; /* 单文件失败忽略 */ }
  }
  return out.slice(0, PROMPTS_PER_REPO);
}

// 每个分类一组定向搜索 query，确保四个分类都有真实内容（解决偏科问题）
const QUERIES = [
  { q: 'topic:prompt', cat: '编程' },
  { q: 'topic:midjourney-prompts', cat: '图像' },
  { q: 'topic:marketing-prompts', cat: '营销' },
  { q: 'topic:video-prompts', cat: '视频' },
];

async function fetchLiveRepos() {
  const out = [];
  for (const { q, cat } of QUERIES) {
    try {
      const json = await ghJson(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=20`);
      (json.items || []).forEach(r => out.push({
        name: r.name, description: r.description || '', html_url: r.html_url,
        owner: { login: r.owner && r.owner.login ? r.owner.login : '' },
        license: r.license, stargazers_count: r.stargazers_count || 0,
        default_branch: r.default_branch || 'main', catHint: cat
      }));
      console.log(`[collect] 查询 "${q}" -> ${(json.items || []).length} 个仓库`);
    } catch (e) {
      if (/rate_limit/.test(e.message)) { console.warn('[collect] 搜索触发限流，停止更多查询'); break; }
      console.warn(`[collect] 查询 "${q}" 失败:`, e.message);
    }
  }
  if (!out.length) console.warn('[collect] 所有查询失败，仅用兜底');
  return out;
}

(async () => {
  const repos = await fetchLiveRepos();
  // 仓库级条目（kind=repo），分类沿用搜索意图
  const repoItems = repos.map(r => ({
    kind: 'repo',
    title: r.name,
    description: r.description || '',
    content: r.description || '',
    category: r.catHint || categorize([r.name, r.description].join(' ')),
    sourceUrl: r.html_url,
    author: r.owner.login || '',
    license: r.license && r.license.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '未知',
    stars: r.stargazers_count || 0,
    fetchedAt: new Date().toISOString().slice(0, 10)
  }));
  // 单条 prompt 解析（kind=prompt）：每个分类取 Top 仓库，保证四分类都有真实内容
  let promptItems = [];
  const usedByCat = {};
  for (const r of repos) {
    const c = r.catHint || '综合';
    if ((usedByCat[c] || 0) >= REPOS_PER_CATEGORY) continue;
    usedByCat[c] = (usedByCat[c] || 0) + 1;
    try {
      promptItems.push(...await parseRepoPrompts(r, r.catHint));
    } catch (e) {
      if (/rate_limit/.test(e.message)) {
        console.warn('[collect] 触发 GitHub API 限流，已停止解析。设置 GITHUB_TOKEN 环境变量可将限额提升到 5000/hr；或等匿名配额(60/hr)重置后重跑。');
        break;
      }
    }
  }

  // 真实仓库兜底(repo)
  const fallbackRepo = FALLBACK.map(f => ({ kind: 'repo', ...f, fetchedAt: new Date().toISOString().slice(0, 10) }));

  let all = [...repoItems, ...promptItems, ...fallbackRepo];

  // 统计各分类现有条数，仅对「完全为空」的分类补示例占位，避免冗余低质页
  const counts = {};
  all.forEach(it => { const c = CATEGORIES.includes(it.category) ? it.category : '综合'; counts[c] = (counts[c] || 0) + 1; });
  const samplePrompt = [];
  for (const s of SAMPLES) {
    if (!counts[s.category]) samplePrompt.push({ kind: 'prompt', ...s, fetchedAt: new Date().toISOString().slice(0, 10) });
  }
  all = all.concat(samplePrompt);

  // 去重：仓库按 sourceUrl；prompt 按归一化内容
  const seenRepo = new Set();
  const seenPrompt = new Set();
  all = all.filter(it => {
    if (it.kind === 'repo') {
      const k = it.sourceUrl || it.title;
      if (seenRepo.has(k)) return false; seenRepo.add(k); return true;
    } else {
      const k = it.content.replace(/\s+/g, '').toLowerCase();
      if (seenPrompt.has(k)) return false; seenPrompt.add(k); return true;
    }
  });

  // 分配唯一 id
  let ri = 0, pi = 0;
  const items = all.map(it => {
    const id = it.kind === 'repo' ? `repo-${++ri}` : `p-${++pi}`;
    return { id, ...it };
  });

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(items, null, 2), 'utf8');
  const pc = items.filter(i => i.kind === 'prompt').length;
  const rc = items.filter(i => i.kind === 'repo').length;
  console.log(`[collect] 写入 ${items.length} 条（单条提示词 ${pc} + 仓库 ${rc}） -> ${OUT}`);
})();
