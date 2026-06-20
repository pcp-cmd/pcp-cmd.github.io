window.ALEKSI_CONTENT = {
  nav: [
    { label: 'Works', href: './works.html' },
    { label: 'Math Lab', href: './math.html' },
    { label: 'Manuscripts', href: './manuscripts.html' },
    { label: 'Protocol', href: './protocol.html' },
    { label: 'Lab Atlas', href: './atlas.html' }
  ],

  hero: {
    eyebrow: 'v1.7.2-clean-reset / Personal Research Lab × Revision Protocol',
    cn: 'Unfinished Manuscript / Cognitive Revision System / Reusable Knowledge Artifacts',
    lede: 'A personal research lab for turning learning, design, math, and AI coworking into revisable knowledge artifacts.',
    note: '一个把学习、设计、数学训练与 AI 共事持续修订成知识资产的个人研究站。'
  },

  revisionChainAtlas: [
    {
      key: 'raw',
      tone: 'paper',
      title: 'Raw Experience',
      cn: '原始经验',
      description: '原始经验、问题、草稿和碎片先进入系统，不急着被解释。',
      count: 7,
      active: false,
      featured: ['Set theory notes', 'Open Loop Revision']
    },
    {
      key: 'error',
      tone: 'clay',
      title: 'Prediction Error',
      cn: '认知误差',
      description: '真正值得学习的地方，通常是“我以为懂了，但其实不懂”的断点。',
      count: 9,
      active: true,
      featured: ['映射为什么要检查良定义性', '对象层级误差']
    },
    {
      key: 'delta',
      tone: 'clay',
      title: 'Personal Delta',
      cn: '个人增量',
      description: '不复制材料，只记录这次修订真正改变了什么判断。',
      count: 6,
      active: false,
      featured: ['Color discipline', 'Chapter 01 overview']
    },
    {
      key: 'connection',
      tone: 'cactus',
      title: 'Connection',
      cn: '连接',
      description: '新材料接入旧笔记、旧作品、旧概念和旧协议。',
      count: 5,
      active: false,
      featured: ['AI Coworker Protocol', 'Design Archive']
    },
    {
      key: 'compression',
      tone: 'olive',
      title: 'Compression',
      cn: '压缩',
      description: '把重复经验压缩成方法、模板、工具箱和判断规则。',
      count: 8,
      active: false,
      featured: ['Toolbox cards', 'Proof deconstruction']
    },
    {
      key: 'skill',
      tone: 'olive',
      title: 'Skill',
      cn: '技能资产',
      description: '稳定动作沉淀为 protocol、workflow、prompt、checklist 和 revision rule。',
      count: 4,
      active: false,
      featured: ['Revision Protocol', 'Math flywheel']
    },
    {
      key: 'loop',
      tone: 'cactus',
      title: 'Revision Loop',
      cn: '反馈修订',
      description: '资产重新返回下一轮实践，继续被打开和修订。',
      count: 6,
      active: false,
      featured: ['v1.1 markdown-first article system', 'Public Growth Log']
    }
  ],

  currentEvolutions: [
    {
      title: 'Article System',
      tone: 'paper',
      problem: 'Markdown 文件直接打开时不像研究文章。',
      decision: '统一进入 article.html，使用 warm manuscript layout。',
      next: '支持 KaTeX、frontmatter、右侧 revision rail 与文章 glyph。',
      status: '修订中'
    },
    {
      title: 'Math Lab',
      tone: 'oat',
      problem: '数学内容不能只是章节目录。',
      decision: '默认按认知修订链组织数学学习资产。',
      next: '把 Chapter 01 的定义、反例、证明拆解和工具箱卡接入索引。',
      status: '修订中'
    },
    {
      title: '可迭代修订协议',
      tone: 'olive',
      problem: '本地学习协议还没有成为公共网站结构。',
      decision: '转化为公开的 Revision Protocol 与可迭代修订协议。',
      next: '进入 protocol.html 和 Skill Library。',
      status: 'compressed'
    },
    {
      title: 'Color System',
      tone: 'clay',
      problem: '页面需要更精确地接近 Anthropic research publication 气质。',
      decision: '保留 warm ivory，陶土色只用于当前节点、细线、hover 和 callout。',
      next: '减少大面积色块，保持高密度慢阅读。',
      status: 'revised'
    },
    {
      title: 'Glyph System',
      tone: 'blue',
      problem: '文章需要概念符号，而不是普通封面图。',
      decision: '先用 CSS glyph header 支撑每篇文章的抽象标记。',
      next: '未来再接入独立 article glyph registry。',
      status: '草稿中'
    }
  ],

  rooms: [
    {
      title: 'Math Lab',
      cn: '数学实验室',
      stage: 'Prediction Error -> Toolbox',
      tone: 'paper',
      body: '把定义误解、证明跳步、反例和卡点，修订成可复用数学工具。',
      image: './assets/rooms/math-lab.webp',
      imageAlt: 'Math Lab editorial illustration',
      href: './math.html'
    },
    {
      title: 'Design Archive',
      cn: '视觉档案',
      stage: 'Raw Experience -> Revision',
      tone: 'oat',
      body: '保存 brief、草图、提示词、反馈和版本，不只展示最终图。',
      image: './assets/rooms/design-archive.webp',
      imageAlt: 'Design Archive editorial illustration',
      href: './manuscripts.html'
    },
    {
      title: '技能资产库',
      cn: '技能资产库',
      stage: '压缩 -> 技能资产',
      tone: 'olive',
      body: '把重复出现的学习、设计、写作与 AI 共事动作固化成协议。',
      image: './assets/rooms/skill-library.webp',
      imageAlt: 'Skill Library editorial illustration',
      href: './protocol.html'
    },
    {
      title: 'Visual Essays',
      cn: '视觉文章',
      stage: 'Connection -> Public Artifact',
      tone: 'cactus',
      body: '把抽象想法写成公共表达，并配套一个可复用的视觉符号。',
      image: './assets/rooms/visual-essays.webp',
      imageAlt: 'Visual Essays editorial illustration',
      href: './manuscripts.html'
    }
  ],

  protocols: [
    {
      title: 'Challenge',
      cn: '反问',
      tone: 'clay',
      body: '逼近真实问题，阻止模糊目标伪装成完整方案。',
      trigger: '规划 / 方向 / 焦虑'
    },
    {
      title: 'Deconstruct',
      cn: '拆解',
      tone: 'oat',
      body: '把证明跳步、设计失败和黑箱判断拆成可检查动作。',
      trigger: '证明 / 评审 / 调试'
    },
    {
      title: 'Connect',
      cn: '连接',
      tone: 'cactus',
      body: '把新材料接回旧笔记、旧作品和旧协议。',
      trigger: '新笔记 / 修订 / 归档'
    },
    {
      title: 'Compress',
      cn: '压缩',
      tone: 'olive',
      body: '把重复动作沉淀成工具箱、工作流、提示词或协议。',
      trigger: '重复动作 / 方法 / 资产'
    }
  ],

  system: {
    revisionProtocol: {
      title: '可迭代修订协议',
      cn: '学习诊断核心',
      type: '方法资产',
      tone: 'olive',
      status: '可复用资产',
      source: 'content/system/revision-protocol/index.md',
      body: '把学习、设计、写作与 AI 共事中的重复动作，固化成可复用的修订协议。它是本站的理念核心。',
      next: '继续作为核心技能资产接入数学、作品和手稿系统。'
    }
  },

  math: {
    analysis: [
      {
        title: '数学分析 / 第一章',
        cn: '数学分析第一章',
        type: '数学实验室',
        tone: 'paper',
        status: '修订中',
        source: 'content/math/analysis/chapter-01/index.md',
        manifest: 'content/math/analysis/chapter-01/manifest.json',
        body: '集合论笔记正在整理为定义卡、反例卡、证明拆解卡、工具箱卡和修订记录。',
        output: '定义卡、反例卡、证明拆解卡、工具箱卡'
      }
    ]
  },

  articles: [
    {
      id: 'math-analysis-notes',
      type: '学习日志',
      title: '数学分析笔记',
      subtitle: '定义、证明卡点与个人增量',
      date: '2026.06',
      room: 'Math Lab',
      sourceType: 'markdown',
      source: 'content/math/analysis/chapter-01/index.md'
    },

    {
      id: 'renren-rulong-skill-article',
      type: '核心技能',
      title: '可迭代学习诊断技能',
      subtitle: '本站理念核心',
      date: '2026.06',
      room: '技能资产库',
      sourceType: 'markdown',
      source: 'content/skills/learning-diagnosis-protocol/SKILL.md'
    },
    {
      id: 'revision-protocol',
      type: 'Protocol',
      title: '可迭代修订协议',
      subtitle: '学习诊断核心',
      date: '2026.06',
      room: '技能资产库',
      sourceType: 'markdown',
      source: 'content/system/revision-protocol/index.md'
    }
  ],

  manuscripts: [
    {
      id: 'math-analysis-notes',
      room: 'Math Lab',
      status: '修订中',
      tone: 'paper',
      title: '数学分析 / 第一章',
      judgment: '集合论笔记被转化为按认知链组织的数学学习资产。',
      chain: ['认知误差', '压缩'],
      next: '把选中的笔记压缩成工具箱卡片',
      artifactType: '证明拆解',
      updated: '2026-06-16',
      glyph: 'math-mapping-well-definedness',
      source: 'content/math/analysis/chapter-01/index.md'
    },
    {
      id: 'set-axioms-learning',
      room: 'Math Lab',
      status: '草稿中',
      tone: 'oat',
      title: '集合公理学习',
      judgment: '真正的难点不是记住公理，而是知道每个对象层级正在被谁约束。',
      chain: ['原始经验', '认知误差'],
      next: '提取定义修复卡片',
      artifactType: '定义卡',
      updated: '2026-06-16',
      glyph: 'math-set-axioms',
      source: 'content/math/analysis/chapter-01/notes/01-1-set-axioms-learning.md'
    },
    {
      id: 'revision-protocol',
      room: '技能资产库',
      status: '可复用资产',
      tone: 'olive',
      title: '可迭代修订协议',
      judgment: '学习协议的价值不在鼓励，而在把阻塞诊断成下一步训练输出。',
      chain: ['压缩', '技能资产'],
      next: '把协议示例接入文章阅读器',
      artifactType: '协议',
      updated: '2026-06-16',
      glyph: 'protocol-revision-chain',
      source: 'content/system/revision-protocol/index.md'
    },

    {
      id: 'renren-rulong-skill',
      room: '技能资产库',
      status: '核心技能资产',
      tone: 'olive',
      title: '可迭代学习诊断技能',
      judgment: '网站的理念核心：不判断天赋，诊断学习系统；不只给鼓励，必须留下动作、输出和资产。',
      chain: ['原始经验', '诊断', '压缩', '技能资产', '反馈修订'],
      next: '继续接入数学实验室、作品复盘和关系图谱',
      artifactType: '技能规则',
      updated: '2026-06-17',
      glyph: 'learning-diagnosis-skill',
      source: 'content/skills/learning-diagnosis-protocol/SKILL.md'
    },
    {
      id: 'open-loop-revision',
      room: 'Visual Essays',
      status: '草稿中',
      tone: 'cactus',
      title: '重新打开的循环',
      judgment: '未完成不是缺陷，而是下一次修订可以进入的位置。',
      chain: ['连接', '反馈修订'],
      next: '改写成公开视觉文章',
      artifactType: '文章种子',
      updated: '2026-06-13',
      glyph: 'essay-open-loop',
      source: 'content/essays/001-open-loop-revision.md'
    },
    {
      id: 'v1-1-markdown-first',
      room: 'System Log',
      status: '已回流',
      tone: 'blue',
      title: 'v1.1 文章优先系统',
      judgment: '网站从栏目展示页转向可阅读、可索引、可继续修订的手稿系统。',
      chain: ['技能资产', '反馈修订'],
      next: '检查所有手稿链接是否进入文章阅读器',
      artifactType: '修订日志',
      updated: '2026-06-16',
      glyph: 'system-markdown-first',
      source: 'content/log/v1.1-markdown-first-article-system.md'
    }
  ],

  logs: [
    {
      no: 'v1.1',
      type: 'Markdown-first',
      tone: 'paper',
      title: 'v1.1 文章优先系统',
      body: '新增 warm manuscript article reader，所有手稿通过统一阅读页进入。',
      source: 'content/log/v1.1-markdown-first-article-system.md'
    },
    {
      no: 'v1.1',
      type: 'Revision Chain',
      tone: 'clay',
      title: 'Revision Chain Atlas 成为首页第一系统区块',
      body: '首页不再先展示 Plog，而是先展示认知修订链如何组织内容。',
      source: 'content/log/v1.1-markdown-first-article-system.md'
    },
    {
      no: 'v1.0',
      type: 'System Integration',
      tone: 'olive',
      title: 'Revision Protocol 成为网站底层系统',
      body: '本地学习协议转换为公开的 Revision Protocol，并接入内容 manifest。',
      source: 'content/log/v1.0-system-integration.md'
    },
    {
      no: 'v1.0',
      type: '数学实验室',
      tone: 'oat',
      title: 'Math Analysis Chapter 01 接入真实试验场',
      body: '数学分析第一章从原始笔记进入 Math Lab。',
      source: 'content/log/v1.0-system-integration.md'
    }
  ]
};

Object.assign(window.ALEKSI_CONTENT, {
  hero: {
    eyebrow: 'v1.7.2-clean-reset / Personal Research Lab × Revision Protocol',
    cn: '未完手稿 / 认知修订系统 / 可复用知识资产',
    lede: '这里不是作品展示柜，而是一个持续修订的个人研究站。',
    note: '学习、设计、数学和 AI 共事，都会被整理成可以再次打开的手稿。'
  },

  homeGuideRows: [
    {
      no: '01',
      label: 'Works',
      title: '作品档案',
      description: '视觉作品、排版实验与 AI 图像都作为修订证据保存，而不只是展示最终图。',
      action: '进入',
      href: './works.html'
    },
    {
      no: '02',
      label: 'Math Lab',
      title: '数学实验室',
      description: '把定义误解、证明跳步、反例和卡点，整理成可复用的数学工具。',
      action: '打开',
      href: './math.html'
    },
    {
      no: '03',
      label: 'Manuscripts',
      title: '未完手稿',
      description: '文章、札记、日志和阶段性判断，统一进入可以继续修订的阅读索引。',
      action: '阅读',
      href: './manuscripts.html'
    },
    {
      no: '04',
      label: 'Protocol',
      title: '修订协议',
      description: '把重复出现的学习、设计、写作与 AI 共事动作，压缩成稳定的方法资产。',
      action: '查看',
      href: './protocol.html'
    }
  ],

  selectedArtifacts: [
    {
      title: 'Dark Poster System',
      type: '视觉作品',
      status: '已归档',
      tone: 'slate',
      href: './work-detail.html?work=dark-poster-system',
      image: './content/design/works/dont-shoot-me-down/thumb.webp',
      imageAlt: 'Dark editorial poster with serif fragments and a muted figure.',
      body: '一次黑暗海报系统实验：字体、颗粒和人物图像共同形成类似档案证据的版面。'
    },
    {
      title: '数学分析第一章',
      type: '数学实验室',
      status: '修订中',
      tone: 'paper',
      source: 'content/math/analysis/chapter-01/index.md',
      body: '定义、证明卡点、反例和修订记录，被重新组织成结构化的数学学习资产。'
    },
    {
      title: '可迭代修订协议',
      type: '方法资产',
      status: '已压缩',
      tone: 'olive',
      source: 'content/system/revision-protocol/index.md',
      body: '这是 Aleksi Lab 的工作宪法：用 AI 对学习、创作和修订过程施加结构化压力。'
    }
  ],

  archiveLinks: [
    { label: '浏览全部作品', href: './works.html' },
    { label: '阅读全部手稿', href: './manuscripts.html' },
    { label: '打开修订协议', href: './protocol.html' },
    { label: '查看关系图谱', href: './atlas.html' }
  ]
});
