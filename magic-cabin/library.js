/* 把网站的完整文章索引投影到 36 个现有书位；正文只在打开时加载。 */
(function () {
  'use strict';
  const content = window.AleksiArticleContent;
  const pageSize = window.CABIN_BOOK_CONFIG.pageSize;
  const byId = id => document.getElementById(id);
  const localPreview = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname) || location.protocol === 'file:';
  const seen = new Set();
  const articles = (window.ALEKSI_SITE?.writing || []).filter(entry => {
    if (entry.approved !== true || !content.validSource(entry.source) || seen.has(entry.source)) return false;
    seen.add(entry.source); return true;
  }).map((entry, order) => ({ ...entry, order,
    title: String(entry.title || '未命名文章'), description: String(entry.description || ''),
    type: entry.type === 'note' ? 'note' : 'long',
    tags: Array.isArray(entry.tags) ? entry.tags.filter(tag => typeof tag === 'string') : []
  }));
  if (!articles.length && localPreview) articles.push({ ...window.CABIN_BOOK_CONFIG.localSample, order: 0 });
  const url = new URL(location.href);
  let query = url.searchParams.get('q') || '', type = url.searchParams.get('type') || 'all';
  let tag = url.searchParams.get('tag') || '', sort = url.searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';
  let batch = Math.max(0, (Number(url.searchParams.get('shelf')) || 1) - 1), visible = [], slots = [], binding;
  const normalize = value => String(value).normalize('NFKC').toLocaleLowerCase();
  const dateValue = entry => /^\d{4}-\d{2}-\d{2}$/.test(entry.date || '') ? Date.parse(entry.date) : NaN;
  function articleUrl(entry) {
    return entry.sample ? new URL('article.html?sample=reading', content.siteRoot).href : content.articleHref(entry.source);
  }
  function writeUrl() {
    const current = new URL(location.href);
    for (const [key, value] of Object.entries({ q: query, type: type === 'all' ? '' : type, tag,
      sort: sort === 'newest' ? '' : sort, shelf: batch ? String(batch + 1) : '' })) {
      if (value) current.searchParams.set(key, value); else current.searchParams.delete(key);
    }
    history.replaceState(null, '', current);
  }
  function draw(updateUrl = true) {
    const needle = normalize(query.trim());
    visible = articles.filter(entry => (type === 'all' || entry.type === type) && (!tag || entry.tags.includes(tag))
      && (!needle || normalize([entry.title, entry.description, ...entry.tags].join(' ')).includes(needle)));
    visible.sort((a, b) => {
      const da = dateValue(a), db = dateValue(b);
      if (Number.isNaN(da) !== Number.isNaN(db)) return Number.isNaN(da) ? 1 : -1;
      const delta = Number.isNaN(da) ? 0 : da - db;
      return (sort === 'newest' ? -delta : delta) || a.order - b.order;
    });
    const batches = Math.max(1, Math.ceil(visible.length / pageSize));
    batch = Math.max(0, Math.min(batches - 1, Math.floor(batch)));
    slots = visible.slice(batch * pageSize, (batch + 1) * pageSize);
    byId('libraryCount').textContent = visible.length ? `${batch * pageSize + 1}–${batch * pageSize + slots.length} / ${visible.length}` : '0 篇';
    byId('libraryBatch').textContent = `${batch + 1} / ${batches}`;
    byId('libraryPrev').disabled = batch === 0; byId('libraryNext').disabled = batch >= batches - 1;
    byId('libraryNotice').textContent = !articles.length ? '文章待添加。' : !slots.length ? '没有找到文章，试试其他关键词。'
      : slots[0].sample ? '本地排版样文 · 尚未发布' : '';
    byId('libraryNotice').hidden = !byId('libraryNotice').textContent;
    byId('shelfHint').textContent = slots.length ? '点选一本书 · Enter 阅读第一本' : '书架暂无文章';
    const list = byId('libraryList'); list.replaceChildren();
    slots.forEach((entry, index) => {
      const li = document.createElement('li'), button = document.createElement('button');
      button.type = 'button'; button.dataset.slot = index;
      const title = document.createElement('span'); title.textContent = entry.title;
      const meta = document.createElement('small'); meta.textContent = entry.sample ? '本地样文' : `${entry.date || '日期待提供'} · ${entry.type === 'note' ? '短记' : '长文'}`;
      button.append(title, meta); button.addEventListener('click', () => binding.openSlot(index));
      li.append(button); list.append(li);
    });
    byId('librarySearch').value = query; byId('libraryType').value = type;
    byId('libraryTag').value = tag; byId('librarySort').value = sort;
    binding?.setSlots(slots);
    if (updateUrl) writeUrl();
  }
  async function loadArticle(entry) {
    let raw;
    if (entry.sample) {
      if (!localPreview) throw new Error('样文仅在本地预览中提供。');
      const response = await fetch(new URL('docs/fixtures/reading-sample.zh.md', content.siteRoot));
      if (!response.ok) throw new Error('本地样文暂时无法打开。');
      raw = await response.text();
    } else raw = await content.loadMarkdown(entry.source);
    let body = content.stripLeadingTitleHeading(content.parseFrontmatter(raw).body);
    if (entry.sample && body.includes('## ')) body = body.slice(body.indexOf('## '));
    return content.renderArticleBody(body, entry.sample ? 'docs/fixtures/reading-sample.zh.md' : entry.source);
  }
  function bookFor(entry) {
    return { id: entry.source, title: entry.title, subtitle: entry.description,
      edition: entry.sample ? '本地样文 · 尚未发布' : `${entry.date || '日期待提供'} · ${entry.type === 'note' ? '短记' : '长文'}`,
      articleHref: articleUrl(entry), loader: () => loadArticle(entry), pages: [] };
  }
  function selectSource(source) {
    const index = visible.findIndex(entry => entry.source === source);
    if (index < 0) {
      if (!articles.some(entry => entry.source === source)) {
        byId('libraryNotice').textContent = '这篇文章暂未收录。'; byId('libraryNotice').hidden = false; return;
      }
      query = ''; type = 'all'; tag = ''; draw(false);
      return selectSource(source);
    }
    batch = Math.floor(index / pageSize); draw();
    binding.openSlot(index % pageSize);
  }
  const tags = [...new Set(articles.flatMap(entry => entry.tags))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  tags.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; byId('libraryTag').append(option); });
  byId('libraryTag').hidden = !tags.length;
  if (!tags.includes(tag)) tag = '';
  if (!['all', 'long', 'note'].includes(type)) type = 'all';
  byId('librarySearch').addEventListener('input', event => { query = event.target.value; batch = 0; draw(); });
  for (const [id, update] of [['libraryType', value => { type = value; }], ['libraryTag', value => { tag = value; }], ['librarySort', value => { sort = value; }]]) {
    byId(id).addEventListener('change', event => { update(event.target.value); batch = 0; draw(); });
  }
  byId('libraryPrev').addEventListener('click', () => { batch--; draw(); });
  byId('libraryNext').addEventListener('click', () => { batch++; draw(); });
  byId('shelfCatalog').addEventListener('keydown', event => event.stopPropagation());
  window.CabinLibrary = Object.freeze({
    getSlot: index => slots[index] || null, bookFor,
    opened(entry) { const current = new URL(location.href); current.searchParams.set('src', entry.source); history.replaceState(null, '', current); },
    closed() { const current = new URL(location.href); current.searchParams.delete('src'); history.replaceState(null, '', current); },
    bind(adapter) { binding = adapter; draw(false); const source = new URL(location.href).searchParams.get('src'); if (source) queueMicrotask(() => selectSource(source)); }
  });
})();
