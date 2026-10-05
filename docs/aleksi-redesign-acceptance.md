# Aleksi 本地验收记录

日期：2026-10-06，Asia/Shanghai。此前的 Room 占位、文章页未统一、UGA 仅提供概览的范围，由本记录替代。旧报告保存在忽略目录 `qa-artifacts/room-archive/acceptance-before.md`。

## 当前实现

| 要求 | 实现 |
| --- | --- |
| 首页图片预览 | 按用户最新反馈，六窗口换成原创黑白漫画场景：书写、制作、探索、窗边背影、绘画和书房。中央猫咪头像保持原色。About 不再重复头像；栏目插画不计入用户的 Works 作品档案。提示词与来源哈希见 `docs/home-manga-art.json`。 |
| 首页交互 | 桌面悬停、键盘焦点展开；手机轻点预览再进入。保持 Niku 原始桌面 solver 和噪声网点 shader；短屏预览按实际空间收缩，并避让照片及外伸字标。去掉重复内框与图上文字；普通窗上图下按钮，紧凑窗左图右侧进入栏。 |
| 照片语义 | 猫咪头像固定在 world 内，不让位、不缩放，随拖动画布移动。 |
| Writing 阅读页 | 普通文章使用统一页头、六栏目导航、噪声网点背景及白色阅读窗。原有正文、目录、来源返回与 Markdown 内容管线继续使用。未编造新的正式文章。 |
| UGA 完整档案 | 所提供 ZIP 的全部 399 份源文件均可查找、阅读或下载。正式台账拆出 89 条 Claim，保留 C041–C132 的原编号与缺号；另有 91 篇 Run 目录下的 Markdown 记录。 |
| UGA 阅读与来源 | 按 Claim、Run、证明、历史修正、工具草稿、计算附件、总览筛选；支持编号/标题/路径搜索、排序与继续展开。记录页保留原文状态、原路径、实测 SHA-256 和完整下载。大文本预览有明确截断说明。 |
| 证据等级 | 保留 OPEN、项目自审计、同团队审查、未独立验证及 PENDING 等原始状态。网站收录不构成新的数学证明或验证。 |
| Room | 所有既有 `room.html` 链接通过兼容入口进入 `magic-cabin/index.html?view=shelf`；无 JavaScript 时仍有明确链接。书房可选书、打开正文、翻页并返回 Writing。未修改书房运行代码。 |
| 既有 Project / Works | 三个真实 GitHub 项目、13 件作品及原说明保留。Works 错时入场、悬停放大、同页查看、切图与键盘操作继续使用；07 展示校正和原图切换保留。 |

## 本次主要文件

- 首页：`index.html`、`home.js`、`assets/css/entrance.css`、`assets/images/previews/`。
- 文章主题：`article.html`、`assets/css/site-theme.css`。
- 研究档案：`research.html`、`research-record.html`、`research-archive.js`、`assets/css/research-archive.css`、`assets/research/uga/`、`scripts/build-uga-archive.py`。
- 书房入口：`room.html`。
- 验证与打包：`qa-check.js`、`scripts/browser-qa.js`、`scripts/redesign-browser-qa.js`、`scripts/research-archive-qa.js`、`scripts/qa-public-package.js`、`scripts/pack-public.js`。
- 说明：`README.md`、本记录、`design-qa.md`、`docs/uga-content-sources.md`。

本轮未改动 `site-data.js`、`article-content.js`、`article.js`、`assets/css/reading.css`、文章正文或 `magic-cabin/` 运行代码。共享工作区此前已有的改动原样保留，以上列表不等于整个 Git 差异。

## 来源完整性

来件 ZIP SHA-256：`186e5a5dbc1c4a3dfe4bbd357539135160e3cd4fe849702054cbd6f575983d6e`。399 个原始文件共 43,276,694 字节，逐文件保留原始字节并生成实测哈希；89 条 Claim 是从台账截取的派生阅读记录。包内旧 SHA256SUMS 仍有 10 个历史不匹配，原清单未被改写。详见 `docs/uga-content-sources.md`。

Niku 代码仍固定于 `18cad16b438792bf0d8d0842efac70819415db17`，原始 shader 与去掉 TypeScript 语法的 solver 受既有来源校验保护。本站交互适配在独立文件中完成。来源说明见 `licenses/THIRD-PARTY.md`。

## 验证

| 检查 | 结果 |
| --- | --- |
| `npm run verify`，漫画插画更新前的整站基线 | PASS：2972 项静态检查；490 项发布包检查，653 个文件。日志 `qa-artifacts/room-archive/verify.log`。 |
| `node scripts/browser-qa.js`，漫画插画更新前的整站基线 | PASS：1435 项断言、75 张截图；包含 370 项重构行为检查及新增 UGA 阅读测试。日志 `qa-artifacts/room-archive/browser-qa.log`。 |
| 漫画插画更新：`npm run verify` | PASS：2972 项静态检查；490 项发布包检查，659 个文件。日志 `qa-artifacts/manga-previews/verify.log`。 |
| 漫画插画更新：`node scripts/browser-qa.js --redesign-only` | PASS：462 项断言，含 370 项重构行为检查；桌面六图片窗口、手机、键盘、进入操作及现有栏目回归通过。该命令复用基线矩阵截图，目录共 75 张，不等于本轮新拍 75 张。日志 `qa-artifacts/manga-previews/browser-qa.log`。 |
| 源文件一致性 | 399 个原始文件与 89 条派生 Claim 均通过逐文件大小及 SHA-256 检查；共享 Markdown 索引仍为 36 条。 |
| 人工浏览器复核 | 已打开首页图片预览、统一后的 Writing 阅读页、Research 档案、C130 原文、Room 书架；查看手机文章与 C129 截图，未见横向溢出或文字遮挡。 |

浏览器矩阵覆盖 1440、1366、1024、390 宽度，追加 320×688 短手机、减少动态效果、1024/1280×720 六图片窗口及导航断点。检查包含鼠标悬停、图片点击进入、键盘与 Escape、画布拖移、Works 查看器、UGA 搜索/筛选/下载/浏览器返回/大文件预览、Room 打开正文与翻页。静态与浏览器检查按顺序执行。日志和人工截图保存在 `qa-artifacts/room-archive/`；矩阵截图与行为结果在 `qa-artifacts/`。

## 尚待提供的内容

Writing 的正式文章等待用户的协作素材及指定写作手册；About 的个人背景仍待确认。UGA 原包没有的 Claim 不补造，研究计算没有重跑。书房内部实现由原窗口维护，本次只接入口并验证基本阅读链路。

当前交付为本地预览，没有提交、推送或部署。完整 UGA 资料已进入本地发布包，线上网站尚未更新；浏览器检查不等于实体手机或线上环境验收。
