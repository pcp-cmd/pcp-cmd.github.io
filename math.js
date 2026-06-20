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
  const current = window.location.pathname.split('/').pop() || 'math.html';
  nav.innerHTML = items.map((item) => {
    const href = item.href || './index.html';
    const label = escapeHtml(item.label || '');
    const file = href.replace('./', '').split('#')[0].split('?')[0] || 'index.html';
    const active = file === current;
    return `<a class="nav-link${active ? ' is-active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
}

function renderMathGraph() {
  const target = document.querySelector('[data-math-graph]');
  if (!target || !window.renderKnowledgeGraph) return;
  window.renderKnowledgeGraph(target, window.ALEKSI_GRAPHS.mathKnowledgeGraph);
}

function bundledJson(path) {
  return window.ALEKSI_JSON_BUNDLE && window.ALEKSI_JSON_BUNDLE[path];
}

async function loadJson(path) {
  const bundled = bundledJson(path);
  if (window.location.protocol === 'file:' && bundled) return bundled;
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return await response.json();
  } catch (error) {
    if (bundled) return bundled;
    throw error;
  }
}

function renderFilters() {
  const filter = document.querySelector('[data-math-filter]');
  if (!filter) return;
  filter.innerHTML = `
    <div class="segmented" role="tablist" aria-label="Math note filters">
      ${[
        ['all', '第一章'],
        ['definition', '定义'],
        ['proof', '证明'],
        ['error', '误差'],
        ['toolbox', '工具箱'],
        ['counterexample', '反例'],
        ['revision', '修订']
      ].map(([key, item], index) => `
        <button class="${index === 0 ? 'is-active' : ''}" type="button" data-filter="${key}">${item}</button>
      `).join('')}
    </div>
  `;
}

function titleFromMarkdown(markdown, fallback) {
  const metaTitle = String(markdown || '').match(/^---[\s\S]*?\ntitle\s*:\s*(.+?)\n[\s\S]*?\n---/);
  const heading = String(markdown || '').match(/^#\s+(.+)$/m);
  return (metaTitle && metaTitle[1].trim()) || (heading && heading[1].trim()) || fallback;
}

function bytesFromMarkdown(markdown) {
  return new Blob([String(markdown || '')]).size;
}

function sourceKindFromPath(source) {
  if (source.includes('/web-latex/')) return '网页数学';
  if (source.includes('/cards/')) return '卡片';
  return '笔记';
}

function classifyNote(note) {
  const text = `${note.title || ''} ${noteSource(note)}`.toLowerCase();
  const tags = new Set(['all']);
  if (/定义|definition|axiom|公理|set-axioms/.test(text)) tags.add('definition');
  if (/证明|proof|题解|solution/.test(text)) tags.add('proof');
  if (/误差|error|gap|错|wrong/.test(text)) tags.add('error');
  if (/toolbox|工具|card|卡片|复习|test/.test(text)) tags.add('toolbox');
  if (/反例|counterexample|boundary|边界/.test(text)) tags.add('counterexample');
  if (/revision|修订|复习|overview|总览|index|索引/.test(text)) tags.add('revision');
  return Array.from(tags);
}

function noteSource(note) {
  if (note.source) return note.source;
  if (note.file) return `content/math/analysis/chapter-01/${note.file}`;
  return '';
}

function noteRow(note, type, index) {
  const source = noteSource(note);
  return `
    <a class="index-row math-note-row" href="${articleHref(source)}" data-filter="${classifyNote(note).join(' ')}" data-filter-tags="${classifyNote(note).join(' ')}" data-reveal>
      <span class="index-row-kicker">${String(index + 1).padStart(2, '0')} / ${type}</span>
      <strong class="index-row-title">${note.title}</strong>
      <p class="index-row-copy">链路：认知误差 → 压缩 · ${note.bytes || 0} bytes</p>
      <em class="row-action">阅读 →</em>
    </a>
  `;
}

function itemsFromBundle(prefix) {
  const bundle = window.ALEKSI_MARKDOWN_BUNDLE || {};
  return Object.keys(bundle)
    .filter((source) => source.startsWith(prefix) && source.endsWith('.md'))
    .sort()
    .map((source) => ({
      source,
      title: titleFromMarkdown(bundle[source], source.split('/').pop().replace(/\.md$/i, '')),
      bytes: bytesFromMarkdown(bundle[source])
    }));
}

function itemsFromMarkdownIndex(index) {
  const files = index && Array.isArray(index.files) ? index.files : [];
  return files
    .filter((item) => /^content\/math\/analysis\/chapter-01\/(notes|web-latex|cards)\/.+\.md$/i.test(item.source || ''))
    .map((item) => ({
      source: item.source,
      title: item.title,
      bytes: item.bytes || 0
    }));
}

function mergeBySource(items) {
  const seen = new Set();
  return items.filter((item) => {
    const source = noteSource(item);
    if (!source || seen.has(source)) return false;
    seen.add(source);
    return true;
  });
}

function applyMathFilter(key = 'all') {
  const filter = document.querySelector('[data-math-filter]');
  const list = document.querySelector('[data-math-notes]');
  if (!filter || !list) return;
  filter.querySelectorAll('button[data-filter]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.filter === key);
  });
  list.querySelectorAll('.math-note-row').forEach((row) => {
    const tags = new Set(String(row.dataset.filterTags || row.dataset.filter || '').split(/\s+/).filter(Boolean));
    const hidden = key !== 'all' && !tags.has(key);
    row.hidden = hidden;
    row.classList.toggle('is-hidden', hidden);
  });
}

function initMathFilter() {
  const filter = document.querySelector('[data-math-filter]');
  if (!filter) return;
  filter.querySelectorAll('button[data-filter]').forEach((button) => {
    button.addEventListener('click', () => applyMathFilter(button.dataset.filter || 'all'));
  });
  applyMathFilter('all');
}

async function renderNotes() {
  const list = document.querySelector('[data-math-notes]');
  if (!list) return;

  const collected = [];

  try {
    const manifest = await loadJson('content/math/analysis/chapter-01/manifest.json');
    collected.push(
      ...(manifest.notes || []).map((item) => ({ ...item, kind: 'note' })),
      ...(manifest.webLatex || []).map((item) => ({ ...item, kind: 'web math' })),
      ...(manifest.cards || []).map((item) => ({ ...item, kind: 'card' }))
    );
  } catch (error) {
    // Static folder browsing is impossible from the browser; fallbacks below use generated indexes/bundles.
  }

  try {
    const markdownIndex = await loadJson('content/markdown-index.json');
    collected.push(...itemsFromMarkdownIndex(markdownIndex));
  } catch (error) {
    // Ignore and use bundle/content fallback.
  }

  collected.push(
    ...itemsFromBundle('content/math/analysis/chapter-01/notes/'),
    ...itemsFromBundle('content/math/analysis/chapter-01/web-latex/'),
    ...itemsFromBundle('content/math/analysis/chapter-01/cards/')
  );

  const notes = mergeBySource(collected);

  if (notes.length) {
    list.innerHTML = notes.map((item, index) => noteRow(item, item.kind || sourceKindFromPath(noteSource(item)), index)).join('');
    return;
  }

  const fallback = content.math?.analysis?.[0];
  list.innerHTML = fallback ? `
    <a class="index-row math-note-row" href="${articleHref(fallback.source)}">
      <span class="index-row-kicker">${fallback.status}</span>
      <strong class="index-row-title">${fallback.title}</strong>
      <p class="index-row-copy">${fallback.body}</p>
      <em class="row-action">阅读 →</em>
    </a>
  ` : '<p class="empty-note">暂时还没有找到数学笔记。</p>';
}

function initPageMotion() {
  if (!window.gsap) return;
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();
  mm.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, (context) => {
    if (context.conditions.reduceMotion) {
      gsap.set('[data-reveal]', { y: 0, autoAlpha: 1 });
      return;
    }
    gsap.fromTo('[data-reveal]', { y: 8, autoAlpha: 0.74 }, { y: 0, autoAlpha: 1, duration: 0.86, stagger: 0.035, ease: 'power2.out' });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderNavigation();
  renderMathGraph();
  renderFilters();
  await renderNotes();
  initMathFilter();
  initPageMotion();
});
