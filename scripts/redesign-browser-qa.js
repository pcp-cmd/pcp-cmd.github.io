const fs = require('fs');
const path = require('path');

async function run(env) {
  const { browser, baseUrl, root, outputDir, assert, openAuditedPage, waitForStablePage, assertNoOverflow, assertNoRuntimeErrors } = env;
  const results = [];
  const sections = ['writing', 'project', 'research', 'about', 'works', 'room'];
  const check = (condition, message) => { assert(condition, message); results.push(message); };
  const screenshot = (page, name) => page.screenshot({ path: path.join(outputDir, name), fullPage: false });
  const settled = (page) => page.evaluate(() => new Promise((resolve, reject) => {
    const elements = [...document.querySelectorAll('[data-window], [data-photo-window]')];
    const start = performance.now();
    let before;
    function inspect() {
      const boxes = elements.map((el) => el.getBoundingClientRect());
      const sizeStable = before && boxes.every((b, i) => ['x', 'y', 'width', 'height'].every((axis) => Math.abs(b[axis] - before[i][axis]) < .1));
      const contentFits = elements.filter((el) => el.classList.contains('is-open')).every((el) => {
        const link = el.querySelector('.window-enter').getBoundingClientRect(), preview = el.querySelector('.window-preview').getBoundingClientRect();
        // Animated transforms introduce subpixel rounding between parent and
        // child rects (observed < 0.0001px); keep the 2px inset with 0.05px tolerance.
        return link.bottom <= preview.bottom - 2 + .05 && link.left >= preview.left - .05 && link.right <= preview.right + .05;
      });
      const separated = boxes.every((a, i) => boxes.every((b, j) => i === j || a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1));
      const brand = document.querySelector('[data-photo-window] h1')?.getBoundingClientRect();
      const brandClear = !brand || boxes.every((box, index) => !elements[index].dataset.window || box.right <= brand.left + 1 || brand.right <= box.left + 1 || box.bottom <= brand.top + 1 || brand.bottom <= box.top + 1);
      if (sizeStable && contentFits && separated && brandClear) return resolve();
      if (performance.now() - start > 8000) return reject(new Error(`Home windows did not become usable: ${JSON.stringify({ sizeStable, contentFits, separated, brandClear, brand: brand?.toJSON(), boxes: boxes.map((r, i) => ({key: elements[i].dataset.window || 'photo', ...r.toJSON()})) })}`));
      before = boxes; requestAnimationFrame(inspect);
    }
    inspect();
  }));

  for (const { width, height } of (env.skipTouch ? [] : [{ width: 320, height: 844 }, { width: 390, height: 844 }, { width: 700, height: 844 }, { width: 320, height: 688 }])) {
    const label = `touch home ${width}x${height}`;
    console.log(`[redesign-qa] START ${label}`);
    const { context, page, errors } = await openAuditedPage(browser, baseUrl, { width, height }, label, { hasTouch: true, isMobile: true });
    try {
      await page.goto(`${baseUrl}/`); await waitForStablePage(page);
      await settled(page);
      const initialPhoto = await page.locator('[data-photo-window]').boundingBox();
      check(await page.locator('[data-photo-window] img').evaluate(image => image.complete && image.naturalWidth > 100), `${label}: supplied avatar loads`);
      for (const key of sections) {
        console.log(`[redesign-qa] ${label} ${key}`);
        const window = page.locator(`[data-window="${key}"]`);
        const homeUrl = page.url(), historyBeforeTap = await page.evaluate(() => history.length);
        await window.locator('.window-title').tap();
        check(page.url() === homeUrl, `${label} ${key}: first tap stays on the home`);
        check(await page.evaluate(() => history.length) === historyBeforeTap, `${label} ${key}: preview adds no navigation history`);
        await settled(page);
        if (width === 320 && key === 'about') {
          await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false })));
          check(await window.locator('.window-enter').isVisible(), 'initial pageshow preserves a preview opened before load completion');
        }
        if (!await window.locator('.window-enter').isVisible()) {
          await screenshot(page, `home-failure-${width}x${height}-${key}.png`);
          console.log('[redesign-qa] home preview failure', await page.evaluate(() => ({
            active: document.activeElement?.outerHTML,
            windows: [...document.querySelectorAll('[data-window]')].map((el) => ({ key: el.dataset.window, open: el.classList.contains('is-open'), expanded: el.querySelector('.window-title').getAttribute('aria-expanded'), hidden: el.querySelector('.window-preview').hidden, rect: el.getBoundingClientRect().toJSON() }))
          })));
        }
        check(await window.locator('.window-enter').isVisible(), `${label} ${key}: Enter is visible`);
        const box = await window.locator('.window-enter').boundingBox();
        check(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= height, `${label} ${key}: Enter is reachable`);
        check(await window.evaluate((el) => el.querySelector('.window-enter').getBoundingClientRect().bottom <= el.getBoundingClientRect().bottom), `${label} ${key}: Enter fits inside the expanded window`);
        const point = await window.locator('.window-enter').evaluate((link) => {
          const r = link.getBoundingClientRect(); return link.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        });
        check(point, `${label} ${key}: Enter is not occluded`);
        const photo = await page.locator('[data-photo-window]').boundingBox();
        check(JSON.stringify(photo) === JSON.stringify(initialPhoto), `${label} ${key}: photo does not move or scale during yielding`);
        check(await page.locator('[data-window].is-open').count() === 1, `${label} ${key}: only one touch preview is open`);
        if (width === 390 && key === 'research') await screenshot(page, 'home-research-preview-mobile-390.png');
        if (width === 320 && height === 688 && key === 'room') await screenshot(page, 'home-room-preview-mobile-320x688.png');
        const url = await window.locator('.window-enter').getAttribute('href');
        const destination = key === 'room' ? '/magic-cabin/index.html?view=shelf' : url.slice(1);
        await Promise.all([page.waitForURL(`**${destination}`), window.locator('.window-enter').tap()]);
        check(page.url().endsWith(destination), `${label} ${key}: Enter navigates to the section`);
        if (key === 'room') {
          await page.waitForFunction(() => document.body.dataset.cabinFocus === 'shelf');
          await page.locator('.cabin-return').click();
          check(page.url().endsWith('/writing.html'), `${label} Room returns to the existing Writing list`);
        }
        if (key === 'works') await page.locator('.brand-mark').click();
        else await page.locator('.reading-mobile-top > a').click();
        await page.locator('[data-photo-window]').waitFor(); await settled(page);
        check(await page.locator('[data-window]').count() === 6, `${label} ${key}: return shows all six section windows`);
      }
      await assertNoOverflow(page, label); await assertNoRuntimeErrors(errors, label);
    } finally { await context.close(); }
  }

  {
    const label = 'home with reduced motion';
    const { context, page, errors } = await openAuditedPage(browser, baseUrl, { width: 320, height: 688 }, label, { hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    try {
      await page.goto(`${baseUrl}/`); await waitForStablePage(page);
      await settled(page);
      const photo = await page.locator('[data-photo-window]').boundingBox();
      for (const key of sections) {
        await page.locator(`[data-window="${key}"] .window-title`).tap(); await settled(page);
        const enter = page.locator(`[data-window="${key}"] .window-enter`);
        const box = await enter.boundingBox();
        check(box.x >= 0 && box.x + box.width <= 320 && box.y >= 0 && box.y + box.height <= 688, `reduced-motion ${key}: Enter remains reachable at 320x688`);
        check(await enter.evaluate(link => {
          const rect = link.getBoundingClientRect(); return link.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
        }), `reduced-motion ${key}: Enter is not occluded`);
        check(await page.locator('[data-window].is-open').count() === 1, `reduced-motion ${key}: one preview is open and all windows settle without overlapping`);
        check(JSON.stringify(await page.locator('[data-photo-window]').boundingBox()) === JSON.stringify(photo), `reduced-motion ${key}: the photo does not move or scale during yielding`);
      }
      await screenshot(page, 'home-room-preview-reduced-320x688.png');
      await assertNoOverflow(page, label);
      await assertNoRuntimeErrors(errors, label);
    } finally { await context.close(); }
  }

  {
    const label = 'desktop home hover, keyboard and canvas drag';
    console.log(`[redesign-qa] START ${label}`);
    const { context, page, errors } = await openAuditedPage(browser, baseUrl, { width: 1440, height: 1000 }, label);
    try {
      await page.goto(`${baseUrl}/`); await waitForStablePage(page);
      const photo = await page.locator('[data-photo-window]').boundingBox();
      const writing = page.locator('[data-window="writing"]');
      await writing.hover(); await settled(page);
      check(await writing.locator('.window-preview').isVisible(), 'desktop hover opens content inside the same Writing window');
      check(await writing.locator('.window-title').isVisible(), 'desktop hover preserves the section title');
      check(JSON.stringify(await page.locator('[data-photo-window]').boundingBox()) === JSON.stringify(photo), 'desktop photo does not yield to hover');
      await screenshot(page, 'home-writing-preview-desktop-1440.png');
      await page.mouse.move(0, 0);
      // Establish a known focus origin after the independent pointer audit.
      // A fresh page/hover does not guarantee the browser's Tab starting point.
      await page.locator('.entrance-skip').focus();
      check(await page.locator('.entrance-skip').evaluate((el) => el === document.activeElement && el.getBoundingClientRect().top >= 0), 'the direct Writing skip link is visible when focused');
      await page.keyboard.press('Tab');
      check(await writing.locator('.window-title').evaluate((el) => el === document.activeElement), 'keyboard reaches the Writing title');
      check(await writing.locator('.window-preview').isVisible(), 'keyboard focus can open a preview');
      await page.keyboard.press('Tab'); await page.keyboard.press('Escape');
      check(await writing.locator('.window-title').evaluate((el) => el === document.activeElement), 'Escape returns focus to the visible title');
      check(await page.locator('[data-window].is-open').count() === 0, 'Escape closes previews');
      const box = await writing.locator('.window-title').boundingBox();
      await page.mouse.move(box.x + 20, box.y + 12); await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 90, { steps: 12 }); await page.mouse.up();
      check(page.url() === `${baseUrl}/`, 'releasing a canvas drag does not navigate');
      await settled(page);
      const movedPhoto = await page.locator('[data-photo-window]').boundingBox();
      const photoDelta = { x: movedPhoto.x - photo.x, y: movedPhoto.y - photo.y, width: movedPhoto.width - photo.width, height: movedPhoto.height - photo.height };
      console.log('[redesign-qa] canvas drag photo delta', photoDelta);
      check(photoDelta.x > 20 && photoDelta.y > 20 && Math.abs(photoDelta.width) < .01 && Math.abs(photoDelta.height) < .01, 'the confirmed photo moves with the dragged canvas without scaling');
      await writing.hover(); await settled(page);
      await Promise.all([page.waitForURL('**/writing.html'), writing.locator('.window-picture').click()]);
      check(page.url().endsWith('/writing.html'), 'desktop clicking preview content enters the same section');
      await assertNoRuntimeErrors(errors, label);
    } finally { await context.close(); }
  }

  for (const route of ['project', 'research', 'about', 'article.html?sample=reading']) {
    const article = route.startsWith('article');
    const label = `inline navigation ${route}`;
    console.log(`[redesign-qa] START ${label}`);
    const { context, page, errors } = await openAuditedPage(browser, baseUrl, { width: 390, height: route === 'about' ? 780 : 844 }, label);
    try {
      await page.goto(`${baseUrl}/${article ? route : `${route}.html`}`); await waitForStablePage(page);
      const toggle = page.locator('[data-menu-toggle]'), directory = page.locator('[data-directory-toggle]');
      const history = await page.evaluate(() => window.history.length);
      const origin = await page.evaluate(() => performance.timeOrigin);
      const top = await page.locator('#content').evaluate((el) => el.getBoundingClientRect().top);
      await toggle.click();
      check(await page.locator('[data-mobile-navigation]').isVisible(), `${label}: section list expands inline`);
      check(await page.locator('#content').evaluate((el) => el.getBoundingClientRect().top) > top + 200, `${label}: opening navigation moves the article down`);
      const rows = await page.locator('[data-mobile-navigation] a').evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
      check(rows.length === 6 && rows.every((h) => h >= 44), `${label}: six shared full-row touch targets`);
      if (route === 'about') await screenshot(page, 'about-navigation-open-mobile-390.png');
      await page.locator('[data-mobile-navigation] a[aria-current="page"]').click();
      check(await page.evaluate(() => performance.timeOrigin) === origin, `${label}: selecting the current section does not reload`);
      check(!await page.locator('[data-mobile-navigation]').isVisible(), `${label}: current section selection closes navigation`);
      await directory.click();
      check(await page.locator('[data-mobile-toc]').isVisible(), `${label}: directory expands inline`);
      if (route === 'research') await screenshot(page, 'research-directory-open-mobile-390.png');
      await toggle.click();
      check(!await page.locator('[data-mobile-toc]').isVisible(), `${label}: opening navigation closes the directory`);
      await toggle.click(); await directory.click();
      check(!await page.locator('[data-mobile-navigation]').isVisible(), `${label}: opening the directory keeps navigation closed`);
      const jump = page.locator('[data-mobile-toc] a').nth(1);
      const hash = await jump.getAttribute('href'); await jump.click();
      await page.waitForFunction(() => document.activeElement?.tagName.match(/^H[1-6]$/));
      check(!await page.locator('[data-mobile-toc]').isVisible(), `${label}: selecting a heading closes the directory`);
      const box = await page.locator(hash).boundingBox();
      check(box.y >= 0 && box.y < 760, `${label}: destination heading remains visible`);
      check(await page.evaluate(() => window.history.length) === history, `${label}: inline controls and heading jumps add no history entries`);
      await assertNoOverflow(page, label); await assertNoRuntimeErrors(errors, label);
    } finally { await context.close(); }
  }

  {
    const label = 'Chinese sample and wide content';
    console.log(`[redesign-qa] START ${label}`);
    const { context, page, errors } = await openAuditedPage(browser, baseUrl, { width: 320, height: 844 }, label);
    try {
      await page.goto(`${baseUrl}/article.html?sample=reading`); await waitForStablePage(page);
      const state = await page.evaluate(() => {
        const body = document.querySelector('[data-article-body]');
        const wide = body.querySelector('pre'), table = body.querySelector('.reading-table-scroll');
        return { paragraphs: body.querySelectorAll('p').length, headings: body.querySelectorAll('h2').length,
          lists: body.querySelectorAll('li').length, quotes: body.querySelectorAll('blockquote').length,
          codeOverflow: wide.scrollWidth > wide.clientWidth, tableOverflow: table.scrollWidth > table.clientWidth,
          codeStyle: getComputedStyle(wide).overflowX, tableStyle: getComputedStyle(table).overflowX,
          notice: document.querySelector('[data-article-notice]').textContent };
      });
      check(state.paragraphs > 10 && state.headings === 6 && state.lists === 3 && state.quotes === 1, 'Chinese sample renders real paragraphs, headings, list and quote');
      check(state.codeOverflow && state.tableOverflow && state.codeStyle === 'auto' && state.tableStyle === 'auto', 'wide code and table scroll inside their own regions');
      check(state.notice.includes('合成中文样文') && state.notice.includes('不代表'), 'sample is explicitly synthetic and unpublished');
      await assertNoOverflow(page, label); await assertNoRuntimeErrors(errors, label);
    } finally { await context.close(); }
  }

  {
    const label = 'Writing filters and Research article history';
    console.log(`[redesign-qa] START ${label}`);
    const { context, page, errors } = await openAuditedPage(browser, baseUrl, { width: 390, height: 844 }, label);
    try {
      await page.goto(`${baseUrl}/writing.html`); await waitForStablePage(page);
      const writing = await page.evaluate(() => window.ALEKSI_SITE.writing);
      check(writing.length === 41 && writing.every(entry => entry.approved === true) && new Set(writing.map(entry => entry.source)).size === 41, 'Writing exposes all 41 unique approved records');
      for (const filter of ['all', 'note', 'long']) {
        await page.locator(`.writing-mobile-filters [data-filter="${filter}"]`).click();
        const expected = writing.filter(entry => filter === 'all' || entry.type === filter);
        const sources = await page.locator('[data-writing-list] .writing-entry h2 a').evaluateAll(links => links.map(link => new URL(link.href).searchParams.get('src')));
        check(JSON.stringify(sources) === JSON.stringify(expected.map(entry => entry.source)), `Writing ${filter} filter shows exactly its ${expected.length} indexed articles`);
        check(!await page.locator('[data-reading-sample], [data-writing-list] .is-pending').count(), `Writing ${filter} filter excludes synthetic samples and pending cards`);
        check((await page.locator('[data-filter-status]').textContent()).trim() === `${expected.length} 篇文章`, `Writing ${filter} filter reports the actual article count`);
        if (!expected.length) check((await page.locator('[data-writing-list]').innerText()).includes('这个分类暂无文章。'), `Writing ${filter} filter has a genuine empty-category state`);
      }
      // Open a real imported article; allow future classifications with no long articles.
      if (!writing.some(entry => entry.type === 'long')) await page.locator('.writing-mobile-filters [data-filter="all"]').click();
      const firstArticle = page.locator('[data-writing-list] .writing-entry h2 a').first();
      const firstSource = new URL(await firstArticle.getAttribute('href'), baseUrl).searchParams.get('src');
      await firstArticle.click(); await waitForStablePage(page);
      check(new URL(page.url()).searchParams.get('src') === firstSource && (await page.locator('[data-article-body]').innerText()).length > 100, 'Writing opens the selected imported Markdown body');
      check((await page.locator('.reading-mobile-top [data-article-return]').getAttribute('href')) === './writing.html', 'Writing article has a clear return to its list');
      await page.locator('.reading-mobile-top [data-article-return]').click();
      check(page.url().endsWith('/writing.html'), 'article return reaches the Writing list');

      // A test-only association exercises the Research-to-article return path.
      // It is injected into the intercepted response, never saved or published.
      const source = 'content/design/works/lucia-punishing-gray-raven/article.md';
      const seed = { title: 'QA 合成标题', date: '2026-01-01', description: 'QA fixture only', type: 'long', source, approved: true };
      await page.route('**/site-data.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body:
        fs.readFileSync(path.join(root, 'site-data.js'), 'utf8') + `\nwindow.ALEKSI_SITE.writing = ${JSON.stringify([seed])}; window.ALEKSI_SITE.researchArticles = ${JSON.stringify([source])};` }));
      await page.goto(`${baseUrl}/research.html`); await waitForStablePage(page);
      await page.locator('[data-research-articles] a').click(); await waitForStablePage(page);
      check((await page.locator('[data-article-body]').innerText()).length > 100, 'Research opens the existing shared Markdown body');
      check((await page.locator('.reading-mobile-top [data-article-return]').getAttribute('href')) === './research.html', 'Research article preserves its source return');
      await page.goBack(); check(page.url().endsWith('/research.html'), 'browser Back returns from a shared article to Research');
      await page.goto(`${baseUrl}/work-detail.html?work=lucia-punishing-gray-raven`); await waitForStablePage(page);
      await page.locator('[data-work-article-link]').click(); await waitForStablePage(page);
      check((await page.locator('.reading-mobile-top [data-article-return]').getAttribute('href')).includes('work-detail.html?work=lucia-punishing-gray-raven'), 'legacy Works article returns to its exact detail');
      await page.locator('.reading-mobile-top [data-article-return]').click();
      check(page.url().includes('work-detail.html?work=lucia-punishing-gray-raven'), 'legacy Works detail return works');
      await page.goto(`${baseUrl}/article.html?src=${encodeURIComponent(source)}`); await waitForStablePage(page);
      check((await page.locator('.reading-mobile-top [data-article-return]').getAttribute('href')) === './writing.html', 'a directly opened article without a known source returns to Writing');
      await assertNoRuntimeErrors(errors, label);
    } finally { await context.close(); }
  }

  // Every image preview must stay open and clear of the photo at desktop edges.
  for (const width of [1024, 1280]) {
    const label = `all desktop previews ${width}x720`;
    const { context, page, errors } = await openAuditedPage(browser, baseUrl, { width, height: 720 }, label);
    try {
      await page.goto(`${baseUrl}/`); await waitForStablePage(page);
      for (const key of sections) {
        await page.locator(`[data-window="${key}"] .window-title`).hover(); await settled(page);
        check(await page.locator(`[data-window="${key}"] .window-preview`).isVisible(), `${label} ${key}: expansion remains under the pointer`);
        check(await page.locator(`[data-window="${key}"] .window-picture img`).evaluate(img => img.complete && img.naturalWidth > 0 && img.getBoundingClientRect().height > 20), `${label} ${key}: real preview image is visible`);
        await page.mouse.move(2, 2); await settled(page);
      }
      await assertNoRuntimeErrors(errors, label);
    } finally { await context.close(); }
  }

  // Narrow and intermediate widths cover the sidebar collapse boundaries.
  for (const width of [320, 760, 768, 1100, 1101]) {
    const label = `reading breakpoint ${width}`;
    const { context, page, errors } = await openAuditedPage(browser, baseUrl, { width, height: 844 }, label);
    try {
      await page.goto(`${baseUrl}/project.html`); await waitForStablePage(page); await assertNoOverflow(page, label);
      const left = await page.locator('.reading-left').isVisible(), right = await page.locator('.reading-right').isVisible();
      check(!left && right === (width > 1100), `${label}: shared header replaces the left navigation and directory respects available space`);
      await assertNoRuntimeErrors(errors, label);
    } finally { await context.close(); }
  }
  fs.writeFileSync(path.join(outputDir, 'redesign-results.json'), JSON.stringify({ checks: results.length, results }, null, 2) + '\n');
  console.log(`[redesign-qa] PASS ${results.length} behavioral checks`);
  return results.length;
}

module.exports = { run };
