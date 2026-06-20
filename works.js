const works = window.ALEKSI_WORKS || [];
let exhibitionInteractionCleanup = null;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function safeLocalHref(value, fallback = './works.html') {
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

function renderNavigation() {
  const nav = document.querySelector('.desktop-nav');
  const items = window.ALEKSI_CONTENT && window.ALEKSI_CONTENT.nav;
  if (!nav || !Array.isArray(items)) return;

  const current = window.location.pathname.split('/').pop() || 'works.html';
  nav.innerHTML = items.map((item) => {
    const href = item.href || './index.html';
    const label = escapeHtml(item.label || '');
    const file = href.replace('./', '').split('#')[0].split('?')[0] || 'index.html';
    const active = file === current;
    return `<a class="nav-link${active ? ' is-active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
}

function workTitleDisplay(work) {
  return work.titleDisplay || work.shortTitle || work.title || '';
}

function desktopSlot(index, count, width) {
  const columns = Math.min(7, Math.max(4, Math.floor(width / 190)));
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  const usableWidth = Math.min(width - 80, 1240);
  const gapX = columns > 1 ? usableWidth / (columns - 1) : 0;
  const x = -usableWidth / 2 + column * gapX;
  const rowGap = rows > 1 ? 270 : 0;
  const y = (row - (rows - 1) / 2) * rowGap + (column % 2 ? -24 : 18);
  const rotationPattern = [-6, 4, -3, 5, -5, 3, -2];
  return { x, y, rotate: rotationPattern[index % rotationPattern.length] };
}

function renderExhibitionWorks(items = works) {
  const stage = document.querySelector('[data-exhibition-stage]');
  if (!stage) return;

  stage.innerHTML = items.map((work, index) => {
    const title = workTitleDisplay(work);
    const summary = work.cardSummary || work.summary || work.intro || '';
    const source = work.source || '来源待复核';
    const image = work.thumb;
    const ctaLabel = work.hasArticle ? '打开阅读' : '查看作品';
    const ctaHref = safeLocalHref(
      work.hasArticle ? work.articleHref : work.detailUrl,
      './works.html'
    );
    const loading = index < 2 ? 'eager' : 'lazy';

    return `
      <article
        class="exhibition-card"
        data-work-card
        data-id="${escapeHtml(work.slug)}"
      >
        <div class="exhibition-card__media">
          <img
            class="exhibition-card__img"
            src="${escapeHtml(image)}"
            alt="${escapeHtml(work.alt || work.title)}"
            loading="${loading}"
            decoding="async"
          >
        </div>
        <div class="exhibition-card__body">
          <p class="exhibition-card__source">${escapeHtml(source)}</p>
          <h2 class="exhibition-card__title">${escapeHtml(title)}</h2>
          <p class="exhibition-card__summary">${escapeHtml(summary)}</p>
          <div class="exhibition-card__actions">
            <button type="button" class="exhibition-card__toggle" aria-expanded="false" aria-label="聚焦作品：${escapeHtml(title)}">聚焦</button>
            <a class="exhibition-card__cta" href="${escapeHtml(ctaHref)}">${ctaLabel}</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  bindImageFallbacks(stage);
  bindExhibitionInteractions(stage);
  positionDesktopCards(stage);
}

function bindImageFallbacks(stage) {
  stage.querySelectorAll('.exhibition-card__img').forEach((image) => {
    image.addEventListener('error', () => {
      image.closest('[data-work-card]')?.classList.add('has-image-fallback');
      image.removeAttribute('src');
    }, { once: true });
  });
}

function positionDesktopCards(stage) {
  const cards = Array.from(stage.querySelectorAll('[data-work-card]'));
  const isDesktop = window.matchMedia('(min-width: 1180px)').matches;

  stage.style.removeProperty('--stage-height');
  cards.forEach((card, index) => {
    if (!isDesktop) {
      card.style.removeProperty('--x');
      card.style.removeProperty('--y');
      card.style.removeProperty('--rotate');
      card.style.removeProperty('--stack');
      return;
    }

    const slot = desktopSlot(index, cards.length, stage.clientWidth);
    card.style.setProperty('--x', `${slot.x}px`);
    card.style.setProperty('--y', `${slot.y}px`);
    card.style.setProperty('--rotate', `${slot.rotate}deg`);
    card.style.setProperty('--stack', `${cards.length - index}`);
  });

  if (isDesktop) {
    const columns = Math.min(7, Math.max(4, Math.floor(stage.clientWidth / 190)));
    const rows = Math.ceil(cards.length / columns);
    stage.style.setProperty('--stage-height', `${rows * 270 + 180}px`);
  }
}

function applySelection(stage, activeId) {
  const cards = Array.from(stage.querySelectorAll('[data-work-card]'));
  stage.classList.toggle('has-active-card', Boolean(activeId));

  cards.forEach((card) => {
    const active = card.dataset.id === activeId;
    const muted = Boolean(activeId) && !active;
    const toggle = card.querySelector('.exhibition-card__toggle');
    const title = card.querySelector('.exhibition-card__title')?.textContent.trim() || '';
    card.classList.toggle('is-active', active);
    card.classList.toggle('is-muted', muted);
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(active));
      toggle.setAttribute('aria-label', `${active ? '取消聚焦' : '聚焦作品'}：${title}`);
      toggle.textContent = active ? '取消聚焦' : '聚焦';
    }
  });
}

function bindExhibitionInteractions(stage) {
  if (exhibitionInteractionCleanup) exhibitionInteractionCleanup();

  let activeId = null;
  let resizeTimer = 0;
  let observer = null;
  let cleanedUp = false;

  const toggleCard = (card) => {
    activeId = activeId === card.dataset.id ? null : card.dataset.id;
    applySelection(stage, activeId);
  };

  const clearSelection = () => {
    if (!activeId) return;
    activeId = null;
    applySelection(stage, activeId);
  };

  const handleStageClick = (event) => {
    if (event.target === stage) {
      clearSelection();
      return;
    }

    const card = event.target.closest('[data-work-card]');
    if (!card) return;
    if (event.target.closest('.exhibition-card__toggle')) {
      toggleCard(card);
      return;
    }
    if (event.target.closest('a, button')) return;
    toggleCard(card);
  };

  const handleDocumentKeydown = (event) => {
    if (event.key === 'Escape') clearSelection();
  };

  const schedulePositionUpdate = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => positionDesktopCards(stage), 80);
  };

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    window.clearTimeout(resizeTimer);
    stage.removeEventListener('click', handleStageClick);
    document.removeEventListener('keydown', handleDocumentKeydown);
    window.removeEventListener('resize', schedulePositionUpdate);
    window.removeEventListener('pagehide', cleanup);
    if (observer) observer.disconnect();
    if (exhibitionInteractionCleanup === cleanup) exhibitionInteractionCleanup = null;
  };

  stage.addEventListener('click', handleStageClick);
  document.addEventListener('keydown', handleDocumentKeydown);
  window.addEventListener('pagehide', cleanup);

  if ('ResizeObserver' in window) {
    observer = new ResizeObserver(schedulePositionUpdate);
    observer.observe(stage);
  } else {
    window.addEventListener('resize', schedulePositionUpdate);
  }

  exhibitionInteractionCleanup = cleanup;
  return cleanup;
}

function renderIndex() {
  const index = document.querySelector('[data-works-index]');
  if (!index) return;

  index.innerHTML = works.map((work, itemIndex) => `
    <a class="index-row work-index-row" href="${escapeHtml(safeLocalHref(work.detailUrl || work.href, './works.html'))}" data-reveal>
      <span class="index-row-kicker">${String(itemIndex + 1).padStart(2, '0')} / ${escapeHtml(work.date)}</span>
      <strong class="index-row-title">${escapeHtml(work.title)}</strong>
      <p class="index-row-copy">${escapeHtml(work.source || '来源待复核')} / ${escapeHtml(work.medium || work.category)}</p>
      <em class="row-action">进入 →</em>
    </a>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavigation();
  renderExhibitionWorks();
  renderIndex();
});
