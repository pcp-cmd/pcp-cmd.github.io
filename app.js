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

function hrefForArtifact(item) {
  return item.href || articleHref(item.source);
}

function linkList(items) {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  return items.map((item) => {
    const href = item.href || './index.html';
    const label = escapeHtml(item.label || '');
    const file = href.replace('./', '').split('#')[0].split('?')[0] || 'index.html';
    const active = file === current || (current === '' && file === 'index.html');
    return `<a class="nav-link${active ? ' is-active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
}

function renderNavigation() {
  const desktopNav = document.querySelector('.desktop-nav');
  if (desktopNav && Array.isArray(content.nav)) desktopNav.innerHTML = linkList(content.nav);
}

function renderHeroCopy() {
  const hero = content.hero || {};
  const eyebrow = document.querySelector('.hero-copy .eyebrow');
  const cn = document.querySelector('.hero-cn');
  const lede = document.querySelector('.hero-lede');
  const support = document.querySelector('.hero-support');
  if (eyebrow) eyebrow.textContent = hero.eyebrow || 'PERSONAL LAB / INDEX';
  if (cn) cn.textContent = hero.cn || 'Learning, making, and revision.';
  if (lede) lede.textContent = hero.lede || '学习、创作与 AI 协作的长期实验室。';
  if (support) support.textContent = hero.note || '把学习、创作与反馈，修订成可复用的结构。';
}

function renderGuideRows() {
  const rows = document.querySelector('[data-guide-rows]');
  if (!rows) return;

  rows.innerHTML = (content.homeGuideRows || []).map((item) => `
    <a class="guide-row" href="${item.href}" data-reveal>
      <span class="guide-row-no">${item.no} / ${item.label}</span>
      <strong class="guide-row-title">${item.title}</strong>
      <p>${item.description}</p>
      <em>${item.action} →</em>
    </a>
  `).join('');
}

function mediaClass(index) {
  return ['is-heather', 'is-sky', 'is-peach'][index % 3];
}

function artifactGlyph(item, index) {
  const glyphs = ['⌁', '∴', '◇'];
  return item.glyph || glyphs[index % glyphs.length];
}

function renderSelectedArtifacts() {
  const grid = document.querySelector('[data-selected-artifacts]');
  if (!grid) return;

  grid.innerHTML = (content.selectedArtifacts || []).slice(0, 3).map((item, index) => `
    <a class="selected-artifact-card claude-card" href="${hrefForArtifact(item)}" data-reveal>
      ${item.image ? `
        <figure>
          <div class="card-media ${mediaClass(index)}">
            <img src="${item.image}" alt="${item.imageAlt}" loading="lazy">
          </div>
        </figure>
      ` : `
        <figure>
          <div class="card-media ${mediaClass(index)} artifact-glyph" aria-hidden="true">${artifactGlyph(item, index)}</div>
        </figure>
      `}
      <div class="selected-artifact-body">
        <div class="selected-artifact-meta claude-card-meta">
          <span>${item.type}</span>
          <span>${item.status}</span>
        </div>
        <h3 class="card-title claude-card-title">${item.title}</h3>
        <p class="claude-card-body">${item.body}</p>
      </div>
    </a>
  `).join('');
}

function startSelectedCarousel() {
  const grid = document.querySelector('[data-selected-artifacts]');
  if (!grid || grid.children.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let index = 0;
  let paused = false;
  const cards = Array.from(grid.children);

  const advance = () => {
    if (paused || !cards.length) return;
    index = (index + 1) % cards.length;
    grid.scrollTo({ left: cards[index].offsetLeft - grid.offsetLeft, behavior: 'smooth' });
  };

  const timer = setInterval(advance, 4200);
  grid.addEventListener('mouseenter', () => { paused = true; });
  grid.addEventListener('mouseleave', () => { paused = false; });
  grid.addEventListener('focusin', () => { paused = true; });
  grid.addEventListener('focusout', () => { paused = false; });
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
}

function renderArchiveLinks() {
  const list = document.querySelector('[data-archive-links]');
  if (!list) return;

  list.innerHTML = (content.archiveLinks || []).map((item) => `
    <a class="archive-link-item" href="${item.href}" data-reveal>
      <span>${item.label}</span>
      <em>→</em>
    </a>
  `).join('');
}

function revealWithoutGSAP() {
  document.documentElement.classList.add('no-gsap');
  document.querySelectorAll('[data-reveal]').forEach((item) => item.classList.add('is-visible'));
}

function initMotion() {
  if (!window.gsap) {
    revealWithoutGSAP();
    return;
  }

  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add({
    isMobile: '(max-width: 720px)',
    reduceMotion: '(prefers-reduced-motion: reduce)'
  }, (context) => {
    const { isMobile, reduceMotion } = context.conditions;
    if (reduceMotion) {
      gsap.set('[data-reveal], .hero-copy > *, .hero-card', { y: 0, autoAlpha: 1 });
      return;
    }

    gsap.fromTo('.hero-copy > *, .hero-card', {
      y: isMobile ? 0 : 10,
      autoAlpha: isMobile ? 1 : 0.72
    }, {
      y: 0,
      autoAlpha: 1,
      duration: 0.86,
      stagger: 0.045,
      ease: 'power2.out'
    });

    if (window.ScrollTrigger) {
      ScrollTrigger.batch('main [data-reveal]', {
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

renderNavigation();
renderHeroCopy();
renderGuideRows();
renderSelectedArtifacts();
startSelectedCarousel();
renderArchiveLinks();
initMotion();
