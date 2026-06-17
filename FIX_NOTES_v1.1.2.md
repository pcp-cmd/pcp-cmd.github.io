# v1.1.2 修复说明

修复内容：

1. 非 Home 页面空白：移除 CSS 对 `[data-reveal]` 的默认隐藏，并给各页面脚本增加 no-GSAP fallback。
2. 数学文章只显示状态不显示正文：文章阅读器现在即使 CDN/GSAP 不加载也会显示 Markdown；缺少 marked 时使用本地简易 Markdown 渲染。
3. 卡片文字超格：增加全局断行、卡片字号 clamp、pre/table 溢出处理。
4. 中文文件名兼容：为 `#Uxxxx` 编码文件补充中文文件名副本，避免 manifest 链接 404。

Hero card 未修改。
