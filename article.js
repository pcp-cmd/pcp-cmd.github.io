const content = window.ALEKSI_CONTENT || {};
const calloutClasses = [
  'callout-definition',
  'callout-proof',
  'callout-error',
  'callout-toolbox',
  'callout-revision'
];

function articleHref(src) {
  return `./article.html?src=${encodeURIComponent(src)}`;
}

function findManuscript(src, id) {
  const registry = [
    ...(content.articles || []),
    ...(content.manuscripts || [])
  ];
  return registry.find((item) => (id && item.id === id) || item.source === src) || null;
}

function normalizePath(path) {
  const parts = String(path || '').replace(/\\/g, '/').split('/');
  const stack = [];
  parts.forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') stack.pop();
    else stack.push(part);
  });
  return stack.join('/');
}

function decodeHashUnicode(path) {
  return String(path || '').replace(/#U([0-9a-fA-F]{4,6})/g, (_, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch (error) {
      return _;
    }
  });
}

function encodeCjkHashUnicode(path) {
  return String(path || '').replace(/[^\x00-\x7F]/g, (char) => {
    return `#U${char.codePointAt(0).toString(16)}`;
  });
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function getMarkdownKeys() {
  return Object.keys(window.ALEKSI_MARKDOWN_BUNDLE || {});
}

function resolveMarkdownSource(src) {
  const normalized = normalizePath(safeDecodeURIComponent(src || ''));
  const bundle = window.ALEKSI_MARKDOWN_BUNDLE || {};
  const keys = getMarkdownKeys();

  const candidates = [
    normalized,
    normalizePath(decodeHashUnicode(normalized)),
    normalizePath(encodeCjkHashUnicode(normalized)),
    normalizePath(encodeCjkHashUnicode(decodeHashUnicode(normalized)))
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (bundle[candidate]) return candidate;
  }

  const decodedTarget = normalizePath(decodeHashUnicode(normalized));
  const encodedTarget = normalizePath(encodeCjkHashUnicode(decodedTarget));

  const matchedKey = keys.find((key) => {
    const decodedKey = normalizePath(decodeHashUnicode(key));
    return key === normalized
      || key === encodedTarget
      || decodedKey === decodedTarget
      || decodedKey.endsWith(`/${decodedTarget.split('/').pop()}`);
  });

  if (matchedKey) return matchedKey;

  const markdownIndex = window.ALEKSI_JSON_BUNDLE && window.ALEKSI_JSON_BUNDLE['content/markdown-index.json'];
  const indexFiles = markdownIndex && Array.isArray(markdownIndex.files) ? markdownIndex.files : [];
  const indexed = indexFiles.find((item) => {
    const source = normalizePath(item.source || '');
    const decodedSource = normalizePath(decodeHashUnicode(source));
    return source === normalized || decodedSource === decodedTarget || source === encodedTarget;
  });

  if (indexed && bundle[indexed.source]) return indexed.source;

  return normalized;
}


function resolveRelativePath(baseSrc, target) {
  if (!target || /^(https?:|mailto:|tel:|#|data:|\/)/i.test(target)) return target;
  const baseDir = String(baseSrc || '').split('/').slice(0, -1).join('/');
  return normalizePath(`${baseDir}/${target}`);
}

function rewriteMarkdownLinks(markdown, src) {
  const baseSrc = src || '';
  return String(markdown || '')
    .replace(/(!?\[[^\]]*\])\(([^)]+)\)/g, (match, label, rawTarget) => {
      const parts = rawTarget.trim().split(/\s+/);
      const target = parts[0].replace(/^['"]|['"]$/g, '');
      const suffix = parts.slice(1).join(' ');
      const resolved = resolveRelativePath(baseSrc, target);
      if (label.startsWith('!')) {
        return `${label}(${resolved}${suffix ? ` ${suffix}` : ''})`;
      }
      if (/\.md(?:#.*)?$/i.test(target)) {
        const [file, hash = ''] = resolved.split('#');
        return `${label}(${articleHref(file)}${hash ? `#${hash}` : ''})`;
      }
      return `${label}(${resolved}${suffix ? ` ${suffix}` : ''})`;
    });
}

async function loadMarkdown(src) {
  const normalized = resolveMarkdownSource(src);
  const bundled = window.ALEKSI_MARKDOWN_BUNDLE && window.ALEKSI_MARKDOWN_BUNDLE[normalized];

  if (bundled) {
    return bundled;
  }

  try {
    const response = await fetch(normalized);
    if (!response.ok) throw new Error(`Could not load ${normalized}`);
    return await response.text();
  } catch (error) {
    throw new Error(`这页手稿还没有接入阅读索引。缺少路径：${normalized}`);
  }
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith('---')) return { meta: {}, body: markdown };
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: markdown };

  const rawMeta = markdown.slice(3, end).trim().split(/\r?\n/);
  const body = markdown.slice(end + 4).trim();
  const meta = {};
  let currentKey = null;

  rawMeta.forEach((line) => {
    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && currentKey) {
      meta[currentKey] = Array.isArray(meta[currentKey]) ? meta[currentKey] : [];
      meta[currentKey].push(listItem[1].trim());
      return;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) return;
    currentKey = pair[1];
    const value = pair[2].trim();
    meta[currentKey] = value || [];
  });

  return { meta, body };
}

function renderCallouts(markdown) {
  const types = ['definition', 'proof', 'error', 'toolbox', 'revision'];
  return markdown.replace(/:::(definition|proof|error|toolbox|revision)\s*([\s\S]*?):::/g, (_, type, body) => {
    const label = types.includes(type) ? type : 'revision';
    return `\n<section class="callout callout-${label}">\n<p class="callout-label">${label}</p>\n${body.trim()}\n</section>\n`;
  });
}

function extractTitle(body, meta, fallback) {
  if (meta.title) return meta.title;
  const heading = body.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback || 'Untitled Manuscript';
}

function stripLeadingTitleHeading(body) {
  return String(body || '').replace(/^\s*#\s+[^\n]+\n+/, '');
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

  try {
    const raw = await loadMarkdown(src);
    const parsed = parseFrontmatter(raw);
    const mergedMeta = {
      ...(known || {}),
      ...parsed.meta
    };
    mergedMeta.title = extractTitle(parsed.body, mergedMeta, known?.title);
    mergedMeta.chain = normalizeChain(mergedMeta.chain, known?.chain);

    applyMeta(mergedMeta);
    renderArticleGlyph(mergedMeta);
    renderRevisionRail(mergedMeta);

    const readableBody = stripLeadingTitleHeading(parsed.body);
    const withCallouts = renderCallouts(rewriteMarkdownLinks(readableBody, src));
    const html = window.marked ? marked.parse(withCallouts) : `<pre>${withCallouts}</pre>`;
    const clean = window.DOMPurify ? DOMPurify.sanitize(html) : html;
    document.querySelector('[data-article-body]').innerHTML = clean;
    localizeArticleHeadings();
    renderToc();
    renderMath();
  } catch (error) {
    document.querySelector('[data-article-title]').textContent = '手稿暂时无法打开';
    document.querySelector('[data-article-judgment]').textContent = '这不是内容本身的问题，而是阅读索引还没有把这条路径映射到正确的手稿文件。';
    document.querySelector('[data-article-body]').innerHTML = `
      <section class="callout callout-error article-missing">
        <p>这页手稿还没有接入阅读索引，可能是中文文件名、Unicode 转义文件名或离线缓存没有同步。</p>
        <p class="dev-note">Dev note: ${error.message}。请检查 <code>content/markdown-index.json</code>、<code>content/content-bundle.js</code> 与文章链接里的 <code>src</code> 是否一致。</p>
      </section>`;
    renderToc();
  }
}

function initArticleMotion() {
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
