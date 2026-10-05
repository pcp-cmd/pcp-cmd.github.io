'use strict';

// Run against an already-built, already-served release. This script neither
// builds nor serves the site. It uses real browser UI and the local publication
// sources as its oracle; it never injects an index, renderer, or player stub.
// Local failure injection is opt-in and is rejected for non-loopback hosts.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const Module = require('module');

const root = path.resolve(__dirname, '..');
const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const loopback = url => ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

function optionsFrom(argv) {
  let baseUrl = 'http://127.0.0.1:4177', localOnlyFailures = false;
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--base-url') {
      if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error('--base-url requires an HTTP(S) URL');
      baseUrl = argv[++index];
    } else if (argument.startsWith('--base-url=')) baseUrl = argument.slice('--base-url='.length);
    else if (argument === '--local-only-failures') localOnlyFailures = true;
    else if (argument === '--help') return { help: true };
    else throw new Error(`Unknown argument: ${argument}`);
  }
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Only HTTP(S) release URLs are supported');
  if (base.username || base.password || base.search || base.hash) throw new Error('Use a site root URL without credentials, query, or fragment');
  if (localOnlyFailures && !loopback(base)) throw new Error('--local-only-failures requires localhost, 127.0.0.1, or [::1]');
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  return { baseUrl: base.href, localOnlyFailures };
}

function loadPlaywright() {
  try { return require('playwright'); } catch (_) {
    const bundled = path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes',
      'codex-primary-runtime', 'dependencies', 'node', 'node_modules');
    const available = [bundled, path.join(bundled, '.pnpm', 'node_modules')].filter(candidate => fs.existsSync(candidate));
    process.env.NODE_PATH = [...available, process.env.NODE_PATH || ''].filter(Boolean).join(path.delimiter);
    Module._initPaths();
    for (const directory of available.reverse()) if (!module.paths.includes(directory)) module.paths.unshift(directory);
    try { return require('playwright'); } catch (error) {
      error.message += '\nPlaywright was not found in the project or bundled Codex runtime.';
      throw error;
    }
  }
}

function edgeExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}

function loadExpected() {
  const indexText = fs.readFileSync(path.join(root, 'site-data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(indexText, sandbox, { filename: 'site-data.js', timeout: 1000 });
  const writing = JSON.parse(JSON.stringify(sandbox.window.ALEKSI_SITE?.writing || []));
  if (writing.length !== 41) throw new Error(`The release oracle requires exactly 41 Writing entries, found ${writing.length}`);
  const entries = writing.map((entry, index) => {
    const source = `content/writing/${String(index + 1).padStart(2, '0')}.md`;
    if (entry.source !== source || entry.approved !== true || entry.type !== 'long' || entry.date !== '2026-10-06') {
      throw new Error(`Unexpected publication metadata or source order at entry ${index + 1}`);
    }
    const bytes = fs.readFileSync(path.join(root, source));
    const raw = bytes.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const frontmatter = raw.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatter) throw new Error(`${source}: missing publication frontmatter`);
    const bodyWithTitle = raw.slice(frontmatter[0].length).trim();
    const heading = bodyWithTitle.match(/^# ([^\n]+)\n/);
    if (!heading || heading[1] !== entry.title) throw new Error(`${source}: source H1 does not match the index`);
    const body = bodyWithTitle.slice(heading[0].length).trim();
    const paragraphs = body.split(/\n[ \t]*\n/).map(normalize);
    // These 41 published manuscripts contain plain prose. Fail explicitly if
    // they later gain Markdown structures requiring a richer independent oracle.
    if (paragraphs.length < 2 || /(^|\n)[ \t]*(?:#{1,6}\s|[-+*]\s|\d+[.)]\s|>|```|~~~|\|)|[<`]|!?\[[^\]]*\]\(/m.test(body)) {
      throw new Error(`${source}: the plain-paragraph oracle needs reviewing for this source structure`);
    }
    const field = name => frontmatter[1].split('\n').find(line => line.startsWith(`${name}: `))?.slice(name.length + 2);
    if (field('title') !== entry.title || field('date') !== entry.date || field('summary') !== entry.description
      || field('status') !== 'published' || field('approved') !== 'true') {
      throw new Error(`${source}: frontmatter and approved index differ`);
    }
    return { ...entry, paragraphs, sourceSha256: sha256(bytes) };
  });
  return { indexSha256: sha256(indexText), entries };
}

async function run(options) {
  // Validate programmatic callers as strictly as CLI callers.
  options = optionsFrom(['--base-url', options?.baseUrl || 'http://127.0.0.1:4177',
    ...(options?.localOnlyFailures ? ['--local-only-failures'] : [])]);
  const base = new URL(options.baseUrl);
  const href = relative => new URL(relative, base).href;
  const outputDir = path.join(root, 'qa-artifacts', 'writing-release',
    `${loopback(base) ? 'local' : 'remote'}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const report = {
    startedAt: new Date().toISOString(), baseUrl: base.href, localOnlyFailures: options.localOnlyFailures,
    passed: false, checks: [], stages: [], diagnostics: [], sources: [], screenshots: []
  };
  let browser, activePage;
  const check = (condition, label, detail) => {
    report.checks.push({ label, passed: Boolean(condition), ...(detail === undefined ? {} : { detail }) });
    if (!condition) throw new Error(`${label}${detail === undefined ? '' : ': ' + JSON.stringify(detail)}`);
  };
  const same = (actual, expected, label) => check(actual === expected, label,
    actual === expected ? undefined : { expected: String(expected).slice(0, 320), actual: String(actual).slice(0, 320) });
  const capture = async (page, name, fullPage = false) => {
    const filename = `${name}.png`;
    await page.screenshot({ path: path.join(outputDir, filename), fullPage, timeout: 20000 });
    report.screenshots.push(filename);
  };
  const goto = async (page, url) => {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    check(response?.ok(), `HTTP document loads: ${new URL(url).pathname}`, response?.status());
    check(['http:', 'https:'].includes(new URL(page.url()).protocol), 'Browser remains on HTTP(S)');
  };
  const noOverflow = async (page, label, contentSelector) => {
    const dimensions = await page.evaluate(selector => {
      const viewport = document.documentElement.clientWidth;
      const visible = element => element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility !== 'hidden' &&
        (typeof element.checkVisibility !== 'function' || element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }));
      const blocks = [...document.querySelectorAll(selector)].filter(visible).map(element => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName, width: element.clientWidth, scroll: element.scrollWidth,
          left: rect.left, right: rect.right };
      });
      return { viewport, documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), blocks };
    }, contentSelector);
    check(dimensions.documentWidth <= dimensions.viewport + 1, `${label}: document has no horizontal overflow`, dimensions);
    check(dimensions.blocks.length > 0, `${label}: readable blocks are visible`);
    check(dimensions.blocks.every(block => block.scroll <= block.width + 1 && block.left >= -1 && block.right <= dimensions.viewport + 1),
      `${label}: readable blocks fit the viewport`, dimensions.blocks);
  };
  const withPage = async (viewport, label, operation, expectedFailurePath, contextOptions = {}) => {
    const context = await browser.newContext({ viewport, reducedMotion: 'no-preference', locale: 'zh-CN', ...contextOptions });
    const page = await context.newPage();
    activePage = page;
    page.setDefaultTimeout(15000);
    const errors = [], localFailures = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => report.diagnostics.push({ stage: label, kind: 'requestfailed',
      url: request.url(), error: request.failure()?.errorText }));
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin === base.origin && response.status() >= 400 && url.pathname !== expectedFailurePath) {
        localFailures.push({ url: url.href, status: response.status() });
      }
    });
    try {
      await operation(page);
      check(errors.length === 0, `${label}: no uncaught JavaScript errors`, errors);
      check(localFailures.length === 0, `${label}: same-origin resources return no HTTP errors`, localFailures);
      report.stages.push({ label, passed: true });
      console.log(`PASS ${label}`);
    } catch (error) {
      report.stages.push({ label, passed: false, error: error.message });
      await capture(page, `${label.replace(/[^a-z0-9-]/gi, '-')}-failure`).catch(() => {});
      throw error;
    } finally {
      await context.close();
      activePage = null;
    }
  };

  try {
    const oracle = loadExpected(), entries = oracle.entries;
    report.indexSha256 = oracle.indexSha256;
    report.sources = entries.map(({ source, sourceSha256, paragraphs }) => ({ source, sha256: sourceSha256, paragraphs: paragraphs.length }));
    const { chromium } = loadPlaywright();
    const executablePath = edgeExecutable();
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    report.browser = { version: browser.version(), executablePath: executablePath || 'Playwright default Chromium' };

    async function auditList(page, label, trialClicks = false, hydrated = true) {
      if (hydrated) await page.waitForFunction(() => document.querySelector('[data-filter-status]')?.textContent.trim() === '41 篇文章');
      else await page.locator('[data-writing-list] .writing-entry').nth(40).waitFor({ state: 'attached' });
      const items = await page.locator('[data-writing-list] > .writing-entry').evaluateAll(nodes => nodes.map(node => ({
        title: node.querySelector('h2 a')?.innerText,
        href: node.querySelector('h2 a')?.href,
        meta: node.querySelector('.writing-entry-meta')?.innerText,
        summary: node.querySelector('p:not(.writing-entry-meta)')?.innerText,
        sample: node.matches('.is-sample, .is-pending, [data-reading-sample]')
      })));
      same(items.length, entries.length, `${label}: exactly 41 entries`);
      same(await page.locator('[data-writing-list] a').count(), 41, `${label}: exactly 41 source links`);
      for (const [index, expected] of entries.entries()) {
        const item = items[index], prefix = `${label}: item ${index + 1}`;
        same(item.href, href(`article.html?src=${encodeURIComponent(expected.source)}`), `${prefix} source and order`);
        same(normalize(item.title), expected.title, `${prefix} title`);
        same(normalize(item.meta), `长文 · ${expected.date}`, `${prefix} publication date`);
        same(normalize(item.summary), expected.description, `${prefix} summary`);
        check(!item.sample, `${prefix} is published content`);
        check(await page.locator('[data-writing-list] h2 a').nth(index).isVisible(), `${prefix} link is visible`);
        if (trialClicks) await page.locator('[data-writing-list] h2 a').nth(index).click({ trial: true });
      }
      await noOverflow(page, label, '[data-writing-list], .writing-entry h2, .writing-entry > p');
    }

    async function auditArticle(page, entry, label, navigate = true) {
      if (navigate) await goto(page, href(`article.html?src=${encodeURIComponent(entry.source)}`));
      await page.waitForFunction(title => document.querySelector('[data-article-title]')?.textContent === title &&
        document.querySelector('[data-article-body]')?.children.length > 0, entry.title);
      await page.evaluate(() => document.fonts.ready);
      check(await page.locator('[data-article-title]').isVisible(), `${label}: visible title`);
      same(normalize(await page.locator('[data-article-title]').innerText()), entry.title, `${label}: title matches source`);
      check(await page.locator('[data-article-date]').isVisible(), `${label}: visible publication date`);
      same(normalize(await page.locator('[data-article-date]').innerText()), `${entry.date} · 长文`, `${label}: publication date matches source`);
      const rendered = await page.locator('[data-article-body]').evaluate(element => ({
        text: element.innerText,
        paragraphs: [...element.children].map(child => ({ tag: child.tagName, text: child.innerText,
          visible: child.getClientRects().length > 0 && getComputedStyle(child).visibility !== 'hidden' }))
      }));
      same(rendered.paragraphs.length, entry.paragraphs.length, `${label}: paragraph count (no missing or extra body)`);
      entry.paragraphs.forEach((paragraph, index) => {
        const actual = rendered.paragraphs[index];
        check(actual.tag === 'P' && actual.visible, `${label}: paragraph ${index + 1} is rendered prose`);
        same(normalize(actual.text), paragraph, `${label}: paragraph ${index + 1} exactly matches source text`);
      });
      same(normalize(rendered.text), normalize(entry.paragraphs.join('\n\n')), `${label}: complete body text has no additions or omissions`);
      await noOverflow(page, label, '[data-article-title], [data-article-date], [data-article-body], [data-article-body] > p');
    }

    async function auditAnimation(page, label) {
      await page.locator('[data-writing-overview]').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('[data-writing-overview]')?.dataset.state === 'ready');
      const state = () => page.evaluate(() => {
        const container = document.querySelector('[data-overview-art]');
        const animation = window.lottie?.getRegisteredAnimations().find(item => item.wrapper === container);
        return { version: window.lottie?.version, frame: animation?.currentFrame, paused: animation?.isPaused,
          renderer: animation?.renderer?.svgElement?.tagName,
          layers: animation?.animationData?.layers?.length || 0,
          paths: container?.querySelectorAll('svg path').length || 0,
          playback: document.querySelector('[data-writing-overview]')?.dataset.playback };
      });
      const ready = await state();
      same(ready.version, '5.12.2', `${label}: official Lottie player version`);
      check(ready.renderer === 'svg' && ready.layers > 0 && ready.paths > 0, `${label}: real SVG animation and layer data rendered`, ready);
      check(await page.locator('[data-overview-art] > svg').isVisible(), `${label}: animation SVG is visible`);
      await page.waitForFunction(frame => {
        const animation = window.lottie?.getRegisteredAnimations().find(item => item.wrapper === document.querySelector('[data-overview-art]'));
        return animation && !animation.isPaused && Math.abs(animation.currentFrame - frame) > 0.5;
      }, ready.frame);
      await page.locator('[data-overview-toggle]').click();
      same(await page.locator('[data-overview-toggle]').getAttribute('aria-label'), '播放动画', `${label}: pause exposes play control`);
      const paused = await state();
      check(paused.paused && paused.playback === 'paused', `${label}: pause stops the real player`);
      // A timed sample is intentional: a paused frame must remain still while
      // browser animation frames continue to run.
      await page.waitForTimeout(250);
      same((await state()).frame, paused.frame, `${label}: paused SVG frame stays fixed`);
      await page.locator('[data-overview-toggle]').click();
      same(await page.locator('[data-overview-toggle]').getAttribute('aria-label'), '暂停动画', `${label}: resume exposes pause control`);
      await page.waitForFunction(frame => {
        const animation = window.lottie?.getRegisteredAnimations().find(item => item.wrapper === document.querySelector('[data-overview-art]'));
        return animation && !animation.isPaused && Math.abs(animation.currentFrame - frame) > 0.5;
      }, paused.frame);
      check((await state()).playback === 'playing', `${label}: resumed SVG advances`);
      await capture(page, `writing-${label}`);
    }

    async function auditShelf(page, viewport) {
      const label = `shelf-${viewport.width}`, entry = entries[40];
      await goto(page, href('writing.html'));
      const entrance = page.locator('.writing-room-link');
      same(await entrance.getAttribute('href'), './magic-cabin/index.html?view=shelf', `${label}: real Writing room entrance`);
      await entrance.click();
      await page.waitForURL(url => url.pathname === new URL(href('magic-cabin/index.html')).pathname && url.searchParams.get('view') === 'shelf');
      await page.waitForFunction(() => document.body.dataset.cabinFocus === 'shelf' &&
        document.querySelector('#libraryCount')?.textContent === '1–36 / 41', null, { timeout: 45000 });
      same(normalize(await page.locator('#libraryBatch').innerText()), '1 / 2', `${label}: first of two batches`);
      check(await page.locator('#libraryPrev').isDisabled(), `${label}: no previous batch on first shelf`);
      const batch = async (start, end) => {
        const titles = await page.locator('#libraryList button > span').allTextContents();
        const dates = await page.locator('#libraryList button > small').allTextContents();
        same(JSON.stringify(titles), JSON.stringify(entries.slice(start, end).map(item => item.title)), `${label}: batch ${start + 1}–${end} exact titles and order`);
        same(JSON.stringify(dates), JSON.stringify(entries.slice(start, end).map(item => `${item.date} · 长文`)), `${label}: batch dates`);
      };
      await batch(0, 36);
      await page.locator('#libraryNext').click();
      same(normalize(await page.locator('#libraryCount').innerText()), '37–41 / 41', `${label}: final five articles`);
      same(normalize(await page.locator('#libraryBatch').innerText()), '2 / 2', `${label}: second batch`);
      check(await page.locator('#libraryNext').isDisabled(), `${label}: no extra batch`);
      await batch(36, 41);
      if (await page.locator('#libraryDirectory').getAttribute('open') === null) await page.locator('#libraryDirectory summary').click();
      await noOverflow(page, label, '#shelfCatalog, #libraryList button');
      await capture(page, `${label}-second-batch`);
      await page.locator('#libraryList button').nth(4).click();
      await page.waitForFunction(source => {
        const dialog = document.querySelector('#bookReader');
        return dialog?.open && dialog.dataset.book === source && dialog.getAttribute('aria-busy') === 'false'
          && document.querySelector('#readerStatus')?.textContent === '';
      }, entry.source, { timeout: 45000 });
      same(normalize(await page.locator('#readerTitle').innerText()), entry.title, `${label}: article 41 opens from the second batch`);
      same(normalize(await page.locator('#readerEdition').innerText()), `${entry.date} · 长文`, `${label}: book publication date`);
      same(await page.locator('#readerArticle').getAttribute('href'), href(`article.html?src=${encodeURIComponent(entry.source)}`), `${label}: continuous reader uses the same source`);
      same(await page.locator('#bookReader').getAttribute('data-page'), '0', `${label}: fresh context opens the title page`);
      await capture(page, `${label}-article-41-open`);
      const spreads = [], seenPages = new Set();
      while (true) {
        const cursor = Number(await page.locator('#bookReader').getAttribute('data-page'));
        check(Number.isFinite(cursor) && !seenPages.has(cursor) && seenPages.size < 100, `${label}: finite forward page sequence at ${cursor}`);
        seenPages.add(cursor);
        const fragments = await page.locator('#pageLeft .book-prose, #pageRight .book-prose').evaluateAll(elements => elements
          .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
          .map(element => element.textContent));
        spreads.push(...fragments);
        await noOverflow(page, `${label} page ${cursor}`, '#pageLeft, #pageRight, #pageLeft .book-prose, #pageRight .book-prose');
        if (await page.locator('#readerNext').isDisabled()) break;
        await page.locator('#readerNext').click();
        await page.waitForFunction(previous => Number(document.querySelector('#bookReader').dataset.page) > previous &&
          document.querySelector('#flipSheet').hidden, cursor);
      }
      check(seenPages.size > 1, `${label}: article 41 actually flips through multiple spreads`);
      // Page boundaries may split a paragraph or word; compare every non-layout
      // character in order, including punctuation, over all visible paper pages.
      same(spreads.join('').replace(/\s+/g, ''), entry.paragraphs.join('').replace(/\s+/g, ''),
        `${label}: all book body text matches source with no missing or duplicate fragments`);
      const lastPage = Number(await page.locator('#bookReader').getAttribute('data-page'));
      const progress = await page.locator('#readerProgress').innerText();
      check(/\d+(?:–\d+)?\s*\/\s*\d+/.test(progress), `${label}: real page progress is displayed`, progress);
      await capture(page, `${label}-article-41-last-page`);
      await page.locator('#readerPrev').click();
      await page.waitForFunction(previous => Number(document.querySelector('#bookReader').dataset.page) < previous &&
        document.querySelector('#flipSheet').hidden, lastPage);
      await page.locator('#readerClose').click();
      await page.waitForFunction(() => !document.querySelector('#bookReader').open);
      same(normalize(await page.locator('#libraryCount').innerText()), '37–41 / 41', `${label}: closing returns to the same batch`);
      await page.locator('#libraryPrev').click();
      same(normalize(await page.locator('#libraryCount').innerText()), '1–36 / 41', `${label}: previous shelf restores 36 books`);
      await page.locator('.cabin-return').click();
      await page.waitForURL(href('writing.html'));
      await auditList(page, `${label}: return to Writing`);
      report.stages.push({ label: `${label}-pagination`, passed: true, spreads: seenPages.size, progress });
    }

    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await withPage(viewport, `real-release-${viewport.width}`, async page => {
        await goto(page, href('writing.html'));
        await auditList(page, `Writing ${viewport.width}`);
        await auditAnimation(page, String(viewport.width));
        const selected = viewport.width === 1440 ? entries : [entries[0], entries[20], entries[40]];
        for (const entry of selected) {
          const number = entry.source.match(/(\d+)\.md$/)[1];
          await auditArticle(page, entry, `article ${number} ${viewport.width}`);
          if (['01', '21', '41'].includes(number)) await capture(page, `article-${number}-${viewport.width}`, true);
          console.log(`  Verified ${entry.source} at ${viewport.width}px`);
        }
        await auditShelf(page, viewport);
      });
    }

    if (options.localOnlyFailures) {
      await withPage({ width: 390, height: 844 }, 'static-writing-without-javascript', async page => {
        await goto(page, href('writing.html'));
        await auditList(page, 'static Writing without JavaScript', true, false);
        await page.locator('[data-writing-list] h2 a').nth(40).click();
        await page.waitForURL(href(`article.html?src=${encodeURIComponent(entries[40].source)}`));
        check(new URL(page.url()).searchParams.get('src') === entries[40].source,
          'Static final article link navigates without Writing JavaScript');
        // The article renderer itself requires JavaScript. Its complete body
        // has already been verified in the normal browser scenarios above.
      }, undefined, { javaScriptEnabled: false });
      for (const resource of ['assets/vendor/lottie-5.12.2.min.js', 'assets/lottie/overview-dark.json']) {
        for (const mode of ['delayed', 'blocked']) {
          const label = `${mode}-${resource.endsWith('.json') ? 'json' : 'player'}`;
          const target = href(resource);
          await withPage({ width: 390, height: 844 }, label, async page => {
            let intercepted = false, release;
            const gate = new Promise(resolve => { release = resolve; });
            await page.route(target, async route => {
              intercepted = true;
              if (mode === 'delayed') await gate;
              // Aborting after the delayed test has navigated away also avoids
              // leaving a hung request behind. No replacement data is supplied.
              await route.abort('failed').catch(() => {});
            });
            try {
              await goto(page, href('writing.html'));
              await auditList(page, label, true);
              check(intercepted, `${label}: the real dependency request was intercepted`);
              if (mode === 'blocked') {
                await page.waitForFunction(() => document.querySelector('[data-writing-overview]').dataset.state === 'failed');
                same(normalize(await page.locator('[data-overview-fallback]').innerText()), '动画暂不可用', `${label}: failure fallback is visible`);
              } else {
                same(await page.locator('[data-writing-overview]').getAttribute('data-state'), 'loading', `${label}: dependency is still held while all 41 links are actionable`);
              }
              await capture(page, label);
              const index = mode === 'delayed' ? 40 : 0;
              await page.locator('[data-writing-list] h2 a').nth(index).click({ noWaitAfter: true });
              await page.waitForURL(url => url.pathname === new URL(href('article.html')).pathname && url.searchParams.get('src') === entries[index].source,
                { waitUntil: 'domcontentloaded' });
              release();
              await auditArticle(page, entries[index], `${label}: actual link navigation`, false);
            } finally { release(); }
          }, new URL(target).pathname);
        }
      }
    } else {
      report.stages.push({ label: 'local dependency failure injection', skipped: true,
        reason: 'Enable --local-only-failures on a loopback URL; remote runs never intercept dependencies.' });
    }
    report.passed = true;
  } catch (error) {
    report.error = error.stack || String(error);
    if (activePage) await capture(activePage, 'failure').catch(() => {});
    throw error;
  } finally {
    if (browser) await browser.close();
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.passed ? 'PASS' : 'FAIL'} Writing release QA: ${report.checks.filter(item => item.passed).length}/${report.checks.length} checks; ${outputDir}`);
  }
  return report;
}

if (require.main === module) {
  Promise.resolve().then(() => {
    const options = optionsFrom(process.argv.slice(2));
    if (options.help) {
      console.log('node scripts/writing-release-qa.js [--base-url http://127.0.0.1:4177] [--local-only-failures]\nUses an existing HTTP(S) server; does not build, publish, inject app state, or stub dependencies.');
      return;
    }
    return run(options);
  }).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}

module.exports = { run, optionsFrom, loadExpected };
