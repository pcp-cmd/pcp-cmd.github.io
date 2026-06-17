const works = window.ALEKSI_WORKS || [];

const cardPositions = [
  [-460, -106, -7], [-304, -156, 5], [-148, -114, -3], [8, -160, 6],
  [164, -102, -5], [320, -142, 4], [476, -92, -4], [-396, 148, 5],
  [-240, 106, -6], [-84, 152, 3], [72, 114, -2], [228, 156, 6], [384, 112, -5]
];

const palettes = [
  ['#191a15', '#f2f0e8', 'rgba(199,194,182,.68)'],
  ['#202119', '#f2f0e8', 'rgba(199,194,182,.66)'],
  ['#1b211d', '#f2f0e8', 'rgba(199,194,182,.64)'],
  ['#211b18', '#f2f0e8', 'rgba(199,194,182,.66)'],
  ['#191d21', '#f2f0e8', 'rgba(199,194,182,.64)']
];

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
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
    const active = file === current;
    return `<a class="nav-link${active ? ' is-active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
}

function mediaMode(work) {
  const value = work.mediaMode || work.detailMode || 'landscape';
  if (['tiny-source', 'fragment'].includes(value)) return 'fragment';
  if (['portrait', 'poster', 'tall'].includes(value)) return 'poster';
  if (value === 'square') return 'square';
  return 'landscape';
}

function setVars(card, vars) {
  Object.entries(vars).forEach(([key, value]) => card.style.setProperty(`--${key}`, value));
}

function isMobile() {
  return window.matchMedia('(max-width: 760px)').matches;
}

function layoutCards(activeId = null) {
  const stage = document.querySelector('[data-exhibition-stage]');
  if (!stage) return;
  const cards = [...stage.querySelectorAll('[data-work-card]')];
  stage.classList.toggle('has-active-card', Boolean(activeId));

  if (isMobile()) {
    cards.forEach((card) => card.removeAttribute('style'));
    return;
  }

  const inactive = cards.filter((card) => card.dataset.id !== activeId);
  const gap = Math.max(58, Math.min(76, Math.floor(stage.clientWidth / Math.max(inactive.length + 2, 1))));
  const total = (inactive.length - 1) * gap;

  cards.forEach((card, index) => {
    const active = activeId && card.dataset.id === activeId;
    card.classList.toggle('is-active', Boolean(active));
    card.classList.toggle('is-inactive', Boolean(activeId && !active));
    card.setAttribute('aria-expanded', String(Boolean(active)));

    if (!activeId) {
      const [x, y, r] = cardPositions[index % cardPositions.length];
      setVars(card, { x: `${x}px`, y: `${y}px`, rot: `${r}deg`, scale: '1', opacity: '1', z: String(10 + index) });
      return;
    }

    if (active) {
      setVars(card, { x: '0px', y: '-76px', rot: '0deg', scale: '1', opacity: '1', z: '40' });
      return;
    }

    const dockIndex = inactive.indexOf(card);
    const dockX = -total / 2 + dockIndex * gap;
    const dockRot = [-5, 3, -2, 5, -4, 2][dockIndex % 6];
    setVars(card, { x: `${dockX}px`, y: '252px', rot: `${dockRot}deg`, scale: '.72', opacity: '.42', z: String(5 + index) });
  });
}

function renderExhibitionWorks() {
  const stage = document.querySelector('[data-exhibition-stage]');
  if (!stage) return;

  stage.innerHTML = works.map((work, index) => {
    const [bg, fg, muted] = palettes[index % palettes.length];
    const title = work.titleDisplay || work.shortTitle || work.title;
    const mode = mediaMode(work);
    const image = work.thumb || work.thumbnail || work.cover;
    const href = work.detailUrl || work.href || `./work-detail.html?work=${encodeURIComponent(work.slug)}`;
    return `
      <article class="exhibition-card is-${escapeHtml(mode)}" data-work-card data-id="${escapeHtml(work.slug)}" tabindex="0" aria-expanded="false" style="--card-bg:${bg};--card-fg:${fg};--card-muted:${muted};">
        <div class="exhibition-card__image-window"><div class="exhibition-card__image-inner"><img src="${image}" alt="${escapeHtml(work.alt || work.title)}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async"></div></div>
        <h2 class="exhibition-card__title">${escapeHtml(title)}</h2>
        <div class="exhibition-card__desc">
          <p>${escapeHtml(work.summary || work.intro || '')}</p>
          <div class="exhibition-card__meta"><span>${escapeHtml(work.source || '来源待复核')}</span><span>${escapeHtml(work.medium || work.category || '')}</span></div>
          <a class="exhibition-card__link" href="${href}">进入作品</a>
        </div>
      </article>`;
  }).join('');

  let activeId = null;
  stage.addEventListener('click', (event) => {
    const card = event.target.closest('[data-work-card]');
    if (!card) {
      activeId = null;
      layoutCards(activeId);
      return;
    }
    if (event.target.closest('a')) return;
    activeId = activeId === card.dataset.id ? null : card.dataset.id;
    layoutCards(activeId);
  });
  window.addEventListener('resize', () => layoutCards(activeId));
  layoutCards(activeId);
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
    </a>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavigation();
  renderExhibitionWorks();
  renderIndex();
});
