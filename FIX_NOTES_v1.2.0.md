# v1.2.0 — Claude Dark Theme Pass

本轮改动把 Aleksi Lab 从浅色 paper theme 改为默认深色 Claude-like theme：

- 使用 Claude-style dark OKLCH token：warm black background、ivory text、clay primary、muted warm borders。
- 把 ochre / sage / dusty blue / violet / lavender 等辅助色用作暗色纸面温度与边框，不再只有 clay。
- 修复 `chain.html` 的 stage header：不再使用三列横向挤压标题与说明，改为纵向 editorial header，避免 `Compression` 与说明文字重合。
- 保留 Tiempos + Styrene 的字体宪法。
- 保留 v1.1.6 的无效 menu 删除和 atlas 卡片重排。

建议预览：

```bash
npm run build
npm run dev
```

然后打开：

```text
http://127.0.0.1:4177/
```
