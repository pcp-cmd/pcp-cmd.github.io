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
    if (!userProfile) throw initialError;

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
        `Playwright was not found in the project or bundled runtime paths: ${extraModulePaths.join(', ')}`
      ].join('\n');
      throw fallbackError;
    }
  }
}

const { chromium } = loadPlaywright();

const routes = [
  '/works.html',
  '/work-detail.html?work=lucia-punishing-gray-raven',
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
  ['/works.html', 'works'],
  ['/work-detail.html?work=lucia-punishing-gray-raven', 'work-detail'],
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
    bodyWidth: document.body?.scrollWidth || 0
  }));
  const scrollWidth = Math.max(metrics.documentWidth, metrics.bodyWidth);
  assert(
    scrollWidth <= metrics.viewportWidth + 4,
    `${label} has horizontal overflow: ${scrollWidth} > ${metrics.viewportWidth}`
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
        && /^(?:\.\/|\/|\?|#)/.test(semantic.ctaHref || ''),
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
        await assertActiveNavigation(page, label);

        if (routeName === 'works') {
          await assertWorksSemanticsAndGeometry(page, label);
          await assertWorksInteraction(page, viewport, label);
        }
        if (routeName === 'work-detail') {
          await assertDetailScores(page, viewport, label);
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
      'works-desktop-1440.png',
      'works-desktop-1366.png',
      'works-tablet-1024.png',
      'works-mobile-390.png',
      'work-detail-desktop-1440.png',
      'work-detail-mobile-390.png',
      'math-desktop-1440.png',
      'manuscripts-desktop-1440.png',
      'protocol-desktop-1440.png',
      'works-reduced-motion.png'
    ];
    for (const filename of requiredScreenshots) {
      assert(screenshots.includes(filename), `Required QA screenshot is missing: ${filename}`);
    }
    assert(screenshots.length === routes.length * viewports.length + 1, `Expected 21 screenshots; found ${screenshots.length}`);

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
