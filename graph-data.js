window.ALEKSI_GRAPHS = {
  mathKnowledgeGraph: {
    title: 'Math Knowledge Graph',
    note: '数学实验室的知识关系图：节点是概念、方法和修订记录，连线是它们之间的迁移关系。',
    nodeRadius: { normal: 0.55, important: 0.78, core: 1.05 },
    linkStroke: 0.16,
    labelSize: 1.65,
    nodes: [
      { id: 'math-lab', label: '数学实验室', type: 'core', x: 50, y: 50, detail: '定义、证明卡点、反例和修订记录共同进入的数学研究室。', related: ['定义修复', '证明跳步', '映射'], nextAction: '打开当前第一章手稿。', openHref: './math.html' },
      { id: 'foundations', label: 'Foundations', type: 'topic', x: 34, y: 24, detail: '基础假设和对象层级纪律。', related: ['集合', 'Math Lab'], nextAction: '让定义始终靠近例子。' },
      { id: 'set', label: 'Set', type: 'topic', x: 18, y: 42, detail: '集合论笔记、公理和元素归属关系。' },
      { id: 'mapping', label: 'Mapping', type: 'topic', x: 30, y: 67, detail: '良定义性、定义域、值域和变换检查。' },
      { id: 'order', label: 'Order', type: 'topic', x: 46, y: 78, detail: '序结构与比较纪律。' },
      { id: 'limit', label: 'Limit', type: 'topic', x: 64, y: 78, detail: '从有限直觉走向分析结构的缓慢桥梁。' },
      { id: 'continuity', label: 'Continuity', type: 'topic', x: 78, y: 60, detail: '未来用于局部行为和 ε 语言训练的节点。' },
      { id: 'proof-gap', label: 'Proof Gap', type: 'method', importance: 'important', x: 70, y: 34, detail: '证明推进得比学习者能验证的速度更快时，跳过的位置。', related: ['反例', '修订笔记'], nextAction: '写出那个被跳过的精确步骤。' },
      { id: 'counterexample', label: 'Counterexample', type: 'method', x: 58, y: 20, detail: '暴露错误直觉最快的工具。', related: ['证明跳步'], nextAction: '寻找最小失败对象。' },
      { id: 'definition-repair', label: 'Definition Repair', type: 'method', importance: 'important', x: 43, y: 36, detail: '先修复定义，再修复解答。', related: ['基础', '压缩'], nextAction: '对照定义、例子和非例子。' },
      { id: 'revision-notes', label: 'Revision Notes', type: 'log', x: 82, y: 42, detail: '轻量记录：这一轮到底改变了什么判断。' },
      { id: 'compression', label: 'Compression', type: 'method', x: 62, y: 58, detail: '把重复错误转化为可复用工具。' },
      { id: 're-enter', label: 'Re-enter', type: 'loop', x: 42, y: 58, detail: '让资产重新进入下一轮练习。' }
    ],
    edges: [
      ['math-lab', 'foundations'], ['foundations', 'set'], ['set', 'mapping'], ['mapping', 'order'], ['order', 'limit'], ['limit', 'continuity'], ['math-lab', 'definition-repair'], ['definition-repair', 'proof-gap'], ['proof-gap', 'counterexample'], ['proof-gap', 'revision-notes'], ['definition-repair', 'compression'], ['compression', 're-enter'], ['re-enter', 'math-lab'], ['math-lab', 'mapping']
    ]
  },

  labGraph: {
    title: 'Lab Atlas',
    note: '全站关系图：节点是作品、文章、数学笔记和方法资产，连线是它们之间的修订关系。',
    nodeRadius: { normal: 0.55, important: 0.78, core: 1.05 },
    linkStroke: 0.16,
    labelSize: 1.65,
    nodes: [
      { id: 'aleksi-lab', label: 'Aleksi Lab', type: 'core', x: 50, y: 48, detail: '全站入口：学习、创作与修订的个人研究实验室。', related: ['作品档案', '数学实验室', '修订协议'], nextAction: '把它作为站点级地图使用。', openHref: './index.html' },
      { id: 'infinite-progress', label: 'Infinite Progress', type: 'work', x: 28, y: 24, detail: '支撑首屏气质的核心视觉资产。', related: ['作品档案', 'Aleksi Lab'], nextAction: '继续作为精选档案保留。', openHref: './index.html#selected-artifacts' },
      { id: 'revision-protocol', label: '修订协议', type: 'protocol', importance: 'important', x: 66, y: 28, detail: '网站底层的方法宪法。', related: ['核心技能', '定义修复'], nextAction: '把稳定循环提升为可复用规则。', openHref: './protocol.html' },
      { id: 'math-lab', label: '数学实验室', type: 'room', importance: 'important', x: 30, y: 58, detail: '定义、证明跳步、反例和结构化思维的空间。', related: ['定义修复', 'Aleksi Lab'], nextAction: '按证明卡点或反例筛选笔记。', openHref: './math.html' },
      { id: 'works', label: '作品档案', type: 'room', importance: 'important', x: 20, y: 42, detail: '精选展示室，而不是普通素材墙。', related: ['Infinite Progress', '档案索引'], nextAction: '打开作品档案。', openHref: './works.html' },
      { id: 'manuscripts', label: '未完手稿', type: 'room', x: 72, y: 58, detail: '文章、笔记和日志的阅读室。', related: ['开放循环修订', '档案索引'], nextAction: '阅读当前手稿条目。', openHref: './manuscripts.html' },
      { id: 'core-skill', label: '核心技能', type: 'skill', importance: 'important', x: 82, y: 38, detail: '可迭代学习诊断技能：不判断天赋，诊断学习系统，并把卡点压缩成可复用资产。', related: ['修订协议', '技能资产库'], nextAction: '打开核心技能文章。', openHref: './article.html?src=content%2Fskills%2Flearning-diagnosis-protocol%2FSKILL.md' },
      { id: 'definition-repair', label: 'Definition Repair', type: 'method', x: 42, y: 74, detail: '面向数学的协议：先修复对象，再处理证明。', related: ['数学实验室', '修订协议'], nextAction: '把重复证明错误变成检查清单。' },
      { id: 'open-loop-revision', label: 'Open Loop Revision', type: 'essay', x: 60, y: 76, detail: '一篇视觉文章种子：把未完成视为下一次进入的位置。', related: ['未完手稿'], nextAction: '继续从阅读室链接进入。', openHref: './article.html?src=content%2Fessays%2F001-open-loop-revision.md' },
      { id: 'archive-index', label: 'Archive Index', type: 'archive', x: 45, y: 18, detail: '轻量索引表面，不是卡片墙。', related: ['作品档案', '未完手稿', '修订协议'], nextAction: '保留行式导航。' }
    ],
    edges: [
      ['aleksi-lab', 'infinite-progress'], ['aleksi-lab', 'revision-protocol'], ['aleksi-lab', 'math-lab'], ['aleksi-lab', 'works'], ['aleksi-lab', 'manuscripts'], ['revision-protocol', 'core-skill'], ['math-lab', 'definition-repair'], ['revision-protocol', 'definition-repair'], ['manuscripts', 'open-loop-revision'], ['works', 'infinite-progress'], ['archive-index', 'works'], ['archive-index', 'manuscripts'], ['archive-index', 'revision-protocol']
    ]
  }
};
