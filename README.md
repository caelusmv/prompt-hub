# 提示词搭子 · PromptDazi

把全网优质提示词精选整理，按中文场景分类（编程 / 营销 / 图像 / 视频 / 综合），提供搜索、分类浏览、详情页与一键复制。内容来自公开开源仓库与本站 AI 原生生成，均保留原作者署名与协议。

## 快速开始

```bash
# 1. 采集数据（GitHub 开源 prompt 仓库 + 内置示例兜底）
node scripts/collect.js

# 2. 生成静态站
node scripts/build.js

# 3. 本地预览（任选其一）
python -m http.server 3000 --directory public
# 或直接双击 public/index.html 打开
```

也可以一步到位：`npm run dev`

## GitHub API 限额与提速

- 匿名调用 GitHub API 限额为 **60 次/小时**（core），超限会 403。脚本会检测到限流并**立即停止并提示**，不会再静默产出 0 条。
- **推荐：设置 `GITHUB_TOKEN` 环境变量**，限额提升到 5000 次/小时，四个分类都能稳定填满：
  ```bash
  export GITHUB_TOKEN=ghp_xxx   # 仅运行时读取，不会写入任何文件
  node scripts/collect.js
  ```
- 采集结果会写入 `data/.cache/`（已加入 `.gitignore`），24 小时内重跑几乎不消耗配额；定时重跑很便宜。
- 分类采集：每个分类用一组定向搜索（topic:prompt / midjourney-prompts / marketing-prompts / video-prompts），各取 Top 2 仓库解析，保证四分类都有真实内容。

## 目录结构

```
prompt-hub/
├── scripts/
│   ├── collect.js   # 采集：GitHub API + 分类 + fallback
│   └── build.js     # 生成静态 HTML（首页/分类页/详情页）
├── data/
│   └── prompts.json # collect 产出
└── public/          # build 产出，可直接托管
    ├── index.html
    ├── category/<分类>.html
    ├── prompt/<id>.html
    └── assets/
```

## 已做的合规处理

- 每条都保留 `sourceUrl`（源头链接）、`author`、`license`；
- 详情页明确标注"版权归原作者，请遵守其协议"；
- 内置"示例"条目清晰标注，不与真实内容混淆；
- 全站页脚声明聚合索引性质。

## 下一步（生产化建议）

1. **接 AdSense 前先攒原创价值**：纯搬运会被拒审/降权。增加中文翻译、人工策展评分、实测对比。
2. **SEO**：当前为静态 HTML（已利于抓取）；如需动态筛选，可升级到 Next.js 做 SSR/ISR。
3. **数据源拓展**：在 `collect.js` 增加 RSS、各平台公开 API、CC 协议内容；对单条 prompt 做去重与结构化。
4. **变现组合**：联盟分销（AI 工具/订阅分成）、赞助位、付费高级功能，合规达标后再接 AdSense。
5. **去重与质量**：加相似度去重、按 stars/评分排序、坏链清理。
