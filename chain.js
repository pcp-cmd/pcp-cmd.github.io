const content = window.ALEKSI_CONTENT || {};

function articleHref(src) {
  return `./article.html?src=${encodeURIComponent(src)}`;
}

function toneClass(tone) {
  return tone ? `tone-${tone}` : 'tone-paper';
}

function renderAtlas() {
  const atlas = document.querySelector('[data-chain-atlas]');
  if (!atlas) return;
  atlas.innerHTML = `
    <svg class="chain-path" viewBox="0 0 1280 360" aria-hidden="true">
      <path class="atlas-line draw-path" d="M80 188 C210 72 340 86 450 174 C545 250 650 252 760 174 C872 92 1010 98 1200 188"></path>
      <path class="atlas-line draw-path atlas-line-soft" d="M120 238 C300 312 438 294 590 226 C780 142 932 170 1138 94"></path>
    </svg>
    <div class="atlas-nodes">
      ${content.revisionChainAtlas.map((node, index) => `
        <article class="atlas-node node-${index + 1} ${toneClass(node.tone)} ${node.active ? 'is-active' : ''}" data-reveal>
          <div class="atlas-node-top">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <span>${node.count} assets</span>
          </div>
          <h3>${node.title}</h3>
          <p class="node-cn">${node.cn}</p>
          <p>${node.description}</p>
          ${(node.featured || []).length ? `<ul>${node.featured.map((item) => `<li>${item}</li>`).join('')}</ul>` : ''}
        </article>
      `).join('')}
    </div>
  `;
}

function renderChainIndex() {
  const index = document.querySelector('[data-chain-index]');
  if (!index) return;
  index.innerHTML = content.revisionChainAtlas.map((node) => {
    const related = (content.manuscripts || []).filter((item) => item.chain.includes(node.title));
    return `
      <section class="chain-node-section ${toneClass(node.tone)}" data-reveal>
        <div class="chain-node-header">
          <span>${node.count} assets</span>
          <h2>${node.title}</h2>
          <p>${node.description}</p>
        </div>
        <div class="chain-node-grid">
          ${related.length ? related.map((item) => `
            <a class="chain-asset-card" href="${articleHref(item.source)}">
              <span>${item.room} / ${item.status}</span>
              <strong>${item.title}</strong>
              <p>${item.judgment}</p>
              <small>Next: ${item.next}</small>
            </a>
          `).join('') : `<p class="empty-note">Waiting for the next manuscript to enter this node.</p>`}
        </div>
      </section>
    `;
  }).join('');
}

function initChainMotion() {
  if (!window.gsap) return;
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  const paths = gsap.utils.toArray('.atlas-line');
  paths.forEach((path) => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
  });
  const mm = gsap.matchMedia();
  mm.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, (context) => {
    if (context.conditions.reduceMotion) {
      gsap.set('[data-reveal]', { y: 0, autoAlpha: 1 });
      paths.forEach((path) => { path.style.strokeDashoffset = 0; });
      return;
    }
    gsap.timeline({ defaults: { ease: 'power2.out' } })
      .to(paths, { strokeDashoffset: 0, duration: 2.1, stagger: .10, ease: 'none' })
      .fromTo('[data-reveal]', { y: 8, autoAlpha: 0.74 }, { y: 0, autoAlpha: 1, duration: .9, stagger: .035 }, '-=.8');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderAtlas();
  renderChainIndex();
  initChainMotion();
});
