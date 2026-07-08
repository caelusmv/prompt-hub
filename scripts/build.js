// scripts/build.js
// 读取 data/prompts.json，生成 SEO 友好的静态聚合站到 public/
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'prompts.json');
const OUT = path.join(ROOT, 'public');

const CATEGORIES = ['编程', '营销', '图像', '视频', '综合'];
// 英文 slug 避免中文文件名在 file:// 协议下导航失败
const CAT_SLUG = { '编程': 'coding', '营销': 'marketing', '图像': 'image', '视频': 'video', '综合': 'general' };
const CAT_ICON = { '编程': '💻', '营销': '📣', '图像': '🎨', '视频': '🎬', '综合': '🧩' };
function catSlug(c) { return CAT_SLUG[c] || enc(c); }

function esc(s) {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }));
}
const enc = c => encodeURIComponent(c);

// 站点正式域名（上线后改成你的域名；或运行时 SITE_URL=https://your.domain node scripts/build.js）
const SITE_URL = (process.env.SITE_URL || 'https://promptdazi.cn').replace(/\/$/, '');
// 将 JS 对象序列化为安全的 JSON-LD（转义 < > 避免 </script> 截断页面）
function jsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function load() {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  catch (e) { console.error('[build] 找不到 data/prompts.json，请先运行 node scripts/collect.js'); process.exit(1); }
}
// 合并两路数据源：GitHub 聚合(prompts.json) + AI 原生生成(generated.json)
function loadAll() {
  let data = [];
  try { data = data.concat(JSON.parse(fs.readFileSync(DATA, 'utf8'))); }
  catch (e) { console.warn('[build] 缺少 data/prompts.json（可先运行 node scripts/collect.js）'); }
  const genPath = path.join(ROOT, 'data', 'generated.json');
  try { data = data.concat(JSON.parse(fs.readFileSync(genPath, 'utf8'))); }
  catch (e) { /* 无 AI 生成内容也可正常构建 */ }
  if (!data.length) { console.error('[build] 没有任何可用数据，无法构建'); process.exit(1); }
  return data;
}
function group(data) {
  const g = {};
  CATEGORIES.forEach(c => g[c] = []);
  data.forEach(it => { const c = CATEGORIES.includes(it.category) ? it.category : '综合'; g[c].push(it); });
  return g;
}

const CSS = `
:root{
  --brand:#2563eb; --brand-700:#1d4ed8; --brand-50:#eff6ff; --brand-ring:rgba(37,99,235,.28);
  --accent:#f97316; --accent-700:#c2410c; --accent-50:#fff7ed;
  --amber:#f59e0b;
  --indigo:#4338ca; --indigo-50:#eef2ff;
  --bg:#f6f8fb; --surface:#ffffff; --border:#e6e9ef; --border-strong:#d4d9e2;
  --text:#0f172a; --text-2:#475569; --text-3:#64748b;
  --r-sm:8px; --r:12px; --r-lg:16px; --r-pill:999px;
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:20px; --s-6:28px; --s-7:40px;
  --sh-1:0 1px 2px rgba(15,23,42,.05); --sh-2:0 6px 20px rgba(15,23,42,.08); --sh-3:0 12px 32px rgba(15,23,42,.12);
  --fs-hero:30px; --fs-h1:26px; --fs-h2:18px; --fs-card:16px; --fs-body:14px; --fs-sm:13px; --fs-xs:12px;
}
* { box-sizing:border-box; }
html { scroll-behavior:smooth; }
body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; color:var(--text); background:var(--bg); line-height:1.6; font-size:var(--fs-body); -webkit-font-smoothing:antialiased; }
a { color:var(--brand); }
.wrap { max-width:1080px; margin:0 auto; padding:0 20px; }

/* ===== Header ===== */
header.site { background:linear-gradient(135deg,var(--brand),var(--brand-700)); color:#fff; padding:18px 0; box-shadow:var(--sh-2); }
header.site .wrap.site-head { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
header.site .logo { color:#fff; font-size:20px; font-weight:700; text-decoration:none; letter-spacing:.2px; }
header.site .logo span { font-weight:400; opacity:.85; font-size:15px; }
header.site .tag { margin:6px 0 0; opacity:.9; font-size:13px; }
header.site .tool-link { color:#fff; text-decoration:none; border:1px solid rgba(255,255,255,.5); padding:8px 16px; border-radius:var(--r-pill); font-size:14px; font-weight:500; transition:.18s; }
header.site .tool-link:hover, header.site .tool-link.active { background:#fff; color:var(--brand); }

/* ===== Nav ===== */
nav.cats { background:rgba(255,255,255,.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:20; }
nav.cats .wrap { display:flex; gap:8px; flex-wrap:wrap; padding:10px 20px; align-items:center; }
.navlink { font-family:inherit; cursor:pointer; background:#fff; color:var(--text-2); text-decoration:none; padding:7px 14px; border-radius:var(--r-pill); font-size:13px; border:1px solid var(--border); transition:.18s; }
.navlink:hover { border-color:var(--brand); color:var(--brand); }
.navlink.active { background:var(--brand-50); color:var(--brand-700); border-color:transparent; font-weight:600; }
.navlink.pick-btn { border-color:var(--accent); color:var(--accent-700); font-weight:600; }
.navlink.pick-btn:hover { background:var(--accent-50); border-color:var(--accent); color:var(--accent-700); }
.navlink.pick-btn.active { background:var(--accent); color:#fff; border-color:var(--accent); }
.navlink .count { opacity:.7; font-size:12px; margin-left:5px; }

/* ===== Hero / 首页首屏 ===== */
.hero { padding:var(--s-6) 0 var(--s-4); }
.hero h1 { margin:0 0 8px; font-size:var(--fs-hero); font-weight:700; letter-spacing:-.2px; line-height:1.3; }
.hero-sub { margin:0 0 16px; color:var(--text-2); font-size:15px; max-width:700px; }
.search-wrap { position:relative; }
.search-wrap::before { content:"🔍"; position:absolute; left:15px; top:50%; transform:translateY(-50%); font-size:15px; opacity:.55; pointer-events:none; }
#search { width:100%; padding:14px 120px 14px 44px; font-size:15px; border:1px solid var(--border-strong); border-radius:var(--r); outline:none; background:#fff; transition:.18s; box-shadow:var(--sh-1); color:var(--text); }
#search:focus { border-color:var(--brand); box-shadow:0 0 0 3px var(--brand-ring); }
.pick-toggle { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:1px solid var(--accent); color:var(--accent-700); padding:5px 12px; border-radius:var(--r-pill); font-size:12px; cursor:pointer; font-weight:600; font-family:inherit; transition:.18s; white-space:nowrap; }
.pick-toggle:hover { background:var(--accent-50); }
.pick-toggle.active { background:var(--accent); color:#fff; }
.cat-quick { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:18px 0 4px; }
.cat-card { display:flex; align-items:center; justify-content:space-between; gap:8px; background:#fff; border:1px solid var(--border); border-radius:var(--r); padding:14px 16px; text-decoration:none; color:var(--text); font-weight:600; font-size:15px; transition:.18s; box-shadow:var(--sh-1); }
.cat-card .em { color:var(--brand); font-style:normal; font-weight:700; font-size:14px; }
.cat-card:hover { border-color:var(--brand); box-shadow:var(--sh-3); transform:translateY(-2px); }
.cta-tool { display:flex; align-items:center; gap:8px; background:linear-gradient(135deg,var(--accent-50),#fff); color:var(--accent-700); border:1px solid #fed7aa; border-radius:var(--r); padding:13px 16px; margin:18px 0 4px; font-weight:600; text-decoration:none; transition:.18s; box-shadow:var(--sh-1); }
.cta-tool:hover { box-shadow:var(--sh-2); border-color:var(--accent); transform:translateY(-1px); }
.cta-tool .arrow { margin-left:auto; font-weight:700; }

/* ===== 卡片网格 ===== */
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:18px; padding:22px 0 44px; }
.card { display:flex; flex-direction:column; background:#fff; border:1px solid var(--border); border-radius:var(--r); padding:18px; text-decoration:none; color:inherit; transition:.18s; box-shadow:var(--sh-1); }
.card:hover { border-color:var(--brand); box-shadow:var(--sh-3); transform:translateY(-3px); }
.badges { display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap; }
.badge { font-size:12px; padding:3px 9px; border-radius:var(--r-pill); background:#f1f5f9; color:var(--text-2); font-weight:500; }
.badge.cat { background:var(--brand-50); color:var(--brand-700); }
.badge.k { background:#f1f5f9; color:var(--text-2); }
.badge.sample { background:#fffbeb; color:var(--accent-700); }
.badge.g { background:var(--indigo-50); color:var(--indigo); }
.badge.pick { background:var(--accent-50); color:var(--accent-700); font-weight:600; }
.badge.diff { background:#f1f5f9; color:var(--text-2); }
.stars { color:var(--amber); font-size:13px; letter-spacing:1px; }
.stars .empty { color:#cbd5e1; }
.usecase { background:var(--brand-50); border:1px solid #dbeafe; border-radius:var(--r-sm); padding:10px 12px; font-size:13px; color:var(--text-2); margin:12px 0; }
.usecase b { color:var(--brand-700); }
.related { margin-top:28px; padding-top:20px; border-top:1px solid var(--border); }
.related h2 { font-size:18px; margin:0 0 14px; }
.card h3 { margin:0 0 8px; font-size:var(--fs-card); font-weight:600; line-height:1.4; }
.card p { margin:0 0 12px; color:var(--text-2); font-size:var(--fs-sm); line-height:1.55; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.card .meta { margin-top:auto; font-size:12px; color:var(--text-3); }

/* ===== 空状态 ===== */
.empty { text-align:center; color:var(--text-3); padding:48px 0; font-size:15px; }
.empty a { color:var(--brand); font-weight:600; }

/* ===== 详情页 ===== */
main.wrap { padding-bottom:40px; }
.detail { padding:14px 0 40px; max-width:780px; margin:0 auto; }
.breadcrumb { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
.back-btn { display:inline-flex; align-items:center; gap:4px; background:var(--brand); color:#fff; text-decoration:none; padding:8px 16px; border-radius:var(--r-sm); font-size:14px; font-weight:600; transition:.18s; white-space:nowrap; }
.back-btn:hover { background:var(--brand-700); }
.crumb { font-size:13px; color:var(--text-3); }
.crumb a { color:var(--brand); text-decoration:none; }
.crumb a:hover { text-decoration:underline; }
.detail h1 { font-size:var(--fs-h1); margin:14px 0 10px; line-height:1.35; }
.detail .desc { color:var(--text-2); margin:8px 0; }
.detail .meta { font-size:13px; color:var(--text-3); margin-bottom:16px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.detail h2 { font-size:var(--fs-h2); margin:18px 0 8px; }
.copy-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--brand-50); border:1px solid #dbeafe; border-radius:var(--r); padding:12px 16px; margin:14px 0; }
.copy-bar .msg { font-size:13px; color:var(--brand-700); font-weight:600; display:flex; align-items:center; gap:6px; }
.copy-bar .msg .ok { color:#16a34a; }
.copy-btn { background:var(--brand); color:#fff; border:none; padding:9px 18px; border-radius:var(--r-sm); font-size:14px; cursor:pointer; font-weight:600; transition:.18s; white-space:nowrap; font-family:inherit; }
.copy-btn:hover { background:var(--brand-700); }
.code-card { border:1px solid #1e293b; border-radius:var(--r); overflow:hidden; box-shadow:var(--sh-1); }
.code-head { display:flex; align-items:center; justify-content:space-between; background:#1e293b; color:#cbd5e1; padding:9px 14px; font-size:12px; }
.code-head .lang { letter-spacing:.5px; }
.code-head .copy-btn { background:#334155; padding:5px 12px; font-size:12px; }
.code-head .copy-btn:hover { background:#475569; }
#prompt-content { background:#0f172a; color:#e2e8f0; padding:16px; white-space:pre-wrap; word-break:break-word; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; overflow:auto; max-height:520px; margin:0; }
.src { font-size:13px; color:var(--text-3); margin-top:16px; word-break:break-all; }
.src a { color:var(--brand); }
footer.site { background:#fff; border-top:1px solid var(--border); color:var(--text-3); font-size:12px; padding:22px 0; margin-top:24px; }

/* ===== 搭子陪写工具页 ===== */
.tool-hero { padding:var(--s-6) 0 var(--s-4); }
.tool-hero h1 { margin:0 0 8px; font-size:var(--fs-hero); font-weight:700; }
.tool-sub { color:var(--text-2); margin:0 0 18px; font-size:15px; max-width:720px; }
.wizard { display:grid; grid-template-columns:260px 1fr; gap:22px; align-items:start; }
.scenarios h2, .workspace h2 { font-size:15px; color:var(--brand-700); margin:0 0 12px; }
.scn-list { display:flex; flex-direction:column; gap:8px; }
.scn { text-align:left; background:#fff; border:1px solid var(--border); border-radius:var(--r); padding:11px 13px; cursor:pointer; transition:.18s; width:100%; font-family:inherit; box-shadow:var(--sh-1); }
.scn:hover { border-color:var(--brand); }
.scn.active { border-color:var(--brand); background:var(--brand-50); }
.scn .name { font-size:14px; font-weight:600; color:var(--text); }
.scn .cat { font-size:11px; color:var(--brand); margin-left:6px; }
.scn .blurb { font-size:12px; color:var(--text-2); margin-top:3px; }
.workspace { background:#fff; border:1px solid var(--border); border-radius:var(--r-lg); padding:22px; box-shadow:var(--sh-1); }
.fields { display:grid; gap:14px; margin-bottom:20px; }
.field label { display:block; font-size:13px; color:var(--text-2); margin-bottom:6px; font-weight:600; }
.field input, .field textarea { width:100%; padding:10px 12px; border:1px solid var(--border-strong); border-radius:var(--r-sm); font-size:14px; font-family:inherit; outline:none; transition:.18s; background:#fff; color:var(--text); }
.field input:focus, .field textarea:focus { border-color:var(--brand); box-shadow:0 0 0 3px var(--brand-ring); }
.chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px; }
.chip { background:#f1f5f9; border:1px solid #e2e8f0; color:var(--text-2); padding:7px 13px; border-radius:var(--r-pill); font-size:13px; cursor:pointer; transition:.18s; font-family:inherit; }
.chip:hover { border-color:var(--brand); color:var(--brand); }
.chip.on { background:var(--brand); border-color:var(--brand); color:#fff; }
.field .custom { background:#fff; }
.field .custom::placeholder { color:var(--text-3); font-size:13px; }
.preview-box { border-top:1px solid var(--border); padding-top:18px; }
.preview-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.preview-head span { font-size:13px; color:var(--text-2); font-weight:600; }
#resetBtn { background:none; border:1px solid var(--border-strong); color:var(--text-2); padding:5px 12px; border-radius:var(--r-sm); font-size:12px; cursor:pointer; transition:.18s; font-family:inherit; }
#resetBtn:hover { border-color:var(--brand); color:var(--brand); }
#out { background:#0f172a; color:#e2e8f0; padding:16px; border-radius:var(--r); white-space:pre-wrap; word-break:break-word; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; min-height:140px; max-height:460px; overflow:auto; border:1px solid #1e293b; }
#copyTool { margin-top:12px; background:var(--brand); color:#fff; border:none; padding:10px 18px; border-radius:var(--r-sm); font-size:14px; cursor:pointer; font-weight:600; transition:.18s; font-family:inherit; }
#copyTool:hover { background:var(--brand-700); }
.tool-tip { background:var(--brand-50); border:1px solid #dbeafe; border-radius:var(--r); padding:14px 16px; margin-top:22px; font-size:13px; color:var(--text-2); }
.tool-tip b { color:var(--brand-700); }

/* ===== Toast / 无障碍 ===== */
.toast { position:fixed; left:50%; bottom:28px; transform:translateX(-50%) translateY(10px); background:var(--text); color:#fff; padding:10px 18px; border-radius:var(--r-pill); font-size:13px; opacity:0; pointer-events:none; transition:.22s; z-index:50; box-shadow:var(--sh-3); }
.toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
:focus-visible { outline:2px solid var(--brand); outline-offset:2px; border-radius:6px; }
@media (prefers-reduced-motion: reduce){ *{ transition:none!important; animation:none!important; } .card:hover, .cat-card:hover, .cta-tool:hover { transform:none; } }
@media(max-width:720px){
  .wizard { grid-template-columns:1fr; }
  .scn-list { flex-direction:row; overflow-x:auto; padding-bottom:6px; }
  .scn { min-width:170px; }
  .cat-quick { grid-template-columns:repeat(2,1fr); }
}
`;

const JS = `
(function(){
  var toastEl = document.createElement('span');
  toastEl.className = 'toast'; toastEl.setAttribute('role','status'); toastEl.setAttribute('aria-live','polite');
  document.body.appendChild(toastEl);
  var toastTimer;
  function toast(msg){ toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 1600); }
  function fallbackCopy(text, done){
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.opacity='0'; ta.style.top='0'; document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); done(); } catch(e){ toast('请手动复制'); }
    document.body.removeChild(ta);
  }
  window.__copy = function(text, btn){
    var done = function(){ toast('已复制 ✓'); if(btn){ var t = btn.textContent; btn.textContent = '已复制 ✓'; setTimeout(function(){ btn.textContent = t; }, 1500); } };
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done, function(){ fallbackCopy(text, done); }); }
    else { fallbackCopy(text, done); }
  };

  var listGrid = document.querySelector('.list-grid');
  var browse = document.getElementById('browse');
  var pager = document.getElementById('pager');
  var emptyEl = document.getElementById('empty');
  var searchInput = document.getElementById('search');
  var pickBtn = document.querySelector('[data-pick-toggle]');
  var pickPage = !!document.querySelector('[data-pickpage]');
  var PAGE = 99;
  var listCards = listGrid ? Array.prototype.slice.call(listGrid.children).filter(function(c){ return c.classList.contains('card'); }) : [];
  var isIndex = !!browse;
  var state = { mode: isIndex ? 'browse' : 'list', q: '', pick: pickPage, page: 1 };

  function matches(c){
    var cat = c.getAttribute('data-cat') || '';
    var text = (c.getAttribute('data-text') || '').toLowerCase();
    var mq = !state.q || text.indexOf(state.q) > -1 || cat.indexOf(state.q) > -1;
    var mp = !state.pick || c.getAttribute('data-pick') === '1';
    return mq && mp;
  }
  function syncMode(){
    if(isIndex){ state.mode = (state.pick || state.q) ? 'list' : 'browse'; }
  }
  function render(){
    syncMode();
    if(browse) browse.style.display = state.mode === 'browse' ? '' : 'none';
    if(listGrid) listGrid.style.display = state.mode === 'list' ? '' : 'none';
    if(pager) pager.style.display = state.mode === 'list' ? '' : 'none';
    if(!listGrid){ if(emptyEl) emptyEl.hidden = true; return; }
    var arr = listCards.filter(matches);
    var pages = Math.max(1, Math.ceil(arr.length / PAGE));
    if(state.page > pages) state.page = pages;
    if(state.page < 1) state.page = 1;
    var start = (state.page - 1) * PAGE;
    listCards.forEach(function(c){ c.style.display = 'none'; });
    arr.slice(start, start + PAGE).forEach(function(c){ c.style.display = ''; });
    if(pager) renderPager(pages, arr.length);
    if(pickBtn) pickBtn.classList.toggle('active', state.pick);
    if(emptyEl) emptyEl.hidden = arr.length > 0;
  }
  function renderPager(pages, total){
    if(pages <= 1){ pager.innerHTML = ''; return; }
    var html = '';
    html += '<button type="button" data-pg="prev" ' + (state.page <= 1 ? 'disabled' : '') + '>‹ 上一页</button>';
    for(var p = 1; p <= pages; p++){
      if(pages > 7 && p > 2 && p < pages - 1 && Math.abs(p - state.page) > 1){ if(p === 3) html += '<span class="info">…</span>'; continue; }
      html += '<button type="button" data-pg="' + p + '" class="' + (p === state.page ? 'active' : '') + '" aria-label="第 ' + p + ' 页">' + p + '</button>';
    }
    html += '<button type="button" data-pg="next" ' + (state.page >= pages ? 'disabled' : '') + '>下一页 ›</button>';
    html += '<span class="info">共 ' + total + ' 条 · 第 ' + state.page + '/' + pages + ' 页</span>';
    pager.innerHTML = html;
  }
  if(pager){ pager.addEventListener('click', function(e){ var b = e.target.closest('button'); if(!b) return; var pg = b.getAttribute('data-pg'); if(pg === 'prev') state.page = Math.max(1, state.page - 1); else if(pg === 'next') state.page = state.page + 1; else state.page = parseInt(pg, 10); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }); }
  if(pickBtn){ pickBtn.addEventListener('click', function(e){ e.preventDefault(); state.pick = !state.pick; state.page = 1; render(); }); }
  if(searchInput){ searchInput.addEventListener('input', function(){ state.q = searchInput.value.trim().toLowerCase(); state.page = 1; render(); }); }
  document.addEventListener('keydown', function(e){
    if(e.key === '/' && searchInput && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)){ e.preventDefault(); searchInput.focus(); }
  });
  document.querySelectorAll('.copy-btn').forEach(function(b){
    b.addEventListener('click', function(){ var pre = document.getElementById('prompt-content'); if(pre) window.__copy(pre.textContent, b); });
  });
  render();
})();
`;

function nav(active, base, isIndex) {
  const pickN = globalThis.__pickCount || 0;
  const pickActive = active === '搭子精选' ? ' active' : '';
  const pickBtn = `<button type="button" class="navlink pick-btn${pickActive}" data-pick-toggle>★ 搭子精选<span class="count">${pickN}</span></button>`;
  if (isIndex) {
    /* 首页：不需要顶部筛选标签（与下方分类入口卡重复），搭子精选 toggle 移入 hero */
    return ''; // 不渲染 nav
  }
  /* 分类详情页：导航链接 */
  const links = CATEGORIES.map(c => {
    const n = (globalThis.__byCat && globalThis.__byCat[c]) ? globalThis.__byCat[c].length : 0;
    if (n === 0) return ''; // 隐藏空分类
    const cls = c === active ? 'active' : '';
    const href = c === '综合' ? base + 'index.html' : base + 'category/' + catSlug(c) + '.html';
    return `<a class="navlink ${cls}" href="${href}">${esc(c)}<span class="count">${n}</span></a>`;
  }).join('');
  return `<nav class="cats"><div class="wrap">${links}${pickBtn}</div></nav>`;
}
function layout(title, body, active, base, desc, opts) {
  opts = opts || {};
  const canonical = opts.canonical || (SITE_URL + '/');
  const ogType = opts.ogType || 'website';
  const ogImage = SITE_URL + '/assets/og.svg';
  const ld = Array.isArray(opts.ld) ? opts.ld : [];
  const descTag = desc ? `<meta name="description" content="${esc(desc)}">` : '';
  const canonicalTag = `<link rel="canonical" href="${esc(canonical)}">`;
  const ogTags = `<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc || '')}">
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="提示词搭子">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc || '')}">
<meta name="twitter:image" content="${esc(ogImage)}">`;
  const ldTags = ld.map(o => `\n<script type="application/ld+json">${jsonLd(o)}</script>`).join('');
  return `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${descTag}
${canonicalTag}
${ogTags}${ldTags}
<link rel="stylesheet" href="${base}assets/style.css">
</head><body>
<header class="site"><div class="wrap site-head">
  <div class="brand">
    <a class="logo" href="${base}index.html">提示词搭子<span> PromptDazi</span></a>
    <p class="tag">中文精选提示词 · 一键复制 · 陪你用好 AI</p>
  </div>
  <a class="tool-link ${active==='__tool__'?'active':''}" href="${base}tool.html">✍ 搭子陪写</a>
</div></header>
${nav(active, base, active === '__index__')}
<main class="wrap">${body}</main>
<footer class="site"><div class="wrap">
  <p>内容来自公开开源仓库与本站 AI 原生生成，均保留原作者署名与协议。本页仅作聚合索引，版权归原作者所有。</p>
</div></footer>
<script src="${base}assets/app.js?v=3"></script>
</body></html>`;
}
function toolBody() {
  return `<section class="tool-hero">
    <h1>搭子陪写 · 三步拿到你的专属提示词</h1>
    <p class="tool-sub">选场景 → 点选预设（或自己填）→ 实时生成结构化中文 prompt，一键复制。搭子陪你一起把需求写清楚，比从库里翻更快、更对味。</p>
  </section>
  <div class="wizard">
    <aside class="scenarios">
      <h2>① 选个场景</h2>
      <div class="scn-list" id="scnList"></div>
    </aside>
    <div class="workspace">
      <h2>② 填几项</h2>
      <div class="fields" id="fields"></div>
      <div class="preview-box">
        <div class="preview-head"><span>③ 实时预览</span><button id="resetBtn" type="button">重置</button></div>
        <pre id="out"></pre>
        <button id="copyTool" type="button">复制提示词</button>
      </div>
    </div>
  </div>
  <div class="tool-tip">
    <b>为什么是这种结构？</b> 好的提示词通常包含四块：<b>角色</b>（你是谁）+ <b>任务</b>（要做什么）+ <b>约束</b>（要求 / 避免）+ <b>输出格式</b>。搭子陪写自动帮你拼出这个结构，生成的内容也符合「搭子精选」的入选标准。
  </div>
  <script>
  (function(){
    function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
    var SCENARIOS = [
      { id:'xhs', icon:'📕', name:'小红书种草笔记', cat:'营销', blurb:'真实测评口吻的种草文',
        fields:[
          {k:'product',l:'产品 / 主题',opts:['平价护肤精华','显瘦通勤穿搭','便携咖啡机','入门降噪耳机']},
          {k:'audience',l:'目标人群',opts:['学生党 / 油皮女生','精致妈妈','租房年轻人','熬夜打工人']},
          {k:'selling',l:'核心卖点 / 痛点',opts:['控油不闷痘、性价比高','显瘦显高、好搭配','省时、口感接近现磨','安静、佩戴舒适']},
          {k:'tone',l:'风格语气',opts:['真实测评、闺蜜安利','接地气、幽默','专业成分党','情绪共鸣、治愈']} ],
        tpl:[ '你是一位深耕小红书的种草文案高手，擅长用真实、有代入感的语气写笔记。', '',
              '任务：为一款「{{product}}」写一篇小红书种草笔记。', '',
              '目标人群：{{audience}}', '核心卖点 / 痛点：{{selling}}', '风格语气：{{tone}}', '',
              '要求：', '- 标题带情绪钩子（如"后悔没早买""油皮亲测"），控制在 20 字内', '- 正文用第一人称真实体验口吻，分点讲清 痛点 → 产品 → 效果', '- 穿插 emoji，段落短小，适合手机阅读', '- 结尾加互动引导（提问 / 求链接）', '',
              '输出格式：标题 + 正文（含 3-5 个 emoji 分段）+ 相关话题标签 #xxx' ] },

      { id:'title', icon:'📰', name:'公众号爆款标题', cat:'营销', blurb:'高点击的标题组合',
        fields:[
          {k:'topic',l:'文章主题',opts:['普通人如何存下第一桶金','30 岁转行还来得及吗','被低估的国产好物','普通人也能上手的 AI 工具']},
          {k:'audience',l:'目标人群',opts:['刚工作的年轻人','职场中层','新手爸妈','自由职业者']},
          {k:'count',l:'标题数量',opts:['8','10','12','15']},
          {k:'style',l:'风格偏好',opts:['悬念','数字盘点','痛点共鸣','对比反差']} ],
        tpl:[ '你是一位公众号爆款标题写手。', '',
              '任务：围绕主题「{{topic}}」为「{{audience}}」生成 {{count}} 个公众号标题。', '',
              '风格偏好：{{style}}', '',
              '要求：', '- 每个标题独立成行，控制在 30 字内', '- 运用数字、痛点、悬念或对比增强点击欲', '- 避免标题党与夸大，承诺内容能兑现', '- 标注每个标题使用的技法（如 [数字] [悬念]）', '',
              '输出格式：标题列表，每条后附技法标注' ] },

      { id:'ecom', icon:'🛍️', name:'电商白底产品图', cat:'图像', blurb:'干净的商业产品图',
        fields:[
          {k:'product',l:'产品',opts:['无线蓝牙耳机','极简陶瓷马克杯','纯棉基础款 T 恤','便携蓝牙音箱']},
          {k:'material',l:'材质 / 颜色',opts:['磨砂白塑料','原木 + 哑光釉','精梳棉、米白','阳极氧化铝、深空灰']},
          {k:'composition',l:'构图',opts:['居中平铺','45° 俯拍','正侧面特写','成组摆拍']},
          {k:'quality',l:'画质要求',opts:['8k 商业摄影','4k 产品图','超高细节、柔光','棚拍级、锐利']} ],
        tpl:[ '你是一位电商产品图摄影师。', '',
              '任务：生成一张「{{product}}」的白底商业产品图。', '',
              '产品描述：{{material}}', '构图：{{composition}}', '画质：{{quality}}', '',
              '要求：', '- 纯白背景（#FFFFFF），无阴影或柔和投影', '- 产品清晰居中，边缘锐利，突出材质质感', '- 光线均匀柔和，避免反光过曝', '- 风格：写实、干净、适合电商详情页', '',
              '输出格式：英文 Midjourney / SD 提示词（主体 + 材质 + 构图 + 画质 + 负向词）', '负向词：杂乱背景、文字、水印、低分辨率、变形' ] },

      { id:'portrait', icon:'🎬', name:'电影感人像肖像', cat:'图像', blurb:'有故事感的人像',
        fields:[
          {k:'subject',l:'人物描述',opts:['沧桑的老渔夫','都市夜归的女孩','退伍老兵','雨中撑伞的老人']},
          {k:'mood',l:'风格 / 情绪',opts:['孤独、暖光怀旧','冷峻、疏离','温柔、希望','压抑、沉思']},
          {k:'light',l:'光影',opts:['逆光','伦勃朗光','窗边自然光','霓虹环境光']},
          {k:'comp',l:'构图',opts:['特写','环境人像','半身中景','背影剪影']} ],
        tpl:[ '你是一位电影感肖像摄影师。', '',
              '任务：生成一张「{{subject}}」的电影感人像。', '',
              '情绪氛围：{{mood}}', '光影：{{light}}', '构图：{{comp}}', '',
              '要求：', '- 电影级调色，胶片颗粒感，浅景深', '- 面部表情自然有故事感，眼神光到位', '- 色调统一（暖调 / 冷调依情绪而定）', '- 高细节、8k、肖像摄影质感', '',
              '输出格式：英文提示词（主体 + 情绪 + 光影 + 构图 + 画质 + 负向词）', '负向词：卡通、低质、畸变、过度磨皮、文字' ] },

      { id:'code', icon:'💻', name:'代码审查与重构', cat:'编程', blurb:'专业视角的代码点评',
        fields:[
          {k:'lang',l:'编程语言',opts:['Python','JavaScript / TypeScript','Go','Java']},
          {k:'purpose',l:'代码用途',opts:['处理用户上传的 CSV','调用第三方支付 API','定时同步数据库','解析前端表单提交']},
          {k:'focus',l:'关注点',opts:['性能','可读性','安全性','边界与异常']},
          {k:'output',l:'期望输出',opts:['逐段点评 + 改进代码','仅给重构后代码','问题清单 + 理由','带复杂度评估']} ],
        tpl:[ '你是一位资深 {{lang}} 工程师，擅长代码审查与重构。', '',
              '任务：审查下面这段用于「{{purpose}}」的代码，并给出改进方案。', '',
              '审查重点：{{focus}}', '期望输出：{{output}}', '',
              '要求：', '- 先指出问题（正确性 / 性能 / 可读性 / 安全性），再给改进', '- 给出重构后的完整代码，并说明改动理由', '- 标注潜在边界情况与异常处理建议', '- 如涉及性能，给出复杂度评估', '',
              '输出格式：问题清单 + 重构代码 + 改动说明' ] },

      { id:'blog', icon:'📝', name:'技术博客大纲', cat:'编程', blurb:'结构清晰的长文框架',
        fields:[
          {k:'topic',l:'主题',opts:['用 Rust 写命令行工具','从零搭一个 CI 流水线','前端状态管理选型','大模型本地部署踩坑']},
          {k:'level',l:'读者水平',opts:['有基础的中级开发者','刚入门的新手','资深架构师','跨行业转码者']},
          {k:'length',l:'篇幅',opts:['3000 字 / 10 节','5000 字 / 15 节','短篇 2000 字','系列文第一篇']},
          {k:'focus',l:'内容重点',opts:['实战、踩坑','原理剖析','最佳实践','对比评测']} ],
        tpl:[ '你是一位技术博客作者。', '',
              '任务：为「{{topic}}」写一篇面朝「{{level}}」的技术博客大纲。', '',
              '篇幅规划：{{length}}', '内容重点：{{focus}}', '',
              '要求：', '- 标题吸引人且准确，不夸大', '- 结构清晰：背景 → 核心概念 → 实战 → 踩坑 → 总结', '- 每节给出要点与可落地的示例代码提示', '- 结尾有总结与延伸阅读建议', '',
              '输出格式：分级大纲（一 / 二 / 三 + 子点），每节附 1 句要点说明' ] },

      { id:'story', icon:'🎥', name:'短视频分镜脚本', cat:'视频', blurb:'可落地的分镜表',
        fields:[
          {k:'theme',l:'主题',opts:['周末 citywalk','减脂餐的一天','宠物日常','新手租房改造']},
          {k:'platform',l:'平台',opts:['抖音','小红书','B站','视频号']},
          {k:'duration',l:'时长',opts:['30 秒','60 秒','15 秒','90 秒']},
          {k:'style',l:'风格',opts:['松弛 vlog','快节奏卡点','治愈系','硬核教程']} ],
        tpl:[ '你是一位短视频编导。', '',
              '任务：为「{{theme}}」写一个适配「{{platform}}」的短视频分镜脚本。', '',
              '时长：{{duration}}', '风格：{{style}}', '',
              '要求：', '- 开篇 3 秒强钩子留住用户', '- 分镜含：画面描述 / 台词或旁白 / 运镜 / 时长', '- 节奏符合平台调性，BGM 与情绪匹配', '- 结尾有行动引导（关注 / 评论）', '',
              '输出格式：分镜表（序号 | 画面 | 台词 | 运镜 | 时长）' ] },

      { id:'voice', icon:'🎙️', name:'抖音口播文案', cat:'视频', blurb:'念得出来的口播稿',
        fields:[
          {k:'topic',l:'产品 / 话题',opts:['降噪耳机','智能手表','平价护肤品','通勤好物']},
          {k:'audience',l:'目标人群',opts:['通勤党','学生党','精致妈妈','租房青年']},
          {k:'hook',l:'开头钩子',opts:['别再花冤枉钱','我后悔没早点买','这东西真被低估了','听完再决定']},
          {k:'duration',l:'时长',opts:['40 秒','30 秒','60 秒','20 秒']} ],
        tpl:[ '你是一位抖音口播文案写手。', '',
              '任务：为「{{topic}}」写一段面向「{{audience}}」的口播文案。', '',
              '开头钩子：{{hook}}', '时长：{{duration}}', '',
              '要求：', '- 前 3 秒用钩子或反常识留住人', '- 口语化、有节奏、适合念出来', '- 中间埋 1-2 个记忆点，结尾引导互动', '- 标注建议停顿 / BGM 位置', '',
              '输出格式：逐句口播稿 + 标注（停顿 / 重音 / BGM）' ] }
    ];

    var listEl = document.getElementById('scnList');
    var fieldsEl = document.getElementById('fields');
    var outEl = document.getElementById('out');
    var labels = {};
    SCENARIOS.forEach(function(s){ s.fields.forEach(function(f){ labels[f.k] = f.l; }); });

    var current = null;
    var vals = {};

    function renderList(){
      listEl.innerHTML = '';
      SCENARIOS.forEach(function(s){
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'scn' + (current === s ? ' active' : '');
        if(current === s) b.setAttribute('aria-current','true');
        b.innerHTML = '<div><span class="name">' + s.icon + ' ' + esc(s.name) + '</span><span class="cat">' + esc(s.cat) + '</span></div><div class="blurb">' + esc(s.blurb) + '</div>';
        b.onclick = function(){ select(s); };
        listEl.appendChild(b);
      });
    }

    function select(s){
      current = s; vals = {};
      renderList();
      fieldsEl.innerHTML = '';
      s.fields.forEach(function(f){
        var d = document.createElement('div'); d.className = 'field';
        var lab = document.createElement('label'); lab.textContent = f.l; d.appendChild(lab);
        var chips = document.createElement('div'); chips.className = 'chips'; chips.setAttribute('role','radiogroup'); chips.setAttribute('aria-label', f.l);
        (f.opts || []).forEach(function(opt){
          var c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = opt;
          c.setAttribute('role','radio'); c.setAttribute('aria-checked','false');
          c.addEventListener('click', function(){
            var wasOn = c.classList.contains('on');
            chips.querySelectorAll('.chip').forEach(function(x){ x.classList.remove('on'); x.setAttribute('aria-checked','false'); });
            if(!wasOn){ c.classList.add('on'); c.setAttribute('aria-checked','true'); }
            var ci = d.querySelector('.custom'); if(ci){ ci.value = ''; }
            vals[f.k] = wasOn ? '' : opt;
            update();
          });
          chips.appendChild(c);
        });
        d.appendChild(chips);
        var inp = document.createElement('input'); inp.type = 'text'; inp.className = 'custom'; inp.placeholder = '或自己填写（留空则用上面的选择）'; inp.dataset.k = f.k;
        inp.setAttribute('aria-label', f.l + '（自定义）');
        inp.addEventListener('input', function(){
          chips.querySelectorAll('.chip').forEach(function(x){ x.classList.remove('on'); x.setAttribute('aria-checked','false'); });
          vals[f.k] = inp.value;
          update();
        });
        d.appendChild(inp); fieldsEl.appendChild(d);
      });
      update();
    }

    function update(){
      if(!current){ outEl.textContent = ''; return; }
      var txt = current.tpl.join(String.fromCharCode(10)).replace(/\{\{(\\w+)\\}\}/g, function(_, k){
        var v = (vals[k] || '').trim();
        return v ? v : '（请选择或填写“' + labels[k] + '”）';
      });
      outEl.textContent = txt;
    }

    var copyBtn = document.getElementById('copyTool');
    if(copyBtn){ copyBtn.addEventListener('click', function(){ var t = outEl.textContent; if(window.__copy){ window.__copy(t, copyBtn); } else if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(function(){ copyBtn.textContent='已复制 ✓'; setTimeout(function(){ copyBtn.textContent='复制提示词'; },1500); }); } else { copyBtn.textContent='请手动复制'; } }); }
    document.getElementById('resetBtn').addEventListener('click', function(){ if(current){ select(current); } });

    select(SCENARIOS[0]);
  })();
  </script>`;
}

function badgeKind(it) {
  const k = it.kind === 'prompt' ? '提示词' : '仓库';
  return `<span class="badge k">${k}</span>`;
}
function stars(n) {
  n = Math.max(1, Math.min(5, n || 3));
  let s = '';
  for (let i = 1; i <= 5; i++) s += i <= n ? '★' : '<span class="empty">☆</span>';
  return `<span class="stars" title="搭子评分 ${n}/5">${s}</span>`;
}
function badgePick(it) { return it.editorPick ? '<span class="badge pick">★ 搭子精选</span>' : ''; }
function badgeDiff(it) { return it.difficulty ? `<span class="badge diff">${esc(it.difficulty)}</span>` : ''; }
function descText(it) { return it.descZh || it.description || ''; }
function card(it, base) {
  const sample = it.license === '示例' ? '<span class="badge sample">示例</span>' : '';
  const gen = it.generated ? '<span class="badge g">AI</span>' : '';
  const desc = descText(it);
  const tags = Array.isArray(it.tags) ? it.tags.join(' ') : '';
  return `<a class="card" href="${base}prompt/${esc(it.id)}.html" data-cat="${esc(it.category)}" data-pick="${it.editorPick ? '1' : ''}" data-text="${esc((it.title + ' ' + desc + ' ' + (it.useCase || '') + ' ' + tags).toLowerCase())}">
    <div class="badges"><span class="badge cat">${esc(it.category)}</span>${badgeKind(it)}${gen}${badgeDiff(it)}${badgePick(it)}</div>
    <h3>${esc(it.title)}</h3>
    <p>${esc(desc)}</p>
    <div class="meta">${stars(it.score)} ${esc(it.author || '匿名')} · ⭐${it.stars || 0}</div>
  </a>`;
}

function build() {
  const data = loadAll();
  // 按「搭子精选优先 + 评分降序」排序：中英文自然交错，高质量内容顶到前面
  data.sort((a, b) => {
    if (!!b.editorPick !== !!a.editorPick) return (b.editorPick ? 1 : 0) - (a.editorPick ? 1 : 0);
    return (b.score || 0) - (a.score || 0);
  });
  const byCat = group(data);
  globalThis.__byCat = byCat;
  globalThis.__pickCount = data.filter(x => x.editorPick).length;

  // 清理上一次生成的页面，避免残留孤儿页（低质量重复页会被搜索引擎惩罚）
  for (const sub of ['category', 'prompt']) {
    const dir = path.join(OUT, sub);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(OUT, 'category'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'prompt'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

  const picks = data.filter(x => x.editorPick);
  const indexBody = `<section class="hero">
    <h1>精选中文提示词，一键复制即用</h1>
    <p class="hero-sub">提示词搭子为你精选高质量中文 prompt，覆盖编程 / 营销 / 图像 / 视频。看到合适的直接复制，写不出的时候让搭子陪你写。</p>
    <div class="search-wrap"><input id="search" placeholder="搜索提示词 / 场景 / 模型…" /><button type="button" class="pick-toggle" data-pick-toggle>★ 搭子精选</button></div>
    <div class="cat-quick">
${CATEGORIES.filter(c => (byCat[c]||[]).length > 0).map(c => {
  const slug = catSlug(c);
  const href = c === '综合' ? 'index.html' : 'category/' + slug + '.html';
  return `      <a class="cat-card" href="${href}">${CAT_ICON[c] || '📁'} ${esc(c)}提示词<span class="em">${byCat[c].length}</span></a>`;
}).join('\n')}
    </div>
    <a class="cta-tool" href="tool.html">✍ 不知道怎么写？让搭子陪你 3 步生成专属提示词 <span class="arrow">→</span></a>
  </section>
  <div class="grid list-grid">${data.map(it => card(it, '')).join('')}</div>
  <div id="pager" class="pager"></div>
  <p id="empty" class="empty" hidden>没有匹配的提示词，换个关键词试试；或 <a href="tool.html">让搭子陪你写 →</a></p>`;
  globalThis.__allCount = data.length;
  const indexLd = [
    { '@context': 'https://schema.org', '@type': 'WebSite', 'name': '提示词搭子', 'url': SITE_URL + '/', 'description': '中文精选提示词库，一键复制即用', 'potentialAction': { '@type': 'SearchAction', 'target': SITE_URL + '/?q={search_term_string}', 'query-input': 'required name=search_term_string' } },
    { '@context': 'https://schema.org', '@type': 'ItemList', 'itemListElement': data.map((it, i) => ({ '@type': 'ListItem', 'position': i + 1, 'url': SITE_URL + '/prompt/' + enc(it.id) + '.html', 'name': it.title })) }
  ];
  fs.writeFileSync(path.join(OUT, 'index.html'), layout('提示词搭子 · 中文精选提示词库', indexBody, '__index__', '', '提示词搭子：中文精选提示词库，覆盖编程、营销、图像、视频场景，一键复制即用；更有搭子陪写帮你 3 步生成专属提示词。', { canonical: SITE_URL + '/', ogType: 'website', ld: indexLd }), 'utf8');
  fs.writeFileSync(path.join(OUT, 'tool.html'), layout('搭子陪写 · 生成专属提示词', toolBody(), '__tool__', '', '搭子陪写：选场景、点选预设或自己填，实时生成结构化中文提示词，一键复制。', { canonical: SITE_URL + '/tool.html', ogType: 'website' }), 'utf8');

  CATEGORIES.forEach(c => {
    if (!byCat[c] || byCat[c].length === 0) return; // 跳过空分类，避免生成空落地页
    const body = `<section class="hero">
      <h1>${esc(c)}类提示词 · 共 ${byCat[c].length} 条</h1>
      <p class="hero-sub">${esc(c)}类精选中文提示词，覆盖常见场景，一键复制即用。</p>
      <div class="search-wrap"><input id="search" placeholder="搜索${esc(c)}提示词…" /></div>
    </section>
    <div class="grid list-grid">${byCat[c].map(it => card(it, '../')).join('')}</div>
    <div id="pager" class="pager"></div>
    <p id="empty" class="empty" hidden>该分类下没有匹配的提示词，换个关键词试试；或 <a href="../tool.html">让搭子陪你写 →</a></p>`;
    const catLd = [
      { '@context': 'https://schema.org', '@type': 'CollectionPage', 'name': esc(c) + '提示词', 'url': SITE_URL + '/category/' + catSlug(c) + '.html', 'description': esc(c) + '类精选中文提示词', 'isPartOf': { '@type': 'WebSite', 'name': '提示词搭子', 'url': SITE_URL + '/' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [ { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': SITE_URL + '/' }, { '@type': 'ListItem', 'position': 2, 'name': esc(c) + '提示词', 'item': SITE_URL + '/category/' + catSlug(c) + '.html' } ] }
    ];
    fs.writeFileSync(path.join(OUT, 'category', catSlug(c) + '.html'), layout(c + '类提示词精选 | 提示词搭子', body, c, '../', c + '类精选提示词，共 ' + byCat[c].length + ' 条，中文一键复制即用。', { canonical: SITE_URL + '/category/' + catSlug(c) + '.html', ogType: 'website', ld: catLd }), 'utf8');
  });

  // 搭子精选落地页（全站质量天花板，占比 ≤ 10%）
  const picksAll = data.filter(x => x.editorPick);
  if (picksAll.length) {
    const pickBody = `<section class="hero" data-pickpage>
      <h1>★ 搭子精选 · 全站质量天花板</h1>
      <p class="hero-sub">搭子精选是提示词搭子里质量最高的内容，宁缺毋滥、占比 ≤ 10%。挑好合适的直接复制，写不出就让搭子陪你写。</p>
      <div class="search-wrap"><input id="search" placeholder="搜索精选提示词…" /></div>
    </section>
    <div class="grid list-grid">${picksAll.map(it => card(it, '')).join('')}</div>
    <div id="pager" class="pager"></div>
    <p id="empty" class="empty" hidden>没有匹配的精选提示词，换个关键词试试；或 <a href="tool.html">让搭子陪你写 →</a></p>`;
    const pickLd = [ { '@context': 'https://schema.org', '@type': 'CollectionPage', 'name': '搭子精选', 'url': SITE_URL + '/pick.html', 'description': '提示词搭子里质量最高的中文提示词', 'isPartOf': { '@type': 'WebSite', 'name': '提示词搭子', 'url': SITE_URL + '/' } } ];
    fs.writeFileSync(path.join(OUT, 'pick.html'), layout('搭子精选 · 中文提示词 | 提示词搭子', pickBody, '搭子精选', '', '搭子精选：提示词搭子里质量最高的中文提示词，宁缺毋滥，一键复制即用。', { canonical: SITE_URL + '/pick.html', ogType: 'website', ld: pickLd }), 'utf8');
  }

  data.forEach(it => {
    const sample = it.license === '示例' ? '<span class="badge sample">示例</span>' : '';
    const gen = it.generated ? '<span class="badge g">AI</span>' : '';
    let src;
    if (it.generated) {
      src = `<p class="src">来源：本站 AI 原生生成内容（原创，遵循 ${esc(it.license)}，可自由使用并注明出处）。</p>`;
    } else if (it.sourceUrl) {
      src = `<p class="src">来源：<a href="${esc(it.sourceUrl)}" target="_blank" rel="noopener">${esc(it.sourceUrl)}</a>（版权归原作者，请遵守其协议）</p>`;
    } else {
      src = '<p class="src">示例数据：运行 node scripts/collect.js 抓取真实仓库后填充来源。</p>';
    }
    const zh = it.descZh ? `<p class="desc">${esc(it.descZh)}</p>` : (it.description ? `<p class="desc">${esc(it.description)}</p>` : '');
    const en = (it.descZh && it.description) ? `<p class="desc" style="color:#94a3b8;font-size:12px;">英文原文：${esc(it.description)}</p>` : '';
    const rel = (byCat[it.category] || []).filter(x => x.id !== it.id).slice(0, 6);
    const relatedHtml = rel.length ? `<section class="related"><h2>相关${esc(it.category)}提示词</h2><div class="grid">${rel.map(x => card(x, '../')).join('')}</div></section>` : '';
    const body = `<article class="detail">
      <div class="breadcrumb">
        <a class="back-btn" href="../index.html">← 返回首页</a>
        <span class="crumb"><a href="../index.html">首页</a> › <a href="../category/${catSlug(it.category)}.html">${esc(it.category)}</a> › ${esc(it.title)}</span>
      </div>
      <div class="badges"><span class="badge cat">${esc(it.category)}</span>${badgeKind(it)}${gen}${badgeDiff(it)}${badgePick(it)}</div>
      <h1>${esc(it.title)}</h1>
      ${zh}${en}
      <div class="meta">${stars(it.score)} <span>搭子评分</span> · 难度 ${esc(it.difficulty || '—')} · 作者 ${esc(it.author || '匿名')} · 协议 ${esc(it.license)}</div>
      <div class="copy-bar">
        <span class="msg"><span class="ok">✓</span> 人工精选 · 一键复制即用</span>
        <button class="copy-btn" type="button">复制提示词</button>
      </div>
      ${it.useCase ? `<div class="usecase"><b>适用场景：</b>${esc(it.useCase)}</div>` : ''}
      <div class="code-card">
        <div class="code-head"><span class="lang">提示词内容</span><button class="copy-btn" type="button">复制</button></div>
        <pre id="prompt-content">${esc(it.content)}</pre>
      </div>
      ${src}
      ${relatedHtml}
    </article>`;
    const descMeta = (it.descZh || it.description || it.title || '').slice(0, 80);
    const artLd = {
      '@context': 'https://schema.org', '@type': 'Article',
      'headline': it.title, 'description': descMeta,
      'author': { '@type': 'Organization', 'name': it.author || '提示词搭子' },
      'publisher': { '@type': 'Organization', 'name': '提示词搭子', 'logo': { '@type': 'ImageObject', 'url': SITE_URL + '/assets/og.svg' } },
      'datePublished': it.fetchedAt || new Date().toISOString().slice(0, 10),
      'inLanguage': 'zh-CN', 'articleSection': it.category,
      'keywords': (Array.isArray(it.tags) ? it.tags.join(',') : ''),
      'about': { '@type': 'Thing', 'name': it.category + '提示词' },
      'mainEntity': { '@type': 'CreativeWork', 'text': it.content },
      'url': SITE_URL + '/prompt/' + enc(it.id) + '.html'
    };
    const crumbLd = {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': SITE_URL + '/' },
        { '@type': 'ListItem', 'position': 2, 'name': it.category, 'item': SITE_URL + '/category/' + catSlug(it.category) + '.html' },
        { '@type': 'ListItem', 'position': 3, 'name': it.title, 'item': SITE_URL + '/prompt/' + enc(it.id) + '.html' }
      ]
    };
    fs.writeFileSync(path.join(OUT, 'prompt', enc(it.id) + '.html'), layout(it.title + ' · ' + it.category + '中文提示词 | 提示词搭子', body, '__detail__', '../', descMeta, { canonical: SITE_URL + '/prompt/' + enc(it.id) + '.html', ogType: 'article', ld: [artLd, crumbLd] }), 'utf8');
  });

  fs.writeFileSync(path.join(OUT, 'assets', 'style.css'), CSS, 'utf8');
  fs.writeFileSync(path.join(OUT, 'assets', 'app.js'), JS, 'utf8');

  // —— SEO 地基：robots.txt / sitemap.xml / OG 分享图 ——
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: '/', pri: '1.0', freq: 'daily' },
    { loc: '/pick.html', pri: '0.8', freq: 'weekly' },
    { loc: '/tool.html', pri: '0.5', freq: 'monthly' }
  ];
  CATEGORIES.forEach(c => { if (byCat[c] && byCat[c].length) urls.push({ loc: '/category/' + catSlug(c) + '.html', pri: '0.8', freq: 'daily' }); });
  data.forEach(it => urls.push({ loc: '/prompt/' + enc(it.id) + '.html', pri: '0.6', freq: 'weekly' }));
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => `  <url><loc>${esc(SITE_URL + u.loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n') +
    '\n</urlset>\n';
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap, 'utf8');
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`, 'utf8');
  // GitHub Pages 默认用 Jekyll 处理，遇到 {{ }} / {% %} 或下划线目录会出错；加 .nojekyll 让它原样托管静态文件
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '', 'utf8');
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><text x="80" y="300" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="92" font-weight="800" fill="#ffffff">提示词搭子</text><text x="84" y="372" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="40" fill="#dbeafe">中文精选提示词 · 一键复制即用</text><text x="84" y="470" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="32" fill="#bfdbfe">PromptDazi · 陪你用好 AI</text></svg>`;
  fs.writeFileSync(path.join(OUT, 'assets', 'og.svg'), ogSvg, 'utf8');

  console.log(`[build] 生成首页 + 工具页 + ${CATEGORIES.filter(c=>byCat[c]&&byCat[c].length).length} 分类页 + ${data.length} 详情页 + sitemap/robots/og -> ${OUT}`);
}
build();
