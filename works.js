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
      <a class="nav-link${file === current ? ' is-active' : ''}" href="${href}"${file === current ? ' aria-current="page"' : ''}>${label}</a>
    `;
  }).join('');
}

function workTitleDisplay(work) {
  return work.titleDisplay || work.shortTitle || work.title;
}

function cardPalette(work, index) {
  // v1.7.0: keep the exhibition wall in one warm charcoal family.
  // The previous green / blue tinted cards made the wall feel muddy and visually noisy.
  const palettes = [
    { bg: '#171711', fg: '#f2f0e8', muted: 'rgba(202,197,185,.72)' },
    { bg: '#1a1913', fg: '#f2f0e8', muted: 'rgba(202,197,185,.70)' },
    { bg: '#181812', fg: '#f2f0e8', muted: 'rgba(202,197,185,.68)' },
    { bg: '#1c1a14', fg: '#f2f0e8', muted: 'rgba(202,197,185,.70)' },
    { bg: '#161711', fg: '#f2f0e8', muted: 'rgba(202,197,185,.68)' }
  ];
  return palettes[index % palettes.length];
}

function clampCardCopy(value, max = 62) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
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
    const titleTopCompact = isTwoLine ? 206 : 234;
    const palette = cardPalette(work, index);
    const mediaMode = normalizeMediaMode(work.mediaMode || work.detailMode);
    const isPosterLike = mediaMode === 'poster' || mediaMode === 'fragment';
    const titleTopExpanded = isPosterLike ? (isTwoLine ? 252 : 276) : (isTwoLine ? 232 : 250);
    const descTopExpanded = isPosterLike ? (isTwoLine ? 342 : 326) : (isTwoLine ? 318 : 300);
    const image = work.thumb || work.thumbnail || work.cover;
    const cardCopy = clampCardCopy(work.cardSummary || work.summary || work.intro || '');
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
          --title-top-expanded: ${titleTopExpanded}px;
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
          <p>${escapeHtml(cardCopy)}</p>
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
  ['x', 'y', 'rot', 'scale', 'opacity', 'z', 'hover-y', 'motion-delay'].forEach((key) => {
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
      'hover-y': '0px',
      'motion-delay': '0ms'
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
      updateExhibitionState(stage, activeId, { animate: true });
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const id = card.dataset.id;
        activeId = activeId === id ? null : id;
        updateExhibitionState(stage, activeId, { animate: true });
      }
    });
  });

  stage.addEventListener('click', (event) => {
    if (!event.target.closest('[data-work-card]')) {
      activeId = null;
      updateExhibitionState(stage, activeId, { animate: true });
    }
  });

  window.addEventListener('resize', () => {
    updateExhibitionState(stage, activeId, { animate: false });
  });
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function snapshotCardMotion(cards) {
  const snapshot = new Map();
  cards.forEach((card) => {
    const style = window.getComputedStyle(card);
    snapshot.set(card, {
      transform: style.transform === 'none' ? 'none' : style.transform,
      opacity: style.opacity || '1',
      filter: style.filter === 'none' ? 'none' : style.filter
    });
  });
  return snapshot;
}

function playInterfaceCraftSelectionMotion(stage, cards, before, activeId) {
  if (!before || isMobileLayout() || prefersReducedMotion()) return;

  const animations = [];
  stage.classList.add('is-motion-running');

  cards.forEach((card) => {
    const prior = before.get(card);
    if (!prior) return;

    card.getAnimations().forEach((animation) => animation.cancel());

    const current = window.getComputedStyle(card);
    const isActive = card.dataset.id === activeId;
    const duration = isActive ? 820 : 680;
    const delay = isActive ? 0 : 40;
    const easing = isActive ? 'cubic-bezier(.16, 1, .3, 1)' : 'cubic-bezier(.22, 1, .36, 1)';

    const animation = card.animate([
      {
        transform: prior.transform,
        opacity: prior.opacity,
        filter: prior.filter
      },
      {
        transform: current.transform === 'none' ? 'none' : current.transform,
        opacity: current.opacity || '1',
        filter: current.filter === 'none' ? 'none' : current.filter
      }
    ], {
      duration,
      delay,
      easing,
      fill: 'both'
    });

    animations.push(animation.finished.catch(() => {}));
    animation.addEventListener('finish', () => animation.cancel(), { once: true });
  });

  Promise.all(animations).then(() => {
    stage.classList.remove('is-motion-running');
  });
}

function applyExhibitionState(stage, activeId) {
  const cards = Array.from(stage.querySelectorAll('[data-work-card]'));
  stage.classList.toggle('has-active-card', Boolean(activeId));

  if (!activeId) {
    layoutCompactCards(stage);
    return cards;
  }

  const inactiveCards = cards.filter((candidate) => candidate.dataset.id !== activeId);
  const dockGap = Math.max(64, Math.min(82, Math.floor(stage.clientWidth / Math.max(inactiveCards.length + 2, 1))));
  const dockTotal = (inactiveCards.length - 1) * dockGap;

  cards.forEach((card, index) => {
    const isActive = card.dataset.id === activeId;
    const isInactive = Boolean(activeId && !isActive);
    card.classList.toggle('is-active', isActive);
    card.classList.toggle('is-inactive', isInactive);
    card.setAttribute('aria-expanded', String(isActive));
    card.setAttribute('aria-selected', String(isActive));
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
        y: '-112px',
        rot: '0deg',
        scale: '1',
        opacity: '1',
        z: '60',
        'hover-y': '0px',
        'motion-delay': '0ms'
      });
      return;
    }

    const dockIndex = inactiveCards.indexOf(card);
    const dockX = -dockTotal / 2 + dockIndex * dockGap;
    const dockRot = [-6, 4, -3, 5, -5, 3, -2][dockIndex % 7];
    const dockY = 322 + Math.abs(dockIndex - inactiveCards.length / 2) * 2;
    setCardVars(card, {
      x: `${dockX}px`,
      y: `${dockY}px`,
      rot: `${dockRot}deg`,
      scale: '.68',
      opacity: '.30',
      z: String(5 + index),
      'hover-y': '0px',
      'motion-delay': `${Math.min(170, dockIndex * 18)}ms`
    });
  });

  return cards;
}

function updateExhibitionState(stage, activeId, options = {}) {
  // v1.7.1: the card transform is declared in CSS with !important, so WAAPI cannot reliably
  // override it. Let the CSS transform transition animate the custom-property state change
  // directly. This is the actual Works exhibition card selected motion.
  const shouldAnimate = options.animate !== false && !isMobileLayout() && !prefersReducedMotion();

  if (shouldAnimate) {
    stage.classList.add('is-motion-running');
    window.clearTimeout(stage.__motionTimer);
  }

  applyExhibitionState(stage, activeId);

  if (shouldAnimate) {
    stage.__motionTimer = window.setTimeout(() => {
      stage.classList.remove('is-motion-running');
    }, 920);
  } else {
    stage.classList.remove('is-motion-running');
  }
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
