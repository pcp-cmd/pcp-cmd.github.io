const works = window.ALEKSI_WORKS || [];
const handbookLabels = {
  curation: '策展说明',
  process: '修订过程'
};
const defaultWorkImage = './content/design/works/ayase-momo-dandadan/hero.webp';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function renderNavigation() {
  const nav = document.querySelector('.desktop-nav');
  const items = window.ALEKSI_CONTENT && window.ALEKSI_CONTENT.nav;
  if (!nav || !Array.isArray(items)) return;
  const current = window.location.pathname.split('/').pop() || 'work-detail.html';
  nav.innerHTML = items.map((item) => {
    const href = item.href || './index.html';
    const label = escapeHtml(item.label || '');
    const file = href.replace('./', '').split('#')[0].split('?')[0] || 'index.html';
    const active = file === current || (current === 'work-detail.html' && file === 'works.html');
    return `<a class="nav-link${active ? ' is-active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
}

function articleHref(src) {
  return `./article.html?src=${encodeURIComponent(src)}`;
}

function safeLocalHref(value, fallback = '') {
  const candidate = String(value || '').trim();
  if (
    !candidate
    || candidate.startsWith('//')
    || /^[a-z][a-z\d+.-]*:/i.test(candidate)
    || /[\u0000-\u001f\u007f\\]/.test(candidate)
  ) {
    return fallback;
  }

  if (/^(?:\.\/|\/(?!\/)|\?|#)/.test(candidate)) return candidate;

  try {
    const normalized = new URL(candidate, 'http://local.invalid/');
    const normalizedRelative = `${normalized.pathname.slice(1)}${normalized.search}${normalized.hash}`;
    return normalized.origin === 'http://local.invalid' && normalizedRelative === candidate
      ? candidate
      : fallback;
  } catch {
    return fallback;
  }
}

function safeLocalAsset(value, fallback = defaultWorkImage) {
  return safeLocalHref(value, fallback);
}

function resolveWorkSlug(value) {
  const aliases = window.ALEKSI_WORK_ALIASES || {};
  const requested = String(value ?? '').trim();
  if (!Object.prototype.hasOwnProperty.call(aliases, requested)) return requested;
  const alias = aliases[requested];
  return typeof alias === 'string' && alias.trim() ? alias.trim() : requested;
}

function findWork() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('work') || params.get('id');
  const slug = resolveWorkSlug(requested);
  return works.find((work) => work.slug === slug) || null;
}

function renderMissingWork() {
  const detail = document.querySelector('[data-work-detail]');
  document.title = 'Aleksi Lab / 未找到作品';
  if (!detail) return;
  detail.innerHTML = `
    <section class="work-not-found" role="status">
      <p class="eyebrow">Works / 作品档案</p>
      <h1>没有找到这件作品</h1>
      <p>链接可能来自旧版本，或该条目已经归档。</p>
      <a class="text-link" href="./works.html">返回作品档案</a>
    </section>
  `;
}

function renderProcess(work) {
  const groups = [
    ['版式判断', work.layoutNotes],
    ['视觉系统', work.visualSystem],
    ['下一轮修订', work.revisionNext]
  ];
  return groups.map(([label, items]) => `
    <article class="work-process-card">
      <span>${escapeHtml(label)}</span>
      ${(items || []).map((item) => `<p>${escapeHtml(item)}</p>`).join('')}
    </article>
  `).join('');
}

function renderScores(work) {
  const scoreLabels = {
    concept: '概念',
    layout: '版式',
    typography: '文字',
    visual: '视觉',
    system: '系统',
    revision: '修订'
  };
  const scores = work.scores || {};
  return Object.entries(scoreLabels).map(([key, label]) => `
    <article class="score-item">
      <span>${escapeHtml(label)}</span>
      <strong>${Number(scores[key] || 0).toFixed(1)}</strong>
    </article>
  `).join('');
}

function renderMetaTable(work) {
  const rows = [
    ['来源', work.source || '来源待复核'],
    ['媒介', work.medium || work.category || '数字图像 / 编辑排版研究'],
    ['工具', work.tools || 'AI 图像 / 编辑排版研究'],
    ['状态', work.status || '档案条目'],
    ['规格', work.format || '网页展示']
  ];

  return rows.map(([key, value]) => `
    <dt>${escapeHtml(key)}</dt>
    <dd>${escapeHtml(value)}</dd>
  `).join('');
}

function renderWork() {
  const work = findWork();
  if (!work) {
    renderMissingWork();
    return null;
  }

  const source = work.source || '来源待复核';
  const image = document.querySelector('[data-work-image]');
  const articleSection = document.querySelector('[data-work-article-section]');
  const articleLink = document.querySelector('[data-work-article-link]');
  const articleTitle = document.querySelector('[data-work-article-title]');

  if (articleSection) articleSection.hidden = true;
  document.title = `Aleksi Lab / ${work.title}`;
  document.querySelector('.work-curation h2').textContent = handbookLabels.curation;
  document.querySelector('.work-process h2').textContent = handbookLabels.process;
  document.querySelector('[data-work-title]').textContent = work.title;
  document.querySelector('[data-work-source]').textContent = source;
  document.querySelector('[data-work-summary]').textContent = work.summary || work.intro || '';
  document.querySelector('[data-work-curation]').textContent = work.concept || work.summary || '';
  document.querySelector('[data-work-process]').innerHTML = renderProcess(work);
  document.querySelector('[data-work-meta-table]').innerHTML = renderMetaTable(work);
  const scoreMount = document.querySelector('[data-work-scores]');
  if (scoreMount) scoreMount.innerHTML = renderScores(work);
  document.querySelector('[data-work-tags]').innerHTML = (work.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');

  image.src = safeLocalAsset(work.heroImage || work.image || work.cover);
  image.alt = work.alt || work.title;
  image.loading = 'eager';

  if (articleSection && articleLink && (work.article || work.articleHref)) {
    const href = safeLocalHref(work.articleHref || articleHref(work.article));
    if (href) {
      articleSection.hidden = false;
      articleLink.href = href;
      articleLink.textContent = '打开文章';
      if (articleTitle) articleTitle.textContent = work.articleTitle || '这件作品有一篇配套手稿，用于说明它的版式逻辑和修订方向。';
    }
  }

  return work;
}

function initMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap) return;

  gsap.fromTo('.work-hero > *, .work-curation, .work-scores, .work-process, .work-meta-table, .work-related-article', {
    y: 14,
    autoAlpha: 0.72
  }, {
    y: 0,
    autoAlpha: 1,
    duration: 0.62,
    stagger: 0.045,
    ease: 'power2.out'
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavigation();
  if (renderWork()) initMotion();
});
