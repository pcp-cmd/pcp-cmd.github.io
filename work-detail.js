const works = window.ALEKSI_WORKS || [];
const handbookLabels = {
  curation: '策展说明',
  process: '修订过程'
};

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
    return `
      <a class="nav-link letter-swap${active ? ' is-active' : ''}" href="${href}" data-text="${label}"${active ? ' aria-current="page"' : ''}>
        <span>${label}</span>
      </a>
    `;
  }).join('');
}

function articleHref(src) {
  return `./article.html?src=${encodeURIComponent(src)}`;
}

function workSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('work') || params.get('id');
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
  const labels = {
    concept: '概念',
    layout: '版式',
    typography: '文字',
    visual: '视觉',
    system: '系统',
    revision: '修订'
  };
  const scores = work.scores || {};
  return Object.entries(labels).map(([key, label]) => `
    <article class="score-item">
      <span>${escapeHtml(label)}</span>
      <strong>${Number(scores[key] || 0).toFixed(1)}</strong>
    </article>
  `).join('');
}

function renderMetaTable(work) {
  const qaLegacyFallback = 'Source pending review';
  const source = work.source || '来源待复核';
  const rows = [
    ['来源', source],
    ['媒介', work.medium || work.category || '数字图像 / 编辑排版研究'],
    ['工具', work.tools || 'AI 图像 / 编辑排版研究'],
    ['状态', work.status || '档案条目'],
    ['规格', work.format || qaLegacyFallback]
  ];

  return rows.map(([key, value]) => `
    <dt>${escapeHtml(key)}</dt>
    <dd>${escapeHtml(value)}</dd>
  `).join('');
}

function renderWork() {
  const slug = workSlugFromUrl();
  const work = works.find((item) => item.slug === slug) || works[0];
  if (!work) return;

  const source = work.source || '来源待复核';
  const image = document.querySelector('[data-work-image]');
  const articleSection = document.querySelector('[data-work-article-section]');
  const articleLink = document.querySelector('[data-work-article-link]');
  const articleTitle = document.querySelector('[data-work-article-title]');

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

  image.src = work.heroImage || work.image || work.cover;
  image.alt = work.alt || work.title;
  image.loading = 'eager';

  if (articleSection && articleLink && (work.article || work.articleHref)) {
    const href = work.articleHref || articleHref(work.article);
    articleSection.hidden = false;
    articleLink.href = href;
    articleLink.textContent = '打开文章';
    if (articleTitle) articleTitle.textContent = work.articleTitle || '这件作品有一篇配套手稿，用于说明它的版式逻辑和修订方向。';
  }
}

function initMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap) return;

  gsap.fromTo('.work-hero > *, .work-curation, .work-process, .work-meta-table, .work-related-article', {
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
  renderWork();
  initMotion();
});
