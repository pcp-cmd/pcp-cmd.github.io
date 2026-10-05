# Aleksi 本地设计 QA

日期：2026-10-06，Asia/Shanghai。当前范围：首页六个图片窗口、统一的普通文章页、完整 UGA 档案和已接通的 Room。旧报告保留于 `qa-artifacts/room-archive/design-qa-before.md`。

## 视觉复核

页面沿用 Niku 的原始噪声网点、DotGothic16 界面字、白色窗口与黑色边框，图片保留彩色。Writing 普通阅读页已移除旧暖色衬线页面外观。Room 进入原有三维书房，作为独立空间保持已有场景。

| 表面 | 检查与处理 |
| --- | --- |
| 字体与层级 | 导航、窗口标题和文章标题共用显示字体，正文使用可读的中文 sans-serif 回退。长 Claim 标题允许多行，小屏进一步缩小。 |
| 布局与间距 | 首页照片固定；六窗口让位。预览去掉双重内框、额外留白与覆盖文字。普通窗图下保留 44px 进入条；短窗将进入栏移到右侧，给插画保留完整高度。手机字标在照片内，桌面外伸字标参与避让。 |
| 配色与背景 | 首页、普通栏目和阅读页共享原始径向网点；不把照片和作品转为黑白。 |
| 图片 | 六个首页预览使用内置 image_gen 新生成的纯黑白漫画场景，线条、黑块和灰阶网点统一；中央猫咪头像保留原图。没有采用最初被用户否定的彩色版画方案。Works 档案及 07 原图/校正开关不受入口插画影响。 |
| 内容与链接 | UGA 列表可以打开原文、回到筛选结果并下载完整文件。长标题链接采用整块点击区域，避免多行文字之间的空白点击失效。来源状态与证据等级可见。 |

## 证据

- 原 Niku 参考与前轮成对比较：`qa-artifacts/revision-2/niku-source-home.jpg`、`qa-artifacts/content-integration/home-source-pair.jpg`。
- 本轮 Codex 浏览器，1280×800：`qa-artifacts/room-archive/writing-1280.png`、`research-1280.png`、`claim-130-1280.png`、`room-1280.png`、`home-room-preview-1280.png`。
- 最终首页图片预览，1280×720：`qa-artifacts/room-archive/home-room-final-1280x720.png`。
- 正式浏览器矩阵、手机阅读和短屏窗口证据：`qa-artifacts/`；实际验证结果见 `docs/aleksi-redesign-acceptance.md`。
- 最新漫画插画的真实页面截图：`qa-artifacts/manga-previews/writing-live.png`、`about-live.png`。六张交付 WebP 在 `assets/images/previews/manga/`，提示词与来源哈希在 `docs/home-manga-art.json`。

## 验证边界

漫画插画更新前的整站基线：静态检查 2972 项、发布包检查 490 项 / 653 文件、整站浏览器检查 1435 项 / 75 张截图通过。新增漫画素材后的检查单独记录于 `qa-artifacts/manga-previews/`，不把基线检查冒充新一轮整站结果。

新增漫画素材后的结果：静态 2972 项、发布包 490 项 / 659 文件通过；针对受影响的首页和栏目交互运行 `--redesign-only`，462 项断言通过（其中重构行为 370 项）。该命令保留既有矩阵截图，不重新运行整站路由矩阵。当前受检窗口均能显示插画，手机进入与键盘焦点正常。

UGA 399 个源文件的字节与哈希检查用于确认归档一致性，不证明数学结论。原文和历史修正全部保留，正式台账仅有 89 条 C041–C132（含缺号）。Writing 当前排版样文仍为未发布样文，正式内容等待用户资料。

本次没有部署。书房运行代码未重构；只接入现有书架并验证选书、正文与翻页。跨系统字体、实体设备与线上 CDN 可达性不在本地浏览器验收结论内。
