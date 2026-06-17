const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outputDir = path.resolve(root, '..', '..', 'outputs', 'v1.6-qa');
const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:4186';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

fs.mkdirSync(outputDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function checkNoOverflow(page, label) {
  const size = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    text: document.body.innerText.slice(0, 200)
  }));
  assert(size.scrollWidth <= size.width + 4, `${label} has horizontal overflow: ${size.scrollWidth} > ${size.width}`);
  assert(/rgb\(15, 16, 13\)|rgb\(20, 20, 19\)/.test(size.bodyBg), `${label} does not use dark body background: ${size.bodyBg}`);
}

async function graphMetrics(page, selector) {
  return page.evaluate((graphSelector) => {
    const graph = document.querySelector(graphSelector);
    const nodes = [...graph.querySelectorAll('.graph-node')].map((node) => Number(node.getAttribute('r')));
    const links = [...graph.querySelectorAll('.graph-link')].map((link) => Number(link.getAttribute('stroke-width') || getComputedStyle(link).strokeWidth.replace('px', '')));
    const labels = [...graph.querySelectorAll('.graph-label')].map((label) => Number.parseFloat(label.style.fontSize || getComputedStyle(label).fontSize));
    return {
      nodeCount: nodes.length,
      maxRadius: Math.max(...nodes),
      minRadius: Math.min(...nodes),
      maxStroke: Math.max(...links),
      maxLabel: Math.max(...labels)
    };
  }, selector);
}

(async () => {
  const launchOptions = { headless: true };
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;

  const browser = await chromium.launch(launchOptions);
  const errors = [];

  async function newPage(viewport) {
    const page = await browser.newPage({ viewport });
    await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();
      if (status >= 400 && url.startsWith(baseUrl)) errors.push(`${status} ${url}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text());
    });
    return page;
  }

  const desktop = await newPage({ width: 1440, height: 1000 });
  await desktop.goto(`${baseUrl}/atlas.html`, { waitUntil: 'domcontentloaded' });
  await checkNoOverflow(desktop, 'Atlas desktop');
  const atlas = await graphMetrics(desktop, '[data-lab-atlas]');
  assert(atlas.nodeCount >= 10, `Atlas graph node count too low: ${atlas.nodeCount}`);
  assert(atlas.maxRadius <= 1.05, `Atlas node radius is not Obsidian-small: ${atlas.maxRadius}`);
  assert(atlas.maxStroke <= 0.16, `Atlas link stroke is too heavy: ${atlas.maxStroke}`);
  assert(atlas.maxLabel <= 1.65, `Atlas labels are too large: ${atlas.maxLabel}`);
  await desktop.screenshot({ path: path.join(outputDir, 'atlas-desktop.png'), fullPage: true });

  await desktop.goto(`${baseUrl}/math.html`, { waitUntil: 'domcontentloaded' });
  await desktop.waitForSelector('[data-math-graph] .graph-node');
  await checkNoOverflow(desktop, 'Math desktop');
  const math = await graphMetrics(desktop, '[data-math-graph]');
  assert(math.maxRadius <= 1.05, `Math graph node radius is not Obsidian-small: ${math.maxRadius}`);
  await desktop.screenshot({ path: path.join(outputDir, 'math-desktop.png'), fullPage: true });

  await desktop.goto(`${baseUrl}/work-detail.html?work=gravy-raven-starlight-fade-away`, { waitUntil: 'domcontentloaded' });
  await desktop.waitForSelector('[data-work-scores] .score-item');
  await checkNoOverflow(desktop, 'Gravy Raven detail desktop');
  const workDetail = await desktop.evaluate(() => ({
    img: document.querySelector('[data-work-image]')?.getAttribute('src'),
    scoreCount: document.querySelectorAll('[data-work-scores] .score-item').length,
    articleHref: document.querySelector('[data-work-article-link]')?.getAttribute('href')
  }));
  assert(workDetail.img && workDetail.img.includes('gravy-raven-starlight-fade-away-hero.svg'), 'Work detail does not use Gravy Raven hero SVG');
  assert(workDetail.scoreCount >= 6, `Work detail score count too low: ${workDetail.scoreCount}`);
  assert(workDetail.articleHref && workDetail.articleHref.includes('gravy-raven-starlight-fade-away.md'), 'Work detail related article missing');
  await desktop.screenshot({ path: path.join(outputDir, 'gravy-work-detail-desktop.png'), fullPage: true });

  await desktop.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await desktop.waitForSelector('[data-selected-artifacts] > *');
  await checkNoOverflow(desktop, 'Home desktop');
  const homeCarousel = await desktop.evaluate(() => {
    const grid = document.querySelector('[data-selected-artifacts]');
    return {
      snap: getComputedStyle(grid).scrollSnapType,
      scrollable: grid.scrollWidth > grid.clientWidth,
      cards: grid.children.length
    };
  });
  assert(homeCarousel.snap.includes('x'), `Home carousel snap not active: ${homeCarousel.snap}`);
  assert(homeCarousel.cards >= 3, `Home carousel card count too low: ${homeCarousel.cards}`);

  for (const target of ['works.html', 'article.html?src=content%2Fdesign%2Fworks%2Fgravy-raven-starlight-fade-away.md', 'protocol.html']) {
    await desktop.goto(`${baseUrl}/${target}`, { waitUntil: 'domcontentloaded' });
    await checkNoOverflow(desktop, `${target} desktop`);
  }

  const mobile = await newPage({ width: 390, height: 844 });
  for (const target of ['atlas.html', 'math.html', 'works.html', 'work-detail.html?work=gravy-raven-starlight-fade-away', 'article.html?src=content%2Fdesign%2Fworks%2Fgravy-raven-starlight-fade-away.md']) {
    await mobile.goto(`${baseUrl}/${target}`, { waitUntil: 'domcontentloaded' });
    await checkNoOverflow(mobile, `${target} mobile`);
  }
  await mobile.goto(`${baseUrl}/atlas.html`, { waitUntil: 'domcontentloaded' });
  await mobile.screenshot({ path: path.join(outputDir, 'atlas-mobile.png'), fullPage: true });

  await browser.close();
  assert(errors.length === 0, `Browser console/page errors:\n${errors.join('\n')}`);
  console.log(`Browser QA passed. Screenshots: ${outputDir}`);
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
