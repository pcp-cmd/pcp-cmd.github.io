(() => {
  'use strict';
  const stage = document.querySelector('[data-exhibition-stage]');
  const viewer = document.querySelector('[data-gallery-viewer]');
  if (!stage || !viewer) return;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const safeImage = (value) => typeof value === 'string' && /^\.\/content\/design\/works\/[a-z0-9-]+\/(?:hero|thumb)\.webp$/.test(value);
  const pictures = (window.ALEKSI_WORKS_CATALOG || []).filter((item) => safeImage(item.image) && item.title);
  const caption = document.querySelector('[data-viewer-caption]');
  const image = document.querySelector('[data-viewer-image]');
  const details = document.querySelector('[data-viewer-details]');
  const counter = document.querySelector('[data-viewer-counter]');
  const toneToggle = document.querySelector('[data-viewer-original]');
  const originalTones = new Set();
  let selected = -1, origin = null;

  stage.innerHTML = pictures.map((item, index) => {
    const number = String(index + 1).padStart(2, '0');
    return `<article class="exhibition-card" data-work-card data-id="${escape(item.id)}"><button type="button" class="exhibition-card__toggle" data-gallery-open="${index}" aria-haspopup="dialog" aria-label="放大 ${escape(item.title)}"><img class="exhibition-card__img${item.displayTone === 'soft-highlights' ? ' image-soft-highlights' : ''}" src="${escape(item.image)}" alt="${escape(item.alt || item.title)}" loading="${index < 7 ? 'eager' : 'lazy'}" decoding="async"><span class="gallery-card-caption"><span class="gallery-card-number">${number}</span><span class="gallery-card-title">${escape(item.shortTitle || item.title)}</span></span><span class="gallery-card-kind">${escape(item.subtitle)}</span></button></article>`;
  }).join('');
  const cards = [...stage.querySelectorAll('[data-work-card]')];

  function positionCards() {
    const desktop = matchMedia('(min-width: 900px)').matches;
    const columns = Math.min(7, Math.max(4, Math.floor(stage.clientWidth / 180)));
    const rows = Math.ceil(cards.length / columns);
    const span = Math.min(stage.clientWidth - 180, 1100);
    const rotations = [-6, 4, -3, 5, -5, 3, -2];
    cards.forEach((card, index) => {
      card.style.setProperty('--x', `${-span / 2 + index % columns * span / (columns - 1)}px`);
      card.style.setProperty('--y', `${(Math.floor(index / columns) - (rows - 1) / 2) * 278 + (index % columns % 2 ? -20 : 16)}px`);
      card.style.setProperty('--rotate', `${rotations[index % rotations.length]}deg`);
      card.style.setProperty('--stack', `${cards.length - index}`);
      card.style.setProperty('--delay', `${index * 28}ms`);
    });
    stage.style.setProperty('--stage-height', `${desktop ? rows * 278 + 140 : 0}px`);
  }

  function updateTone() {
    const item = pictures[selected];
    const hasSoftTone = item.displayTone === 'soft-highlights';
    const showOriginal = originalTones.has(item.id);
    image.classList.toggle('image-soft-highlights', hasSoftTone && !showOriginal);
    toneToggle.hidden = !hasSoftTone;
    toneToggle.textContent = showOriginal ? '显示校正' : '原图';
    toneToggle.setAttribute('aria-pressed', String(showOriginal));
  }

  function select(index) {
    if (!pictures.length) return;
    selected = (index + pictures.length) % pictures.length;
    const item = pictures[selected];
    const number = String(selected + 1).padStart(2, '0');
    image.src = item.image;
    image.alt = item.alt || item.title;
    caption.textContent = item.title;
    counter.textContent = `${number} / ${pictures.length}`;
    details.innerHTML = `<p class="gallery-detail-kind">${escape(item.subtitle)}</p><h2>${escape(item.title)}</h2><p class="gallery-detail-summary">${escape(item.summary)}</p><dl class="gallery-detail-facts"><div><dt>来源</dt><dd>${escape(item.source)}</dd></div><div><dt>画幅</dt><dd>${escape(item.format)}</dd></div></dl><h3>版式</h3><ul>${(item.layoutNotes || []).map((note) => `<li>${escape(note)}</li>`).join('')}</ul><h3>视觉语言</h3>${(item.visualSystem || []).map((note) => `<p>${escape(note)}</p>`).join('')}`;
    details.scrollTop = 0;
    document.querySelector('.gallery-viewer-content').scrollTop = 0;
    updateTone();
    cards.forEach((card, cardIndex) => {
      card.classList.toggle('is-active', cardIndex === selected);
      card.classList.toggle('is-muted', cardIndex !== selected);
    });
  }

  stage.addEventListener('click', (event) => {
    const button = event.target.closest('[data-gallery-open]');
    if (!button) return;
    origin = button;
    select(Number(button.dataset.galleryOpen));
    viewer.showModal();
    document.body.classList.add('viewer-open');
  });
  document.querySelector('[data-viewer-close]').addEventListener('click', () => viewer.close());
  document.querySelector('[data-viewer-previous]').addEventListener('click', () => select(selected - 1));
  document.querySelector('[data-viewer-next]').addEventListener('click', () => select(selected + 1));
  toneToggle.addEventListener('click', () => {
    const item = pictures[selected];
    if (originalTones.has(item.id)) originalTones.delete(item.id);
    else originalTones.add(item.id);
    updateTone();
  });
  viewer.addEventListener('click', (event) => { if (event.target === viewer || event.target.matches('[data-viewer-stage]')) viewer.close(); });
  viewer.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); select(selected + (event.key === 'ArrowRight' ? 1 : -1)); }
  });
  viewer.addEventListener('close', () => {
    cards.forEach((card) => card.classList.remove('is-active', 'is-muted'));
    document.body.classList.remove('viewer-open');
    image.removeAttribute('src');
    origin?.focus({ preventScroll: true });
    selected = -1;
  });
  if ('ResizeObserver' in window) new ResizeObserver(positionCards).observe(stage);
  else window.addEventListener('resize', positionCards);
  positionCards();
})();
