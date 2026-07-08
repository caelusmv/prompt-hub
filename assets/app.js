
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
