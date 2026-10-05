// New public content is added here only after Aleksi has confirmed it.
window.ALEKSI_SITE = {
  navigation: [
    { key: 'writing', label: 'Writing', href: './writing.html' },
    { key: 'project', label: 'Project', href: './project.html' },
    { key: 'research', label: 'Research', href: './research.html' },
    { key: 'about', label: 'About', href: './about.html' },
    { key: 'works', label: 'Works', href: './works.html' },
    { key: 'room', label: 'Room', href: './room.html' }
  ],
  // { title, date, description, type: 'long' | 'note', source, tags: [], approved: true }
  // Writing 与书房使用同一份索引；书房每批展示 36 本，文章总量不受书位限制。
  writing: [
    {
      "title": "“好看一点”，到底是什么意思？",
      "date": "2026-10-06",
      "description": "我把网站的审美要求拆成字号、板块比例和必须保留的条件，让修改可以讨论，也可以核对。",
      "type": "long",
      "source": "content/writing/01.md",
      "tags": [
        "需求表达",
        "网站设计",
        "AI协作"
      ],
      "approved": true
    },
    {
      "title": "我为什么开始先看图，再让AI写前端",
      "date": "2026-10-06",
      "description": "我想先用参考页面和生成图讨论视觉关系，再把已经决定的部分交给AI写前端。",
      "type": "long",
      "source": "content/writing/02.md",
      "tags": [
        "前端开发",
        "视觉沟通",
        "AI协作"
      ],
      "approved": true
    },
    {
      "title": "圈一下图片，能比写一段话多传递什么？",
      "date": "2026-10-06",
      "description": "我把无限画布上的圈选、箭头和批注看成定位问题的手段，再用文字补足动作与保留条件。",
      "type": "long",
      "source": "content/writing/03.md",
      "tags": [
        "图片批注",
        "需求表达",
        "无限画布"
      ],
      "approved": true
    },
    {
      "title": "同一个修改要求，为什么还要导出JSON？",
      "date": "2026-10-06",
      "description": "我想用JSON保留修改字段、保留条件、坐标和版本，让一份要求经过转交后仍然可以核对。",
      "type": "long",
      "source": "content/writing/04.md",
      "tags": [
        "结构化需求",
        "JSON",
        "版本管理"
      ],
      "approved": true
    },
    {
      "title": "我只想换背景，AI却把我的脸换了",
      "date": "2026-10-06",
      "description": "证件照修改中脸被改变的失败，让我更重视保留边界、结果比较和不确定时的停止条件。",
      "type": "long",
      "source": "content/writing/05.md",
      "tags": [
        "证件照",
        "图片编辑",
        "保留边界"
      ],
      "approved": true
    },
    {
      "title": "ChatGPT听懂了，交给Codex为什么又走样？",
      "date": "2026-10-06",
      "description": "我把ChatGPT到Codex的交接看成一次需求转交，重点检查限制和取舍是否随任务一起传递。",
      "type": "long",
      "source": "content/writing/06.md",
      "tags": [
        "任务交接",
        "ChatGPT",
        "Codex"
      ],
      "approved": true
    },
    {
      "title": "提示词越长，真的越好吗？",
      "date": "2026-10-06",
      "description": "旧AGENTS.md和重复SHA256检查让我反思，提示词应按条件、范围与当前目标组织，而不是不断累积。",
      "type": "long",
      "source": "content/writing/07.md",
      "tags": [
        "提示词",
        "AGENTS.md",
        "任务约束"
      ],
      "approved": true
    },
    {
      "title": "我为什么想借用ASD-STE100跟AI说话",
      "date": "2026-10-06",
      "description": "我想借鉴术语一致、动作明确和步骤清楚的表达原则，让中文AI协作要求更容易执行与检查。",
      "type": "long",
      "source": "content/writing/08.md",
      "tags": [
        "AI沟通",
        "需求表达",
        "术语一致"
      ],
      "approved": true
    },
    {
      "title": "审查了很多轮，为什么项目还是不干净？",
      "date": "2026-10-06",
      "description": "7月3日的反复补丁让我重新看待审查范围、交付标准和能够解释的项目状态。",
      "type": "long",
      "source": "content/writing/09.md",
      "tags": [
        "软件交付",
        "代码审查",
        "完成标准"
      ],
      "approved": true
    },
    {
      "title": "给朋友用一次，才知道什么叫交付",
      "date": "2026-10-06",
      "description": "解压即用和无个人资料的要求，让我从接收者的入口、操作和信息边界重新理解交付。",
      "type": "long",
      "source": "content/writing/10.md",
      "tags": [
        "软件交付",
        "首次使用",
        "个人资料"
      ],
      "approved": true
    },
    {
      "title": "安装包做好了，打开却一直让我重试",
      "date": "2026-10-06",
      "description": "7月17日的本地服务报错让我把安装、准备、进入操作和失败恢复分别纳入验证。",
      "type": "long",
      "source": "content/writing/11.md",
      "tags": [
        "本地服务",
        "错误恢复",
        "软件交付"
      ],
      "approved": true
    },
    {
      "title": "按钮能点，不代表一件事能做完",
      "date": "2026-10-06",
      "description": "我想按完整使用目标检查进入、返回和状态更新，而不再只凭局部点击反馈判断完成。",
      "type": "long",
      "source": "content/writing/12.md",
      "tags": [
        "使用流程",
        "状态更新",
        "功能验证"
      ],
      "approved": true
    },
    {
      "title": "每次改好一点，为什么整个项目反而更乱？",
      "date": "2026-10-06",
      "description": "CSS覆盖和重复路径让我同时关注局部效果与实现关系，并按当前任务决定必要的整理范围。",
      "type": "long",
      "source": "content/writing/13.md",
      "tags": [
        "CSS",
        "项目维护",
        "技术债"
      ],
      "approved": true
    },
    {
      "title": "个人自用的软件，需要把技术债清零吗？",
      "date": "2026-10-06",
      "description": "我按实际使用影响、处理成本和关键结果的可靠性，决定个人软件中的问题何时处理或暂留。",
      "type": "long",
      "source": "content/writing/14.md",
      "tags": [
        "技术债",
        "个人软件",
        "维护取舍"
      ],
      "approved": true
    },
    {
      "title": "一份大Markdown，就让我的工具撑不住了",
      "date": "2026-10-06",
      "description": "从大Markdown导入受阻的经历，思考输入范围、分批处理与结果核对如何影响工具的实际可用性。",
      "type": "long",
      "source": "content/writing/15.md",
      "tags": [
        "文件导入",
        "工具设计",
        "资料管理"
      ],
      "approved": true
    },
    {
      "title": "只多了一层文件夹，整套课程就不能导入",
      "date": "2026-10-06",
      "description": "从课程导入和Vault未初始化的经历，讨论目录入口、准备状态与可执行提示应如何表达。",
      "type": "long",
      "source": "content/writing/16.md",
      "tags": [
        "Vault",
        "课程导入",
        "使用体验"
      ],
      "approved": true
    },
    {
      "title": "同一个项目，换个窗口为什么像重新开始？",
      "date": "2026-10-06",
      "description": "从项目换窗口后的接续成本，说明共享记忆需要保留当前状态、有效限制和决策依据。",
      "type": "long",
      "source": "content/writing/17.md",
      "tags": [
        "共享记忆",
        "任务接续",
        "项目记录"
      ],
      "approved": true
    },
    {
      "title": "AI研究最让我疲惫的，是做了又忘",
      "date": "2026-10-06",
      "description": "从重复研究的疲惫，讨论如何让问题、证据、失败和未解决缺口参与下一次研究。",
      "type": "long",
      "source": "content/writing/18.md",
      "tags": [
        "AI研究",
        "研究记录",
        "重复劳动"
      ],
      "approved": true
    },
    {
      "title": "交接文件里，为什么必须写失败路线？",
      "date": "2026-10-06",
      "description": "以重复研究为背景，讨论失败路线的条件、停止原因和证据如何帮助接手者避免无意重做。",
      "type": "long",
      "source": "content/writing/19.md",
      "tags": [
        "研究交接",
        "失败记录",
        "证据管理"
      ],
      "approved": true
    },
    {
      "title": "我把研究资料分成了工具箱和历史箱",
      "date": "2026-10-06",
      "description": "区分面向方法调用的工具箱与保留来源过程的历史箱，并说明二者需要通过证据关系连接。",
      "type": "long",
      "source": "content/writing/20.md",
      "tags": [
        "研究资料",
        "方法调用",
        "来源历史"
      ],
      "approved": true
    },
    {
      "title": "我为什么停用了更复杂的多Agent系统？",
      "date": "2026-10-06",
      "description": "说明从Danus转向MRS与Vault的个人成本取舍，并提出未来比较研究安排时应检查的实际成本。",
      "type": "long",
      "source": "content/writing/21.md",
      "tags": [
        "多Agent",
        "MRS",
        "成本取舍"
      ],
      "approved": true
    },
    {
      "title": "一次失败，怎样变成以后还能用的资产？",
      "date": "2026-10-06",
      "description": "我把保存失败记录与实际复用分开，并说明研究记录需要怎样的条件、入口和核对才能帮助下一次行动。",
      "type": "long",
      "source": "content/writing/22.md",
      "tags": [
        "研究记录",
        "失败复用",
        "个人工具"
      ],
      "approved": true
    },
    {
      "title": "我的数学飞轮，最初什么都没有",
      "date": "2026-10-06",
      "description": "我以UGA为起点讨论工具与研究资产积累，并保留一般问题尚未解决、积累效果尚需使用检验的边界。",
      "type": "long",
      "source": "content/writing/23.md",
      "tags": [
        "UGA",
        "数学研究",
        "研究资产"
      ],
      "approved": true
    },
    {
      "title": "做研究，也要允许自己的猜想是错的",
      "date": "2026-10-06",
      "description": "我把找反例和攻击前提作为研究方向，讨论怎样检查条件、区分候选反例与已确认反例。",
      "type": "long",
      "source": "content/writing/24.md",
      "tags": [
        "数学研究",
        "反例",
        "研究判断"
      ],
      "approved": true
    },
    {
      "title": "AI给了我一整套课程，我还是看不懂",
      "date": "2026-10-06",
      "description": "我从9月11日至13日干涩且仍为半成品的课程材料出发，说明课程覆盖范围与可学习程度之间的距离。",
      "type": "long",
      "source": "content/writing/25.md",
      "tags": [
        "AI课程",
        "学习材料",
        "学习入口"
      ],
      "approved": true
    },
    {
      "title": "材料越来越多，我却不知道从哪里开始学",
      "date": "2026-10-06",
      "description": "我从9月15日资料库与学习路径的问题出发，讨论怎样根据学习目标、起点和知识依赖找到一个可进入的入口。",
      "type": "long",
      "source": "content/writing/26.md",
      "tags": [
        "资料库",
        "学习路径",
        "学习目标"
      ],
      "approved": true
    },
    {
      "title": "让AI整理资料时，我最怕它把什么删掉？",
      "date": "2026-10-06",
      "description": "我讨论资料整理中应保留的例外、失败和判断状态，并把删减标准放在是否会改变后续判断上。",
      "type": "long",
      "source": "content/writing/27.md",
      "tags": [
        "资料整理",
        "信息保留",
        "AI协作"
      ],
      "approved": true
    },
    {
      "title": "看懂了答案，和自己做出来差在哪里？",
      "date": "2026-10-06",
      "description": "我围绕Workbench提出主动回忆与复习设计，区分看懂参考答案、独立尝试和已经验证的学习效果。",
      "type": "long",
      "source": "content/writing/28.md",
      "tags": [
        "Workbench",
        "主动回忆",
        "复习设计"
      ],
      "approved": true
    },
    {
      "title": "让AI和我学同一门课，会发生什么？",
      "date": "2026-10-06",
      "description": "从进入Workbench的学习实验出发，我区分共同学习的安排、双方的可观察表现和仍待核实的学习结果。",
      "type": "long",
      "source": "content/writing/29.md",
      "tags": [
        "学习实验",
        "Workbench",
        "主动回忆"
      ],
      "approved": true
    },
    {
      "title": "测试通过了，究竟证明谁学会了？",
      "date": "2026-10-06",
      "description": "参考答案通过测试只能支持答案层面的判断，我需要把测试对象、独立作答和知识迁移分开。",
      "type": "long",
      "source": "content/writing/30.md",
      "tags": [
        "学习评估",
        "测试",
        "参考答案"
      ],
      "approved": true
    },
    {
      "title": "为了不浪费额度，我开始反过来找事情做",
      "date": "2026-10-06",
      "description": "当额度反过来决定任务时，我需要重新用真实需求、后续维护和可保留成果判断工作价值。",
      "type": "long",
      "source": "content/writing/31.md",
      "tags": [
        "任务取舍",
        "AI额度",
        "个人项目"
      ],
      "approved": true
    },
    {
      "title": "“看起来很未来”的项目，为什么后来被我放下？",
      "date": "2026-10-06",
      "description": "H5角色与修图工作台的取舍让我把项目的新鲜感，与它在实际工作中承担的用途分开。",
      "type": "long",
      "source": "content/writing/32.md",
      "tags": [
        "项目取舍",
        "H5角色",
        "修图工作台"
      ],
      "approved": true
    },
    {
      "title": "只看前端截图，能判断一个AI好不好吗？",
      "date": "2026-10-06",
      "description": "前端截图能支持视觉判断，长期任务还需要检查交接、状态保持和出错后的恢复过程。",
      "type": "long",
      "source": "content/writing/33.md",
      "tags": [
        "AI评估",
        "长期任务",
        "错误恢复"
      ],
      "approved": true
    },
    {
      "title": "会用很多AI工具，我就有解决问题的能力了吗？",
      "date": "2026-10-06",
      "description": "工具名单不能代替解决问题的能力，我需要用目标、任务边界、结果核对和持续接续连接实际工作。",
      "type": "long",
      "source": "content/writing/34.md",
      "tags": [
        "解决问题",
        "AI工具",
        "工作方法"
      ],
      "approved": true
    },
    {
      "title": "一个项目值得做，应该先回答哪些问题？",
      "date": "2026-10-06",
      "description": "我用真实痛点、投入范围、易用程度和工作环节来判断项目，先找到值得验证的小问题。",
      "type": "long",
      "source": "content/writing/35.md",
      "tags": [
        "项目判断",
        "真实需求",
        "工作环节"
      ],
      "approved": true
    },
    {
      "title": "我的个人网站，为什么越改越想做减法？",
      "date": "2026-10-06",
      "description": "我把个人网站的取舍重新放回文章阅读，保留有用途的现有功能，减少入口、展示和维护带来的负担。",
      "type": "long",
      "source": "content/writing/36.md",
      "tags": [
        "个人网站",
        "内容取舍",
        "维护成本"
      ],
      "approved": true
    },
    {
      "title": "同一篇文章，为什么要有两种读法？",
      "date": "2026-10-06",
      "description": "我希望同一份正文支持Writing连续阅读和Room书内翻页，并把真实稿件导入与长文一致性验收留作下一步。",
      "type": "long",
      "source": "content/writing/37.md",
      "tags": [
        "阅读设计",
        "内容复用",
        "Room"
      ],
      "approved": true
    },
    {
      "title": "我为什么想做自己的Dream-RSI？",
      "date": "2026-10-06",
      "description": "我把Dream-RSI写成围绕记忆、失败复用和后续验证的个人探索，并明确持续改进与跨任务稳定提升尚未成立。",
      "type": "long",
      "source": "content/writing/38.md",
      "tags": [
        "Dream-RSI",
        "个人实验",
        "研究边界"
      ],
      "approved": true
    },
    {
      "title": "复现论文时，我为什么改回了熟悉的Codex对话？",
      "date": "2026-10-06",
      "description": "CLI启动问题促使我改用熟悉的Codex对话驱动runner，示例已跑通，但完整复现和实验条件仍需核验。",
      "type": "long",
      "source": "content/writing/39.md",
      "tags": [
        "论文复现",
        "Codex",
        "实验验证"
      ],
      "approved": true
    },
    {
      "title": "两次实验都没触发“Dream”，这个结果有价值吗？",
      "date": "2026-10-06",
      "description": "我保留9月28日两次未触发Dream的负结果，用它检查观察标准与实验设计，避免泛化为Dream无用。",
      "type": "long",
      "source": "content/writing/40.md",
      "tags": [
        "负结果",
        "Dream",
        "实验设计"
      ],
      "approved": true
    },
    {
      "title": "我开始用benchmark，检查AI到底有没有帮上忙",
      "date": "2026-10-06",
      "description": "我提出以统一标准、基线、同预算和留出任务比较MRS与Dream-MRS，并把课程一致性、未触发Dream、成本和返工纳入核验。",
      "type": "long",
      "source": "content/writing/41.md",
      "tags": [
        "benchmark",
        "MRS",
        "对照实验"
      ],
      "approved": true
    }
  ],
  // References a confirmed Writing source; the article body is never duplicated.
  researchArticles: []
};
