/* Read-only projection of the supplied UGA archive. Source text is data, never code. */
(() => {
  'use strict';
  const base = './assets/research/uga/';
  const labels = { claims: 'Claim 台账', runs: 'Run 研究记录', proofs: '证明', history: '历史与修正', tools: '工具箱与草稿', evidence: '计算与附件', overview: '项目总览', all: '全部源文件' };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link = record => './research-record.html?id=' + encodeURIComponent(record.id);
  const size = bytes => bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
  async function response(url) { const res = await fetch(url); if (!res.ok) throw new Error('资料暂时无法加载，请刷新重试。'); return res; }
  function row(record) {
    return `<article class="archive-row"><p class="archive-row-meta">${escape(record.label || labels[record.category])} <span>${escape(record.date || record.format.toUpperCase())}</span></p><h3><a href="${link(record)}">${escape(record.title)}</a></h3><p class="archive-path">${escape(record.path)}${record.line ? ' · 第 ' + record.line + ' 行' : ' · ' + size(record.bytes)}</p></article>`;
  }
  function list(catalog) {
    const form = document.querySelector('[data-archive-form]'), results = document.querySelector('[data-archive-results]'), status = document.querySelector('[data-archive-status]'), more = document.querySelector('[data-archive-more]');
    const query = form.elements.q, category = form.elements.category, order = form.elements.order;
    const params = new URLSearchParams(location.search);
    query.value = params.get('q') || ''; category.value = Object.hasOwn(labels, params.get('category')) ? params.get('category') : 'claims'; order.value = params.get('order') === 'oldest' ? 'oldest' : 'newest';
    let limit = 18;
    document.querySelector('[data-archive-counts]').textContent = `${catalog.claimCount} 条 Claim · ${catalog.categories.runs} 篇 Run · ${catalog.sourceFileCount} 份源文件`;
    [...category.options].forEach(option => { option.textContent = labels[option.value] + ' (' + (option.value === 'claims' ? catalog.claimCount : option.value === 'all' ? catalog.sourceFileCount : catalog.categories[option.value]) + ')'; });
    function draw(update = false) {
      const term = query.value.trim().normalize('NFKC').toLowerCase();
      let records = category.value === 'claims' ? [...catalog.claims] : catalog.files.filter(record => category.value === 'all' || record.category === category.value);
      records = records.filter(record => [record.title, record.path, record.label || '', record.number ? 'C' + record.number : ''].join(' ').normalize('NFKC').toLowerCase().includes(term));
      records.sort((a,b) => (category.value === 'claims' ? a.number - b.number : (a.date || '').localeCompare(b.date || '') || a.path.localeCompare(b.path)) * (order.value === 'oldest' ? 1 : -1));
      results.innerHTML = records.slice(0,limit).map(row).join('');
      status.textContent = records.length ? `找到 ${records.length} 条，当前显示 ${Math.min(limit,records.length)} 条。` : '没有匹配的记录。可更换分类或搜索完整编号、标题、文件名。';
      more.hidden = limit >= records.length;
      if (update) {
        const url = new URL(location.href);
        for (const [key,value] of [['q',query.value.trim()],['category',category.value],['order',order.value]]) { if (value) url.searchParams.set(key,value); else url.searchParams.delete(key); }
        history.replaceState(null,'',url);
      }
    }
    form.addEventListener('submit',event => { event.preventDefault(); limit=18; draw(true); });
    form.addEventListener('input',()=> { limit=18; draw(true); });
    more.addEventListener('click',()=> { limit+=18; draw(); });
    draw();
  }
  function markdown(source) {
    // Protect mathematical source from Markdown's escape and emphasis parsing.
    const formulas = [];
    const chunks = source.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
    const protectedSource = chunks.map((chunk,i) => i%2 ? chunk : chunk.replace(/\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$(?!\s)[^$\n]+\$/g, formula => 'ALEKSIMATH' + (formulas.push(formula)-1) + 'TOKEN')).join('');
    return window.AleksiArticleContent.renderMarkdownSafely(protectedSource).replace(/ALEKSIMATH(\d+)TOKEN/g, (_,i) => `<span class="archive-math">${escape(formulas[Number(i)])}</span>`);
  }
  async function reader(catalog) {
    const id = new URLSearchParams(location.search).get('id');
    const record = [...catalog.claims,...catalog.files].find(item=>item.id===id);
    if (!record) throw new Error('这条记录不在所提供的研究包中。请返回完整档案选择。');
    const title = document.querySelector('[data-record-title]'), body = document.querySelector('[data-record-body]');
    title.textContent = record.label ? `${record.label} · ${record.title}` : record.title;
    document.title = `${record.label || record.title} · UGA · Aleksi`;
    document.querySelector('[data-record-kind]').textContent = labels[record.category];
    document.querySelector('[data-record-source]').textContent = `${record.path}${record.line ? ' · 第 '+record.line+' 行起' : ''} · ${size(record.bytes)}`;
    document.querySelector('[data-record-status]').textContent = record.status || '原始资料 · 保留文件自身的日期、状态与修正，不代表新的数学验证。';
    const download = document.querySelector('[data-record-download]'); download.href = base + record.file; download.download = record.label ? record.label + '.md' : record.path.split('/').pop(); download.hidden=false;
    document.querySelector('[data-record-hash]').textContent = record.sha256;
    if (record.format === 'pdf') {
      body.innerHTML='<p>这是一份原始 PDF 附件，可在浏览器打开或下载完整文件。</p><p><a href="'+escape(base+record.file)+'" target="_blank" rel="noopener">打开 PDF ↗</a></p>';
    } else {
      const source=await (await response(base+record.file)).text();
      if (record.format === 'md') {
        body.innerHTML=markdown(source.replace(/^#{1,2}[^\n]*\n/,''));
        const byPath=new Map(catalog.files.map(item=>[item.path,item]));
        body.querySelectorAll('a[href]').forEach(anchor=> {
          const href=anchor.getAttribute('href'); if (!href || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return;
          try { const path=decodeURIComponent(new URL(href,'https://uga.invalid/'+record.path).pathname.slice(1)); const target=byPath.get(path); if (target) anchor.href=link(target); else { anchor.removeAttribute('href'); anchor.title='原文引用的文件未包含在本包中：'+href; anchor.classList.add('archive-unresolved'); } } catch (_) { anchor.removeAttribute('href'); }
        });
        if (window.renderMathInElement) window.renderMathInElement(body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false},{left:'$',right:'$',display:false}],throwOnError:false});
      } else {
        const cap=180000, pre=document.createElement('pre'); pre.textContent=source.slice(0,cap); body.replaceChildren(pre);
        if (source.length>cap) { const notice=document.createElement('p'); notice.textContent='大文件预览显示前 180,000 个字符。下载原文件可查看全部内容（'+size(record.bytes)+'）。'; body.prepend(notice); }
      }
    }
    const related=document.querySelector('[data-record-related]');
    const peers=record.category==='claims' ? catalog.files.filter(item=>item.references.includes(record.number) && item.path!=='claims/CLAIMS.md') : catalog.claims.filter(item=>record.references.includes(item.number));
    if (peers.length) { related.innerHTML='<h2>同编号相关记录</h2><p>这里列出原文出现相同编号的文件，不自动判定证明依赖。</p>'+peers.map(row).join(''); related.hidden=false; }
    document.body.dataset.recordReady='true'; window.AleksiReading?.refreshToc();
  }
  async function init() {
    if (!document.querySelector('[data-archive-form], [data-record-body]')) return;
    try { const catalog=await (await response(base+'catalog.json')).json(); if (document.querySelector('[data-record-body]')) await reader(catalog); else list(catalog); }
    catch(error) { const target=document.querySelector('[data-record-body], [data-archive-status]'); target.textContent=error.message; target.setAttribute('role','alert'); const title=document.querySelector('[data-record-title]'); if(title) title.textContent='资料暂时无法打开'; }
  }
  document.addEventListener('DOMContentLoaded',init);
})();
