const works = window.ALEKSI_WORKS || [];

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
    const file = href.replace('./', '').split('#')[0].split('?')[0] || 'index.html';
    const active = file === current || (current === 'work-detail.html' && file === 'works.html');
    return `<a class="nav-link${active ? ' is-active' : ''}" href="${href}">${item.label}</a>`;
  }).join('');
}

function articleHref(src) {
  return `./article.html?src=${encodeURIComponent(src)}`;
}

function listMarkup(items, className) {
  return (items || []).map((item, index) => `
    <article class="${className}" data-reveal>
      <span>${String(index + 1).padStart(2, '0')}</span>
      <p>${escapeHtml(item)}</p>
    </article>
  `).join('');
}

function scoreLabel(key) {
  return ({
    concept: '概念',
    layout: '版式',
    typography: '字体',
    visual: '视觉',
    system: '系统',
    revision: '修订潜力'
  })[key] || key;
}

function renderScores(scores) {
  if (!scores) return '<p class="empty-note">暂未评分。</p>';
  return Object.entries(scores).map(([key, value]) => {
    const score = Number(value) || 0;
    const percent = Math.max(0, Math.min(100, score * 10));
    return `
      <article class="score-item" data-reveal>
        <div class="score-item-head">
          <span>${escapeHtml(scoreLabel(key))}</span>
          <strong>${score.toFixed(1)}</strong>
        </div>
        <div class="score-meter" aria-hidden="true"><i style="width:${percent}%"></i></div>
      </article>
    `;
  }).join('');
}

function renderWork() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("work");
  const work = works.find((item) => item.slug === slug) || works[0];
  if (!work) return;

  document.title = `Aleksi Lab / ${work.title}`;
  document.querySelector('[data-work-title]').textContent = work.title;
  document.querySelector('[data-work-summary]').textContent = work.intro || work.summary;
  document.querySelector('[data-work-category]').textContent = work.category;
  document.querySelector('[data-work-status]').textContent = work.status;
  document.querySelector('[data-work-format]').textContent = work.format;
  document.querySelector('[data-work-concept]').textContent = work.concept;

  const scoreTarget = document.querySelector('[data-work-scores]');
  if (scoreTarget) scoreTarget.innerHTML = renderScores(work.scores);

  const articleSection = document.querySelector('[data-work-article-section]');
  const articleLink = document.querySelector('[data-work-article-link]');
  const articleTitle = document.querySelector('[data-work-article-title]');
  if (articleSection && articleLink && (work.article || work.articleHref)) {
    const href = work.articleHref || articleHref(work.article);
    articleSection.hidden = false;
    articleLink.href = href;
    articleLink.textContent = '打开文章 →';
    if (articleTitle) articleTitle.textContent = work.articleTitle || '这件作品有一篇配套文章，用于说明它的版式逻辑和修订方向。';
  }

  const image = document.querySelector('[data-work-image]');
  image.src = work.heroImage || work.image || work.cover;
  image.alt = work.alt;
  const figure = image.closest('.work-detail-figure');
  if (figure) {
    const isTiny = work.detailMode === 'tiny-source' || /thumbnail|source|trace|缩略|低分辨率/i.test(`${work.status} ${work.format}`);
    const isLandscape = work.detailMode === 'landscape' || /1920 x 1080|横幅/i.test(`${work.format} ${work.category}`);
    figure.classList.toggle('is-fragment', isTiny);
    figure.classList.toggle('is-tiny-source', isTiny);
    figure.classList.toggle('is-landscape', isLandscape);
    figure.querySelector('.work-source-note')?.remove();
    if (isTiny) {
      const note = document.createElement('figcaption');
      note.className = 'work-source-note';
      note.textContent = '低分辨率档案痕迹：这张图保留为过程证据，不作为最终高清作品展示。';
      figure.appendChild(note);
    }
  }

  document.querySelector('[data-work-tags]').innerHTML = (work.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  document.querySelector('[data-work-review]').innerHTML = listMarkup(work.gptReview, 'review-item');
  document.querySelector('[data-work-layout]').innerHTML = listMarkup(work.layoutNotes, 'layout-note');
  document.querySelector('[data-work-visual-system]').innerHTML = listMarkup(work.visualSystem, 'work-note');
  document.querySelector('[data-work-revision]').innerHTML = listMarkup(work.revisionNext, 'work-note');

  const related = document.querySelector('[data-related-work-link]');
  related.href = work.relatedHref;
  related.textContent = '打开相关页面';
}

function initMotion() {
  if (!window.gsap) {
    document.documentElement.classList.add('no-gsap');
    return;
  }
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add({
    reduceMotion: '(prefers-reduced-motion: reduce)',
    isMobile: '(max-width: 720px)'
  }, (context) => {
    const { reduceMotion, isMobile } = context.conditions;
    if (reduceMotion) {
      gsap.set('[data-reveal], .work-detail-figure img', { y: 0, autoAlpha: 1, scale: 1, clearProps: 'transform,visibility' });
      return;
    }

    gsap.timeline({ defaults: { ease: 'power2.out' } })
      .fromTo('.work-detail-meta', { y: isMobile ? 0 : 10, autoAlpha: isMobile ? 1 : 0.7 }, { y: 0, autoAlpha: 1, duration: 0.72 })
      .fromTo('.work-detail-hero > *', { y: 12, autoAlpha: 0.7 }, { y: 0, autoAlpha: 1, duration: 0.78, stagger: 0.045 }, '-=0.36')
      .fromTo('.work-detail-figure', { y: 14, autoAlpha: 0.74 }, { y: 0, autoAlpha: 1, duration: 0.9 }, '-=0.42');

    if (window.ScrollTrigger) {
      ScrollTrigger.batch('.work-detail-section [data-reveal], .work-detail-section', {
        start: 'top 88%',
        once: true,
        batchMax: isMobile ? 2 : 4,
        onEnter: (batch) => gsap.to(batch, {
          y: 0,
          autoAlpha: 1,
          duration: 0.72,
          stagger: 0.035,
          overwrite: true
        })
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavigation();
  renderWork();
  initMotion();
});
