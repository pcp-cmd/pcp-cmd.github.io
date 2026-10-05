const content = window.ALEKSI_CONTENT || {};
const calloutClasses = [
  'callout-definition',
  'callout-proof',
  'callout-error',
  'callout-toolbox',
  'callout-revision'
];

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function renderMarkdownSafely(markdown) {
  if (window.marked && window.DOMPurify) {
    return window.AleksiArticleContent.renderMarkdownSafely(markdown);
  }
  return `<pre>${escapeHtml(markdown)}</pre>`;
}

function articleHref(src) {
  return `./article.html?src=${encodeURIComponent(src)}`;
}

function findManuscript(src, id) {
  const registry = [
    ...(window.ALEKSI_SITE?.writing || []).filter((item) => item.approved === true),
    ...(content.articles || []),
    ...(content.manuscripts || [])
  ];
  return registry.find((item) => (id && item.id === id) || item.source === src) || null;
}

// The same article content feeds the continuous reader and the physical book.
async function loadMarkdown(src) { return window.AleksiArticleContent.loadMarkdown(src); }
function parseFrontmatter(markdown) { return window.AleksiArticleContent.parseFrontmatter(markdown); }
function renderCallouts(markdown) { return window.AleksiArticleContent.renderCallouts(markdown); }

function extractTitle(body, meta, fallback) {
  if (meta.title) return meta.title;
  const heading = body.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback || 'Untitled Manuscript';
}

function stripLeadingTitleHeading(body) {
  return window.AleksiArticleContent.stripLeadingTitleHeading(body);
}


function normalizeChain(value, fallback) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return value.split(/\s*->\s*|\s*,\s*/).filter(Boolean);
  return fallback || [];
}

function renderArticleGlyph(meta) {
  const glyph = document.querySelector('[data-article-glyph]');
  if (!glyph) return;
  const tone = meta.glyphTone || 'clay';
  const name = meta.glyph || 'default-manuscript-glyph';
  glyph.dataset.glyph = name;
  glyph.dataset.tone = tone;
  glyph.innerHTML = `
    <span class="glyph-line glyph-line-a"></span>
    <span class="glyph-line glyph-line-b"></span>
    <span class="glyph-line glyph-line-c"></span>
    <span class="glyph-dot"></span>
    <small>${name}</small>
  `;
}


const statusCnMap = {
  'reference-candidate': '候选参考资产',
  'reusable artifact': '可复用资产',
  'under revision': '修订中',
  'working draft': '草稿中',
  'returned': '已回流',
  'draft': '草稿',
  'published': '已发布',
  'revision': '修订中'
};

const roomCnMap = {
  'Skill Library': '技能资产库',
  'Math Lab': '数学实验室',
  'Visual Essays': '视觉文章',
  'System Log': '系统日志',
  'Works': '作品档案',
  'Aleksi Lab': 'Aleksi Lab'
};

const artifactCnMap = {
  'Manuscript': '手稿',
  'manuscript': '手稿',
  'Protocol': '协议',
  'Proof Deconstruction': '证明拆解',
  'Definition Card': '定义卡',
  'Essay Seed': '文章种子',
  'Revision Log': '修订日志',
  'Learning Index': '学习索引',
  'Skill Rule': '技能规则',
  'method asset': '方法资产',
  '方法资产': '方法资产',
  '学习索引': '学习索引'
};

const chainCnMap = {
  'Raw Experience': '原始经验',
  'Prediction Error': '认知误差',
  'Personal Delta': '个人增量',
  'Connection': '连接',
  'Compression': '压缩',
  'Skill': '技能资产',
  'Revision Loop': '反馈修订',
  're-enter': '再进入',
  '原始经验': '原始经验',
  '连接': '连接',
  '压缩': '压缩',
  '修订回路': '修订回路',
  '技能资产': '技能资产',
  '反馈修订': '反馈修订'
};

const headingCnMap = {
  'Core Rule': '核心规则',
  'Seven-Link Diagnosis': '七链诊断',
  'Seven-link Diagnosis': '七链诊断',
  'Minimum Response Shape': '最小回应结构',
  'Math Lab Cycle': '数学实验室循环',
  'Asset Levels': '资产层级',
  'Public Site Use': '网站中的使用方式',
  'Naming Note': '命名说明',
  'When To Use': '使用场景',
  'Response Protocol': '回应协议',
  'Block Types': '阻塞类型',
  'Math Flywheel': '数学飞轮',
  'Asset Rules': '资产规则',
  'Anti-Drift Rules': '防漂移规则',
  'Pressure Scenarios': '压力场景',
  'Current Diagnosis': '当前诊断',
  'Minimum Action': '最小行动',
  'Training Output': '训练输出',
  'Asset To Keep': '保留资产',
  'Feedback Check': '反馈检查',
  'Definition Cards': '定义卡片',
  'Source Context': '来源语境',
  'What The Poster Is Doing': '作品在做什么',
  'Why It Works': '为什么成立',
  'Why This Version Works': '为什么这个版本成立',
  'What Makes It Strong': '它强在哪里',
  'What Needs Revision': '需要修订的地方',
  'Portfolio Position': '作品集定位',
  'Next Revision': '下一轮修订',
  'Thesis': '核心判断',
  'Notes': '笔记',
  'Opening': '开头',
  'Sections': '章节',
  'Visual Glyph': '视觉符号',
  'Revision Notes': '修订记录',
  'Changed': '改动',
  'Kept': '保留',
  'Removed': '移除',
  'Next': '下一步',
  'Change': '变化',
  'Decision': '决策',
  'Decisions': '决策',
  'Reason': '原因',
  'Revision': '修订',
  'Constraint': '限制',
  'Purpose': '用途',
  'Inputs': '输入',
  'Input': '输入',
  'Output': '输出',
  'Goal': '目标',
  'Steps': '步骤',
  'Checks': '检查',
  'Visual Rules': '视觉规则',
  'Public Use': '网站用途',
  'Default coworking loop': '默认共事循环'
};

function cnValue(value, map) {
  if (!value) return '';
  const raw = String(value).trim();
  return map[raw] || raw;
}

function cnStatus(value) {
  return cnValue(value, statusCnMap) || '修订中';
}

function cnRoom(value) {
  return cnValue(value, roomCnMap) || '未完手稿';
}

function cnArtifact(value) {
  return cnValue(value, artifactCnMap) || '手稿';
}

function cnChainList(chain = []) {
  return normalizeChain(chain, []).map((item) => chainCnMap[item] || item).filter(Boolean);
}

function localizeArticleHeadings() {
  const body = document.querySelector('[data-article-body]');
  if (!body) return;
  body.querySelectorAll('h1, h2, h3, h4').forEach((heading) => {
    const raw = heading.textContent.trim();
    if (headingCnMap[raw]) {
      heading.textContent = headingCnMap[raw];
      return;
    }
    const cardMatch = raw.match(/^Card\s+(\d+)[:：]\s*(.+)$/i);
    if (cardMatch) heading.textContent = `卡片 ${cardMatch[1]}：${cardMatch[2]}`;
  });
}

function renderRevisionRail(meta) {
  const rail = document.querySelector('[data-revision-rail]');
  if (!rail) return;
  const chain = cnChainList(meta.chain);
  rail.innerHTML = `
    <h2>修订信息</h2>
    <dl>
      <dt>状态</dt>
      <dd>${cnStatus(meta.status)}</dd>
      <dt>链路</dt>
      <dd>${chain.join(' → ') || '反馈修订'}</dd>
      <dt>空间</dt>
      <dd>${cnRoom(meta.room)}</dd>
      <dt>资产</dt>
      <dd>${cnArtifact(meta.artifactType)}</dd>
      <dt>下一步</dt>
      <dd>${meta.next || '回到下一轮修订'}</dd>
    </dl>
  `;
}

function renderToc() {
  if (window.AleksiReading) {
    window.AleksiReading.refreshToc();
    return;
  }
  const toc = document.querySelector('[data-article-toc]');
  const body = document.querySelector('[data-article-body]');
  if (!toc || !body) return;
  const headings = Array.from(body.querySelectorAll('h2, h3')).slice(0, 12);
  const tocSection = toc.closest('section');
  if (!headings.length) {
    toc.innerHTML = '';
    if (tocSection) tocSection.hidden = true;
    return;
  }
  if (tocSection) tocSection.hidden = false;
  headings.forEach((heading, index) => {
    heading.id = heading.id || `section-${index + 1}`;
  });
  toc.innerHTML = headings.map((heading) => `<a href="#${heading.id}">${heading.textContent}</a>`).join('');
}

function renderMath() {
  const body = document.querySelector('[data-article-body]');
  if (body && window.renderMathInElement) {
    renderMathInElement(body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false
    });
  }
}

function applyMeta(meta) {
  if (document.body.classList.contains('reading-page')) {
    document.querySelector('[data-article-title]').textContent = meta.title || '文章标题待提供';
    document.title = `${meta.title || 'Writing'} · Aleksi`;
    document.querySelector('[data-article-date]').textContent = [
      typeof meta.date === 'string' && meta.date ? meta.date : '日期待提供',
      meta.type === 'note' ? '短记' : '长文',
      meta.sample ? '排版样文（未发布）' : ''
    ].filter(Boolean).join(' · ');
    const notice = document.querySelector('[data-article-notice]');
    notice.hidden = !meta.sample;
    notice.textContent = meta.sample ? '合成中文样文，仅用于本地排版核对，不代表 Aleksi 的真实经历、项目成果或研究进展。' : '';
    return;
  }
  document.querySelector('[data-article-room]').textContent = cnRoom(meta.room || '未完手稿');
  document.querySelector('[data-article-title]').textContent = meta.title || '未命名手稿';
  document.querySelector('[data-article-judgment]').textContent = meta.judgment || meta.description || '一件可以继续修订的知识资产。';
  document.querySelector('[data-meta-room]').textContent = cnRoom(meta.room || '未完手稿');
  document.querySelector('[data-meta-status]').textContent = cnStatus(meta.status || '修订中');
  document.querySelector('[data-meta-artifact]').textContent = cnArtifact(meta.artifactType || '手稿');

  const tags = document.querySelector('[data-article-tags]');
  const chain = cnChainList(meta.chain);
  tags.innerHTML = [
    cnStatus(meta.status),
    cnArtifact(meta.artifactType),
    ...chain
  ].filter(Boolean).map((item) => `<span>${item}</span>`).join('');

  const next = document.querySelector('[data-article-next]');
  next.innerHTML = meta.next ? `<p class="section-kicker">下一轮修订</p><p>${meta.next}</p>` : '';
}

async function renderArticle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const initialSrc = params.get('src');
  const known = findManuscript(initialSrc, id);
  const src = initialSrc || known?.source || 'content/system/revision-protocol/index.md';
  const sample = params.get('sample') === 'reading';
  configureArticleReturn(params, src);

  try {
    let raw;
    if (sample) {
      if (!window.AleksiReading?.localPreview) throw new Error('排版样文仅在本地预览中提供。');
      const response = await fetch('./docs/fixtures/reading-sample.zh.md');
      if (!response.ok) throw new Error('本地排版样文暂时无法打开。');
      raw = await response.text();
    } else {
      raw = await loadMarkdown(src);
    }
    const parsed = parseFrontmatter(raw);
    const mergedMeta = {
      ...(known || {}),
      ...parsed.meta
    };
    mergedMeta.sample = sample;
    mergedMeta.title = extractTitle(parsed.body, mergedMeta, known?.title);
    mergedMeta.chain = normalizeChain(mergedMeta.chain, known?.chain);

    applyMeta(mergedMeta);
    renderArticleGlyph(mergedMeta);
    renderRevisionRail(mergedMeta);

    let readableBody = stripLeadingTitleHeading(parsed.body);
    if (sample) {
      // The fixture's metadata and usage notice are rendered in the title block.
      readableBody = readableBody.slice(readableBody.indexOf('## '));
    }
    document.querySelector('[data-article-body]').innerHTML = window.AleksiArticleContent.renderArticleBody(
      readableBody, sample ? 'docs/fixtures/reading-sample.zh.md' : src
    );
    localizeArticleHeadings();
    renderToc();
    renderMath();
  } catch (error) {
    if (document.body.classList.contains('reading-page')) {
      document.querySelector('[data-article-title]').textContent = '文章暂时无法打开';
      document.querySelector('[data-article-date]').textContent = '';
      document.querySelector('[data-article-body]').innerHTML = `<p>${escapeHtml(error.message)}</p><p><a href="./writing.html">返回 Writing</a></p>`;
      renderToc();
      return;
    }
    document.querySelector('[data-article-title]').textContent = '手稿暂时无法打开';
    document.querySelector('[data-article-judgment]').textContent = '这不是内容本身的问题，而是阅读索引还没有把这条路径映射到正确的手稿文件。';
    document.querySelector('[data-article-body]').innerHTML = `
      <section class="callout callout-error article-missing">
        <p>这页手稿还没有接入阅读索引，可能是中文文件名、Unicode 转义文件名或离线缓存没有同步。</p>
        <p class="dev-note">Dev note: ${escapeHtml(error.message)}。请检查 <code>content/markdown-index.json</code>、<code>content/content-bundle.js</code> 与文章链接里的 <code>src</code> 是否一致。</p>
      </section>`;
    renderToc();
  }
}

function initArticleMotion() {
  if (document.body.classList.contains('reading-page')) return;
  if (!window.gsap) return;
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add({
    reduceMotion: '(prefers-reduced-motion: reduce)'
  }, (context) => {
    if (context.conditions.reduceMotion) {
      gsap.set('[data-reveal], .article-glyph span', { autoAlpha: 1, y: 0, scale: 1 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.fromTo('.article-manuscript', { y: 8, autoAlpha: 0.74 }, { y: 0, autoAlpha: 1, duration: .95 })
      .fromTo('.article-glyph span', { scaleX: 0.82, autoAlpha: 0.72 }, { scaleX: 1, autoAlpha: 1, duration: .85, stagger: .035, transformOrigin: 'left center' }, '-=.35')
      .fromTo('.article-meta, .article-rail', { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .85, stagger: .035 }, '-=.35');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await renderArticle();
  initArticleMotion();
});

function configureArticleReturn(params, src) {
  const choices = {
    writing: ['./writing.html', 'Writing'],
    research: ['./research.html', 'Research'],
    manuscripts: ['./manuscripts.html', 'Manuscripts'],
    math: ['./math.html', 'Math Lab'],
    protocol: ['./protocol.html', 'Protocol'],
    works: ['./works.html', 'Works']
  };
  let target = choices[params.get('from')] || choices.writing;
  if (!choices[params.get('from')] && document.referrer) {
    try {
      const origin = new URL(document.referrer);
      const route = origin.pathname.split('/').pop();
      if (origin.origin === location.origin && route === 'work-detail.html') target = [`./work-detail.html${origin.search}`, '作品详情'];
      else if (origin.origin === location.origin) {
        const key = route.replace(/\.html$/, '');
        if (choices[key]) target = choices[key];
      }
    } catch (error) { /* Direct entry falls back to the Writing hierarchy. */ }
  }
  document.querySelectorAll('[data-article-return]').forEach((link) => {
    link.href = target[0]; link.textContent = `← 返回 ${target[1]}`;
  });
}
