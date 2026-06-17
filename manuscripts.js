const content = window.ALEKSI_CONTENT || {};

function articleHref(src) {
  return `./article.html?src=${encodeURIComponent(src)}`;
}

const manuscriptViews = [
  { key: 'By Chain', label: '按链路' },
  { key: 'By Room', label: '按空间' },
  { key: 'By Status', label: '按状态' },
  { key: 'By Time', label: '按时间' }
];

const statusMap = {
  'under revision': '修订中',
  'working draft': '草稿中',
  'reusable artifact': '可复用资产',
  'returned': '已回流'
};

const roomMap = {
  'Math Lab': '数学实验室',
  'Skill Library': '技能资产库',
  'Visual Essays': '视觉文章',
  'System Log': '系统日志'
};

const artifactMap = {
  'Proof Deconstruction': '证明拆解',
  'Definition Card': '定义卡',
  'Protocol': '协议',
  'Essay Seed': '文章种子',
  'Revision Log': '修订日志'
};

const chainMap = {
  'Raw Experience': '原始经验',
  'Prediction Error': '认知误差',
  'Personal Delta': '个人增量',
  'Connection': '连接',
  'Compression': '压缩',
  'Skill': '技能资产',
  'Revision Loop': '反馈修订'
};

function renderTabs(active = 'By Chain') {
  const tabs = document.querySelector('[data-manuscript-tabs]');
  if (!tabs) return;
  tabs.className = 'manuscript-view-tabs';
  tabs.innerHTML = `
    <div class="segmented">
      ${manuscriptViews.map((view) => `
        <button class="${view.key === active ? 'is-active' : ''}" type="button" data-view="${view.key}">${view.label}</button>
      `).join('')}
    </div>
  `;
  tabs.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      renderTabs(button.dataset.view);
      renderList(button.dataset.view);
    });
  });
}

function sortItems(view) {
  const items = [...(content.manuscripts || [])];
  if (view === 'By Room') return items.sort((a, b) => a.room.localeCompare(b.room));
  if (view === 'By Status') return items.sort((a, b) => a.status.localeCompare(b.status));
  if (view === 'By Time') return items.sort((a, b) => b.updated.localeCompare(a.updated));
  return items.sort((a, b) => a.chain[0].localeCompare(b.chain[0]));
}

function cnStatus(status) {
  return statusMap[status] || status;
}

function cnRoom(room) {
  return roomMap[room] || room;
}

function cnArtifact(type) {
  return artifactMap[type] || type;
}

function cnChain(chain = []) {
  return chain.map((item) => chainMap[item] || item).join(' → ');
}

function renderList(view = 'By Chain') {
  const list = document.querySelector('[data-manuscript-list]');
  if (!list) return;
  list.innerHTML = sortItems(view).map((item) => `
    <a class="reading-row index-row" href="${articleHref(item.source)}" data-reveal>
      <span class="reading-row-meta">${item.updated} / ${cnArtifact(item.artifactType)}</span>
      <strong class="index-row-title">${item.title}</strong>
      <p class="index-row-copy">${item.judgment}</p>
      <span class="reading-row-status">${cnStatus(item.status)} / ${cnRoom(item.room)} / ${cnChain(item.chain)}</span>
    </a>
  `).join('');
}

function initMotion() {
  if (!window.gsap) return;
  const mm = gsap.matchMedia();
  mm.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, (context) => {
    if (context.conditions.reduceMotion) {
      gsap.set('[data-reveal]', { y: 0, autoAlpha: 1 });
      return;
    }
    gsap.fromTo('[data-reveal]', { y: 8, autoAlpha: 0.74 }, { y: 0, autoAlpha: 1, duration: 0.72, stagger: 0.035, ease: 'power2.out' });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderTabs();
  renderList();
  initMotion();
});
