# Aleksi Lab v1.6.1 CN Manuscript Refinement

本次修改围绕“中文思想 + 英文档案气质”重整网站。

## 已修复

1. **Works 图片路径**
   - `gravy-raven-starlight-fade-away` 不再被强制替换为 SVG 占位图。
   - Works 卡片与详情页都回到真实 JPG：`content/design/works/gravy-raven-starlight-fade-away.jpg`。
   - 横版作品增加 `landscape` 显示模式，避免 1920×1080 被 4:3 强裁切。

2. **Memento Mori 低清图处理**
   - 标记为 `tiny-source` / 低分辨率档案痕迹。
   - 详情页不再强行放大到大图，而是以小型档案碎片方式居中展示。
   - 增加中文说明：这是过程证据，不是最终高清作品。

3. **暗色页面标题对比度**
   - 修复 `.page-title` / `.section-title` 使用 `--gray-950` 导致标题融入背景的问题。
   - 标题改用 `--text-strong`。

4. **中文字体系统**
   - 中文标题使用宋体栈：`Noto Serif SC / Source Han Serif SC / Songti SC / SimSun`。
   - 中文正文使用黑体栈：`Noto Sans SC / Source Han Sans SC / PingFang SC / Microsoft YaHei`。
   - 英文保留 Georgia / Times 作为档案标题气质。
   - 本交付包不包含任何本地字体文件，避免字体授权问题。

5. **语言系统中文化**
   - 导航和栏目名保留英文。
   - 页面说明、作品正文、方法论说明、诊断说明、详情页模块标题改为中文主叙事。
   - Works 13 个作品条目的 category / status / summary / concept / review / layout notes / visual system / revision next / tags 均补充中文版本。

6. **Protocol 页面重构**
   - 删除厚重按钮式 `Skill / Compression` 卡片感。
   - Method Engine 改为 archive ledger row。
   - 七链诊断改为细线诊断矩阵。
   - Asset Levels 改为 Inbox → Candidate → Reference → Core 资产阶梯。

7. **Manuscripts 页面改进**
   - 顶部 hero 扩展为宽幅 dark editorial field。
   - Tabs 改为：按链路 / 按空间 / 按状态 / 按时间。
   - 阅读列表状态与链路中文化。

8. **Math Lab / Lab Atlas / Article UI 中文化**
   - Math Lab 页面说明、筛选器、当前手稿、修订笔记中文化。
   - Lab Atlas 说明、节点详情、下一步提示中文化。
   - Article 阅读器侧栏和返回链接中文化。

## 参考原则

参考 `anthropic-style-cn` 的设计方向，但转译成 Aleksi Lab 自己的 dark manuscript archive：

- 暖暗色档案气质
- 大留白
- 衬线标题
- 克制陶土色强调
- 中文主叙事
- 英文仅作导航、metadata、概念锚点
- transform / opacity 轻动效，不使用刺眼光边
