# Aleksi Lab v1.7.1 — Works Selection Motion + Nav Readability Fix

## 修复对象

这次修的是 `works.html` 上方展览墙里的作品卡片，不是详情页评分卡、不是下方 Archive Index 行。

## 1. Works 选中动效没有执行

### 问题

v1.7.0 中 `updateExhibitionState()` 走的是 WAAPI / FLIP 采样：

- 先记录卡片旧 transform；
- 再切换 active / inactive；
- 最后用 `card.animate()` 播放旧 transform 到新 transform。

但现有卡片 transform 在 CSS 中是 `!important`：

```css
.exhibition-card {
  transform: translate3d(...) rotate(...) scale(...) !important;
}
```

这会导致 WAAPI 动画无法稳定覆盖作者级 `!important` transform。结果就是：状态切换了，但真正的 Interface Craft 式“选中卡片上浮、居中、其它卡片收束到底部”的动效没有可靠播放。

### 修改

改为直接让 CSS transform transition 承接 JS 写入的 CSS 变量变化：

- JS 只负责改变 `--x / --y / --rot / --scale / --opacity / --z`；
- CSS 负责过渡 `transform / width / height / opacity / filter`；
- 不再用 `is-motion-sampling` 把 transition 关掉；
- 保留 `is-motion-running` 只用于短暂锁定点击，防止动画中连续误触。

### 结果

点击 Works 顶部展览墙卡片时：

- 被选中的作品卡片会上浮到中间并放大；
- 其它卡片会缩小、降低透明度并收束到底部 dock；
- inactive 卡片带轻微错峰延迟；
- 选中卡片出现克制橙色边框、内框与标题小圆点；
- 再点空白或同一张卡片，会回到散开展览墙状态。

## 2. Works 右上导航选中后文字消失

### 问题

Works / work-detail 的导航重新渲染时使用了 `letter-swap`：

```html
<a class="nav-link letter-swap" data-text="Works"><span>Works</span></a>
```

但全站当前页提示也使用 `::after` 做橙色短线。`letter-swap` 同样占用了 `::after` 放置替换文字，两个机制冲突：

- 当前页需要 `::after` 作为下划线；
- letter-swap 需要 `::after` 作为第二层文字；
- hover / focus / active 时 span 被移动或透明，导致按钮文字看起来消失。

### 修改

- `works.js` 和 `work-detail.js` 的动态导航改回稳定文本结构；
- 新增 `assets/css/102-nav-active-readable-fix.css`，兜底保证 active/current 导航文字永远可见；
- 当前页仍保留白色加粗 + 橙色短线提示，但不再用文字翻转动画。

## 修改文件

- `works.js`
- `work-detail.js`
- `styles.css`
- `assets/css/101-interface-craft-selection-fix.css`
- `assets/css/102-nav-active-readable-fix.css`

## QA

已运行：

```bash
node qa-check.js
```

结果：通过。
