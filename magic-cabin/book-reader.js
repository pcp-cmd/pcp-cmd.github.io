/* 原生实体书阅读器。书架通过原 regMagic 调用 open，不参与场景的动画循环。 */
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const dialog = byId('bookReader'), spread = byId('bookSpread');
  const left = byId('pageLeft'), right = byId('pageRight');
  const sheet = byId('flipSheet'), front = byId('sheetFront'), back = byId('sheetBack');
  const prev = byId('readerPrev'), next = byId('readerNext');
  const compact = matchMedia('(max-width: 640px)'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let book = null, cursor = 0, busy = false, drag = null, direction = 1, progress = 0;
  let animation = null, closeCallback = null, returnFocus = null, generation = 0;
  let contentHtml = '', loading = false, layoutPass = 0, resizeTimer = null, savedBookmark = { offset: -1, page: 0 };
  const step = () => compact.matches ? 1 : 2;
  const last = () => Math.floor((book.pages.length - 1) / step()) * step();
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function plate(symbol) {
    const drawings = {
      house: '<path d="M36 114 151 54 267 115 153 176Z M36 114v126l117 62 114-64V115 M153 176v126 M36 177l117 63 114-62 M88 142v57l34 18v-57Z M184 162v56l45-25v-56Z M87 254v-50l33 17v50 M69 111l81-42 79 40 M150 70v72"/><path d="m154 54 0-24 27 14v24 M162 30v-15 M88 288l-23 12 39 21 29-15 M190 265l42 23 31-16 M211 270v-35l25-14v37 M59 241l-14 7v-36l14-7Z"/>',
      moon: '<circle cx="151" cy="148" r="84"/><path d="M187 73a84 84 0 0 0 0 150 84 84 0 1 1 0-150Z"/><circle cx="121" cy="116" r="13"/><circle cx="99" cy="169" r="8"/><path d="M39 65h14m-7-7v14 M247 248h16m-8-8v16 M234 50h10m-5-5v10 M34 247l23-11 8-13 15-3"/><path d="M63 292h176 M97 283h106"/>',
      leaf: '<path d="M151 264V81 M151 177c-62-5-93-33-95-82 54 5 85 33 95 82Z M151 220c62-5 93-33 95-82-54 5-85 33-95 82Z M151 129c-24-23-29-55 0-87 29 32 24 64 0 87Z M151 177l-62-55 M151 220l64-56 M105 264h92l-12 48h-68Z M103 263h95v-9h-95Z"/><path d="M56 304h42m104 0h42 M61 82h13m-6-7v14 M231 70h16m-8-8v16"/>',
      star: '<circle cx="151" cy="170" r="105"/><circle cx="151" cy="170" r="87"/><path d="m151 62 64 196-168-121h208L87 258Z M151 80v179 M63 170h176"/><circle cx="151" cy="170" r="28"/><path d="M151 20v22 M151 299v23 M13 170h21 M269 170h21 M41 59l15 15 M248 265l15 15 M248 74l15-15 M41 280l15-15"/>'
    };
    const wrapper = node('div', 'plate-page');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 304 340');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.2'); svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true'); svg.innerHTML = drawings[symbol] || drawings.house;
    wrapper.append(svg);
    return wrapper;
  }
  function renderPage(target, index) {
    target.replaceChildren();
    const data = book.pages[index];
    if (!data) return;
    if (data.kind === 'html') {
      const content = node('div', 'book-prose');
      content.innerHTML = window.DOMPurify.sanitize(data.html);
      if (data.scroll) { content.dataset.pageScroll = ''; content.tabIndex = 0; target.append(node('small', 'page-scroll-note', '本页内容可滚动')); }
      target.append(content);
    } else if (data.kind === 'error') {
      const content = node('div', 'colophon');
      content.append(node('h3', '', '正文暂时无法打开'), node('p', '', data.message));
      const retry = node('button', 'page-retry', '重新加载'); retry.type = 'button';
      retry.addEventListener('click', event => { event.stopPropagation(); generation++; void loadBook(); });
      content.append(retry); target.append(content);
    } else if (data.kind === 'plate') {
      const content = plate(data.symbol);
      content.append(node('div', 'plate-number', data.number), node('div', 'plate-caption', data.caption));
      target.append(content);
    } else if (data.kind === 'title') {
      const content = node('div', 'title-page');
      content.append(node('p', 'page-chapter', book.edition), node('h3', '', data.title), node('p', '', data.subtitle), node('span', 'title-rule'), node('p', '', data.note));
      target.append(content);
    } else if (data.kind === 'colophon') {
      const content = node('div', 'colophon');
      content.append(node('h3', '', data.title));
      data.text.forEach(text => content.append(node('p', '', text)));
      target.append(content);
    } else if (data.kind === 'image') {
      const image = node('img', 'page-image');
      image.src = data.src; image.alt = data.alt || `${book.title}，第 ${index + 1} 页`;
      image.draggable = false; target.append(image);
    } else {
      target.append(node('p', 'page-chapter', data.chapter), node('h3', 'page-title', data.title));
      data.text.forEach(text => target.append(node('p', 'page-copy', text)));
    }
    target.append(node('span', 'page-number', String(index + 1).padStart(2, '0')));
  }
  function renderSpread() {
    renderPage(left, cursor);
    renderPage(right, compact.matches ? cursor : cursor + 1);
    sheet.hidden = true; sheet.style.transform = ''; front.style.boxShadow = ''; back.style.boxShadow = '';
    busy = false; progress = 0;
    prev.disabled = loading || cursor === 0; next.disabled = loading || cursor >= last();
    const start = String(cursor + 1).padStart(2, '0');
    const end = String(Math.min(cursor + step(), book.pages.length)).padStart(2, '0');
    byId('readerProgress').textContent = `${start}${step() === 2 ? '–' + end : ''} / ${String(book.pages.length).padStart(2, '0')}`;
    dialog.dataset.page = String(cursor);
    if (!loading && (contentHtml || !book.loader)) {
      try { localStorage.setItem('aleksi-article-book:' + book.id, JSON.stringify(bookmark())); } catch (_) { /* 私密模式也可以正常阅读。 */ }
    }
  }
  function bookmark() { return { offset: cursor === 0 ? -1 : book.pages[cursor]?.offset ?? cursor, page: cursor }; }
  function titlePage(note) { return { kind: 'title', title: book.title, subtitle: book.subtitle || '', note: note || '', offset: -1 }; }
  function status(message) {
    byId('readerStatus').textContent = message;
    byId('readerGesture').hidden = Boolean(message);
    dialog.setAttribute('aria-busy', String(loading));
  }
  function stopFlip() {
    if (animation) { animation.cancel(); animation = null; }
    drag = null; busy = false; sheet.hidden = true;
  }
  function goToPage(page) {
    if (loading || busy) return;
    cursor = Math.max(0, Math.min(last(), Math.floor(page / step()) * step())); renderSpread();
    byId('readerDirectory').hidden = true; byId('readerContents').setAttribute('aria-expanded', 'false');
  }
  async function layout(mark, ownGeneration = generation) {
    const pass = ++layoutPass, width = right.clientWidth, height = right.clientHeight;
    loading = true; stopFlip(); status('正在排版…'); prev.disabled = next.disabled = true;
    const result = await window.CabinBookPagination.paginate(contentHtml, right);
    if (generation !== ownGeneration || pass !== layoutPass || !dialog.open) return;
    if (width !== right.clientWidth || height !== right.clientHeight) return layout(mark, ownGeneration);
    book.pages = [titlePage(), ...result.pages];
    let selected = 0;
    if (mark.offset >= 0) book.pages.forEach((page, i) => { if (page.offset >= 0 && page.offset <= mark.offset) selected = i; });
    cursor = Math.max(0, Math.min(last(), Math.floor(selected / step()) * step()));
    const directory = byId('readerDirectory'); directory.replaceChildren();
    result.toc.forEach(heading => {
      const button = node('button', heading.level === 3 ? 'directory-subheading' : '', heading.title);
      button.type = 'button'; button.addEventListener('click', () => goToPage(heading.page)); directory.append(button);
    });
    byId('readerContents').disabled = !result.toc.length;
    loading = false; status(''); renderSpread();
  }
  async function loadBook() {
    const ownGeneration = generation;
    loading = true; contentHtml = ''; cursor = 0; book.pages = [titlePage('正在读取正文…')];
    byId('readerContents').disabled = true; status('正在读取正文…'); renderSpread();
    try {
      const html = await book.loader();
      if (generation !== ownGeneration || !dialog.open) return;
      contentHtml = html; await layout(savedBookmark, ownGeneration);
    } catch (error) {
      if (generation !== ownGeneration || !dialog.open) return;
      loading = false; contentHtml = ''; cursor = 0;
      book.pages = [{ kind: 'error', message: error.message || '请稍后重试。' }];
      status('读取失败'); renderSpread();
    }
  }
  function prepareFlip(dir) {
    if (!book || loading || busy || cursor + dir * step() < 0 || cursor + dir * step() > last()) return false;
    direction = dir; busy = true; progress = 0;
    sheet.classList.toggle('backwards', dir < 0); sheet.hidden = false;
    sheet.style.transform = 'rotateY(0deg)';
    if (compact.matches) {
      renderPage(front, cursor); renderPage(back, cursor + dir); renderPage(right, cursor + dir);
    } else if (dir > 0) {
      renderPage(front, cursor + 1); renderPage(back, cursor + 2); renderPage(right, cursor + 3);
    } else {
      renderPage(front, cursor); renderPage(back, cursor - 1); renderPage(left, cursor - 2);
    }
    return true;
  }
  function setProgress(value) {
    progress = Math.max(0, Math.min(1, value));
    sheet.style.transform = `rotateY(${direction * -180 * progress}deg)`;
    front.style.boxShadow = `${direction * -18 * Math.sin(progress * Math.PI)}px 0 30px #0002`;
    back.style.boxShadow = `${direction * 18 * Math.sin(progress * Math.PI)}px 0 30px #0002`;
  }
  async function settleFlip(commit) {
    if (!busy) return;
    const ownGeneration = generation, target = commit ? 1 : 0;
    if (!reduced.matches) {
      animation = sheet.animate([
        { transform: `rotateY(${direction * -180 * progress}deg)` },
        { transform: `rotateY(${direction * -180 * target}deg)` }
      ], { duration: Math.max(130, Math.abs(target - progress) * 580), easing: 'cubic-bezier(.2,.65,.2,1)', fill: 'forwards' });
      try { await animation.finished; } catch (_) { return; }
    }
    if (generation !== ownGeneration || !dialog.open) return;
    if (commit) cursor += direction * step();
    if (animation) { animation.cancel(); animation = null; }
    renderSpread();
  }
  function turn(dir) { if (prepareFlip(dir)) void settleFlip(true); }
  function open(data, onClose) {
    if (dialog.open || !data || (!data.loader && !data.pages?.length)) return;
    book = { ...data, pages: (data.pages || []).slice() }; closeCallback = onClose; returnFocus = document.activeElement; generation++;
    contentHtml = ''; loading = Boolean(book.loader); savedBookmark = { offset: -1, page: 0 };
    try { savedBookmark = JSON.parse(localStorage.getItem('aleksi-article-book:' + book.id)) || savedBookmark; } catch (_) {}
    if (!Number.isFinite(savedBookmark.offset)) savedBookmark = { offset: -1, page: 0 };
    if (book.loader) book.pages = [titlePage('正在读取正文…')];
    cursor = book.loader ? 0 : Math.max(0, Math.min(last(), Math.floor((savedBookmark.page || 0) / step()) * step()));
    byId('readerEdition').textContent = book.edition;
    byId('readerTitle').textContent = book.title;
    byId('readerArticle').hidden = !book.articleHref;
    if (book.articleHref) byId('readerArticle').href = book.articleHref;
    byId('readerDirectory').hidden = true; byId('readerContents').setAttribute('aria-expanded', 'false'); byId('readerContents').disabled = true;
    dialog.dataset.book = book.id; status(''); renderSpread();
    dialog.showModal(); document.body.dataset.reading = 'true';
    byId('readerClose').focus();
    if (book.loader) void loadBook();
  }
  function close() {
    if (!dialog.open) return;
    generation++; layoutPass++; clearTimeout(resizeTimer); stopFlip(); loading = false;
    dialog.close(); delete document.body.dataset.reading;
    const callback = closeCallback; closeCallback = null;
    if (callback) callback();
    if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
  }
  byId('readerClose').addEventListener('click', close);
  byId('readerContents').addEventListener('click', () => {
    const directory = byId('readerDirectory'); directory.hidden = !directory.hidden;
    byId('readerContents').setAttribute('aria-expanded', String(!directory.hidden));
  });
  prev.addEventListener('click', () => turn(-1)); next.addEventListener('click', () => turn(1));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('keydown', event => {
    if (event.target.closest('input,textarea,select,[data-page-scroll]')) { event.stopPropagation(); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); turn(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); turn(-1); }
    if (event.key === 'Home' && !busy && !loading) { cursor = 0; renderSpread(); event.preventDefault(); }
    if (event.key === 'End' && !busy && !loading) { cursor = last(); renderSpread(); event.preventDefault(); }
    event.stopPropagation();
  });
  dialog.addEventListener('click', event => {
    if (event.composedPath().some(element => element.matches?.('.reader-top, .reader-bottom, .reader-directory, .book-object'))) return;
    close();
  });
  spread.addEventListener('pointerdown', event => {
    if (loading || busy || event.button !== 0 || event.target.closest('a,button,[data-page-scroll]')) return;
    const bounds = spread.getBoundingClientRect();
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, turning: false, dir: event.clientX < bounds.left + bounds.width * (compact.matches ? .35 : .5) ? -1 : 1, width: bounds.width / step() };
    spread.setPointerCapture(event.pointerId);
  });
  spread.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    drag.dx = event.clientX - drag.startX;
    if (!drag.turning && Math.abs(drag.dx) > 8 && Math.abs(drag.dx) > Math.abs(event.clientY - drag.startY)) {
      if (compact.matches) drag.dir = drag.dx < 0 ? 1 : -1;
      drag.turning = prepareFlip(drag.dir);
    }
    if (drag.turning) { if (event.cancelable) event.preventDefault(); setProgress(-drag.dir * drag.dx / drag.width); }
  });
  spread.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const gesture = drag; drag = null;
    if (spread.hasPointerCapture(event.pointerId)) spread.releasePointerCapture(event.pointerId);
    if (gesture.turning) void settleFlip(progress > .18);
    else if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 8) turn(gesture.dir);
  });
  spread.addEventListener('pointercancel', () => { drag = null; if (busy && !animation) void settleFlip(false); });
  spread.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;
    event.preventDefault();
    let id; try { id = decodeURIComponent(anchor.hash.slice(1)); } catch (_) { return; }
    const page = book.pages.findIndex(data => data.ids?.includes(id)); if (page >= 0) goToPage(page);
  });
  function resized() {
    if (!dialog.open) return;
    if (contentHtml && !loading) {
      const mark = bookmark(), ownGeneration = generation; stopFlip(); clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (dialog.open && generation === ownGeneration) void layout(mark, ownGeneration).catch(() => {
          if (dialog.open && generation === ownGeneration) { loading = false; status(''); renderSpread(); }
        });
      }, 180);
    } else if (!loading) { generation++; stopFlip(); cursor = Math.min(last(), Math.floor(cursor / step()) * step()); renderSpread(); }
  }
  compact.addEventListener('change', resized); addEventListener('resize', resized);
  window.CabinBookReader = Object.freeze({ open, close, get isOpen() { return dialog.open; } });
})();
