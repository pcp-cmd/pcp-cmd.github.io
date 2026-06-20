const content = window.ALEKSI_CONTENT || {};

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function articleHref(src) {
  return `./article.html?src=${encodeURIComponent(src)}`;
}

function renderNavigation() {
  const nav = document.querySelector('.desktop-nav');
  const items = content.nav;
  if (!nav || !Array.isArray(items)) return;
  const current = window.location.pathname.split('/').pop() || 'protocol.html';
  nav.innerHTML = items.map((item) => {
    const href = item.href || './index.html';
    const label = escapeHtml(item.label || '');
    const file = href.replace('./', '').split('#')[0].split('?')[0] || 'index.html';
    const active = file === current;
    return `<a class="nav-link${active ? ' is-active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
}

const protocolRows = [
  {
    no: '01',
    title: 'Capture',
    cn: '捕捉',
    body: '先把原始经验、错误、草稿和困惑放入系统，不急着解释。',
    action: '记录'
  },
  {
    no: '02',
    title: 'Diagnose',
    cn: '诊断',
    body: '找到认知误差、证明跳步、审美失衡或目标模糊的真实位置。',
    action: '检查'
  },
  {
    no: '03',
    title: 'Compress',
    cn: '压缩',
    body: '把重复动作沉淀为工作流、提示词、检查清单、模板或规则。',
    action: '压缩'
  },
  {
    no: '04',
    title: 'Re-enter',
    cn: '再进入',
    body: '让资产回到下一轮学习、作品、文章或 AI 共事，而不是停在归档。',
    action: '回流'
  }
];

const engineLinks = [
  ['Raw Experience', '原始经验', '捕捉事件、草稿、失败、问题和感受，不急着把它解释成结论。'],
  ['Prediction Error', '认知误差', '找到“我以为懂了，但结果不对”的分裂位置。'],
  ['Personal Delta', '个人增量', '记录这次修订真正改变了自己的哪个判断。'],
  ['Connection', '连接', '把这次增量接入项目、笔记、证明、视觉系统或旧协议。'],
  ['Compression', '压缩', '把重复动作变成更小、更稳定、可再次调用的形式。'],
  ['Skill', '技能资产', '把稳定动作提升为检查清单、协议、提示词或工作流。'],
  ['Revision Loop', '反馈修订', '让技能回到下一次实践，继续被打开、测试和修订。']
];

const diagnosisLinks = [
  ['Time', '时间', '问题发生在什么时候？是拖延、过早结束，还是复盘太晚？'],
  ['Object', '对象', '真正要处理的是概念、证明、版式、情绪，还是任务边界？'],
  ['Feedback', '反馈', '有没有足够清楚的外部反馈，能指出哪里错了？'],
  ['Granularity', '颗粒度', '现在的单位太大还是太碎？能不能缩成一个可执行动作？'],
  ['Transfer', '迁移', '这次经验能不能迁移到别的题、作品或项目？'],
  ['Environment', '环境', '工具、时间、场景和协作者是否支持这次修订？'],
  ['Recovery', '恢复', '失败之后如何重新进入，而不是直接放弃？']
];

const assetLevels = [
  ['Inbox', '原始材料', '失败尝试、截图、问题、灵感和松散笔记。'],
  ['Candidate', '候选模式', '重复出现但还没有稳定下来的动作或判断。'],
  ['Reference', '参考样本', '已经清理过、可以指导下一次工作的例子。'],
  ['Core', '核心技能', '跨项目反复使用的规则、协议、模板或技能。']
];

function renderProtocolMethod() {
  const target = document.querySelector('[data-protocol-method]');
  if (!target) return;
  target.innerHTML = `
    <section class="protocol-summary">
      <p class="section-kicker">Core</p>
      <h2 class="section-title">把修订公开成方法</h2>
      <p class="zh-copy">Revision Protocol 不是一句鼓励，而是一条工作链：经验进入、误差暴露、个人增量生成、连接旧系统、压缩为技能，再返回下一轮实践。</p>
    </section>

    <section class="protocol-guide">
      <p class="section-kicker">Numbered Guide Rows</p>
      <div class="guide-row-list">
        ${protocolRows.map((item) => `
          <article class="guide-row protocol-guide-row">
            <span class="guide-row-no">${item.no} / ${item.title}</span>
            <strong class="guide-row-title">${item.cn}</strong>
            <p>${item.body}</p>
            <em>${item.action} →</em>
          </article>
        `).join('')}
      </div>
    </section>

    <section class="protocol-engine">
      <p class="section-kicker">Method Engine</p>
      <h2 class="section-title">方法引擎</h2>
      <div class="protocol-ledger">
        ${engineLinks.map(([title, cn, body], index) => `
          <article class="protocol-ledger-row">
            <span class="ledger-no">${String(index + 1).padStart(2, '0')}</span>
            <div class="ledger-name">
              <strong>${title}</strong>
              <em>${cn}</em>
            </div>
            <p>${body}</p>
          </article>
        `).join('')}
      </div>
    </section>

    <section class="protocol-diagnosis">
      <p class="section-kicker">Diagnosis</p>
      <h2 class="section-title">七链诊断</h2>
      <p class="zh-note">七链不是按钮，而是一组检查口。每次卡住，都从这七个位置找出真正的断点。</p>
      <div class="diagnosis-matrix">
        ${diagnosisLinks.map(([title, cn, body]) => `
          <article class="diagnosis-cell">
            <span>${title}</span>
            <strong>${cn}</strong>
            <p>${body}</p>
          </article>
        `).join('')}
      </div>
    </section>

    <section class="protocol-assets">
      <p class="section-kicker">Asset Levels</p>
      <h2 class="section-title">资产层级</h2>
      <div class="asset-stair">
        ${assetLevels.map(([title, cn, body], index) => `
          <article class="asset-step">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <strong>${title}</strong>
            <em>${cn}</em>
            <p>${body}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderProtocolSource() {
  const source = document.querySelector('[data-protocol-source]');
  const protocol = content.system && content.system.revisionProtocol;
  if (!source || !protocol) return;
  source.innerHTML = `
    <p class="section-kicker">CORE ASSET</p>
    <h2>${protocol.title}</h2>
    <p class="zh-note">${protocol.cn}</p>
    <p>${protocol.body}</p>
    <a class="text-link" href="${articleHref(protocol.source)}">打开修订协议文章</a>
    <a class="text-link" href="${articleHref('content/skills/learning-diagnosis-protocol/SKILL.md')}">打开核心技能资产</a>
    <div class="atlas-entrance">
      <p class="section-kicker">Lab Atlas</p>
      <a class="text-link" href="./atlas.html">打开关系图谱 →</a>
    </div>
  `;
}

function initMotion() {
  if (!window.gsap) return;
  const mm = gsap.matchMedia();
  mm.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, (context) => {
    if (context.conditions.reduceMotion) {
      gsap.set('[data-reveal]', { y: 0, autoAlpha: 1 });
      return;
    }
    gsap.fromTo('[data-reveal]', { y: 8, autoAlpha: 0.74 }, { y: 0, autoAlpha: 1, duration: 0.72, stagger: 0.035, ease: 'power2.out' });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavigation();
  renderProtocolMethod();
  renderProtocolSource();
  initMotion();
});
