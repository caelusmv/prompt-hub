# 部署到 GitHub Pages（免费 · 自动）

本仓库是纯静态站点，`scripts/build.js` 把 `data/` 构建成 `public/`。
通过 **GitHub Pages** 部署：每次 `git push` 到 `main`，GitHub Actions 自动构建并把 `public/` 发布到 `gh-pages` 分支。每日自动化生成新内容后也会自动推送上线。

线上地址：`https://<你的用户名>.github.io/prompt-hub/`
（本仓库即 `https://caelusmv.github.io/prompt-hub/`）

## 一、你只需要做一次的仓库设置

1. 仓库已建好：`https://github.com/caelusmv/prompt-hub.git`
2. 开启 Pages：仓库 **Settings → Pages → Build and deployment → Source 选 "Deploy from a branch" → Branch 选 `gh-pages` / 目录 `(root)` → Save**。
   - 首次推送后 Actions 跑完，这里会出现绿色已发布提示和公网地址。
3. （可选）买域名 `promptdazi.cn` 后，在 Pages 里填 Custom domain，并把 `scripts/build.js` 顶部的 `SITE_URL` 默认值改成你的域名、重新部署。

> 站点使用相对路径，放在 `/prompt-hub/` 子路径下也能正常加载 CSS/JS，无需额外配置。

## 二、本地推送（首次 / 手动更新）

在本机 `prompt-hub/` 目录：

```bash
git add -A
git commit -m "feat: 提示词搭子静态站 + GitHub Pages 部署"
git push -u origin main
```

推送后 GitHub Actions 自动构建并部署，通常 1 分钟内上线。
可在仓库 **Actions** 标签页看到实时进度；失败会有红色 ✗ 与日志。

## 三、每日自动化（已配置，自动上线）

自动化 `automation-1783481910434` 每天 09:00：
1. 生成 10 条原创中文 prompt（遵守「搭子精选 ≤10%」约束）
2. `generate.js` → 更新 `data/generated.json`
3. `git add data/generated.json ... && git commit && git push origin main`
   → 触发 GitHub Actions 自动构建并部署到 GitHub Pages
   - 若 push 失败（无凭证/网络不可达）：自动化会**明确告警**并请你手动 `git push`，**不会静默失败**。

## 四、让搜索引擎收录（拿到地址后做）

- **百度站长平台**：https://ziyuan.baidu.com/ → 添加站点 `https://caelusmv.github.io/prompt-hub` → HTML 标签/CNAME 验证 → 提交 `sitemap.xml`（`https://caelusmv.github.io/prompt-hub/sitemap.xml`）
- **Google Search Console**：https://search.google.com/search-console → 同样添加并验证 → 提交 sitemap
- 收录后，站点每天的原创中文 prompt 会被抓到，形成搜索流量。

## 五、本地预览（不部署也能看）

```bash
cd prompt-hub
node scripts/build.js
python -m http.server 8080   # 打开 http://127.0.0.1:8080
```
