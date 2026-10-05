/* 在实际纸页尺寸中分页，保存正文偏移；无法拆分的宽内容在本页内滚动。 */
(function () {
  'use strict';
  const nodeText = node => node.textContent || '';
  function fragment(node, from, to) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const texts = []; let total = 0, text;
    while ((text = walker.nextNode())) { texts.push({ node: text, start: total }); total += text.length; }
    const boundary = offset => {
      const match = texts.find(item => offset <= item.start + item.node.length) || texts.at(-1);
      return [match.node, Math.max(0, Math.min(match.node.length, offset - match.start))];
    };
    const range = document.createRange();
    if (from === 0) range.setStart(node, 0); else range.setStart(...boundary(from));
    if (to === total) range.setEnd(node, node.childNodes.length); else range.setEnd(...boundary(to));
    const copy = node.cloneNode(false); copy.append(range.cloneContents());
    if (from) copy.removeAttribute('id');
    if (node.tagName === 'OL') {
      let preceding = 0, count = 0;
      for (const child of node.childNodes) {
        preceding += nodeText(child).length;
        if (preceding > from) break;
        if (child.tagName === 'LI') count++;
      }
      copy.start = (Number(node.getAttribute('start')) || 1) + count;
    }
    return copy;
  }
  function canSplit(node) {
    return node.nodeType === Node.ELEMENT_NODE && nodeText(node).length > 1
      && !node.matches('pre, table, figure, svg, img, .katex, .katex-display')
      && !node.querySelector('pre, table, svg, img, .katex, .katex-display');
  }
  async function paginate(html, paper) {
    const source = document.createElement('div');
    source.innerHTML = window.DOMPurify ? window.DOMPurify.sanitize(html) : '';
    const toc = [...source.querySelectorAll('h2,h3')].map((heading, i) => {
      if (!heading.id) heading.id = 'book-heading-' + i;
      return { id: heading.id, title: heading.textContent, level: Number(heading.tagName[1]) };
    });
    source.querySelectorAll('table,pre').forEach(element => {
      const wrapper = document.createElement('div'); wrapper.className = 'book-wide-content';
      wrapper.dataset.pageScroll = ''; wrapper.tabIndex = 0; element.replaceWith(wrapper); wrapper.append(element);
    });
    if (window.renderMathInElement) window.renderMathInElement(source, {
      delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false }, { left: '\\[', right: '\\]', display: true }], throwOnError: false
    });
    const measure = document.createElement('article');
    measure.className = 'book-page pagination-measure';
    Object.assign(measure.style, { width: paper.clientWidth + 'px', height: paper.clientHeight + 'px', left: '-20000px', top: '0' });
    const body = document.createElement('div'); body.className = 'book-prose'; measure.append(body); document.body.append(measure);
    const pages = [], queue = [...source.childNodes].filter(node => node.nodeType === Node.ELEMENT_NODE || nodeText(node).trim());
    let offset = 0;
    const fits = () => body.scrollHeight <= body.clientHeight + 1;
    const flush = () => {
      if (!body.childNodes.length) return;
      pages.push({ kind: 'html', html: body.innerHTML, offset,
        ids: [...body.querySelectorAll('[id]')].map(element => element.id), scroll: !fits() });
      offset += nodeText(body).length + body.querySelectorAll('img,hr').length; body.replaceChildren();
    };
    try {
      // Font metrics and decoded images stabilize the initial page layout.
      body.append(source.cloneNode(true));
      const ready = [...body.querySelectorAll('img')].map(image => image.decode?.().catch(() => {}));
      await Promise.race([Promise.all([document.fonts.ready, ...ready]), new Promise(resolve => setTimeout(resolve, 2000))]);
      body.replaceChildren();
      while (queue.length) {
        const item = queue.shift(); body.append(item);
        if (fits()) continue;
        item.remove();
        if (body.childNodes.length && !(body.childNodes.length === 1 && body.firstChild.matches?.('h1,h2,h3,h4'))) {
          const last = body.lastChild;
          if (last.matches?.('h1,h2,h3,h4')) { last.remove(); flush(); body.append(last); }
          else flush();
          body.append(item);
          if (fits()) continue;
          item.remove();
        }
        if (!canSplit(item)) { body.append(item); flush(); continue; }
        const value = nodeText(item); let low = 1, high = value.length, best = 0;
        while (low <= high) {
          const middle = Math.floor((low + high) / 2), part = fragment(item, 0, middle);
          body.append(part); const fit = fits(); part.remove();
          if (fit) { best = middle; low = middle + 1; } else high = middle - 1;
        }
        if (!best && body.childNodes.length) { flush(); queue.unshift(item); continue; }
        if (!best) { body.append(item); flush(); continue; }
        if (best < value.length) {
          const near = value.slice(Math.max(0, best - 40), best);
          const boundaries = [...near.matchAll(/[\s。！？；，、.!?;,:]/g)];
          if (best > 80 && boundaries.length) best -= near.length - boundaries.at(-1).index - 1;
          // Never separate the two halves of a Unicode surrogate pair.
          if (/[\uD800-\uDBFF]/.test(value[best - 1])) best--;
        }
        body.append(fragment(item, 0, best)); flush();
        if (best < value.length) queue.unshift(fragment(item, best, value.length));
      }
      flush();
      if (!pages.length) pages.push({ kind: 'html', html: '<p>本文暂无正文。</p>', offset: 0, ids: [] });
      toc.forEach(heading => { heading.page = pages.findIndex(page => page.ids.includes(heading.id)) + 1; });
      return { pages, toc };
    } finally { measure.remove(); }
  }
  window.CabinBookPagination = Object.freeze({ paginate });
})();
