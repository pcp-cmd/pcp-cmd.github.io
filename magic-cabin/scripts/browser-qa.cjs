/* 通过真实点击、按键与拖动检查场景和阅读闭环。只在测试响应中注入只读观测接口。 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.CABIN_PLAYWRIGHT_MODULE || 'playwright');
const { createServer } = require('../server.cjs');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.CABIN_QA_OUTPUT || path.join(root, 'qa-artifacts'));
fs.mkdirSync(output, { recursive: true });
const checks = [], errors = [], requests = [];
// The site has no approved public articles yet. These fixtures exist only in
// intercepted QA responses; neither the article index nor Markdown is shipped.
const articleSource = 'content/cabin-scene-qa/first.md';
const fixtureIndex = { writing: [
  { title: '测试长文', description: '场景回归测试正文', date: '2026-10-05', type: 'long', source: articleSource, approved: true },
  { title: '测试短记', description: '第二篇场景测试正文', date: '2026-10-04', type: 'note', source: 'content/cabin-scene-qa/second.md', approved: true }
] };
const fixtureBody = '# 测试长文\n\n' + Array.from({ length: 28 }, (_, index) =>
  `${index % 4 === 0 ? '## 第 ' + (index / 4 + 1) + ' 节\n\n' : ''}段落 ${index + 1}。` +
  '这是从网站文章源读取的场景回归测试正文，用来验证实体书分页以后仍然承载同一篇文章，翻阅纸页不会替换文章内容。'.repeat(5)
).join('\n\n');
const observation = `
window.__cabinAudit = {
  state: () => ({ mode: viewMode, weather: wx.type, hour: curHour(), daylight: FILL.uniforms.uDaylight.value,
    player: player.pos.toArray(), velocity: player.vy, onGround: player.onGround, door: doorGroup.userData.spring.open,
    fire: fireLit, lamp: lampLit, cat: catAwake, slot: slotSel,
    fullHouse, houseVisible: fullHouseGroup.visible, hint: hintEl.textContent,
    camera: camera.position.toArray(), books: shelfBooks.map(b => ({ out: b.userData.out, x: b.position.x, base: b.userData.bx })),
    bindings: { magic: magicMeshes.length, hinges: hingeMeshes.length, books: shelfBooks.length },
    shelfCollider: platformBoxes.find(p => Math.abs((p.x1 + p.x2) / 2 - SFX) < .001 && Math.abs((p.z1 + p.z2) / 2 - SFZ) < .001)
  }),
  bookPoint: index => {
    const b = shelfBooks[index]; const height = b.children[0].children[0].geometry.parameters.height;
    scene.updateMatrixWorld(true);
    const point = b.localToWorld(new THREE.Vector3(.125, height / 2, 0)).project(camera);
    return { x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2 };
  },
  itemPoint: key => {
    const object = { cat: catG, fireplace: fireMeshes[0], sign: signG }[key];
    scene.updateMatrixWorld(true);
    const point = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).project(camera);
    return { x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2 };
  }
};
`;
function check(condition, message) { assert(condition, message); checks.push(message); console.log('PASS ' + message); }
async function state(page) { return page.evaluate(() => window.__cabinAudit.state()); }
async function attachAudit(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) requests.push(response.url() + ' ' + response.status()); });
  await page.route('**/site-data.js', route => route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: 'window.ALEKSI_SITE = ' + JSON.stringify(fixtureIndex) + ';' }));
  await page.route('**/content/cabin-scene-qa/*.md', route => route.fulfill({ contentType: 'text/markdown; charset=utf-8', body: fixtureBody }));
  await page.route('**/index.html', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace('            animate(0);', observation + '\n            animate(0);');
    await route.fulfill({ response, body: html });
  });
}
async function setRange(page, id, value) {
  await page.locator('#' + id).evaluate((input, val) => { input.value = val; input.dispatchEvent(new Event('input', { bubbles: true })); }, String(value));
}
async function openBook(page, index = 0, touch = false) {
  const point = await page.evaluate(i => window.__cabinAudit.bookPoint(i), index);
  if (touch) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
  await page.locator('#bookReader[open]').waitFor({ timeout: 6000 });
  await page.locator('#bookReader[aria-busy="false"]').waitFor({ timeout: 15000 });
}
async function dragPage(page, dir = 1, commit = true, capture = '') {
  const bounds = await page.locator('#bookObject').boundingBox();
  const compact = bounds.width < bounds.height;
  const start = dir > 0 ? bounds.x + bounds.width * .92 : bounds.x + bounds.width * .08;
  const distance = bounds.width * (compact ? .68 : .34) * (commit ? 1 : .14);
  const y = bounds.y + bounds.height * .60;
  await page.mouse.move(start, y); await page.mouse.down();
  await page.mouse.move(start - dir * distance, y, { steps: 12 });
  if (capture) await page.screenshot({ path: path.join(output, capture) });
  await page.mouse.up();
  await page.waitForFunction(() => document.getElementById('flipSheet').hidden, null, { timeout: 6000 });
}
async function swipeWithFinger(page) {
  const box = await page.locator('#bookObject').boundingBox();
  const x = box.x + box.width * .9, y = box.y + box.height * .6;
  const before = Number(await page.locator('#bookReader').getAttribute('data-page'));
  await page.evaluate(() => {
    window.__cabinTouchTrace = [];
    window.__recordCabinTouch = event => window.__cabinTouchTrace.push({
      type: event.type, pointer: event.pointerType, target: event.target.className,
      x: event.clientX, y: event.clientY
    });
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) document.addEventListener(type, window.__recordCabinTouch, true);
  });
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] });
    for (let i = 1; i <= 12; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - box.width * .64 * i / 12, y, id: 0 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(previous => Number(document.getElementById('bookReader').dataset.page) === previous + 1
      && document.getElementById('flipSheet').hidden, before, { timeout: 6000 });
  } catch (error) {
    console.error('Native touch trace:', await page.evaluate(() => window.__cabinTouchTrace));
    throw error;
  } finally {
    await page.evaluate(() => {
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) document.removeEventListener(type, window.__recordCabinTouch, true);
      delete window.__recordCabinTouch; delete window.__cabinTouchTrace;
    });
    await session.detach();
  }
}
(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/magic-cabin/index.html`;
  const browser = await chromium.launch({ headless: true, channel: process.env.CABIN_BROWSER_CHANNEL || 'msedge', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  let currentPage;
  try {
    let baseline;
    if (process.env.CABIN_ORIGINAL_HTML) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); currentPage = page;
      await page.route('**/baseline.html', async route => route.fulfill({ contentType: 'text/html', body: fs.readFileSync(process.env.CABIN_ORIGINAL_HTML, 'utf8').replace('            animate(0);', observation + '\n            animate(0);') }));
      await page.goto(url.replace('index.html', 'baseline.html'));
      await page.waitForFunction(() => window.__cabinAudit);
      baseline = (await state(page)).bindings;
      await page.close();
    }
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await desktop.newPage(); currentPage = page; await attachAudit(page); await page.goto(url);
    await page.waitForFunction(() => window.__cabinAudit); await page.waitForTimeout(800);
    const initial = await state(page);
    check(initial.bindings.books > 25, 'Original shelf retains its books');
    if (baseline) check(JSON.stringify(initial.bindings) === JSON.stringify(baseline), 'Magic, hinge and book registrations equal the supplied original');
    check(initial.shelfCollider.x1 > 3 && initial.shelfCollider.z1 > .5, 'Moved shelf and its collision body occupy the same corner');
    await page.screenshot({ path: path.join(output, 'modern-desktop.png') });
    await page.keyboard.press('KeyE');
    check((await state(page)).door === true, 'Original E interaction opens the entrance door');
    await page.locator('#viewTpBtn').click();
    check((await state(page)).mode === 'tp', 'Third-person view still works');
    const beforeWalk = (await state(page)).player;
    await page.keyboard.down('KeyW');
    try { await page.waitForFunction(before => { const after = window.__cabinAudit.state().player; return Math.hypot(after[0] - before[0], after[2] - before[2]) > .3; }, beforeWalk, { timeout: 6000 }); }
    finally { await page.keyboard.up('KeyW'); }
    const afterWalk = (await state(page)).player;
    check(Math.hypot(afterWalk[0] - beforeWalk[0], afterWalk[2] - beforeWalk[2]) > .3, 'Original player moves using WASD');
    await page.waitForFunction(() => window.__cabinAudit.state().onGround);
    await page.keyboard.down('Space');
    try { await page.waitForFunction(() => window.__cabinAudit.state().player[1] > .1, null, { timeout: 6000 }); }
    finally { await page.keyboard.up('Space'); }
    check((await state(page)).player[1] > .1, 'Original jump physics still runs');
    await page.locator('#viewFpBtn').click();
    check((await state(page)).mode === 'fp', 'First-person view still works');
    await page.locator('#viewFixedBtn').click();
    await page.locator('#menuDot').click();
    await page.locator('#resetBtn').click();
    await page.keyboard.press('Digit2'); check((await state(page)).slot === 2, 'Original wand selection still works');
    await page.keyboard.press('Digit1'); check((await state(page)).slot === 1, 'Original empty-hand selection still works');
    await page.locator('#houseToggle').click(); check((await state(page)).houseVisible, 'Full-house toggle still displays the exterior');
    const observedWeather = [];
    for (const weather of ['多云', '雾', '雨', '暴雨', '雪', '暴雪', '晴']) {
      await page.locator('.wxChip', { hasText: new RegExp('^' + weather + '$') }).click();
      observedWeather.push((await state(page)).weather);
    }
    check(JSON.stringify(observedWeather) === JSON.stringify(['cloudy', 'fog', 'rain', 'storm', 'snow', 'blizzard', 'sunny']), 'All seven existing weather controls respond');
    await setRange(page, 'speedSlider', 0); await setRange(page, 'timeSlider', 22);
    await page.waitForFunction(() => window.__cabinAudit.state().daylight < .01);
    check((await state(page)).hour === 22, 'Existing time control reaches night');
    await setRange(page, 'timeSlider', 10);
    await page.waitForFunction(() => window.__cabinAudit.state().daylight > .99);
    await page.locator('#sfxToggle').click(); await page.locator('#sfxToggle').click();
    check(await page.locator('#sfxToggle').evaluate(el => el.classList.contains('on')), 'Original sound setting can be toggled');
    await page.locator('#menuDot').click();
    await page.locator('#focusShelfBtn').click(); await page.waitForTimeout(500);
    check(!(await state(page)).fullHouse, 'Shelf focus reveals the cutaway when exterior was enabled');
    await page.screenshot({ path: path.join(output, 'modern-bookshelf.png') });
    await openBook(page);
    check(await page.locator('#readerTitle').textContent() === '测试长文'
      && (await page.locator('#pageRight .book-prose').textContent()).includes('网站文章源'), 'Clicking an actual 3D book opens its matching article in the physical reader');
    check((await state(page)).books[0].out, 'Opened book uses the original pull-out state');
    await page.screenshot({ path: path.join(output, 'modern-book-open.png') });
    const readingPosition = (await state(page)).player;
    await page.keyboard.down('KeyW'); await page.waitForTimeout(300); await page.keyboard.up('KeyW');
    const readingAfter = (await state(page)).player;
    check(Math.hypot(readingAfter[0] - readingPosition[0], readingAfter[2] - readingPosition[2]) < .01, 'Reading keys do not move the character behind the book');
    await page.locator('#readerNext').click(); await page.waitForFunction(() => document.getElementById('bookReader').dataset.page === '2');
    const pageProgress = await page.locator('#readerProgress').textContent();
    check(/^03–04 \/ \d+$/.test(pageProgress) && Number(pageProgress.split('/')[1]) > 6, 'Page-edge control turns a two-page spread of the dynamically paginated article');
    await page.screenshot({ path: path.join(output, 'modern-book-text.png') });
    await dragPage(page, 1, true, 'modern-book-drag.png');
    check(await page.locator('#bookReader').getAttribute('data-page') === '4', 'Dragging the physical sheet turns forward');
    await dragPage(page, -1, true);
    check(await page.locator('#bookReader').getAttribute('data-page') === '2', 'Dragging the left sheet turns backward');
    await dragPage(page, 1, false);
    check(await page.locator('#bookReader').getAttribute('data-page') === '2', 'A short drag returns the paper to its original page');
    await page.keyboard.press('End'); check(await page.locator('#readerNext').isDisabled(), 'Last page prevents flipping beyond the book');
    await page.keyboard.press('Home'); check(await page.locator('#readerPrev').isDisabled(), 'First page prevents flipping before the book');
    await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => document.getElementById('bookReader').dataset.page === '2');
    await page.keyboard.press('Escape');
    check(!await page.locator('#bookReader').evaluate(el => el.open), 'Esc closes the book and restores the scene');
    await page.waitForFunction(() => { const b = window.__cabinAudit.state().books[0]; return !b.out && Math.abs(b.x - b.base) < .03; });
    check(true, 'Closed book returns to its original shelf position');
    await page.keyboard.press('Enter'); await page.locator('#bookReader[open]').waitFor();
    await page.locator('#bookReader[aria-busy="false"]').waitFor({ timeout: 15000 });
    check(await page.locator('#bookReader').getAttribute('data-page') === '2', 'Reopening remembers reading progress');
    await page.locator('#readerClose').click();
    await openBook(page, 1); check(await page.locator('#readerTitle').textContent() === '测试短记', 'Another spine opens another article');
    await page.locator('#readerClose').click();
    await page.locator('#focusShelfBtn').click();
    check(await page.locator('body').getAttribute('data-cabin-focus') === 'room', 'Return-to-room button restores the panorama');
    await desktop.close();

    for (const width of [390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: width === 320 ? 'reduce' : 'no-preference' });
      const mobile = await context.newPage(); currentPage = mobile; await attachAudit(mobile); await mobile.goto(url);
      await mobile.waitForFunction(() => window.__cabinAudit); await mobile.waitForTimeout(500);
      check(await mobile.locator('body').evaluate(el => el.classList.contains('touch')), `${width}px: original touch controls are enabled`);
      const dock = await mobile.locator('.cabin-dock').boundingBox();
      const touch = await mobile.locator('#btnAct').boundingBox();
      check(dock.x >= 0 && dock.x + dock.width <= width && touch.y + touch.height < dock.y, `${width}px: navigation and touch controls do not overlap`);
      await mobile.screenshot({ path: path.join(output, `modern-mobile-${width}.png`) });
      await mobile.locator('#focusShelfBtn').tap(); await mobile.waitForTimeout(500);
      await openBook(mobile, 0, true);
      const bookBox = await mobile.locator('#bookObject').boundingBox();
      check(bookBox.x >= 0 && bookBox.x + bookBox.width <= width && bookBox.y + bookBox.height < 844, `${width}px: real 3D book tap opens a fitted single-page reader`);
      await mobile.screenshot({ path: path.join(output, `modern-book-mobile-${width}.png`) });
      await mobile.locator('#readerNext').tap(); await mobile.waitForFunction(() => document.getElementById('bookReader').dataset.page === '1');
      check(true, `${width}px: narrow reader turns one page at a time`);
      await dragPage(mobile, 1, true);
      check(await mobile.locator('#bookReader').getAttribute('data-page') === '2', `${width}px: horizontal page gesture works`);
      await swipeWithFinger(mobile);
      check(await mobile.locator('#bookReader').getAttribute('data-page') === '3', `${width}px: native finger swipe turns the paper`);
      const beforeRotation = await mobile.evaluate(source => JSON.parse(localStorage.getItem('aleksi-article-book:' + source)), articleSource);
      await mobile.setViewportSize({ width: 900, height: 600 }); await mobile.waitForTimeout(300);
      await mobile.locator('#bookReader[aria-busy="false"]').waitFor({ timeout: 15000 });
      const afterRotation = await mobile.evaluate(source => ({
        mark: JSON.parse(localStorage.getItem('aleksi-article-book:' + source)),
        book: document.getElementById('bookReader').dataset.book,
        visibleLength: [...document.querySelectorAll('#pageLeft .book-prose, #pageRight .book-prose')].reduce((sum, element) => sum + element.textContent.length, 0)
      }), articleSource);
      check(afterRotation.book === articleSource && beforeRotation.offset >= 0
        && afterRotation.mark.offset <= beforeRotation.offset
        && beforeRotation.offset <= Math.max(0, afterRotation.mark.offset) + afterRotation.visibleLength,
      `${width}px: rotating the viewport keeps the previous article offset in the visible spread`);
      await mobile.locator('#readerClose').tap();
      check(!await mobile.locator('#bookReader').evaluate(el => el.open), `${width}px: closing returns to the scene`);
      await context.close();
    }
    check(errors.length === 0, 'No browser runtime errors');
    check(requests.length === 0, 'No failed local asset requests');
    const report = { phase: 'website-integration', passed: checks.length, checks, errors, failedRequests: requests, browser: await browser.version(), viewports: ['1440x1000', '390x844', '320x844 reduced motion', '900x600 rotation'], baselineBindings: baseline };
    fs.writeFileSync(path.join(output, 'scene-verification.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: checks.length, errors, output }));
  } catch (error) {
    if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
