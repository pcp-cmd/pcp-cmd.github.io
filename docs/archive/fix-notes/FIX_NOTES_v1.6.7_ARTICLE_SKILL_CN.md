# v1.6.7 Article Skill CN / 文章阅读与核心技能资产中文化

## 修复目标

修复文章页左侧信息栏贴边、字体难看、背景太窄的问题；同时把文章正文内容改成中文优先，并把用户上传的 renren-rulong 学习诊断 skill 作为网站核心资产接入。

## Changed

- 新增 `assets/css/99-article-meta-cn.css`，重做 article 页左侧信息栏、右侧目录栏、正文标题和中文字体层级。
- 扩大 article 三栏阅读布局的整体宽度和栏间距，避免左侧 meta 和背景边线相切。
- `article.js` 增加中文元信息映射：状态、空间、资产、链路都显示中文。
- `article.js` 增加常见英文标题中文化映射，文章正文的 `Core Rule / Current Diagnosis / Source Context` 等标题会显示为中文。
- 重写 `content/system/revision-protocol/index.md`，改成完整中文文章。
- 将用户上传的 `renren-rulong` skill 整理为中文核心资产，写入 `content/skills/learning-diagnosis-protocol/SKILL.md`。
- 重写 `content/skills/learning-diagnosis-protocol/README.md`。
- 在 `content.js` 中把“可迭代学习诊断技能”加入 Manuscripts，作为核心技能资产显示。
- 在 Protocol 页面 source 区增加“打开核心技能资产”入口。
- 在 Lab Atlas 中把 core skill 节点连接到核心技能文章。
- 重新生成 `content/markdown-index.json` 与 `content/content-bundle.js`。

## Language Rule

导航和少量栏目 kicker 可以保留英文；文章正文、修订信息、资产说明、方法解释必须中文优先。
