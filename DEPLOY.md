# 部署到 GitHub Pages（免费 · 自动）

本仓库是纯静态站点，`scripts/build.js` 把 `data/` 构建成 `public/`。
通过 GitHub Actions 实现：**推送源码 → 自动构建 → 自动部署到 GitHub Pages**，每日自动化生成新内容后也会自动推送上线。

## 一、首次部署（你来做，约 5 分钟）

### 1. 在 GitHub 新建仓库
- 登录 GitHub → New repository
- 仓库名随意，建议 `prompt-hub`（若想用 `https://你的名.github.io/` 这种用户页，仓库名必须叫 `你的名.github.io`）
- 设为 **Public**（GitHub Pages 免费版要求公开仓库）
- 不要勾选 "Add a README"（本地已有）

### 2. 本地首次推送（已帮你 `git init` + 初始提交，只需加远程并推送）
在 `prompt-hub/` 目录下执行：
```bash
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```
推送后 GitHub Actions 会自动运行，约 1 分钟构建完成。

### 3. 开启 GitHub Pages
- 进入仓库 **Settings → Pages**
- Source 选 **Deploy from a branch**
- Branch 选 **gh-pages** ，目录 **/ (root)**
- 保存
- 几秒后访问：`https://<你的用户名>.github.io/<仓库名>/`

### 4. 让搜索引擎收录（拿到地址后做）
- **百度站长平台**：https://ziyuan.baidu.com/ → 添加站点 → 选「HTML 标签验证」或「CNAME 验证」→ 把验证代码/记录发我，我帮你加到页面或 DNS → 提交 `sitemap.xml`（`https://<你的名>.github.io/<仓库>/sitemap.xml`）
- **Google Search Console**：https://search.google.com/search-console → URL 前缀填上述地址 → 同样验证 → 提交 sitemap
- 收录后，站点每天的原创中文 prompt 会被百度/Google 抓到，形成搜索流量。

## 二、每日自动化（已配置，自动上线）

自动化 `automation-1783481910434` 每天 09:00：
1. 生成 10 条原创中文 prompt（遵守「搭子精选 ≤10%」约束）
2. 运行 `generate.js` → 更新 `data/generated.json`
3. 运行 `build.js` → 本地重建 `public/`
4. `git add` 数据/脚本 → `commit` → `push origin main` → **触发上面的 Actions 自动部署**

> ⚠️ 前提：WorkBuddy 自动化运行环境需能访问你的 GitHub（即已配置 git 远程 + 凭证/SSH key）。
> 若 push 被拒绝（无凭证/无远程），自动化会明确告警并跳过部署，**不会静默失败**；此时你手动 `git push` 一次即可恢复自动链路。

## 三、以后买域名（可选，升级品牌）

花 30–55 元/年买 `promptdazi.cn` 后：
- 改 `scripts/build.js` 顶部 `SITE_URL` 为你域名，或部署时在 Actions 注入 `SITE_URL` 环境变量
- 仓库 Settings → Pages → Custom domain 填 `promptdazi.cn`，DNS 加 CNAME 指向 `<你的名>.github.io`
- 因服务器在境外，**无需 ICP 备案**即可用国内域名访问

## 四、本地预览（不部署也能看）

```bash
cd prompt-hub
node scripts/build.js
python -m http.server 8080   # 打开 http://127.0.0.1:8080
```
