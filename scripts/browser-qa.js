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
      'Playwright is optional and only required for browser QA.',
      'Install it with:',
      '  npm install -D playwright',
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
  const activeNav = await page.evaluate(() => {
    const link = document.querySelector(
      '.desktop-nav a.is-active, .desktop-nav a[aria-current="page"], .site-nav a.is-active, .site-nav a[aria-current="page"]'
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
      right: rect.right
    };
  });

  assert(activeNav !== null, `${label} is missing an active navigation link`);
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
}

async function assertHomeHero(page, viewport, label) {
  const result = await page.evaluate(() => {
    const hero = document.querySelector('.home-redesign .hero');
    const card = document.querySelector('.hero-lottie-card');
    const titleStrip = document.querySelector('.hero-lottie-card .hero-card-top');
    const figure = document.querySelector('.hero-lottie-figure');
    const glyph = document.querySelector('#heroGlyphLottie');
    const fallback = document.querySelector('.hero-lottie-fallback');
    if (!hero || !card || !titleStrip || !figure || !glyph || !fallback) return null;

    const heroRect = hero.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const glyphRect = glyph.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    const titleStyle = getComputedStyle(titleStrip);
    const figureStyle = getComputedStyle(figure);
    const fallbackStyle = getComputedStyle(fallback);

    return {
      heroWidth: heroRect.width,
      cardWidth: cardRect.width,
      cardLeft: cardRect.left,
      cardRight: cardRect.right,
      glyphWidth: glyphRect.width,
      cardBorder: cardStyle.borderTopWidth,
      cardPadding: cardStyle.paddingTop,
      cardBackgroundImage: cardStyle.backgroundImage,
      cardBackgroundColor: cardStyle.backgroundColor,
      cardShadow: cardStyle.boxShadow,
      titleDisplay: titleStyle.display,
      figureBackgroundImage: figureStyle.backgroundImage,
      figureBackgroundColor: figureStyle.backgroundColor,
      figureOverflow: figureStyle.overflow,
      fallbackNaturalWidth: fallback.naturalWidth,
      fallbackOpacity: Number(fallbackStyle.opacity),
      failed: figure.classList.contains('lottie-failed')
    };
  });

  assert(result !== null, `${label} is missing the Lottie hero structure`);
  assert(result.cardBorder === '0px', `${label} Lottie wrapper still has a border`);
  assert(result.cardPadding === '0px', `${label} Lottie wrapper still has card padding`);
  assert(result.cardBackgroundImage === 'none', `${label} Lottie wrapper still has a background image`);
  assert(
    result.cardBackgroundColor === 'rgba(0, 0, 0, 0)',
    `${label} Lottie wrapper still has a background color: ${result.cardBackgroundColor}`
  );
  assert(result.cardShadow === 'none', `${label} Lottie wrapper still has a card shadow`);
  assert(result.titleDisplay === 'none', `${label} Lottie title strip is still visible`);
  assert(
    result.figureBackgroundImage === 'none'
      && result.figureBackgroundColor === 'rgba(0, 0, 0, 0)'
      && result.figureOverflow === 'visible',
    `${label} Lottie figure is not a transparent, unboxed visual`
  );
  assert(result.fallbackNaturalWidth > 0, `${label} Lottie fallback image did not load`);
  assert(
    result.failed && result.fallbackOpacity > 0,
    `${label} must reveal the fallback when the external Lottie runtime is unavailable`
  );

  if (viewport.width >= 980) {
    const visualShare = result.cardWidth / result.heroWidth;
    assert(
      visualShare >= 0.38 && visualShare <= 0.55,
      `${label} right visual share must be about 40%-50%; received ${visualShare.toFixed(3)}`
    );
    assert(
      result.glyphWidth >= result.cardWidth * 0.95,
      `${label} glyph is still too small for a hero visual`
    );
  } else {
    assert(
      result.cardLeft >= -4 && result.cardRight <= viewport.width + 4,
      `${label} Lottie wrapper exceeds the mobile viewport`
    );
  }
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
    result.bodyWidth <= Math.min(680, result.manuscriptWidth) + 2,
    `${label} article body is wider than its 680px reading measure`
  );
  assert(
    result.bodyLeft >= -4 && result.bodyRight <= viewport.width + 4,
    `${label} article body exceeds the viewport`
  );
}

async function assertWorksSemanticsAndGeometry(page, label) {
  const result = await page.evaluate(() => {
    const tolerance = 3;
    const cards = [...document.querySelectorAll('[data-work-card]')];
    const problems = [];
    const semantics = [];
    const selectors = [
      '.exhibition-card__body',
      '.exhibition-card__title',
      '.exhibition-card__summary',
      '.exhibition-card__source',
      '.exhibition-card__toggle',
      '.exhibition-card__cta'
    ];

    for (const [cardIndex, card] of cards.entries()) {
      const cardRect = card.getBoundingClientRect();
      const toggle = card.querySelector('.exhibition-card__toggle');
      const cta = card.querySelector('.exhibition-card__cta');
      semantics.push({
        articleTag: card.tagName,
        articleRole: card.getAttribute('role'),
        articleTabIndex: card.getAttribute('tabindex'),
        toggleTag: toggle?.tagName,
        toggleType: toggle?.getAttribute('type'),
        toggleExpanded: toggle?.getAttribute('aria-expanded'),
        toggleLabel: toggle?.getAttribute('aria-label'),
        ctaTag: cta?.tagName,
        ctaHref: cta?.getAttribute('href'),
        ctaText: cta?.textContent.trim(),
        nestedInteractive: Boolean(card.querySelector('a a, a button, button a, button button'))
      });

      for (const selector of selectors) {
        const element = card.querySelector(selector);
        if (!element) {
          problems.push(`card ${cardIndex + 1} missing ${selector}`);
          continue;
        }
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          problems.push(`card ${cardIndex + 1} ${selector} has an empty box`);
          continue;
        }
        if (
          rect.left < cardRect.left - tolerance
          || rect.right > cardRect.right + tolerance
          || rect.top < cardRect.top - tolerance
          || rect.bottom > cardRect.bottom + tolerance
        ) {
          problems.push(
            `card ${cardIndex + 1} ${selector} escapes card `
            + `[${rect.left.toFixed(1)},${rect.top.toFixed(1)},${rect.right.toFixed(1)},${rect.bottom.toFixed(1)}] `
            + `outside [${cardRect.left.toFixed(1)},${cardRect.top.toFixed(1)},${cardRect.right.toFixed(1)},${cardRect.bottom.toFixed(1)}]`
          );
        }
      }
    }
    return { count: cards.length, problems, semantics };
  });

  assert(result.count === 13, `${label} must render exactly 13 Works cards; found ${result.count}`);
  assert(result.problems.length === 0, `${label} card content boxes escape their cards:\n${result.problems.join('\n')}`);
  for (const [index, semantic] of result.semantics.entries()) {
    assert(semantic.articleTag === 'ARTICLE', `${label} card ${index + 1} must be an article`);
    assert(semantic.articleRole !== 'button', `${label} card ${index + 1} must not use role=button`);
    assert(semantic.articleTabIndex === null, `${label} card ${index + 1} must not be an extra tab stop`);
    assert(
      semantic.toggleTag === 'BUTTON'
        && semantic.toggleType === 'button'
        && semantic.toggleExpanded === 'false'
        && Boolean(semantic.toggleLabel),
      `${label} card ${index + 1} has invalid toggle semantics`
    );
    assert(
      semantic.ctaTag === 'A'
        && /^\.\/work-detail\.html\?work=[a-z0-9-]+$/.test(semantic.ctaHref || '')
        && semantic.ctaText === '进入作品',
      `${label} card ${index + 1} has invalid CTA semantics`
    );
    assert(!semantic.nestedInteractive, `${label} card ${index + 1} nests interactive controls`);
  }
}

async function assertWorksInteraction(page, viewport, label) {
  const cards = page.locator('[data-work-card]');
  const firstCard = cards.first();
  const initialTransform = await firstCard.evaluate((card) => getComputedStyle(card).transform);
  await firstCard.hover({ force: true });
  await page.waitForTimeout(620);
  const hoverTransform = await firstCard.evaluate((card) => getComputedStyle(card).transform);
  assert(hoverTransform !== initialTransform, `${label} first card hover transform did not change`);

  await page.mouse.move(0, 0);
  await firstCard.locator('.exhibition-card__toggle').click({ force: true });
  await page.waitForTimeout(40);
  const selected = await page.evaluate(() => ({
    active: document.querySelectorAll('[data-work-card].is-active').length,
    muted: document.querySelectorAll('[data-work-card].is-muted').length,
    mutedOpacity: [...document.querySelectorAll('[data-work-card].is-muted')]
      .map((card) => Number(getComputedStyle(card).opacity))
  }));
  assert(selected.active === 1, `${label} must have exactly one active card after toggle; found ${selected.active}`);
  assert(selected.muted === 12, `${label} must have exactly 12 muted cards after toggle; found ${selected.muted}`);

  if (viewport.width < 1180) {
    assert(
      selected.mutedOpacity.every((opacity) => opacity >= 0.9),
      `${label} tablet/mobile muted cards must remain readable: ${selected.mutedOpacity.join(', ')}`
    );
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(40);
  const cleared = await page.evaluate(() => ({
    active: document.querySelectorAll('[data-work-card].is-active').length,
    muted: document.querySelectorAll('[data-work-card].is-muted').length
  }));
  assert(cleared.active === 0, `${label} Escape must clear the active card`);
  assert(cleared.muted === 0, `${label} Escape must clear muted card state`);
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
        await waitForStablePage(page);
        await assertNoOverflow(page, label);
        if (!['home', 'article', 'work-article'].includes(routeName)) {
          await assertActiveNavigation(page, label);
        }

        if (routeName === 'home') {
          await assertHomeHero(page, viewport, label);
        }
        if (['article', 'work-article'].includes(routeName)) {
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
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const { server, baseUrl } = await createStaticServer();
  let browser;
  try {
    const executablePath = edgeExecutable();
    const launchOptions = { headless: true };
    if (executablePath) launchOptions.executablePath = executablePath;
    browser = await chromium.launch(launchOptions);

    await runMatrix(browser, baseUrl);
    await auditDetailStates(browser, baseUrl);
    await auditReducedMotion(browser, baseUrl);

    const screenshots = fs.readdirSync(outputDir).filter((file) => file.endsWith('.png'));
    const requiredScreenshots = [
      'home-desktop-1440.png',
      'home-mobile-390.png',
      'article-desktop-1440.png',
      'article-mobile-390.png',
      'work-article-desktop-1440.png',
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
      screenshots.length === expectedScreenshotCount,
      `Expected ${expectedScreenshotCount} screenshots; found ${screenshots.length}`
    );

    console.log(
      `Browser QA passed for Aleksi Lab v1.7.2-clean-reset: ${assertions} assertions, `
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
