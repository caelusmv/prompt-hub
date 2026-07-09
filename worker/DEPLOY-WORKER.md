# Agnes AI 代理 Worker 部署指南

把 Agnes 的 Key 藏到 Cloudflare Worker 里，浏览器只调 Worker、不直接碰 Agnes。
好处：① 访客免填 Key ② Key 不暴露在页面源码 ③ 解决浏览器直连 Agnes 的 CORS 跨域。

## 0. 准备
- 一个 Cloudflare 账号（免费就行，Workers 免费额度够用）
- 你的 Agnes API Key（在 platform.agnes-ai.com → Settings → API Keys 创建，形如 `sk-...`）
- 本地装好 Node.js（用来跑 wrangler）

## 1. 安装并登录 wrangler
```bash
npm install -g wrangler
wrangler login        # 浏览器弹窗授权，登录你的 Cloudflare 账号
```

## 2. 部署 Worker
在 `prompt-hub/worker/` 目录下：
```bash
cd prompt-hub/worker
wrangler deploy
```
首次部署会让你给 Worker 起个名字（默认 `agnes-proxy`，回车即可），
部署成功后终端会返回一个地址，形如：
```
https://agnes-proxy.<你的子域>.workers.dev
```
记下这个地址，它就是代理入口。

## 3. 设置 Agnes Key（机密，不在代码里）
```bash
wrangler secret put AGNES_API_KEY
# 提示粘贴时，输入你的 Agnes Key（sk-...），回车
```
设置后 Worker 自动重启生效。

> 也可以在 Cloudflare 控制台 → Workers & Pages → agnes-proxy → Settings → Variables → Add → 类型选 Secret，名字 `AGNES_API_KEY`，值填 Key。

## 4. （可选）限制只有你的站能调
编辑 `wrangler.toml`，取消注释并改成你的域名：
```toml
[vars]
ALLOWED_ORIGIN = "https://promptdazi.cn"
```
然后 `wrangler deploy` 重新部署。localhost 测试地址默认已放行。

## 5. 把站点指向 Worker
打开 `scripts/build.js`，找到 `AI_CONFIG`：
```js
var AI_CONFIG = {
  endpoint: 'https://agnes-proxy.<你的子域>.workers.dev/v1/chat/completions', // ← 换成第 2 步拿到的地址 + /v1/chat/completions
  model: 'agnes-2.0-flash',
  keyStorage: 'pd_ai_key',
  builtinKey: '',
  proxy: true   // true=走 Worker 代理（Key 在 Worker 端）；false=浏览器直连 Agnes（需访客自填 Key）
};
```
改完重建：
```bash
node scripts/build.js
```
部署站点（push 到 GitHub 触发 Pages，或你本地的方式）。

## 6. 验证
- 本地 `python -m http.server --directory public 8081`，打开 `http://localhost:8081`
- 在 AI 对话框输入一个想法回车，底部应显示「已连接 Agnes AI（经代理）· 真实生成」，并收到四段提示词
- 若 Worker 地址没填对 / Key 没设置，会自动回退演示模式，不会白屏

## 备注
- Worker 免费额度：每天 10 万次请求，个人站点绰绰有余。
- 想换回「访客自填 Key」直连模式：把 `proxy` 改 `false`，访客在「⚙ 设置 Agnes API Key」面板粘贴自己的 Key 即可。
