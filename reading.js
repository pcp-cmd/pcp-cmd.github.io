(() => {
  'use strict';
  const site = window.ALEKSI_SITE || { writing: [], researchArticles: [] };
  const localPreview = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname) || location.protocol === 'file:';
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const validSource = (source) => typeof source === 'string' && /^content\/[\w\u0080-\uFFFF/.-]+\.md$/.test(source) && !source.split('/').some((part) => part === '..' || part === '.');
  let headings = [], menu, menuToggle, directory, directoryToggle, directoryNav;

  function closeMenu() {
    if (!menu) return;
    menu.hidden = true; menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.querySelector('span').textContent = '⌄';
  }
  function closeDirectory() {
    if (!directoryNav) return;
    directoryNav.hidden = true; directoryToggle.setAttribute('aria-expanded', 'false');
    directoryToggle.lastElementChild.textContent = '⌄';
  }
  function updateCurrentHeading() {
    if (!headings.length) return;
    let current = headings[0];
    for (const heading of headings) { if (heading.getBoundingClientRect().top <= 64) current = heading; }
    document.querySelectorAll('[data-reading-toc] a, [data-mobile-toc] a').forEach((link) => {
      if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function refreshToc() {
    headings = [...document.querySelectorAll('[data-toc-heading], [data-article-body] h2, [data-article-body] h3')];
    const usedIds = new Set();
    headings.forEach((heading, index) => {
      let id = heading.id || `section-${index + 1}`;
      while (usedIds.has(id)) id += '-next';
      heading.id = id; usedIds.add(id);
    });
    const markup = headings.map((heading) => `<a href="#${escape(heading.id)}" data-level="${heading.tagName.slice(1)}">${escape(heading.dataset.tocLabel || heading.textContent)}</a>`).join('');
    document.querySelectorAll('[data-reading-toc], [data-mobile-toc]').forEach((nav) => { nav.innerHTML = markup; });
    if (directory) directory.hidden = !headings.length || (document.body.dataset.article === 'true' && headings.length < 2);
    const rail = document.querySelector('[data-reading-toc]')?.closest('.reading-right');
    if (rail) rail.hidden = !headings.length;
    document.querySelectorAll('[data-article-body] table').forEach((table) => {
      if (table.parentElement.classList.contains('reading-table-scroll')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'reading-table-scroll'; wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', '表格，可横向滚动');
      table.before(wrapper); wrapper.append(table);
    });
    updateCurrentHeading();
  }

  function renderWriting(filter = 'all') {
    const list = document.querySelector('[data-writing-list]');
    if (!list) return;
    const confirmed = (site.writing || []).filter((entry) => entry.approved === true && validSource(entry.source));
    const visible = confirmed.filter((entry) => filter === 'all' || entry.type === filter);
    let markup = visible.map((entry) => `<article class="writing-entry"><p class="writing-entry-meta">${entry.type === 'note' ? '短记' : '长文'} · ${escape(entry.date || '日期待提供')}</p><h2><a href="./article.html?src=${encodeURIComponent(entry.source)}">${escape(entry.title)}</a></h2><p>${escape(entry.description)}</p></article>`).join('');
    if (localPreview && !confirmed.length && filter !== 'note') markup = `<article class="writing-entry is-sample" data-reading-sample><p class="writing-entry-meta">长文 · 日期待提供 · 排版样文（未发布）</p><h2><a href="./article.html?sample=reading">把一次尝试记录清楚</a></h2><p>合成中文样文，仅用于核对阅读排版，不代表真实经历或研究成果。</p></article>${markup}`;
    if (!confirmed.length) {
      const types = filter === 'all' ? ['long', 'note'] : [filter];
      markup += types.map((type) => `<article class="writing-entry is-pending"><p class="writing-entry-meta">${type === 'note' ? '短记' : '长文'} · 日期待提供</p><h2>${type === 'note' ? '短记' : '长文'}标题待提供</h2><p>真实标题、简介与正文待提供并确认。</p></article>`).join('');
    } else if (!visible.length) {
      markup += '<p class="reading-muted">这个分类暂无文章。</p>';
    }
    list.innerHTML = markup;
    document.querySelectorAll('[data-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    const status = document.querySelector('[data-filter-status]');
    if (status) status.textContent = confirmed.length ? `${visible.length} 篇文章` : (filter === 'note' ? '短记内容待提供。' : '文章内容待提供；排版样文尚未发布。');
  }

  function renderResearchLinks() {
    const container = document.querySelector('[data-research-articles]');
    if (!container) return;
    const confirmed = (site.writing || []).filter((entry) => entry.approved === true && validSource(entry.source));
    const links = (site.researchArticles || []).map((source) => confirmed.find((entry) => entry.source === source)).filter(Boolean);
    if (links.length) container.innerHTML = links.map((entry) => `<p><a href="./article.html?src=${encodeURIComponent(entry.source)}&amp;from=research">${escape(entry.title)}</a></p>`).join('');
  }

  function init() {
    menu = document.querySelector('[data-mobile-navigation]'); menuToggle = document.querySelector('[data-menu-toggle]');
    directory = document.querySelector('[data-directory]'); directoryToggle = document.querySelector('[data-directory-toggle]'); directoryNav = document.querySelector('[data-mobile-toc]');
    menuToggle?.addEventListener('click', () => {
      const expand = menu.hidden; closeDirectory(); menu.hidden = !expand;
      menuToggle.setAttribute('aria-expanded', String(expand)); menuToggle.querySelector('span').textContent = expand ? '⌃' : '⌄';
    });
    directoryToggle?.addEventListener('click', () => {
      const expand = directoryNav.hidden; closeMenu(); directoryNav.hidden = !expand;
      directoryToggle.setAttribute('aria-expanded', String(expand)); directoryToggle.lastElementChild.textContent = expand ? '⌃' : '⌄';
    });
    menu?.addEventListener('click', (event) => {
      const link = event.target.closest('a'); if (!link) return;
      closeMenu();
      if (link.getAttribute('aria-current') === 'page') { event.preventDefault(); menuToggle.focus(); }
    });
    document.addEventListener('click', (event) => {
      const link = event.target.closest('[data-reading-toc] a, [data-mobile-toc] a');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1))); if (!target) return;
      event.preventDefault(); closeDirectory();
      // Closing the inline menu changes geometry; locate only after layout settles.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        history.replaceState(history.state, '', link.hash);
        target.tabIndex = -1; target.focus({ preventScroll: true });
        window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + scrollY - 24), behavior: 'instant' });
        updateCurrentHeading();
      }));
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (menu && !menu.hidden) { closeMenu(); menuToggle.focus(); }
      else if (directoryNav && !directoryNav.hidden) { closeDirectory(); directoryToggle.focus(); }
    });
    document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => renderWriting(button.dataset.filter)));
    document.querySelectorAll('.reading-page-heading h1').forEach((heading) => { if (/^[\x00-\x7F]+$/.test(heading.textContent)) heading.classList.add('latin-title'); });
    let scheduled = false;
    window.addEventListener('scroll', () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(() => { scheduled = false; updateCurrentHeading(); }); }
    }, { passive: true });
    window.addEventListener('resize', () => { closeMenu(); closeDirectory(); });
    renderWriting(); renderResearchLinks(); refreshToc();
  }
  window.AleksiReading = { refreshToc, localPreview, validSource };
  document.addEventListener('DOMContentLoaded', init);
})();
