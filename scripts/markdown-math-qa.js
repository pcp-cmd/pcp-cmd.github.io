const fs = require('fs');
const path = require('path');
const Module = require('module');

const defaultRoot = path.resolve(__dirname, '..');
const fixtureSource = 'content/qa/markdown-math-audit.md';
const oldSource = 'content/math/analysis/chapter-01/web-latex/web-05-set-theory-solutions.md';
const normalizeTex = (value) => String(value).replace(/\r\n?/g, '\n').trim();
const fixtureFormulas = [
  String.raw`a_1+b_2=c_3`,
  String.raw`p_i+q_j=r_k`,
  String.raw`\{x\in A:x>0\}`,
  String.raw`\sum_{i=1}^{n}x_i^2`,
  String.raw`\begin{aligned}
a_i+b_j&=c_k\\
d_l-e_m&=f_n
\end{aligned}`,
  String.raw`\begin{pmatrix}
1&2\\
3&4
\end{pmatrix}`,
  String.raw`u_1+v_2`,
  String.raw`t_1+t_2`,
  String.raw`P\subseteq Q`,
  String.raw`\{1,2\}\subseteq\mathbb{N}`
];
const literalFence = '$$not_math$$\n\\[not_math\\]\n:::proof\n**这是字面示例**\n:::\n';

async function run(env) {
  const { browser, baseUrl } = env;
  const root = env.root || defaultRoot;
  const outputDir = path.join(env.outputDir || path.join(root, 'qa-artifacts'), 'markdown-math');
  fs.mkdirSync(outputDir, { recursive: true });
  const fixture = fs.readFileSync(path.join(root, 'docs/fixtures/markdown-math-audit.md'), 'utf8');
  const legacy = fs.readFileSync(path.join(root, oldSource), 'utf8');
  // Independent oracle for this pre-existing document: it uses only $ / $$,
  // without fenced code, inline code, or escaped dollars that need a parser.
  if (/```|~~~|`|\\\$/.test(legacy)) throw new Error('Legacy math audit oracle needs updating for new literal-code syntax');
  const legacyFormulas = [...legacy.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g)]
    .map((match) => normalizeTex(match[1] ?? match[2]));
  const results = [];
  let completed = false;
  const check = (condition, message) => {
    results.push({ message, passed: Boolean(condition) });
    if (env.assert) env.assert(condition, message);
    else if (!condition) throw new Error(message);
  };
  const sameTex = (actual, expected, label) => {
    check(actual.length === expected.length, `${label}: expected ${expected.length} real math annotations, found ${actual.length}`);
    expected.forEach((tex, index) => check(normalizeTex(actual[index]) === normalizeTex(tex),
      `${label}: formula ${index + 1} preserves TeX source (${JSON.stringify(normalizeTex(tex))})`));
  };
  const localOrigin = new URL(baseUrl).origin;

  try {
    check(legacyFormulas.length > 50, 'Legacy oracle covers the complete old set-theory solutions document');
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      for (const documentCase of [
        { name: 'fixture', source: fixtureSource, expected: fixtureFormulas },
        { name: 'legacy', source: oldSource, expected: legacyFormulas }
      ]) {
        const label = `${documentCase.name} ${viewport.width}px`;
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
        const external = [], errors = [], failedLocal = [];
        await context.route('**/*', async (route) => {
          const url = new URL(route.request().url());
          if (url.origin !== localOrigin) { external.push(url.href); await route.abort('blockedbyclient'); return; }
          if (url.pathname === `/${fixtureSource}`) {
            await route.fulfill({ status: 200, contentType: 'text/markdown; charset=utf-8', body: fixture });
            return;
          }
          await route.continue();
        });
        const page = await context.newPage();
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('response', (response) => { if (response.status() >= 400) failedLocal.push(`${response.status()} ${response.url()}`); });
        try {
          await page.goto(`${baseUrl}/article.html?src=${encodeURIComponent(documentCase.source)}`, { waitUntil: 'load' });
          await page.waitForFunction(() => {
            const title = document.querySelector('[data-article-title]');
            return title && !title.textContent.includes('正在加载');
          });
          await page.evaluate(() => document.fonts.ready);
          await page.evaluate(() => Promise.all([...document.querySelectorAll('[data-article-body] img')].map((image) => image.decode().catch(() => {}))));
          const rendered = await page.evaluate(() => {
            const body = document.querySelector('[data-article-body]');
            return {
              title: document.querySelector('[data-article-title]').textContent,
              katexVersion: window.katex?.version,
              katexFonts: [...document.fonts].filter((font) => font.family.startsWith('KaTeX')).map((font) => ({ family: font.family, status: font.status })),
              tex: [...body.querySelectorAll('.katex annotation[encoding="application/x-tex"]')].map((node) => node.textContent),
              display: [...body.querySelectorAll('.katex-display annotation[encoding="application/x-tex"]')].map((node) => node.textContent),
              mathErrors: [...body.querySelectorAll('.katex-error')].map((node) => node.textContent),
              mathHtml: body.querySelectorAll('.katex .katex-html').length,
              overflow: document.documentElement.scrollWidth > innerWidth + 1,
              maliciousExecuted: window.__markdownMathUnsafe,
              activeMarkup: body.querySelectorAll('script,iframe,[onerror],[onload],a[href^="javascript:"]').length,
              sourceImages: [...body.querySelectorAll('img')].map((img) => ({ width: img.naturalWidth, alt: img.alt })),
              headings: [...body.querySelectorAll('h2,h3')].map((node) => node.textContent),
              table: body.querySelector('table')?.textContent,
              tableCount: body.querySelectorAll('table').length,
              listItems: [...body.querySelectorAll('li')].map((node) => node.textContent),
              strong: [...body.querySelectorAll('strong')].map((node) => node.textContent),
              emphasis: [...body.querySelectorAll('em')].map((node) => node.textContent),
              code: [...body.querySelectorAll('p > code')].map((node) => node.textContent),
              fence: body.querySelector('pre code')?.textContent,
              codeMath: body.querySelectorAll('pre .katex, code .katex').length,
              calloutCount: body.querySelectorAll('.callout-proof').length,
              callout: body.querySelector('.callout-proof') ? {
                strong: body.querySelector('.callout-proof strong')?.textContent,
                items: body.querySelectorAll('.callout-proof li').length,
                tex: [...body.querySelectorAll('.callout-proof annotation[encoding="application/x-tex"]')].map((node) => node.textContent)
              } : null
            };
          });
          check(external.length === 0, `${label}: no external dependency requests (${external.join(', ')})`);
          check(failedLocal.length === 0, `${label}: local assets load (${failedLocal.join(', ')})`);
          check(errors.length === 0, `${label}: no runtime errors (${errors.join(', ')})`);
          check(rendered.katexVersion === '0.16.11', `${label}: real pinned KaTeX 0.16.11 is loaded`);
          check(rendered.katexFonts.some((font) => font.status === 'loaded'), `${label}: real local KaTeX fonts are loaded`);
          sameTex(rendered.tex, documentCase.expected, label);
          check(rendered.mathHtml === documentCase.expected.length, `${label}: every formula has real KaTeX HTML output`);
          check(rendered.mathErrors.length === 0, `${label}: no rejected TeX (${rendered.mathErrors.join(', ')})`);
          check(!rendered.overflow, `${label}: page has no horizontal overflow`);
          if (documentCase.name === 'fixture') {
            sameTex(rendered.display, fixtureFormulas.slice(2, 6), `${label} display delimiters`);
            check(rendered.headings.includes('四种数学分隔符') && rendered.headings.includes('子标题'), `${label}: Markdown headings survive`);
            check(rendered.strong.includes('加粗文字') && rendered.emphasis.includes('强调文字'), `${label}: Markdown inline formatting survives`);
            check(rendered.tableCount === 1 && rendered.table.includes('正常单元格'), `${label}: Markdown table survives`);
            check(rendered.listItems.some((text) => text === '列表第一项') && rendered.listItems.some((text) => text.startsWith('列表第二项')), `${label}: Markdown list survives`);
            check(JSON.stringify(rendered.code) === JSON.stringify(['$not_math$', String.raw`\(not_math\)`, ':::proof']), `${label}: inline code stays literal`);
            check(rendered.fence === literalFence && rendered.codeMath === 0, `${label}: fenced code and its callout marker stay literal`);
            check(rendered.calloutCount === 1 && rendered.callout?.strong === '关键一步' && rendered.callout.items === 2, `${label}: proof callout parses Markdown without leaking into code`);
            sameTex(rendered.callout?.tex || [], fixtureFormulas.slice(-2), `${label} callout`);
            check(!rendered.maliciousExecuted && rendered.activeMarkup === 0, `${label}: unsafe HTML, event handlers and URLs are removed`);
            check(rendered.sourceImages.some((img) => img.alt === '安全过滤探针' && img.width > 0), `${label}: safe image survives sanitization`);
          }
          await page.screenshot({ path: path.join(outputDir, `${documentCase.name}-${viewport.width}.png`), fullPage: false });
          console.log(`[markdown-math-qa] PASS ${label}: ${rendered.tex.length} source-identical formulas`);
        } catch (error) {
          await page.screenshot({ path: path.join(outputDir, `${documentCase.name}-${viewport.width}-failure.png`), fullPage: false }).catch(() => {});
          throw error;
        } finally { await context.close(); }
      }
    }
    completed = true;
    console.log(`[markdown-math-qa] PASS ${results.length} assertions; external networking blocked`);
    return results.length;
  } finally {
    fs.writeFileSync(path.join(outputDir, 'results.json'), JSON.stringify({ assertions: results.length, passed: completed && results.every((item) => item.passed), results }, null, 2) + '\n');
  }
}

function loadPlaywright() {
  try { return require('playwright'); } catch (error) {
    if (!process.env.USERPROFILE) throw error;
    const bundled = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
    const paths = [bundled, path.join(bundled, '.pnpm/node_modules')].filter((candidate) => fs.existsSync(candidate));
    process.env.NODE_PATH = [...paths, process.env.NODE_PATH || ''].filter(Boolean).join(path.delimiter);
    Module._initPaths();
    for (const candidate of paths) if (!module.paths.includes(candidate)) module.paths.unshift(candidate);
    return require('playwright');
  }
}

async function main() {
  const { chromium } = loadPlaywright();
  const server = require('../server.js').createServer();
  let browser;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const candidates = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft/Edge/Application/msedge.exe'), process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft/Edge/Application/msedge.exe')].filter(Boolean);
    const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    await run({ browser, baseUrl: `http://127.0.0.1:${server.address().port}`, root: defaultRoot });
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

module.exports = { run };
if (require.main === module) main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
