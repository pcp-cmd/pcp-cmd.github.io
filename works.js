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
  const current = window.location.pathname.split('/').pop() || 'works.html';
  nav.innerHTML = items.map((item) => {
    const href = item.href || './index.html';
    const file = href.replace('./', '').split('#')[0].split('?')[0] || 'index.html';
    return `<a class="nav-link${file === current ? ' is-active' : ''}" href="${href}">${item.label}</a>`;
  }).join('');
}

function mediaClass(index, work = {}) {
  const tone = ['is-peach', 'is-heather', 'is-sky'][index % 3];
  const mode = work.mediaMode ? ` is-${work.mediaMode}` : '';
  return `${tone}${mode}`;
}

function renderCarousel() {
  const carousel = document.querySelector('[data-works-carousel]');
  if (!carousel) return;
  const featuredWorks = works;

  carousel.innerHTML = featuredWorks.map((work, index) => `
    <a class="work-card claude-card" href="${work.href}" data-reveal>
      <figure class="work-card-figure">
        <div class="card-media ${mediaClass(index, work)}">
          <img src="${work.thumbnail || work.cover}" alt="${escapeHtml(work.alt)}" loading="${index < 3 ? 'eager' : 'lazy'}">
        </div>
      </figure>
      <div class="work-card-body">
        <div class="work-card-meta claude-card-meta">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <span>${escapeHtml(work.category)}</span>
        </div>
        <h2 class="card-title claude-card-title">${escapeHtml(work.shortTitle || work.title)}</h2>
        <p class="claude-card-body">${escapeHtml(work.intro || work.summary)}</p>
        <small>${escapeHtml(work.status)} / ${escapeHtml(work.format)}</small>
      </div>
    </a>
  `).join('');
}

function initWorksCarousel() {
  const carousel = document.querySelector('[data-works-carousel]');
  if (!carousel) return;
  const cards = Array.from(carousel.querySelectorAll('.work-card'));
  if (cards.length <= 1) return;

  let activeIndex = 0;
  let paused = false;

  function goTo(index) {
    activeIndex = (index + cards.length) % cards.length;
    const left = cards[activeIndex].offsetLeft - carousel.offsetLeft;
    carousel.scrollTo({ left, behavior: 'smooth' });
  }

  carousel.addEventListener('mouseenter', () => { paused = true; });
  carousel.addEventListener('mouseleave', () => { paused = false; });
  carousel.addEventListener('focusin', () => { paused = true; });
  carousel.addEventListener('focusout', () => { paused = false; });

  window.setInterval(() => {
    if (!paused && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      goTo(activeIndex + 1);
    }
  }, 4200);
}

function renderIndex() {
  const index = document.querySelector('[data-works-index]');
  if (!index) return;
  index.innerHTML = works.map((work, itemIndex) => `
    <a class="index-row work-index-row" href="${work.href}" data-reveal>
      <span class="index-row-kicker">${String(itemIndex + 1).padStart(2, '0')} / ${escapeHtml(work.date)}</span>
      <strong class="index-row-title">${escapeHtml(work.title)}</strong>
      <p class="index-row-copy">${escapeHtml(work.category)} · ${escapeHtml(work.status)}</p>
      <em class="row-action">打开 →</em>
    </a>
  `).join('');
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
      gsap.set('[data-reveal], .work-card', { y: 0, autoAlpha: 1 });
      return;
    }

    gsap.fromTo('.works-hero .section-kicker, .works-hero h1, .works-hero-copy > *', {
      y: isMobile ? 0 : 10,
      autoAlpha: isMobile ? 1 : 0.72
    }, {
      y: 0,
      autoAlpha: 1,
      duration: 0.78,
      stagger: 0.045,
      ease: 'power2.out'
    });

    if (window.ScrollTrigger) {
      ScrollTrigger.batch('[data-reveal]', {
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
  renderCarousel();
  initWorksCarousel();
  renderIndex();
  initMotion();
});
