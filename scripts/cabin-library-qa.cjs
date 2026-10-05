/* Integration fixtures exist only in intercepted HTTP responses, never the publication index. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.CABIN_PLAYWRIGHT_MODULE || 'C:/Users/pcp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { createServer } = require('../server.js');
const output = path.resolve(__dirname, '../qa-artifacts/cabin-library');
fs.mkdirSync(output, { recursive: true });
const checks = [], errors = [], requests = [], observations = [];
const fixture = Array.from({ length: 120 }, (_, i) => ({ title: `文章 ${String(i + 1).padStart(3, '0')}`, source: `content/cabin-qa/article-${String(i + 1).padStart(3, '0')}.md`, date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10), description: `第 ${i + 1} 篇的独立简介`, type: i % 2 ? 'note' : 'long', tags: [i % 3 ? '思考' : '记录'], approved: true }));
const longBody = `## 开始阅读\n\n正文标记一二零。这里的正文来自文章本身。\n\n${'极长段落有连续的内容、中文标点和 emoji 🌲，分页需要完整保存每一个字符。'.repeat(80)}\n\n## 列表与引用\n\n${Array.from({ length: 28 }, (_, i) => `${i + 1}. 列表项目 ${i + 1}：${'保持次序和完整语义。'.repeat(5)}`).join('\n')}\n\n> 引用中的文字也必须保存。\n\n[正文内链接](https://example.com/reading)与**加粗文字**和*斜体文字*。\n\n### 代码和表格\n\n\`\`\`js\nconst veryWideLine = '${'abcdef'.repeat(30)}';\nconsole.log(veryWideLine);\n\`\`\`\n\n| 列一 | 列二 | 列三 |\n| --- | --- | --- |\n| ${'宽表格内容'.repeat(15)} | 中间 | 最后 |\n\n![示意图片](./image.svg)\n\n## 最后章节\n\n文章末尾唯一标记 END-ARTICLE-120。`;
const markdown = id => `---\ntitle: 文章 ${String(id).padStart(3, '0')}\n---\n# 文章 ${String(id).padStart(3, '0')}\n\n${id === 120 ? longBody : `## 独立正文\n\n这是文章 ${id} 的真实测试正文，唯一标记 ARTICLE-BODY-${id}。\n\n${id===119?'数学公式 $x^2+y^2=z^2$。\n\n':''}## 第二章节\n\n${('后续内容 ' + id + '。').repeat(35)}`}`;
const audit = `window.__libraryScene = {
  books: () => shelfBooks.map(b => ({ out:b.userData.out, label:b.userData.aimLabel, source:window.CabinLibrary.getSlot(b.userData.bookIndex)?.source || null })),
  point: i => { const b=shelfBooks[i], h=b.children[0].children[0].geometry.parameters.height; scene.updateMatrixWorld(true); const p=b.localToWorld(new THREE.Vector3(.125,h/2,0)).project(camera); return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}; }
};`;
const paginationAudit = `window.__paginationRuns = []; window.CabinBookPagination = Object.freeze({paginate:async (...args) => { const result=await paginate(...args); window.__paginationRuns.push({html:args[0],result:structuredClone(result),width:args[1].getBoundingClientRect().width}); return result; }});`;
function check(condition, description, detail) { assert(condition, description + (detail ? ': ' + JSON.stringify(detail) : '')); checks.push(description); console.log('PASS ' + description); }
async function waitReady(page) { await page.waitForFunction(() => window.__libraryScene && document.body.dataset.cabinFocus === 'shelf', null, { timeout: 25000 }); }
async function waitBook(page) { await page.locator('#bookReader[open]').waitFor(); await page.waitForFunction(() => document.querySelector('#bookReader').getAttribute('aria-busy') === 'false' && document.querySelector('#readerStatus').textContent === '', null, { timeout: 25000 }); }
async function closeBook(page) { await page.locator('#readerClose').click(); await page.locator('#bookReader[open]').waitFor({ state: 'hidden' }); }
async function openSpine(page, index = 0, touch = false) {
  const point = await page.evaluate(i => window.__libraryScene.point(i), index);
  const hit = await page.evaluate(p => document.elementFromPoint(p.x,p.y)?.id, point);
  check(hit === 'cabinCanvas', '3D spine click reaches scene canvas (' + index + ')', { point, hit });
  if (touch) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
  await waitBook(page);
}
async function openByTitle(page, title) { if (!await page.locator('#libraryDirectory').evaluate(el=>el.open)) await page.locator('#libraryDirectory summary').click(); await page.locator('#libraryList button').filter({ hasText: title }).click(); await waitBook(page); }
async function turn(page) { const previous = await page.locator('#bookReader').getAttribute('data-page'); await page.locator('#readerNext').click(); await page.waitForFunction(old => document.querySelector('#bookReader').dataset.page !== old && document.querySelector('#flipSheet').hidden, previous); }
async function verifyCompletePages(page, label) {
  await page.keyboard.press('Home');
  const visible = [], layouts = [], media = [], links = [];
  for (let count = 0; count < 180; count++) {
    await page.locator('#pageLeft .book-prose img,#pageRight .book-prose img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>{}))));
    const current = await page.evaluate(() => [...document.querySelectorAll('#pageLeft,#pageRight')].filter(el => getComputedStyle(el).display !== 'none').map(el => ({ text: el.querySelector('.book-prose')?.textContent || '', overflow: el.querySelector('.book-prose') ? { x: el.querySelector('.book-prose').scrollWidth - el.querySelector('.book-prose').clientWidth, y: el.querySelector('.book-prose').scrollHeight - el.querySelector('.book-prose').clientHeight, scroll: Boolean(el.querySelector('[data-page-scroll]')) } : null })));
    visible.push(...current.map(item => item.text)); layouts.push(...current.map(item => item.overflow).filter(Boolean));
    media.push(...await page.locator('#pageLeft .book-prose img,#pageRight .book-prose img').evaluateAll(images => images.map(image=>({src:image.src,width:image.naturalWidth,alt:image.alt}))));
    links.push(...await page.locator('#pageLeft .book-prose a,#pageRight .book-prose a').evaluateAll(anchors=>anchors.map(anchor=>({href:anchor.href,text:anchor.textContent}))));
    if (await page.locator('#readerNext').isDisabled()) break;
    await turn(page);
    if (count === 179) throw new Error('Unexpected page count exceeds safety bound');
  }
  const expected = await page.evaluate(() => { const node = document.createElement('div'); node.innerHTML = window.__paginationRuns.at(-1).html; return node.textContent; });
  const normalize = text => text.replace(/\s+/gu, '');
  check(normalize(visible.join('')) === normalize(expected), label + ': traversing every visible paper page preserves complete article text', { expectedLength: normalize(expected).length, actualLength: normalize(visible.join('')).length });
  check(layouts.every(item => item.x <= 2 && (item.y <= 2 || item.scroll)), label + ': prose fits paper or exposes scrolling for indivisible blocks', layouts.filter(item => item.x > 2 || item.y > 2 && !item.scroll));
  check(media.length>0 && media.every(image=>image.width>0 && image.alt==='示意图片' && image.src.endsWith('/content/cabin-qa/image.svg')), label+': article-relative images load inside physical pages',media);
  check(links.some(link=>link.href==='https://example.com/reading' && link.text==='正文内链接'),label+': article links remain working anchors');
  observations.push({ viewport: page.viewportSize(), pages: await page.locator('#readerProgress').textContent(), articleCharacters: normalize(expected).length });
}
async function install(page, options = {}) {
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/magic-cabin/index.html*', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace('            animate(0);', audit + '\n            animate(0);') }); });
  await page.route('**/magic-cabin/book-pagination.js', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace('window.CabinBookPagination = Object.freeze({ paginate });', paginationAudit) }); });
  if (options.emptyIndex) await page.route('**/site-data.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()) + '\nwindow.ALEKSI_SITE.writing = []; window.ALEKSI_SITE.researchArticles = [];\n' });
  });
  else if (options.fixtures !== false) await page.route('**/site-data.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.ALEKSI_SITE=' + JSON.stringify({ writing: [...fixture, {...fixture[0],title:'重复来源不能出现'}, {...fixture[1],source:'content/qa-unapproved.md',approved:false}, {...fixture[1],source:'../private.md'}], researchArticles: [], works: [], navigation: [] }) }));
  await page.route('**/content/cabin-qa/*.md', async route => {
    const id = Number(/article-(\d+)\.md/.exec(route.request().url())[1]); requests.push(id);
    if (id === 118 && options.failOnce && !options.failed) { options.failed = true; await route.fulfill({ status: 503, body: 'Synthetic one-time failure' }); return; }
    if (id === 117 && options.delay) await options.delay;
    await route.fulfill({ contentType: 'text/markdown; charset=utf-8', body: markdown(id) });
  });
  await page.route('**/content/cabin-qa/image.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160"><rect width="480" height="160" fill="#e2e1d8"/><path d="M20 100L140 20L250 125L420 40" stroke="#333" fill="none"/></svg>' }));
}
async function verifyActualLibrary(page, label, openArticle = false) {
  const writing = await page.evaluate(() => window.ALEKSI_SITE.writing);
  check(writing.length === 41 && writing.every(entry => entry.approved === true) && new Set(writing.map(entry => entry.source)).size === 41, label + ': actual index contains 41 unique approved articles');
  check(await page.locator('#libraryCount').textContent() === '1–36 / 41' && await page.locator('#libraryList button').count() === 36, label + ': first batch contains 36 actual articles');
  check(!(await page.locator('#libraryNotice').textContent()).includes('本地排版样文'), label + ': populated index excludes the local sample');
  const sources = (await page.evaluate(() => window.__libraryScene.books())).map(book => book.source).filter(Boolean);
  await page.locator('#libraryNext').click();
  check(await page.locator('#libraryCount').textContent() === '37–41 / 41' && await page.locator('#libraryList button').count() === 5 && await page.locator('#libraryNext').isDisabled(), label + ': final batch contains the remaining five actual articles');
  const lastSources = (await page.evaluate(() => window.__libraryScene.books())).map(book => book.source).filter(Boolean);
  sources.push(...lastSources);
  check(lastSources.length === 5 && new Set(sources).size === 41 && JSON.stringify(sources.sort()) === JSON.stringify(writing.map(entry => entry.source).sort()), label + ': both physical shelf batches cover the actual index exactly once');
  if (openArticle) {
    const selected = await page.evaluate(() => window.CabinLibrary.getSlot(0));
    await openByTitle(page, selected.title);
    check(await page.locator('#bookReader').getAttribute('data-book') === selected.source && await page.locator('#readerTitle').textContent() === selected.title, label + ': second-batch book keeps the selected article title and source');
    check((await page.locator('#bookSpread').textContent()).trim().length > 100, label + ': actual imported Markdown appears in the physical reader');
    check(new URL(await page.locator('#readerArticle').getAttribute('href'), page.url()).searchParams.get('src') === selected.source, label + ': continuous reader points to the same imported source');
    await closeBook(page);
  }
}
async function installPublishedHost(page, base, emptyIndex = false) {
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('http://cabin-qa.example/**', async route => {
    const requestUrl = new URL(route.request().url());
    const response = await route.fetch({ url: base + requestUrl.pathname + requestUrl.search });
    let body = await response.body();
    if (requestUrl.pathname.endsWith('/magic-cabin/index.html')) body = Buffer.from(body.toString().replace('            animate(0);', audit + '\n            animate(0);'));
    if (emptyIndex && requestUrl.pathname === '/site-data.js') body = Buffer.from(body.toString() + '\nwindow.ALEKSI_SITE.writing = []; window.ALEKSI_SITE.researchArticles = [];\n');
    await route.fulfill({ response, body });
  });
}
async function swipe(page) {
  const b = await page.locator('#bookObject').boundingBox(), session = await page.context().newCDPSession(page), x = b.x + b.width * .91, y = b.y + b.height * .6;
  try { await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] }); for (let i=1;i<=10;i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x:x-b.width*.68*i/10, y, id:0 }] }); await session.send('Input.dispatchTouchEvent', { type:'touchEnd',touchPoints:[] }); await page.waitForFunction(() => document.querySelector('#flipSheet').hidden); } finally { await session.detach(); }
}
(async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`, url = base + '/magic-cabin/index.html?view=shelf';
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  let page;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page = await context.newPage(); let release; const options = { failOnce: true, delay: new Promise(resolve => { release = resolve; }) }; await install(page, options); await page.goto(url); await waitReady(page);
    check(await page.locator('#libraryCount').textContent() === '1–36 / 120', '120 approved article index begins with 36 slots');
    check(await page.locator('#libraryList button').count() === 36, 'First shelf batch lists exactly 36 articles');
    check(!(await page.locator('body').textContent()).includes('黑白之间'), 'Unrequested cabin title and slogan removed');
    await page.screenshot({ path: path.join(output, 'desktop-library.png') });
    for (let i=0;i<3;i++) await page.locator('#libraryNext').click();
    check(await page.locator('#libraryCount').textContent() === '109–120 / 120' && await page.locator('#libraryList button').count() === 12, 'Fourth batch contains remaining 12 articles');
    check((await page.evaluate(() => window.__libraryScene.books())).filter(book => book.source).length === 12, 'Only 12 final-batch physical slots resolve to content');
    await page.locator('#librarySearch').fill('文章 042'); check(await page.locator('#libraryList button').count() === 1 && (await page.locator('#libraryList button span').textContent()) === '文章 042', 'Search reaches article outside current 36 slots');
    await page.locator('#librarySearch').fill(''); await page.locator('#libraryType').selectOption('note'); check((await page.locator('#libraryCount').textContent()).endsWith('/ 60'), 'Type filter reaches all 60 notes');
    await page.locator('#libraryTag').selectOption('记录'); check((await page.locator('#libraryCount').textContent()).endsWith('/ 20'), 'Tag and type filters combine across entire index');
    await page.locator('#libraryType').selectOption('all'); await page.locator('#libraryTag').selectOption(''); await page.locator('#librarySort').selectOption('oldest'); check(await page.locator('#libraryList button span').first().textContent() === '文章 001', 'Oldest-first sorting applies to full collection');
    await page.locator('#librarySort').selectOption('newest');
    await openSpine(page); check(await page.locator('#bookReader').getAttribute('data-book') === fixture[119].source, 'Actual 3D book opens matching article source');
    check(await page.locator('#readerTitle').textContent() === fixture[119].title && requests.includes(120), 'Book title and loaded Markdown correspond to same article');
    check((await page.locator('#readerArticle').getAttribute('href')).includes(encodeURIComponent(fixture[119].source)), 'Continuous reader links to canonical source');
    await page.screenshot({ path:path.join(output,'desktop-article.png') });
    await verifyCompletePages(page,'Desktop');
    await page.locator('#readerContents').click(); await page.locator('#readerDirectory button').filter({ hasText: '最后章节' }).click();
    check(await page.locator('#bookSpread').textContent().then(text=>text.includes('END-ARTICLE-120')), 'Table of contents jumps to article final chapter');
    const bookmark = await page.locator('#bookReader').getAttribute('data-page'); await closeBook(page); await openSpine(page); check(await page.locator('#bookReader').getAttribute('data-page') === bookmark, 'Reopening article restores reading position');
    await closeBook(page); await openSpine(page,1); check(await page.locator('#bookReader').getAttribute('data-page') === '0' && (await page.locator('#bookSpread').textContent()).includes('ARTICLE-BODY-119'), 'Separate source gets independent body and reading position');
    check(await page.locator('#bookSpread .katex').count()>0,'Mathematical article renders KaTeX inside physical book');
    await closeBook(page);
    await page.locator('#libraryDirectory summary').click(); await page.locator('#libraryList button').filter({hasText:'文章 118'}).click(); await page.locator('.page-retry').waitFor(); check(await page.locator('#readerStatus').textContent() === '读取失败', 'Failed article displays a retry action');
    await page.locator('.page-retry').click(); await waitBook(page); check((await page.locator('#bookSpread').textContent()).includes('ARTICLE-BODY-118'), 'Retry loads original article body after transient failure'); await closeBook(page);
    await page.locator('#libraryList button').filter({hasText:'文章 117'}).click(); await page.locator('#bookReader[open]').waitFor(); await closeBook(page); await openByTitle(page,'文章 116'); release(); await page.waitForTimeout(300);
    check(await page.locator('#bookReader').getAttribute('data-book') === fixture[115].source && (await page.locator('#bookSpread').textContent()).includes('ARTICLE-BODY-116') && !(await page.locator('#bookSpread').textContent()).includes('ARTICLE-BODY-117'), 'Closing slow article then opening another prevents stale response replacing current book');
    await closeBook(page); await page.goto(url+'&src='+encodeURIComponent(fixture[4].source)); await waitBook(page);
    check(await page.locator('#libraryBatch').textContent()==='4 / 4' && await page.locator('#bookReader').getAttribute('data-book')===fixture[4].source && (await page.locator('#bookSpread').textContent()).includes('ARTICLE-BODY-5'), 'Shared source URL finds article on fourth shelf and opens matching body');
    await context.close();
    for (const width of [390,320]) {
      const mobile = await browser.newContext({ viewport:{width,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce' }); page=await mobile.newPage(); await install(page); await page.goto(url); await waitReady(page);
      check(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth+1), `${width}px: shelf controls fit viewport`);
      await openSpine(page,0,true); await page.screenshot({path:path.join(output,`mobile-${width}-article.png`)});
      await swipe(page); check(await page.locator('#bookReader').getAttribute('data-page') === '1', `${width}px: real touch swipe turns single page`);
      await verifyCompletePages(page,`${width}px`);
      await page.locator('#readerContents').click(); await page.locator('#readerDirectory button').filter({hasText:'最后章节'}).click(); check((await page.locator('#bookSpread').textContent()).includes('END-ARTICLE-120'), `${width}px: chapter jump exposes actual final content`);
      check(await page.locator('.reader-shell').evaluate(el=>el.scrollWidth<=innerWidth), `${width}px: reader toolbar and controls stay in viewport`);
      const runs=await page.evaluate(()=>window.__paginationRuns.length);
      await page.setViewportSize({width:900,height:600});
      await page.waitForFunction(count=>window.__paginationRuns.length>count && document.querySelector('#bookReader').getAttribute('aria-busy')==='false',runs);
      check((await page.locator('#bookSpread').textContent()).includes('END-ARTICLE-120'),`${width}px: rotation repaginates while preserving article position`);
      await mobile.close();
    }
    const local = await browser.newContext({viewport:{width:1000,height:800},reducedMotion:'reduce'}); page=await local.newPage(); await install(page,{fixtures:false}); await page.goto(url); await waitReady(page);
    await verifyActualLibrary(page, 'Local HTTP library', true);
    await page.screenshot({path:path.join(output,'actual-library-final-batch.png')});
    await local.close();

    // Empty-library behavior is isolated in a fresh context and HTTP response fixture.
    const localEmpty = await browser.newContext({viewport:{width:1000,height:800},reducedMotion:'reduce'}); page=await localEmpty.newPage(); await install(page,{fixtures:false,emptyIndex:true}); await page.goto(url); await waitReady(page);
    check((await page.locator('#libraryNotice').textContent()).includes('本地排版样文') && await page.locator('#libraryList button').count() === 1, 'Intercepted empty local index offers exactly one explicitly local-only sample');
    await openByTitle(page,'把一次尝试记录清楚'); check(await page.locator('#bookReader').getAttribute('data-book') === 'local-reading-sample', 'Isolated local fallback sample is readable through the shared article loader'); await localEmpty.close();

    for (const emptyIndex of [false, true]) {
      const deployed=await browser.newContext({viewport:{width:1000,height:800},reducedMotion:'reduce'}); page=await deployed.newPage();
      const sampleRequests = [];
      page.on('request', request => { if (new URL(request.url()).pathname === '/docs/fixtures/reading-sample.zh.md') sampleRequests.push(request.url()); });
      await installPublishedHost(page, base, emptyIndex);
      await page.goto('http://cabin-qa.example/magic-cabin/index.html?view=shelf'); await waitReady(page);
      if (emptyIndex) check(await page.locator('#libraryCount').textContent() === '0 篇' && await page.locator('#libraryList button').count() === 0, 'Intercepted empty non-local index never presents the unpublished local sample');
      else await verifyActualLibrary(page, 'Non-local HTTP library');
      check(sampleRequests.length === 0, `${emptyIndex ? 'Empty' : 'Populated'} non-local index never requests local sample content`);
      await deployed.close();
    }
    check(errors.length===0,'No uncaught browser runtime errors',errors);
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({status:'passed',browser:browser.version(),checks,observations,fixtureCount:fixture.length,actualArticleCount:41,fixturePublication:'HTTP interception only; production site-data.js untouched',errors},null,2));
    console.log(JSON.stringify({passed:checks.length,output}));
  } catch(error) { if(page&&!page.isClosed()) await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{}); fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({status:'failed',checks,observations,errors,error:error.stack},null,2)); throw error; }
  finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
