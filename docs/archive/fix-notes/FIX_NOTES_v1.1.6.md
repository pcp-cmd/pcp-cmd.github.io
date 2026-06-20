# v1.1.6 — Chain Readability / Header Nav / Anthropic Palette Pass

## 修复内容

1. **Revision Chain 卡片排布修复**
   - 不再让 7 张 atlas 卡片在桌面端密集挤成一行。
   - Chain 页面默认改为 3 列，超宽屏才进入 4 列。
   - 隐藏 Chain 页面的大曲线路径，避免路径和文字视觉重合。
   - 增大卡片 padding、gap、min-height，让 Compression 等长词不再挤压或越界。
   - 卡片标题使用更强的 Tiempos Headline 权重和更舒展的行高。

2. **移除无效 menu overlay**
   - Home 页删除 hamburger menu 和 overlay menu 结构。
   - app.js 增加空节点保护，避免移除 menu 后报错。
   - Header nav 在桌面和移动端都保留为直接可见的导航。

3. **Anthropic palette 扩展**
   - 在原有 warm ivory + clay 基础上增加 Claude-like ochre、sage、dusty blue、lavender 语义色。
   - 不做高饱和彩卡，而是将颜色作为纸面染色、边框、accent line、active marker 使用。
   - tone-paper / tone-oat / tone-clay / tone-cactus / tone-blue 等卡片获得更明确的色温层次。

## QA

`npm run qa` passed.
