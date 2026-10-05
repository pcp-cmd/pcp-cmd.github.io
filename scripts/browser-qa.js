const fs = require('fs');
const http = require('http');
const path = require('path');
const Module = require('module');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'qa-artifacts');
let assertions = 0;

function assert(condition, message) {
  assertions += 1;
  if (!condition) throw new Error(message);
}

async function withTimeout(operation, timeoutMs, label) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(operation), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (initialError) {
    const userProfile = process.env.USERPROFILE;
    const installHelp = [
      'Playwright is declared as a development dependency and required for browser release QA.',
      'Install project dependencies and Chromium with:',
      '  npm install',
      '  npx playwright install chromium'
    ].join('\n');
    if (!userProfile) {
      initialError.message = `${initialError.message}\n${installHelp}`;
      throw initialError;
    }

    const bundledNodeModules = path.join(
      userProfile,
      '.cache',
      'codex-runtimes',
      'codex-primary-runtime',
      'dependencies',
      'node',
      'node_modules'
    );
    const bundledPnpmModules = path.join(bundledNodeModules, '.pnpm', 'node_modules');
    const extraModulePaths = [bundledNodeModules, bundledPnpmModules].filter((candidate) =>
      fs.existsSync(candidate)
    );

    process.env.NODE_PATH = [
      ...extraModulePaths,
      process.env.NODE_PATH || ''
    ].filter(Boolean).join(path.delimiter);
    Module._initPaths();
    for (const modulePath of extraModulePaths.reverse()) {
      if (!module.paths.includes(modulePath)) module.paths.unshift(modulePath);
    }

    try {
      return require('playwright');
    } catch (fallbackError) {
      fallbackError.message = [
        fallbackError.message,
        `Playwright was not found in the project or bundled runtime paths: ${extraModulePaths.join(', ')}`,
        installHelp
      ].join('\n');
      throw fallbackError;
    }
  }
}

const { chromium } = loadPlaywright();

const routes = [
  '/',
  '/writing.html',
  '/project.html',
  '/research.html',
  '/research-record.html?id=claim-130',
  '/about.html',
  '/room.html',
  '/article.html?sample=reading',
  '/article.html?src=content/system/revision-protocol/index.md',
  '/article.html?src=content%2Fdesign%2Fworks%2Flucia-punishing-gray-raven%2Farticle.md',
  '/works.html',
  '/work-detail.html?work=lucia-punishing-gray-raven',
  '/work-detail.html?work=small-kid-sen-music-poster',
  '/math.html',
  '/manuscripts.html',
  '/protocol.html'
];

const viewports = [
  { name: 'desktop-1440', width: 1440, height: 1000 },
  { name: 'desktop-1366', width: 1366, height: 900 },
  { name: 'tablet-1024', width: 1024, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 }
];

const routeNames = new Map([
  ['/', 'home'],
  ['/writing.html', 'writing'],
  ['/project.html', 'project'],
  ['/research.html', 'research'],
  ['/research-record.html?id=claim-130', 'research-record'],
  ['/about.html', 'about'],
  ['/room.html', 'room'],
  ['/article.html?sample=reading', 'sample'],
  ['/article.html?src=content/system/revision-protocol/index.md', 'article'],
  [
    '/article.html?src=content%2Fdesign%2Fworks%2Flucia-punishing-gray-raven%2Farticle.md',
    'work-article'
  ],
  ['/works.html', 'works'],
  ['/work-detail.html?work=lucia-punishing-gray-raven', 'work-detail'],
  ['/work-detail.html?work=small-kid-sen-music-poster', 'work-detail-no-article'],
  ['/math.html', 'math'],
  ['/manuscripts.html', 'manuscripts'],
  ['/protocol.html', 'protocol']
]);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function isPathInside(parentPath, childPath) {
  const relative = path.relative(parentPath, childPath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function createStaticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      const decodedPath = decodeURIComponent(url.pathname);
      const requestedPath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
      const filePath = path.resolve(root, requestedPath);

      if (!isPathInside(root, filePath)) {
        response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Forbidden');
        return;
      }

      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) throw new Error('Not a file');
      const realFile = await fs.promises.realpath(filePath);
      const realRoot = await fs.promises.realpath(root);
      if (!isPathInside(realRoot, realFile)) {
        response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Forbidden');
        return;
      }

      const data = await fs.promises.readFile(realFile);
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': mimeTypes[path.extname(realFile).toLowerCase()] || 'application/octet-stream'
      });
      response.end(data);
    } catch (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function edgeExecutable() {
  const candidates = [
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

async function installNetworkPolicy(page, baseUrl, label, errors) {
  const baseOrigin = new URL(baseUrl).origin;

  await page.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    let parsed;
    try {
      parsed = new URL(requestUrl);
    } catch (error) {
      await route.abort('blockedbyclient');
      return;
    }

    if (parsed.origin === baseOrigin || parsed.protocol === 'data:' || parsed.protocol === 'blob:') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: parsed.pathname.endsWith('.js')
        ? 'text/javascript; charset=utf-8'
        : 'text/plain; charset=utf-8',
      body: ''
    });
  });

  page.on('pageerror', (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(baseOrigin)) {
      errors.push(`${label} request failed: ${request.url()} ${request.failure()?.errorText || ''}`.trim());
    }
  });
  page.on('response', (response) => {
    if (response.url().startsWith(baseOrigin) && response.status() >= 400) {
      errors.push(`${label} HTTP ${response.status()}: ${response.url()}`);
    }
  });
}

async function waitForStablePage(page) {
  await withTimeout(
    page.waitForFunction(() => document.readyState !== 'loading'),
    10_000,
    'Document readiness'
  );
  await withTimeout(
    page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      for (const image of document.images) image.loading = 'eager';
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.scrollTo(0, 0);
      await Promise.all([...document.images].map(async (image) => {
        if (!image.complete) {
          await new Promise((resolve) => {
            const finish = () => resolve();
            image.addEventListener('load', finish, { once: true });
            image.addEventListener('error', finish, { once: true });
            setTimeout(finish, 5_000);
          });
        }
        if (image.complete && image.naturalWidth > 0 && image.decode) {
          try {
            await image.decode();
          } catch (error) {
            // A load/error event is enough for QA to continue and report HTTP/console failures separately.
          }
        }
      }));
    }),
    15_000,
    'Font and image readiness'
  );
  await page.waitForTimeout(80);
}

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body?.scrollWidth || 0,
    offenders: [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: typeof element.className === 'string' ? element.className : '',
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          width: Math.round(rect.width * 10) / 10
        };
      })
      .filter((item) => item.left < -4 || item.right > window.innerWidth + 4)
      .sort((a, b) => Math.max(b.right - window.innerWidth, -b.left) - Math.max(a.right - window.innerWidth, -a.left))
      .slice(0, 8)
  }));
  const scrollWidth = Math.max(metrics.documentWidth, metrics.bodyWidth);
  assert(
    scrollWidth <= metrics.viewportWidth + 4,
    `${label} has horizontal overflow: ${scrollWidth} > ${metrics.viewportWidth}; offenders: ${JSON.stringify(metrics.offenders)}`
  );
}

async function assertActiveNavigation(page, label) {
  const mobileReading = await page.evaluate(() => (document.body.classList.contains('reading-page') || document.body.classList.contains('gallery-page')) && innerWidth <= 760);
  if (mobileReading) await page.locator('[data-menu-toggle]').click();
  const activeNav = await page.evaluate(() => {
    const link = document.querySelector(
      document.body.classList.contains('site-page')
        ? (innerWidth <= 760 ? '[data-mobile-navigation] a[aria-current="page"]' : '.site-navigation a[aria-current="page"]')
        : document.body.classList.contains('reading-page')
        ? (innerWidth <= 760 ? '.reading-mobile-header a[aria-current="page"]' : '.reading-left a[aria-current="page"]')
        : (document.body.classList.contains('gallery-page') && innerWidth <= 760
          ? '[data-mobile-navigation] a[aria-current="page"]'
          : '.desktop-nav a.is-active, .desktop-nav a[aria-current="page"], .site-nav a.is-active, .site-nav a[aria-current="page"]')
    );
    if (!link) return null;
    const style = getComputedStyle(link);
    const rect = link.getBoundingClientRect();
    const color = style.color.trim().toLowerCase();
    const alphaMatch = color.match(/^rgba?\([^)]*?(?:,\s*([.\d]+))?\)$/);
    const alpha = alphaMatch && alphaMatch[1] !== undefined ? Number(alphaMatch[1]) : 1;
    return {
      color,
      alpha,
      display: style.display,
      opacity: Number(style.opacity),
      visibility: style.visibility,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      themed: document.body.classList.contains('site-page'),
      labels: [...document.querySelectorAll('.site-navigation a')].map(item => item.textContent.trim())
    };
  });

  assert(activeNav !== null, `${label} is missing an active navigation link`);
  if (activeNav.themed) assert(activeNav.labels.join(',') === 'Writing,Project,Research,About,Works,Room', `${label} must expose all six shared section links`);
  assert(
    activeNav.display !== 'none'
      && activeNav.visibility !== 'hidden'
      && activeNav.opacity > 0
      && activeNav.width > 0
      && activeNav.height > 0,
    `${label} active navigation link is not visible`
  );
  assert(
    activeNav.color !== 'transparent' && activeNav.alpha > 0,
    `${label} active navigation color is transparent: ${activeNav.color}`
  );
  if (mobileReading) await page.locator('[data-menu-toggle]').click();
}

async function assertHomeEntrance(page, viewport, label) {
  const state = await page.evaluate(() => ({
    count: document.querySelectorAll('[data-window]').length,
    photo: document.querySelectorAll('[data-photo-window]').length,
    labels: [...document.querySelectorAll('.window-title')].map((item) => item.textContent),
    expanded: document.querySelectorAll('[data-window].is-open').length,
    background: getComputedStyle(document.body).backgroundColor,
    photoText: document.querySelector('[data-photo-window]').textContent,
    photoImage: (() => {
      const image = document.querySelector('[data-photo-window] img');
      return image && { loaded: image.complete && image.naturalWidth > 100 && image.naturalHeight > 100, alt: image.alt, visible: image.getBoundingClientRect().width > 0 };
    })(),
    windows: [...document.querySelectorAll('[data-window]')].map((item) => {
      const r = item.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom };
    })
  }));
  assert(state.count === 6 && state.photo === 1, `${label} must show six section windows and one photo window`);
  assert(state.labels.join(',') === 'Writing,Project,Research,About,Works,Room', `${label} has incorrect section labels`);
  assert(state.expanded === 0, `${label} must initially show titles only`);
  assert(state.background === 'rgb(255, 255, 255)', `${label} must preserve the white home`);
  assert(state.photoImage?.loaded && state.photoImage.visible && state.photoImage.alt && !state.photoText.includes('照片待提供'), `${label} must load the supplied avatar instead of a photo placeholder`);
  for (const r of state.windows) assert(r.left >= 8 && r.right <= viewport.width - 8, `${label} hides an entrance outside the viewport`);
}

async function assertHalftoneInterface(page, label) {
  const themed = await page.locator('body.site-page, body.entrance-page').count();
  if (!themed) return;
  const result = await page.evaluate(() => {
    const canvas = document.querySelector('[data-site-backdrop], [data-entrance-backdrop]');
    if (!canvas || !canvas.width || !canvas.height) return null;
    const gl = canvas.getContext('webgl2');
    if (!gl || canvas.dataset.backdropRenderer !== 'niku-webgl2') return null;
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let dark = 0, light = 0;
    for (let i = 0; i < pixels.length; i += 64) {
      if (pixels[i] < 32 && pixels[i + 1] < 32 && pixels[i + 2] < 32) dark++;
      if (pixels[i] > 224 && pixels[i + 1] > 224 && pixels[i + 2] > 224) light++;
    }
    const heading = document.querySelector('.window-title, .reading-page-heading h1, .reading-article-heading h1, .gallery-heading h1');
    return { dark, light, font: heading && getComputedStyle(heading).fontFamily, loaded: document.fonts.check('18px DotGothic16'), background: getComputedStyle(document.body).backgroundColor };
  });
  assert(result && result.dark > 100 && result.light > 100, `${label} must visibly render black and white halftone dots`);
  assert(result.loaded && result.font.includes('DotGothic16'), `${label} must share the entrance display font`);
  assert(result.background === 'rgb(255, 255, 255)', `${label} must use the shared paper base`);
}

async function assertReadingGeometry(page, label) {
  if (!await page.locator('body.reading-page').count()) return;
  const result = await page.evaluate(() => {
    const main = document.querySelector('.reading-main, .article-manuscript');
    const rect = main.getBoundingClientRect();
    return { width: rect.width, max: getComputedStyle(main).maxWidth, background: getComputedStyle(document.body).backgroundColor,
      font: getComputedStyle(document.body).fontSize,
      themed: document.body.classList.contains('site-page'),
      navigation: [...document.querySelectorAll(document.body.classList.contains('site-page') ? '.site-navigation a' : '.reading-left .reading-navigation a')].map(a=>a.textContent) };
  });
  assert(result.width <= 768.1 && result.max === '768px', `${label} must use a maximum 48rem reader`);
  assert(result.background === (result.themed ? 'rgb(255, 255, 255)' : 'rgb(240, 236, 224)'), `${label} has an unexpected page background`);
  assert(result.font === '16px', `${label} must keep readable body size`);
  assert(result.navigation.join(',') === (result.themed ? 'Writing,Project,Research,About,Works,Room' : 'Writing,Project,Research,About,Works'), `${label} changed the navigation outside its six-section or legacy five-section contract`);
}

async function assertRoomEntry(page, label) {
  await page.waitForURL('**/magic-cabin/index.html?view=shelf');
  await page.waitForFunction(() => document.body.dataset.cabinFocus === 'shelf');
  assert(await page.locator('#cabinCanvas').isVisible(), `${label} must enter the actual cabin shelf`);
  assert(await page.locator('.cabin-return').getAttribute('href') === '../writing.html', `${label} must retain its return to Writing`);
  await page.locator('#libraryDirectory summary').click();
  await page.locator('#libraryList button').first().click();
  await page.waitForFunction(() => document.querySelector('#bookReader').open && document.querySelector('#bookReader').getAttribute('aria-busy') === 'false');
  const before = await page.locator('#bookReader').getAttribute('data-page');
  await page.locator('#readerNext').click();
  await page.waitForFunction(old => document.querySelector('#bookReader').dataset.page !== old && document.querySelector('#flipSheet').hidden, before);
  assert((await page.locator('#pageLeft .book-prose, #pageRight .book-prose').first().innerText()).length > 20, `${label} must read Markdown inside the book after its title page`);
  assert(page.url().includes('/magic-cabin/index.html?view=shelf'), `${label} must turn pages without leaving the cabin`);
  await page.locator('#readerClose').click();
}

async function assertArticleGeometry(page, viewport, label) {
  const result = await page.evaluate(() => {
    const body = document.querySelector('.article-body');
    const manuscript = document.querySelector('.article-manuscript');
    if (!body || !manuscript) return null;
    const bodyRect = body.getBoundingClientRect();
    const manuscriptRect = manuscript.getBoundingClientRect();
    return {
      bodyWidth: bodyRect.width,
      manuscriptWidth: manuscriptRect.width,
      textLength: body.textContent.trim().length,
      bodyLeft: bodyRect.left,
      bodyRight: bodyRect.right
    };
  });

  assert(result !== null, `${label} is missing the article reader`);
  assert(result.textLength > 100, `${label} did not render meaningful article content`);
  assert(
    result.bodyWidth <= Math.min(768, result.manuscriptWidth) + 2,
    `${label} article body is wider than its 48rem reading measure`
  );
  assert(
    result.bodyLeft >= -4 && result.bodyRight <= viewport.width + 4,
    `${label} article body exceeds the viewport`
  );
}

async function assertWorksSemanticsAndGeometry(page, label) {
  const result = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-work-card]')];
    return {
      count: cards.length,
      legacyLinks: document.querySelectorAll('.exhibition-stage a, [data-works-index]').length,
      oldRuntime: [...document.scripts].some((script) => /\/(?:content|works-data|works)\.js$/.test(script.src)),
      temporaryCopy: /临时演示|正式作品的名称与介绍待提供/.test(document.body.textContent),
      catalog: (window.ALEKSI_WORKS_CATALOG || []).map(item => ({ title: item.title, shortTitle: item.shortTitle, summary: item.summary, alt: item.alt })),
      cards: cards.map((card) => {
        const button = card.querySelector('[data-gallery-open]'), image = card.querySelector('img');
        const rect = button?.getBoundingClientRect();
        return { tag: card.tagName, button: button?.tagName, type: button?.type,
          popup: button?.getAttribute('aria-haspopup'), label: button?.getAttribute('aria-label'),
          loaded: image?.naturalWidth > 0, alt: image?.alt, height: rect?.height, title: card.querySelector('.gallery-card-title')?.textContent,
          nested: Boolean(card.querySelector('button button, button a')) };
      })
    };
  });
  assert(result.count === 13 && result.catalog.length === 13, `${label} must render 13 source-backed work cards`);
  assert(result.legacyLinks === 0 && !result.oldRuntime && !result.temporaryCopy, `${label} must show restored content without old article routes or temporary-demo copy`);
  for (const [index, card] of result.cards.entries()) {
    const work = result.catalog[index];
    assert(card.tag === 'ARTICLE' && card.button === 'BUTTON' && card.type === 'button'
      && card.popup === 'dialog' && card.label?.includes(work.title) && card.title === work.shortTitle, `${label} card ${index + 1} must name the work and open the image viewer`);
    assert(card.loaded && card.alt === work.alt && work.summary.length > 10, `${label} card ${index + 1} is missing its original image, alt text, or description`);
    assert(card.height >= 44 && !card.nested, `${label} card ${index + 1} has an inaccessible target`);
  }
}

async function assertWorksInteraction(page, viewport, label) {
  const firstCard = page.locator('[data-work-card]').first();
  const button = firstCard.locator('[data-gallery-open]');
  const initialTransform = await firstCard.evaluate((card) => getComputedStyle(card).transform);
  await firstCard.hover();
  await page.waitForTimeout(620);
  assert(await firstCard.evaluate((card) => getComputedStyle(card).transform) !== initialTransform, `${label} hover must lift the image card`);
  const beforeUrl = page.url(), beforeHistory = await page.evaluate(() => history.length);
  await button.click();
  await page.locator('[data-gallery-viewer][open]').waitFor();
  await page.locator('[data-viewer-image]').evaluate((image) => image.decode());
  const selected = await page.evaluate(() => ({
    active: document.querySelectorAll('[data-work-card].is-active').length,
    muted: document.querySelectorAll('[data-work-card].is-muted').length,
    caption: document.querySelector('[data-viewer-caption]').textContent,
    counter: document.querySelector('[data-viewer-counter]').textContent,
    details: document.querySelector('[data-viewer-details]').textContent,
    focusInDialog: document.querySelector('[data-gallery-viewer]').contains(document.activeElement)
  }));
  assert(selected.active === 1 && selected.muted === 12, `${label} opening an image must retain focus and muting behavior`);
  await page.waitForTimeout(500);
  const mutedOpacity = await page.locator('[data-work-card].is-muted').evaluateAll((cards) => cards.map((card) => Number(getComputedStyle(card).opacity)));
  assert(mutedOpacity.every((opacity) => opacity <= .5), `${label} the other cards must visibly dim after selection`);
  assert(selected.focusInDialog && selected.caption === 'Lucia / Punishing: Gray Raven' && selected.counter === '01 / 13', `${label} viewer must receive keyboard focus and name the original work`);
  assert(selected.details.includes('露西亚') && selected.details.includes('版式') && selected.details.includes('视觉语言'), `${label} viewer must present restored work content in place`);
  assert(page.url() === beforeUrl && await page.evaluate(() => history.length) === beforeHistory, `${label} opening an image must not navigate to an old page`);
  const fits = await page.locator('[data-viewer-image]').evaluate((image) => {
    const r = image.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
  });
  assert(fits, `${label} enlarged image must fit the viewport`);
  if (viewport.name === 'desktop-1440' || viewport.name === 'mobile-390') {
    await page.screenshot({ path: path.join(outputDir, `works-zoom-${viewport.name}.png`) });
  }
  await page.locator('[data-viewer-next]').click();
  assert((await page.locator('[data-viewer-counter]').textContent()) === '02 / 13' && (await page.locator('[data-viewer-caption]').textContent()) === 'Momo Ayase / Dandadan', `${label} next image button must update both image and restored title`);
  await page.keyboard.press('ArrowLeft');
  assert((await page.locator('[data-viewer-counter]').textContent()) === '01 / 13', `${label} keyboard image navigation must work`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(40);
  assert(await page.locator('[data-gallery-viewer]').evaluate((viewer) => !viewer.open), `${label} Escape must close the viewer`);
  assert(await button.evaluate((button) => button === document.activeElement), `${label} closing the viewer must restore focus`);
  await page.locator('[data-work-card]').nth(6).locator('[data-gallery-open]').click();
  await page.locator('[data-viewer-image]').evaluate(image => image.decode());
  const originalSource = await page.locator('[data-viewer-image]').getAttribute('src');
  const correctedFilter = await page.locator('[data-viewer-image]').evaluate(image => getComputedStyle(image).filter);
  assert((await page.locator('[data-viewer-caption]').textContent()) === 'The Hills / Typographic Study' && correctedFilter !== 'none', `${label} 07 must default to its reversible display correction`);
  await page.locator('[data-viewer-original]').click();
  assert(await page.locator('[data-viewer-image]').evaluate(image => getComputedStyle(image).filter) === 'none' && await page.locator('[data-viewer-image]').getAttribute('src') === originalSource, `${label} 07 original toggle must remove only the display correction`);
  assert((await page.locator('[data-viewer-original]').textContent()) === '显示校正', `${label} 07 original view must offer return to correction`);
  await page.locator('[data-viewer-original]').click();
  assert(await page.locator('[data-viewer-image]').evaluate(image => getComputedStyle(image).filter) === correctedFilter, `${label} 07 correction must be restorable`);
  await page.locator('[data-viewer-next]').click();
  await page.locator('[data-viewer-image]').evaluate(image => image.decode());
  assert(!await page.locator('[data-viewer-original]').isVisible() && await page.locator('[data-viewer-image]').evaluate(image => getComputedStyle(image).filter) === 'none', `${label} the next work must retain its original colors`);
  assert(page.url() === beforeUrl && await page.evaluate(() => history.length) === beforeHistory, `${label} work descriptions and tone comparison must remain in the current exhibition`);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[data-gallery-viewer]').open && !document.querySelector('[data-work-card].is-active, [data-work-card].is-muted'));
  assert(await page.locator('[data-work-card].is-active, [data-work-card].is-muted').count() === 0, `${label} closing must clear selection states`);
  await page.waitForFunction(() => [...document.querySelectorAll('[data-work-card]')].every((card) => Number(getComputedStyle(card).opacity) >= .99 && card.getAnimations({ subtree: true }).every((animation) => animation.playState !== 'running')));
  assert(await page.locator('[data-work-card]').count() === 13, `${label} closing must return to the fully visible exhibition`);
}

function rectanglesIntersect(first, second, tolerance = 0.5) {
  return first.left < second.right - tolerance
    && first.right > second.left + tolerance
    && first.top < second.bottom - tolerance
    && first.bottom > second.top + tolerance;
}

async function assertDetailScores(page, viewport, label) {
  const result = await page.evaluate(() => {
    const heading = document.querySelector('.work-scores h2');
    const grid = document.querySelector('.work-score-grid');
    const items = [...document.querySelectorAll('.work-score-grid .score-item')];
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom
      };
    };
    return {
      heading: heading ? rect(heading) : null,
      items: items.map(rect),
      columns: grid ? getComputedStyle(grid).gridTemplateColumns : '',
      itemLefts: items.map((item) => item.getBoundingClientRect().left)
    };
  });

  assert(result.heading !== null, `${label} is missing the score heading`);
  assert(result.items.length > 0, `${label} is missing score items`);
  for (const [index, item] of result.items.entries()) {
    assert(
      !rectanglesIntersect(result.heading, item),
      `${label} score heading intersects score item ${index + 1}`
    );
  }

  if (viewport.width === 390) {
    const computedColumns = result.columns.trim().split(/\s+/).filter(Boolean);
    const alignedLefts = new Set(result.itemLefts.map((left) => Math.round(left)));
    assert(computedColumns.length === 1, `${label} mobile score grid is not one column: ${result.columns}`);
    assert(alignedLefts.size === 1, `${label} mobile score items do not share one column`);
  }
}

async function assertDetailArticleState(page, expectedArticle, label) {
  const result = await page.evaluate(() => {
    const section = document.querySelector('[data-work-article-section]');
    const link = document.querySelector('[data-work-article-link]');
    return {
      hidden: section?.hidden,
      href: link?.getAttribute('href') || '',
      text: link?.textContent.trim() || ''
    };
  });

  if (expectedArticle) {
    assert(result.hidden === false, `${label} must expose its article section`);
    assert(result.text === '打开阅读', `${label} must use the canonical reading CTA`);
    assert(
      result.href.startsWith('./article.html?src=content%2Fdesign%2Fworks%2F'),
      `${label} has an invalid article href: ${result.href}`
    );
  } else {
    assert(result.hidden === true, `${label} without an article must keep the article section hidden`);
  }
}

async function openAuditedPage(browser, baseUrl, viewport, label, contextOptions = {}) {
  const context = await browser.newContext({ viewport, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  await installNetworkPolicy(page, baseUrl, label, errors);
  return { context, page, errors };
}

async function assertNoRuntimeErrors(errors, label) {
  assert(errors.length === 0, `${label} emitted browser errors:\n${errors.join('\n')}`);
}

async function runMatrix(browser, baseUrl) {
  for (const viewport of viewports) {
    for (const route of routes) {
      const routeName = routeNames.get(route);
      const label = `${routeName} ${viewport.name}`;
      console.log(`[browser-qa] START ${label}`);
      const { context, page, errors } = await openAuditedPage(browser, baseUrl, viewport, label);
      try {
        await withTimeout(
          page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 20_000 }),
          25_000,
          `${label} navigation`
        );
        if (routeName === 'room') await page.waitForURL('**/magic-cabin/index.html?view=shelf');
        if (routeName === 'research-record') await page.waitForFunction(() => document.body.dataset.recordReady === 'true');
        await waitForStablePage(page);
        await assertNoOverflow(page, label);
        await assertHalftoneInterface(page, label);
        await assertReadingGeometry(page, label);
        if (!['home', 'article', 'work-article', 'sample', 'room'].includes(routeName)) {
          await assertActiveNavigation(page, label);
        }

        if (routeName === 'home') {
          await assertHomeEntrance(page, viewport, label);
        }
        if (routeName === 'room') await assertRoomEntry(page, label);
        if (['article', 'work-article', 'sample'].includes(routeName)) {
          await assertArticleGeometry(page, viewport, label);
        }
        if (routeName === 'works') {
          await assertWorksSemanticsAndGeometry(page, label);
          await assertWorksInteraction(page, viewport, label);
        }
        if (['work-detail', 'work-detail-no-article'].includes(routeName)) {
          await assertDetailScores(page, viewport, label);
          await assertDetailArticleState(page, routeName === 'work-detail', label);
        }

        await withTimeout(
          page.screenshot({
            path: path.join(outputDir, `${routeName}-${viewport.name}.png`),
            animations: routeName === 'works' ? 'disabled' : 'allow',
            fullPage: true
          }),
          30_000,
          `${label} screenshot`
        );
        await assertNoRuntimeErrors(errors, label);
        console.log(`[browser-qa] PASS ${label}`);
      } finally {
        await withTimeout(context.close(), 10_000, `${label} context close`);
      }
    }
  }
}

async function auditDetailStates(browser, baseUrl) {
  const viewport = { width: 1440, height: 1000 };
  const label = 'work detail canonical/legacy/missing states';
  const { context, page, errors } = await openAuditedPage(browser, baseUrl, viewport, label);
  try {
    await page.goto(`${baseUrl}/work-detail.html?work=lucia-punishing-gray-raven`, {
      waitUntil: 'domcontentloaded'
    });
    await waitForStablePage(page);
    const canonical = await page.evaluate(() => ({
      title: document.querySelector('[data-work-title]')?.textContent.trim(),
      image: document.querySelector('[data-work-image]')?.getAttribute('src'),
      missing: Boolean(document.querySelector('.work-not-found'))
    }));
    assert(Boolean(canonical.title) && !canonical.missing, 'Canonical detail slug must render its work');

    await page.goto(`${baseUrl}/work-detail.html?work=gravy-raven-starlight-fade-away`, {
      waitUntil: 'domcontentloaded'
    });
    await waitForStablePage(page);
    const legacy = await page.evaluate(() => ({
      title: document.querySelector('[data-work-title]')?.textContent.trim(),
      image: document.querySelector('[data-work-image]')?.getAttribute('src'),
      missing: Boolean(document.querySelector('.work-not-found'))
    }));
    assert(!legacy.missing, 'Legacy detail alias must resolve to a canonical work');
    assert(legacy.title === canonical.title, 'Legacy detail alias must render the canonical title');
    assert(legacy.image === canonical.image, 'Legacy detail alias must render the canonical image');

    await page.goto(`${baseUrl}/work-detail.html?work=missing-work-slug`, {
      waitUntil: 'domcontentloaded'
    });
    await waitForStablePage(page);
    const missing = await page.evaluate(() => ({
      stateVisible: Boolean(document.querySelector('.work-not-found')),
      detailText: document.querySelector('[data-work-detail]')?.textContent.trim()
    }));
    assert(missing.stateVisible, 'Missing detail slug must render the explicit not-found state');
    assert(Boolean(missing.detailText), 'Missing detail state must include explanatory copy');
    await assertNoRuntimeErrors(errors, label);
  } finally {
    await context.close();
  }
}

function durationToSeconds(value) {
  const match = String(value).trim().match(/^([\d.]+)(ms|s)$/);
  if (!match) return Number.POSITIVE_INFINITY;
  const amount = Number(match[1]);
  return match[2] === 'ms' ? amount / 1000 : amount;
}

async function auditReducedMotion(browser, baseUrl) {
  const label = 'works reduced motion';
  const { context, page, errors } = await openAuditedPage(
    browser,
    baseUrl,
    { width: 1440, height: 1000 },
    label,
    { reducedMotion: 'reduce' }
  );
  try {
    await page.goto(`${baseUrl}/works.html`, { waitUntil: 'domcontentloaded' });
    await waitForStablePage(page);
    const durations = await page.locator('[data-work-card]').first().evaluate((card) =>
      getComputedStyle(card).transitionDuration.split(',').map((duration) => duration.trim())
    );
    const seconds = durations.map(durationToSeconds);
    assert(
      seconds.length > 0 && seconds.every((duration) => duration <= 0.0010001),
      `Reduced-motion card transitions exceed 0.001s: ${durations.join(', ')}`
    );
    await page.screenshot({
      path: path.join(outputDir, 'works-reduced-motion.png'),
      fullPage: true
    });
    await assertNoRuntimeErrors(errors, label);
  } finally {
    await context.close();
  }
}

async function main() {
  const skipTouch = process.argv.includes('--redesign-desktop-only');
  const focused = process.argv.includes('--redesign-only') || skipTouch;
  // Refresh generated root captures while keeping prior visual comparison evidence.
  if (!focused && fs.existsSync(outputDir)) {
    for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
      if (entry.isFile() && (entry.name.endsWith('.png') || entry.name === 'redesign-results.json')) fs.unlinkSync(path.join(outputDir, entry.name));
    }
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const { server, baseUrl } = await createStaticServer();
  let browser;
  try {
    const executablePath = edgeExecutable();
    const launchOptions = { headless: true };
    if (executablePath) launchOptions.executablePath = executablePath;
    browser = await chromium.launch(launchOptions);

    if (!focused) {
      await runMatrix(browser, baseUrl);
      await auditDetailStates(browser, baseUrl);
      await auditReducedMotion(browser, baseUrl);
    }
    await require('./redesign-browser-qa.js').run({ browser, baseUrl, root, outputDir, assert, openAuditedPage, waitForStablePage, assertNoOverflow, assertNoRuntimeErrors, skipTouch });
    await require('./research-archive-qa.js').run({ browser, baseUrl, root, outputDir, assert, openAuditedPage, waitForStablePage, assertNoOverflow, assertNoRuntimeErrors });

    const screenshots = fs.readdirSync(outputDir).filter((file) => file.endsWith('.png'));
    const requiredScreenshots = [
      'home-desktop-1440.png',
      'home-mobile-390.png',
      'article-desktop-1440.png',
      'article-mobile-390.png',
      'work-article-desktop-1440.png',
      'writing-desktop-1440.png',
      'project-desktop-1440.png',
      'research-desktop-1440.png',
      'about-desktop-1440.png',
      'room-desktop-1440.png',
      'room-mobile-390.png',
      'sample-desktop-1440.png',
      'sample-mobile-390.png',
      'work-article-mobile-390.png',
      'works-desktop-1440.png',
      'works-desktop-1366.png',
      'works-tablet-1024.png',
      'works-mobile-390.png',
      'work-detail-desktop-1440.png',
      'work-detail-mobile-390.png',
      'work-detail-no-article-desktop-1440.png',
      'work-detail-no-article-mobile-390.png',
      'math-desktop-1440.png',
      'manuscripts-desktop-1440.png',
      'protocol-desktop-1440.png',
      'works-reduced-motion.png'
    ];
    for (const filename of requiredScreenshots) {
      assert(screenshots.includes(filename), `Required QA screenshot is missing: ${filename}`);
    }
    const expectedScreenshotCount = routes.length * viewports.length + 1;
    assert(
      screenshots.length >= expectedScreenshotCount,
      `Expected at least ${expectedScreenshotCount} screenshots; found ${screenshots.length}`
    );

    console.log(
      `Browser QA passed for Aleksi: ${assertions} assertions, `
      + `${screenshots.length} screenshots in ${outputDir}`
    );
  } finally {
    if (browser) await withTimeout(browser.close(), 15_000, 'Browser close');
    await withTimeout(closeServer(server), 10_000, 'QA server close');
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
