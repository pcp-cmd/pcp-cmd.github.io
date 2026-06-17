# v1.6.3 Type System Sweep

本版把字体设计作为全站控制层，而不是只修几个标题。

## 处理内容

1. 新增 `assets/css/99-typography-system.css`，作为最后加载的字体系统覆盖层。
2. `styles.css` 已在最后引入该文件。
3. 英文字体栈加入本地 Tiempos / Styrene 名称引用：
   - `Test Tiempos Headline VF`
   - `Test Tiempos Text VF`
   - `Test Tiempos Fine VF`
   - `Styrene UI`
   - `Styrene B`
4. 没有打包任何字体文件。浏览器只会在用户本机安装字体时调用；否则回退到 Georgia / 系统中文字体。
5. 中文标题统一压低字号，避免“牌匾化”和过大视觉噪音。
6. 中文正文统一为较小字号、较长行距，保证暗色背景下阅读舒适。
7. 标签、按钮、导航、metadata 统一为小号 UI 字体，降低英文模板感。
8. Protocol 页删除 `workflow / prompt / checklist / template / rule` 这类混杂正文，改成中文主叙事。
9. Works carousel 再次保护为横向轨道，防止被后续样式覆盖成静态网格。
10. Method Engine 左侧橙点彻底禁用。

## 字体原则

英文做骨架，中文做思想。

- 英文栏目、导航、作品名：Tiempos / Styrene / Georgia 气质。
- 中文标题：思源宋体 / 宋体栈，克制字号。
- 中文正文：思源黑体 / 苹方 / 微软雅黑 fallback，保证可读性。
- metadata：小号 UI 字体，不抢正文。

## 注意

请不要把 `Test Tiempos Collection.zip` 或任何字体文件复制进网站目录。字体文件涉及授权问题，本交付包只提供字体栈设计与本地字体引用。
