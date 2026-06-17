const works = window.ALEKSI_WORKS || [];

const compactLayout = [
  { x: -460, y: -106, r: -7, s: 1 },
  { x: -304, y: -156, r: 5, s: 1 },
  { x: -148, y: -114, r: -3, s: 1 },
  { x: 8, y: -160, r: 6, s: 1 },
  { x: 164, y: -102, r: -5, s: 1 },
  { x: 320, y: -142, r: 4, s: 1 },
  { x: 476, y: -92, r: -4, s: 1 },
  { x: -396, y: 148, r: 5, s: 1 },
  { x: -240, y: 106, r: -6, s: 1 },
  { x: -84, y: 152, r: 3, s: 1 },
  { x: 72, y: 114, r: -2, s: 1 },
  { x: 228, y: 156, r: 6, s: 1 },
  { x: 384, y: 112, r: -5, s: 1 }
];

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
    const label = escapeHtml(item.label || '');
    const file = href.replace('./', '').split('#')[0].split('?')[0] || 'index.html';
    return `
      <a class="nav-link letter-swap${file === current ? ' is-active' : ''}" href="${href}" data-text="${label}"${file === current ? ' aria-current="page"' : ''}>
        <span>${label}</span>
      </a>
    `;
  }).join('');
}

function workTitleDisplay(work) {
  return work.titleDisplay || work.shortTitle || work.title;
}

function cardPalette(work, index) {
  const palettes = [
    { bg: '#191a15', fg: '#f2f0e8', muted: 'rgba(199,194,182,.68)' },
    { bg: '#202119', fg: '#f2f0e8', muted: 'rgba(199,194,182,.66)' },
    { bg: '#1b211d', fg: '#f2f0e8', muted: 'rgba(199,194,182,.64)' },
    { bg: '#211b18', fg: '#f2f0e8', muted: 'rgba(199,194,182,.66)' },
    { bg: '#191d21', fg: '#f2f0e8', muted: 'rgba(199,194,182,.64)' }
  ];
  return palettes[index % palettes.length];
}

function normalizeMediaMode(value) {
  if (value === 'tiny-source' || value === 'fragment') return 'fragment';
  if (value === 'portrait' || value === 'poster' || value === 'tall') return 'poster';
  if (value === 'square') return 'square';
  return 'landscape';
}

function renderExhibitionWorks(items = works) {
  const stage = document.querySelector('[data-exhibition-stage]');
  if (!stage) return;

  stage.innerHTML = items.map((work, index) => {
    const titleDisplay = workTitleDisplay(work);
    const isTwoLine = titleDisplay.includes('\n') || titleDisplay.length > 16;
    const titleTopCompact = isTwoLine ? 208 : 238;
    const descTopExpanded = isTwoLine ? 314 : 280;
    const palette = cardPalette(work, index);
    const mediaMode = normalizeMediaMode(work.mediaMode || work.detailMode);
    const image = work.thumb || work.thumbnail || work.cover;
    const href = work.detailUrl || work.href || `./work-detail.html?work=${encodeURIComponent(work.slug)}`;
    const loading = index < 2 ? 'eager' : 'lazy';

    return `
      <article
        class="exhibition-card is-${escapeHtml(mediaMode)}"
        data-media-mode="${escapeHtml(mediaMode)}"
        data-work-card
        data-id="${escapeHtml(work.slug)}"
        tabindex="0"
        aria-expanded="false"
        style="
          --card-bg: ${palette.bg};
          --card-fg: ${palette.fg};
          --card-muted: ${palette.muted};
          --title-top-compact: ${titleTopCompact}px;
          --desc-top-expanded: ${descTopExpanded}px;
        "
      >
        <div class="exhibition-card__image-window">
          <div class="exhibition-card__image-inner">
            <img src="${image}" alt="${escapeHtml(work.alt || work.title)}" loading="${loading}" decoding="async">
          </div>
        </div>
        <h2 class="exhibition-card__title">${escapeHtml(titleDisplay)}</h2>
        <div class="exhibition-card__desc">
          <p>${escapeHtml(work.summary || work.intro || '')}</p>
          <div class="exhibition-card__meta">
            <span>${escapeHtml(work.source || '来源待复核')}</span>
            <span>${escapeHtml(work.medium || work.category || '')}</span>
          </div>
          <a class="exhibition-card__link" href="${href}">进入作品</a>
        </div>
      </article>
    `;
  }).join('');

  layoutCompactCards(stage);
  bindExhibitionInteractions(stage);
}

function isMobileLayout() {
  return window.matchMedia('(max-width: 760px)').matches;
}

function setCardVars(card, vars) {
  Object.entries(vars).forEach(([key, value]) => {
    card.style.setProperty(`--${key}`, value);
  });
}

function clearMotionVars(card) {
  ['x', 'y', 'rot', 'scale', 'opacity', 'z', 'hover-y'].forEach((key) => {
    card.style.removeProperty(`--${key}`);
  });
}

function layoutCompactCards(stage) {
  const cards = Array.from(stage.querySelectorAll('[data-work-card]'));
  cards.forEach((card, index) => {
    const pos = compactLayout[index % compactLayout.length];
    card.classList.remove('is-active', 'is-inactive');
    card.setAttribute('aria-expanded', 'false');
    card.style.removeProperty('left');
    card.style.removeProperty('top');
    card.style.removeProperty('margin-left');
    card.style.removeProperty('transform');
    card.style.removeProperty('z-index');

    if (isMobileLayout()) {
      clearMotionVars(card);
      return;
    }

    setCardVars(card, {
      x: `${pos.x}px`,
      y: `${pos.y}px`,
      rot: `${pos.r}deg`,
      scale: String(pos.s || 1),
      opacity: '1',
      z: String(10 + index),
      'hover-y': '0px'
    });
  });
}

function bindExhibitionInteractions(stage) {
  let activeId = null;
  const cards = Array.from(stage.querySelectorAll('[data-work-card]'));

  cards.forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      const id = card.dataset.id;
      activeId = activeId === id ? null : id;
      updateExhibitionState(stage, activeId);
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const id = card.dataset.id;
        activeId = activeId === id ? null : id;
        updateExhibitionState(stage, activeId);
      }
    });
  });

  stage.addEventListener('click', (event) => {
    if (!event.target.closest('[data-work-card]')) {
      activeId = null;
      updateExhibitionState(stage, activeId);
    }
  });

  window.addEventListener('resize', () => {
    updateExhibitionState(stage, activeId);
  });
}

function updateExhibitionState(stage, activeId) {
  const cards = Array.from(stage.querySelectorAll('[data-work-card]'));
  stage.classList.toggle('has-active-card', Boolean(activeId));

  if (!activeId) {
    layoutCompactCards(stage);
    return;
  }

  const inactiveCards = cards.filter((candidate) => candidate.dataset.id !== activeId);
  const dockGap = Math.max(58, Math.min(76, Math.floor(stage.clientWidth / Math.max(inactiveCards.length + 2, 1))));
  const dockTotal = (inactiveCards.length - 1) * dockGap;

  cards.forEach((card, index) => {
    const isActive = card.dataset.id === activeId;
    const isInactive = Boolean(activeId && !isActive);
    card.classList.toggle('is-active', isActive);
    card.classList.toggle('is-inactive', isInactive);
    card.setAttribute('aria-expanded', String(isActive));
    card.style.removeProperty('left');
    card.style.removeProperty('top');
    card.style.removeProperty('margin-left');
    card.style.removeProperty('transform');
    card.style.removeProperty('z-index');

    if (isMobileLayout()) {
      clearMotionVars(card);
      return;
    }

    if (isActive) {
      setCardVars(card, {
        x: '0px',
        y: '-76px',
        rot: '0deg',
        scale: '1',
        opacity: '1',
        z: '40',
        'hover-y': '0px'
      });
      return;
    }

    const dockIndex = inactiveCards.indexOf(card);
    const dockX = -dockTotal / 2 + dockIndex * dockGap;
    const dockRot = [-5, 3, -2, 5, -4, 2][dockIndex % 6];
    setCardVars(card, {
      x: `${dockX}px`,
      y: '252px',
      rot: `${dockRot}deg`,
      scale: '.72',
      opacity: '.42',
      z: String(5 + index),
      'hover-y': '0px'
    });
  });
}

function renderIndex() {
  const index = document.querySelector('[data-works-index]');
  if (!index) return;
  index.innerHTML = works.map((work, itemIndex) => `
    <a class="index-row work-index-row" href="${work.detailUrl || work.href}" data-reveal>
      <span class="index-row-kicker">${String(itemIndex + 1).padStart(2, '0')} / ${escapeHtml(work.date)}</span>
      <strong class="index-row-title">${escapeHtml(work.title)}</strong>
      <p class="index-row-copy">${escapeHtml(work.source || '来源待复核')} / ${escapeHtml(work.medium || work.category)}</p>
      <em class="row-action">进入 →</em>
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
  mm.add('(prefers-reduced-motion: reduce)', (context) => {
    if (context.conditions) return;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavigation();
  renderExhibitionWorks();
  renderIndex();
  initMotion();
});
