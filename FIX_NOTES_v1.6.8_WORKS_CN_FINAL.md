# v1.6.8 Works 中文终审版

## Why

修复 Works 详情页仍然大量显示英文正文的问题。上一版只校对了来源和部分文章语境，但 Work Detail 页面里的评审、版式判断、视觉系统、下一轮修订等卡片仍然保留英文，导致实际浏览时仍像英文 demo。

## Changed

- Work Detail 页面所有内容区 kicker 改成中文：
  - 作品档案
  - 作品语境
  - 内部评估
  - 配套文章
  - 辅助评审
  - 版式判断
  - 视觉系统
  - 下一轮修订
- 为所有 13 个 Works 条目追加最终中文内容覆盖层：
  - summary / intro
  - concept
  - category
  - status
  - tags
  - gptReview
  - layoutNotes
  - visualSystem
  - revisionNext
- 所有 Works 配套文章标题与二级标题重写为中文。
- 重新生成 content/markdown-index.json 与 content/content-bundle.js，保证 file:// 离线打开时读取到新中文内容。

## Rule

导航、作品固有英文名、必要专名可以保留英文；正文解释、评审判断、版式说明、视觉系统、修订建议必须中文优先。
