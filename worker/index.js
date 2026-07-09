// Cloudflare Worker：Agnes AI 代理
// 作用：
//   1) 隐藏 Agnes API Key —— Key 存在 Worker 的「机密变量」里，浏览器永远拿不到
//   2) 解决 CORS —— 浏览器直连 apihub.agnes-ai.com 常被跨域拦截，Worker 回程加 CORS 头即可放行
//   3) 可选防盗刷 —— 配置 ALLOWED_ORIGIN 后，只有你的站点域名能调，别人白嫖不了你的免费 RPM 额度
//
// 部署步骤见同目录 DEPLOY-WORKER.md

const AGNES_URL = 'https://apihub.agnes-ai.com/v1/chat/completions';

function corsHeaders(origin) {
  // 有 Origin 就反射回去（更稳），否则放行全部
  const allow = origin && origin !== 'null' ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');

    // 1) 预检（CORS preflight）：浏览器发 POST 前会先发 OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // 2) 只接受 POST
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // 3) 可选：来源校验（防滥用）。未配置 ALLOWED_ORIGIN 则放行所有来源
    const allowed = env.ALLOWED_ORIGIN;
    if (allowed) {
      const ok = origin === allowed ||
        (origin && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')));
      if (!ok) return json({ error: 'Origin not allowed' }, 403);
    }

    // 4) 读取并原样转发请求体（model / messages / temperature 等由前端决定）
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    // 5) 代理到 Agnes，注入 Key（浏览器不持有 Key）
    const upstream = await fetch(AGNES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + env.AGNES_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    });
  },
};
