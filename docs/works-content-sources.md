# Works 内容恢复记录

日期：2026-10-05。

用户本次明确要求从原网站源代码恢复作品名称与内容。当前展示层读取 `works-catalog.js`；它是旧 `works-data.js` 中 13 件作品的展示字段投影，保留原展览顺序。

## 来源与呈现

| 编号 | 作品名称（原数据） | 素材目录 |
| --- | --- | --- |
| 01 | Lucia / Punishing: Gray Raven | `lucia-punishing-gray-raven` |
| 02 | Momo Ayase / Dandadan | `ayase-momo-dandadan` |
| 03 | Anna Yamada / The Dangers in My Heart | `anna-yamada-blue-poster` |
| 04 | Small Kid Sen / Music Poster | `small-kid-sen-music-poster` |
| 05 | Dark Poster System / Dont Shoot Me Down | `dont-shoot-me-down` |
| 06 | Owari ni Shitai / Twin Cover | `owari-ni-shitai-spread` |
| 07 | The Hills / Typographic Study | `the-hills-typographic-study` |
| 08 | Denji & Reze / Blue Embrace | `chainsaw-denji-reze-blue-embrace` |
| 09 | Blue Night Portrait | `blue-night-portrait` |
| 10 | City Glass Portrait | `city-glass-portrait` |
| 11 | Summer Street Frame | `summer-street-frame` |
| 12 | Komi / Purple Monochrome Spread | `komi-purple-monochrome-spread` |
| 13 | Chainsaw Man / Denji & Reze | `chainsaw-denji-reze-blue-monochrome` |

目录均位于 `content/design/works/`，展示原有 `hero.webp`，未覆盖素材。各卡片显示原数据中的 `shortTitle` 与 `subtitle`。大图查看器显示完整 `title`、`summary`、`sourceWork`、`format`、`layoutNotes` 和 `visualSystem`。这些文本直接来自旧 `works-data.js`，未新增作品归属、创作日期或作者主张。

旧 `content/design/works/*/article.md` 及 `docs/archive/works-legacy/` 中的六篇作品文章为既有来源背景；当前版本保留文件，但不加载旧文章阅读器，也不跳转旧 `work-detail.html`。旧文章的修订建议、GPT 评分与评论没有混入新作品说明。Works 展示恢复与文章阅读页重构是独立范围。

## 07 的亮度检查

检查了 `the-hills-typographic-study` 下的原始 `source.webp`、展示 `hero.webp` 与 `thumb.webp`。

- source 与 hero 都是 1920 × 1440；thumb 是 720 × 540。
- 原始 source 平均 RGB 为 (230.74, 218.34, 227.95)，hero 为 (230.72, 218.36, 227.94)。两者逐像素平均绝对 RGB 差为 (0.3049, 0.2764, 0.3098)，量纲为 0–255。
- 原图和展示图本身均为大面积白纸、高调渐变与浅灰文字。没有发现加载错误缩略图或对图片额外提亮的样式。
- 默认只为 07 加上可逆显示校正 `brightness(.92) contrast(1.18)`。先降低亮度，再增加适度对比，使中间调更实，同时将纯白映射到约 254/255，避免整页罩灰。原始位图不变；文字与图形未重绘。
- 07 大图底部有“原图 / 显示校正”开关，切换时不换图片文件。其他 12 张图不应用该滤镜。

## 局部验证

2026-10-05 运行 `node --check gallery.js`、`node --check works-catalog.js`，通过。

运行 `node qa-artifacts/works-restoration/check-works.cjs`，通过。该检查针对本次变更：13 件作品标题和摘要与旧数据逐件一致；卡片无旧链接；大图内有真实说明；07 可在校正/原图之间切换；08 恢复无滤镜；上一层 URL 保持 Works；Esc 关闭后焦点回到原卡片；1280 × 800 与 390 × 844 没有水平溢出。浏览器使用已安装 Edge，首次沙盒启动失败后经自动审批在沙盒外运行，仅访问本地预览。

截图（已查看）位于 `qa-artifacts/works-restoration/`：

- `gallery-1280.png`、`gallery-390.png`：恢复真实名称后的展览。
- `07-corrected-1280.png`、`07-original-1280.png`：同一桌面视口的亮度切换对照。
- `07-corrected-390.png`、`07-original-390.png`：同一手机视口的亮度切换对照。

截图在可见图片解码完成后采集，减少空卡片造成的误判。完整站点与公开包验证由整合任务统一运行，本文的局部检查不能代替该结果。
