# v1.6.6 Article + Math Reader 修正版

## Why

修复 Article / Math 阅读系统在本地 file:// 打开时暴露出的路径、语言和排版问题。

## Changed

1. **中文路径映射**
   - `article.js` 新增 Unicode 路径解析。
   - 支持用户打开 `web-01-集合论索引.md` 这类中文 URL。
   - 自动映射到真实文件名 `web-01-#U96c6#U5408...md`。
   - 不再把中文文件名问题直接甩给 `npm run dev`。

2. **错误页改成档案缺页**
   - 将开发者报错改成“手稿还没有接入阅读索引”。
   - 技术信息降级为 dev note。
   - 空目录自动隐藏。

3. **Math 文章中文化**
   - 重写 `content/math/analysis/chapter-01/index.md`。
   - 将 `Current Focus / Asset Pipeline / Asset Types` 改为中文主叙事。
   - 为集合论索引、复习卡片、Obsidian LaTeX 说明补充 frontmatter。

4. **文章页排版收敛**
   - 新增 `assets/css/99-article-reader.css`。
   - Article 页面字号、行距、边栏、代码块、目录全部压小。
   - 自动去掉正文里重复的一级标题，避免标题出现两次或显得过大。

5. **重新生成静态内容缓存**
   - 已运行 `scripts/build-markdown.js`。
   - 已运行 `scripts/build-content-bundle.js`。
   - 离线 file:// 打开时也能读取更新后的内容。
