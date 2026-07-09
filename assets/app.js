
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
  var isHome = !!document.querySelector('.hero');
  var homeRandom = isHome;
  var homeRandomCards = [];
  var state = { mode: isIndex ? 'browse' : 'list', q: '', pick: pickPage, page: 1 };
  function shuffle(a){ for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  if(isHome && listCards.length > 9){
    var idx = listCards.map(function(_, i){ return i; });
    shuffle(idx);
    homeRandomCards = idx.slice(0, 9).map(function(i){ return listCards[i]; });
  } else if(isHome){
    homeRandomCards = listCards.slice();
    homeRandom = false;
  }

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
    if(!listGrid){ if(emptyEl) emptyEl.hidden = true; return; }
    if(isHome && homeRandom && !state.q && !state.pick){
      listGrid.style.display = '';
      listCards.forEach(function(c){ c.style.display = 'none'; });
      homeRandomCards.forEach(function(c){ c.style.display = ''; });
      if(pager) pager.style.display = 'none';
      if(pickBtn) pickBtn.classList.toggle('active', false);
      if(emptyEl) emptyEl.hidden = homeRandomCards.length > 0;
      return;
    }
    if(listGrid) listGrid.style.display = state.mode === 'list' ? '' : 'none';
    if(pager) pager.style.display = state.mode === 'list' ? '' : 'none';
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
  if(pickBtn){ pickBtn.addEventListener('click', function(e){ e.preventDefault(); homeRandom = false; state.pick = !state.pick; state.page = 1; render(); }); }
  if(searchInput){ searchInput.addEventListener('input', function(){ homeRandom = false; state.q = searchInput.value.trim().toLowerCase(); state.page = 1; render(); }); }
  document.addEventListener('keydown', function(e){
    if(e.key === '/' && searchInput && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)){ e.preventDefault(); searchInput.focus(); }
  });
  document.querySelectorAll('.copy-btn').forEach(function(b){
    b.addEventListener('click', function(){ var pre = document.getElementById('prompt-content'); if(pre) window.__copy(pre.textContent, b); });
  });
  function addViewAllBtn(){
    if(!isHome || document.getElementById('homeViewAll')) return;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'homeViewAll'; btn.className = 'home-viewall';
    btn.textContent = '查看全部提示词 (' + listCards.length + ') →';
    btn.addEventListener('click', function(){ homeRandom = false; state.page = 1; render(); btn.style.display = 'none'; });
    if(listGrid && listGrid.parentNode) listGrid.parentNode.insertBefore(btn, listGrid.nextSibling);
  }
  addViewAllBtn();

  // ===== AI 对话框（演示：本地模拟回复；接入大模型时只需改 callAI 内部） =====
  var aiInput = document.getElementById('aiInput');
  var aiSend = document.getElementById('aiSend');
  var aiMsgs = document.getElementById('aiMsgs');
  function aiEscape(s){ return String(s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
  // 系统提示词（接入真实大模型时作为 system 消息传入，框死 AI 只输出提示词结构）
  window.__AI_SYSTEM_PROMPT = "# 角色设定\n你是一位世界级的提示词工程专家（Prompt Engineering Expert），精通文本生成、图像生成、视频生成、代码生成、Agent 工作流五大类提示词的撰写与优化。\n\n# 任务\n用户会给你一句简短的想法或需求。你要直接为他生成【最终可复制使用的那条提示词本身】——不要写\"角色设定\"\"任务目标\"\"处理流程\"\"约束规则\"\"示例\"之类的\"提示词生成器\"元框架，也不要输出任何需求分析或解释文字。只给最终提示词。\n\n# 输出规则\n1. 先判断用户想要哪类产出：图像 / 视频 / 代码 / 文本写作 / Agent 工作流。\n2. 直接给出最终提示词，按类型采用最实用的格式：\n   - 图像、视频类：依次给出「中文提示词」「英文提示词」（英文用逗号分隔的关键词/短语结构，必要时用 :: 权重标记）、「参数建议」（画幅比例 / 模型版本 / 运镜参数等）、「风格说明」（一句话说明视觉风格与适用场景）。\n   - 代码类：直接给出可运行代码，附中文注释与简要用法。\n   - 文本写作类：直接给出「角色 + 任务 + 关键约束 + 输出格式」的中文提示词。\n   - Agent 工作流类：直接给出节点流程与每个节点的指令。\n3. 将最终提示词主体用三个反引号包裹的 Markdown 代码块输出，便于一键复制。\n4. 严格禁止输出\"需求分析\"\"第一部分\"\"第二部分\"\"角色设定\"\"任务目标\"等字样，不闲聊。\n\n# 示例（图像类，用户输入\"小女孩在海边骑马\"时的期望输出）\n**中文提示词**：一位约 8 岁的小女孩身穿亚麻色连衣裙与软皮短靴，骑在一匹温顺的浅棕色马背上沿金色沙滩缓行；背景是柔和的晨雾与微浪拍岸，远处低矮云层；自然侧光勾勒轮廓，浅景深突出主体，整体电影级治愈写实摄影风格。\n**英文提示词**：An 8-year-old girl wearing a linen dress and soft leather boots, riding a calm light brown horse along a golden sandy beach; soft morning mist, gentle waves, distant low clouds; natural side lighting, shallow depth of field, cinematic healing realistic photography, highly detailed, 8k.\n**参数建议**：--ar 16:9 --v 6.0 --style raw --q 2\n**风格说明**：电影级写实摄影，强调自然光影与情感氛围，适合高精度出图与故事感构图。".split('@@BT@@').join(String.fromCharCode(96));
  // ===== 真实模型接入配置（默认 Agnes AI，OpenAI 兼容协议，免费） =====
  // proxy=true：浏览器只调 Cloudflare Worker（endpoint），Agnes Key 存在 Worker 机密里，不进浏览器、解决 CORS。
  //   见 worker/ 目录与 worker/DEPLOY-WORKER.md。endpoint 换成你部署的 Worker 地址 + /v1/chat/completions。
  // proxy=false：浏览器直连 Agnes，需访客在「设置」面板自填 Key（或填 builtinKey 全站免填，但会暴露在源码）。
  var AI_CONFIG = {
    endpoint: 'https://apihub.agnes-ai.com/v1/chat/completions', // Agnes 直连（CORS 已放行 *）
    model: 'agnes-2.0-flash',
    keyStorage: 'pd_ai_key',
    builtinKey: 'sk-DRCwwtVFRiQadqXDlk5sQC7M4cD34RW9fhSfAd63jwSFyKgK', // 全站内置 Key（会暴露在源码，免费低流量可接受）
    proxy: false
  };
  function aiGetKey(){ try { return localStorage.getItem(AI_CONFIG.keyStorage) || ''; } catch(e){ return ''; } }
  function aiSetKey(k){ try { if(k) localStorage.setItem(AI_CONFIG.keyStorage, k); else localStorage.removeItem(AI_CONFIG.keyStorage); } catch(e){} }
  function aiHasKey(){ return !!aiGetKey(); }
  function aiAdd(role, html){
    if(!aiMsgs) return;
    var wrap = document.createElement('div'); wrap.className = 'ai-msg ' + role;
    if(role === 'ai'){ var av = document.createElement('div'); av.className = 'ai-avatar'; av.textContent = '🤖'; wrap.appendChild(av); }
    var b = document.createElement('div'); b.className = 'ai-bubble'; b.innerHTML = html; wrap.appendChild(b);
    aiMsgs.appendChild(wrap); aiMsgs.scrollTop = aiMsgs.scrollHeight;
  }
  function aiTyping(){
    if(!aiMsgs) return;
    var wrap = document.createElement('div'); wrap.className = 'ai-msg ai'; wrap.id = 'aiTyping';
    var av = document.createElement('div'); av.className = 'ai-avatar'; av.textContent = '🤖';
    var b = document.createElement('div'); b.className = 'ai-bubble'; b.textContent = '正在生成提示词…';
    wrap.appendChild(av); wrap.appendChild(b); aiMsgs.appendChild(wrap); aiMsgs.scrollTop = aiMsgs.scrollHeight;
  }
  function aiStopTyping(){ var t = document.getElementById('aiTyping'); if(t) t.parentNode.removeChild(t); }
  // 本地模拟：不接真模型时，按新设定直接输出最终提示词本体（中文/英文/参数/风格，或代码/文本/工作流对应形态），不带生成器框架
  function simulatePrompt(idea){
    var NL = String.fromCharCode(10);
    var BT = String.fromCharCode(96);
    var i = (idea || '').trim() || '你的需求';
    var t = (i.match(/图|照片|写真|头像|海报|产品图|插画|画|image|midjourney|\bmj\b|sd|flux|recraft/i)) ? 'image'
          : (i.match(/视频|短片|运镜|mv|video|可灵|runway|sora|pika|海螺/i)) ? 'video'
          : (i.match(/代码|爬虫|python|js|程序|脚本|函数|前端|后端|cursor|copilot|系统提示|system prompt/i)) ? 'code'
          : (i.match(/工作流|agent|智能体|自动化|coze|dify|n8n|comfyui/i)) ? 'agent'
          : 'text';
    var body;
    if(t === 'image' || t === 'video'){
      var isV = t === 'video';
      var en = isV
        ? i + ', smooth camera movement, natural lighting, realistic motion, coherent subject, cinematic grade, 24fps.'
        : i + ', cinematic realistic photography, natural lighting, shallow depth of field, highly detailed, 8k.';
      var params = isV ? '--ar 16:9，时长 5s，fps 24，缓慢推近 / 横移运镜' : '--ar 16:9 --v 6.0 --style raw --q 2';
      var style = isV ? '电影级视频调色，强调运镜与主体一致性。' : '电影级写实摄影，强调自然光影与主体质感，适合高精度出图。';
      var cn = isV
        ? i + '，流畅运镜，自然光线，真实动态，主体一致，电影级调色，24fps。'
        : i + '，电影级写实摄影风格，自然光影，浅景深突出主体，画面细节丰富，8k 分辨率。';
      body = '**中文提示词**：' + cn + NL +
             '**英文提示词**：' + en + NL +
             '**参数建议**：' + params + NL +
             '**风格说明**：' + style;
    } else if(t === 'code'){
      body = '下面是可直接运行 / 使用的「' + i + '」方案（演示骨架，接入真实模型后自动细化）：' + NL + NL +
             BT + BT + BT + 'python' + NL + '# TODO: 按「' + i + '」生成对应代码' + NL + 'def main():' + NL + '    pass' + NL + BT + BT + BT + NL + NL +
             '**用法**：粘贴到「' + i + '」对应环境运行，按需补充输入输出。';
    } else if(t === 'agent'){
      body = '**工作流**：' + i + NL +
             '1. 触发节点：监听触发条件，收集输入' + NL +
             '2. 处理节点：执行核心逻辑，产出中间结果' + NL +
             '3. 输出节点：格式化结果并回传' + NL +
             '**每节点指令**：独立 system prompt，明确 IO 与异常分支。';
    } else {
      body = '**提示词**：你是一位擅长「' + i + '」的资深专家。基于用户素材，输出可直接使用的结果：先明确角色与语气，再定义核心任务与目标，列出关键约束（字数 / 风格 / 禁忌），最后指定输出格式。用 {主题} {风格} {字数} 占位符方便复用。';
    }
    return body;
  }
  function callAI(idea, done){
    var browserKey = aiGetKey() || AI_CONFIG.builtinKey;
    if(!AI_CONFIG.proxy && !browserKey){
      // 直连模式且无 Key：本地演示模式（输出只含结构化提示词代码块）
      setTimeout(function(){ done(simulatePrompt(idea)); }, 450);
      return;
    }
    // 代理模式：浏览器不持有 Key，由 Worker 注入；直连模式：带浏览器 Key
    var headers = { 'Content-Type': 'application/json' };
    if(!AI_CONFIG.proxy && browserKey){ headers['Authorization'] = 'Bearer ' + browserKey; }
    fetch(AI_CONFIG.endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: window.__AI_SYSTEM_PROMPT },
          { role: 'user', content: idea }
        ],
        stream: false,
        temperature: 0.7
      })
    })
    .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
    .then(function(res){
      if(!res.ok || (res.d && res.d.error)){ throw new Error((res.d && res.d.error && res.d.error.message) || ('HTTP ' + res.ok)); }
      var text = res.d.choices && res.d.choices[0] && res.d.choices[0].message ? res.d.choices[0].message.content : '';
      done(text && text.trim() ? text : simulatePrompt(idea));
    })
    .catch(function(err){
      // 真实调用失败：回退演示模式并提示（常见：CORS 跨域 / Key 无效 / 额度不足）
      done(simulatePrompt(idea));
      var note = document.getElementById('aiNote');
      if(note) note.textContent = '⚠️ 调用失败（' + (err && err.message ? err.message : '网络错误') + '），已回退演示模式 · 请检查网络或刷新重试';
    });
  }
  function aiSendIdea(raw){
    var idea = (raw || (aiInput && aiInput.value) || '').trim();
    if(!idea || !aiMsgs) return;
    if(aiInput) aiInput.value = '';
    var welcome = document.getElementById('aiWelcome');
    if(welcome) welcome.parentNode.removeChild(welcome);
    var chatInner = document.getElementById('aiChatInner');
    if(chatInner) chatInner.classList.add('active');
    aiAdd('user', aiEscape(idea));
    aiTyping();
    callAI(idea, function(text){
      aiStopTyping();
      var html = '<span class="ai-prompt">' + aiEscape(text) + '</span><button type="button" class="ai-copy" data-copy>复制提示词</button>';
      aiAdd('ai', html);
    });
  }
  if(aiSend) aiSend.addEventListener('click', function(){ aiSendIdea(); });
  if(aiInput){
    aiInput.addEventListener('keydown', function(e){ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); aiSendIdea(); } });
    aiInput.addEventListener('input', function(){
      aiInput.style.height = 'auto';
      aiInput.style.height = Math.min(aiInput.scrollHeight, 160) + 'px';
    });
  }
  document.querySelectorAll('.ai-chip').forEach(function(ch){ ch.addEventListener('click', function(){ aiSendIdea(ch.getAttribute('data-idea')); }); });
  if(aiMsgs) aiMsgs.addEventListener('click', function(e){ var btn = e.target.closest('[data-copy]'); if(btn){ var pre = btn.previousElementSibling; if(pre) window.__copy(pre.textContent, btn); } });

  // 设置面板：切换 / 保存 / 清除 Key
  var aiNote = document.getElementById('aiNote');
  function aiUpdateNote(){
    if(!aiNote) return;
    if(AI_CONFIG.proxy){
      aiNote.textContent = '已连接 Agnes AI（经代理）· 真实生成 · 只输出结构化提示词（Markdown 代码块）';
    } else if(aiHasKey()){
      aiNote.textContent = '已连接 Agnes AI · 真实生成 · 只输出结构化提示词（Markdown 代码块）';
    } else {
      aiNote.textContent = '只生成提示词 · 不闲聊 · 只输出结构化提示词（Markdown 代码块） · 当前为演示模式';
    }
  }
  aiUpdateNote();

  render();
})();
