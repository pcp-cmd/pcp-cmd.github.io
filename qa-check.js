const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeAsset(file) {
  return String(file || '').replace(/^\.\//, '').replace(/\\/g, '/');
}

function loadWorks() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read('works-data.js'), sandbox, { filename: 'works-data.js' });
  return sandbox.window.ALEKSI_WORKS || [];
}

const requiredFiles = [
  'index.html',
  'works.html',
  'work-detail.html',
  'article.html',
  'math.html',
  'manuscripts.html',
  'protocol.html',
  'atlas.html',
  'styles.css',
  'assets/css/00-tokens.css',
  'assets/css/01-base.css',
  'assets/css/02-layout.css',
  'assets/css/03-components.css',
  'assets/css/04-graph.css',
  'assets/css/pages/home.css',
  'assets/css/pages/works.css',
  'assets/css/pages/math.css',
  'assets/css/pages/manuscripts.css',
  'assets/css/pages/protocol.css',
  'assets/css/pages/atlas.css',
  'app.js',
  'works.js',
  'works-data.js',
  'work-detail.js',
  'article.js',
  'math.js',
  'manuscripts.js',
  'protocol.js',
  'graph-data.js',
  'graph.js',
  'content/design/works/gravy-raven-starlight-fade-away.md',
  'content/design/works/gravy-raven-starlight-fade-away-thumb.svg',
  'content/design/works/gravy-raven-starlight-fade-away-hero.svg',
  'FIX_NOTES_v1.6.0.md'
];

for (const file of requiredFiles) {
  assert(exists(file), `Missing required v1.6 file: ${file}`);
}

const tokensCss = read('assets/css/00-tokens.css');
const baseCss = read('assets/css/01-base.css');
const layoutCss = read('assets/css/02-layout.css');
const componentsCss = read('assets/css/03-components.css');
const graphCss = read('assets/css/04-graph.css');
const homeCss = read('assets/css/pages/home.css');
const worksCss = read('assets/css/pages/works.css');
const pageCss = [
  homeCss,
  worksCss,
  read('assets/css/pages/math.css'),
  read('assets/css/pages/manuscripts.css'),
  read('assets/css/pages/protocol.css'),
  read('assets/css/pages/atlas.css')
].join('\n');
const allNewCss = [tokensCss, baseCss, layoutCss, componentsCss, graphCss, pageCss].join('\n');

const indexHtml = read('index.html');
const worksHtml = read('works.html');
const workDetailHtml = read('work-detail.html');
const articleHtml = read('article.html');
const mathHtml = read('math.html');
const manuscriptsHtml = read('manuscripts.html');
const protocolHtml = read('protocol.html');
const atlasHtml = read('atlas.html');
const appJs = read('app.js');
const worksJs = read('works.js');
const workDetailJs = read('work-detail.js');
const mathJs = read('math.js');
const protocolJs = read('protocol.js');
const graphDataJs = read('graph-data.js');
const graphJs = read('graph.js');
const packageJson = JSON.parse(read('package.json'));
const works = loadWorks();

for (const token of [
  '--page-bg: #0f100d',
  '--panel-bg: #151611',
  '--panel-bg-soft: #1b1c17',
  '--card-bg: #191a15',
  '--card-bg-hover: #202119',
  '--text-strong: #f2f0e8',
  '--text-body: #c7c2b6',
  '--text-muted: #8e897d',
  '--line-soft: rgba(242, 240, 232, 0.08)',
  '--line-mid: rgba(242, 240, 232, 0.14)',
  '--accent: #d77955',
  '--accent-soft: #a85d46',
  '--stage-max: 1480px',
  '--stage-pad: clamp(32px, 5vw, 72px)',
  '--content-max: 1180px',
  '--article-main: 760px'
]) {
  assert(tokensCss.includes(token), `Missing v1.6 dark/stage token: ${token}`);
}

for (const staleLight of [
  '--page-bg: var(--gray-050)',
  '.selected-artifacts { background: var(--gray-050)',
  '.protocol-source { background: var(--gray-000)'
]) {
  assert(!allNewCss.includes(staleLight), `Light theme fallback still active in new CSS: ${staleLight}`);
}

for (const bodyClass of [
  'home-redesign',
  'works-page',
  'work-detail-page',
  'article-page',
  'math-page',
  'manuscripts-page',
  'protocol-page',
  'atlas-page'
]) {
  assert(allNewCss.includes(`body.${bodyClass}`), `Missing dark body override for ${bodyClass}`);
}

for (const token of [
  '.site-stage',
  'width: min(var(--stage-max), calc(100vw - var(--stage-pad) * 2))',
  '.nav-link.is-active',
  'color: var(--text-strong)',
  'font-weight: 700'
]) {
  assert(allNewCss.includes(token), `Missing wide stage/nav active rule: ${token}`);
}

for (const html of [indexHtml, worksHtml, workDetailHtml, articleHtml, mathHtml, manuscriptsHtml, protocolHtml, atlasHtml]) {
  assert(html.includes('<link rel="stylesheet" href="./styles.css">'), 'Every primary page must use the v1.6 CSS stack');
}

for (const token of [
  'scroll-snap-type: x mandatory',
  'scroll-snap-align',
  'startSelectedCarousel',
  'setInterval',
  'mouseenter',
  'focusin'
]) {
  assert([pageCss, appJs].join('\n').includes(token), `Home selected carousel requirement missing: ${token}`);
}
assert(appJs.includes('artifact-glyph'), 'Home selected cards need default glyphs when no image is configured');

for (const token of [
  'thumbnail',
  'heroImage',
  'scores',
  'article',
  'data-work-source',
  'data-work-curation',
  'data-work-process',
  'data-work-meta-table',
  'heroImage || work.image',
  'class="work-detail"'
]) {
  assert([worksDataText(), workDetailHtml, workDetailJs, pageCss].join('\n').includes(token), `Work archive/detail requirement missing: ${token}`);
}

for (const work of works) {
  assert(work.thumbnail, `Work missing thumbnail: ${work.slug}`);
  assert(work.heroImage, `Work missing heroImage: ${work.slug}`);
  assert(work.intro || work.summary, `Work missing Chinese/reader intro: ${work.slug}`);
  assert(work.scores && typeof work.scores === 'object', `Work missing scores: ${work.slug}`);
  for (const scoreKey of ['concept', 'layout', 'typography', 'visual', 'system', 'revision']) {
    assert(typeof work.scores[scoreKey] === 'number', `Work score missing ${scoreKey}: ${work.slug}`);
  }
  assert(exists(normalizeAsset(work.thumbnail)), `Work thumbnail does not exist: ${work.slug} -> ${work.thumbnail}`);
  assert(exists(normalizeAsset(work.heroImage)), `Work heroImage does not exist: ${work.slug} -> ${work.heroImage}`);
  if (work.article) assert(exists(normalizeAsset(work.article)), `Work article does not exist: ${work.slug} -> ${work.article}`);
}

const gravy = works.find((work) => work.slug === 'gravy-raven-starlight-fade-away');
assert(gravy, 'Missing Gravy Raven / Starlight Fade Away work');
assert(gravy.title === 'Lucia / Punishing: Gray Raven', 'Gravy Raven/Lucia title mismatch');
assert(gravy.subtitle && /游戏二创|黑白|编辑海报/.test(gravy.subtitle), 'Gravy Raven/Lucia Chinese subtitle missing');
assert(gravy.article === 'content/design/works/gravy-raven-starlight-fade-away.md', 'Gravy Raven article path mismatch');

for (const token of [
  '.article-layout',
  'grid-template-columns: 260px minmax(720px, 820px) 280px',
  '.article-title',
  'word-break: normal',
  'hyphens: none',
  'overflow-wrap: normal',
  'minmax(720px, 820px)'
]) {
  assert(allNewCss.includes(token), `Article readability rule missing: ${token}`);
}

for (const token of [
  'applyMathFilter',
  'button.addEventListener',
  'data-filter',
  'definition',
  'counterexample',
  'revision',
  'word-break: normal',
  'overflow-wrap: anywhere'
]) {
  assert([mathJs, pageCss].join('\n').includes(token), `Math filter/card rule missing: ${token}`);
}

for (const token of [
  'Raw Experience',
  'Prediction Error',
  'Personal Delta',
  '七链诊断',
  'Asset Levels',
  'Inbox',
  'Candidate',
  'Reference',
  'Core'
]) {
  assert(protocolJs.includes(token), `Protocol engine content missing: ${token}`);
}

for (const token of [
  'nodeRadius',
  'normal: 0.55',
  'important: 0.78',
  'core: 1.05',
  'linkStroke: 0.16',
  'labelSize: 1.65',
  'related',
  'nextAction',
  'openHref'
]) {
  assert([graphDataJs, graphJs].join('\n').includes(token), `Atlas graph behavior/config missing: ${token}`);
}
assert(!graphCss.includes('.graph-node.is-core {\n  r: 9;'), 'Atlas still has oversized core node CSS');
assert(graphCss.includes('.graph-label') && graphCss.includes('opacity'), 'Graph labels should be subdued by default');

assert(allNewCss.includes('.manuscripts-stage'), 'Manuscripts stage width rule missing');
assert(allNewCss.includes('width: min(1480px, calc(100vw - 96px))'), 'Required 1480px stage width missing');

for (const prohibited of [
  'box-shadow: 0 0',
  'neon',
  'shimmer',
  'light-edge',
  'glow-card',
  'scale(1.08',
  'rotate(360'
]) {
  assert(!allNewCss.toLowerCase().includes(prohibited), `Prohibited motion/visual effect found: ${prohibited}`);
}

for (const token of [
  'works-exhibition',
  'data-works-exhibition',
  'data-exhibition-stage',
  'Works / 作品档案',
  '一面可以被打开的展览墙。',
  '视觉实验、排版练习、二创研究与未完成草稿'
]) {
  assert(worksHtml.includes(token), `Works exhibition wall markup missing: ${token}`);
}
assert(!worksHtml.includes('data-works-carousel'), 'Old Works carousel mount must be removed from works.html');

for (const token of [
  'renderExhibitionWorks',
  'compactLayout',
  'layoutCompactCards',
  'bindExhibitionInteractions',
  'updateExhibitionState',
  'data-work-card',
  'tabindex="0"',
  "event.key === 'Enter'",
  "event.key === ' '",
  "class=\"exhibition-card is-${escapeHtml(mediaMode)}\"",
  'has-active-card'
]) {
  assert(worksJs.includes(token), `Works exhibition state machine missing: ${token}`);
}
assert(!worksJs.includes('initWorksCarousel'), 'Old auto-advancing Works carousel script must be removed');

for (const token of [
  '--work-card-w',
  '--work-card-expanded-w',
  '.works-exhibition',
  '.exhibition-stage',
  '.exhibition-card',
  '.exhibition-card__image-window',
  '.exhibition-card.is-active .exhibition-card__image-window',
  '.exhibition-card.is-poster .exhibition-card__image-inner img',
  '.exhibition-stage.has-active-card .exhibition-card.is-inactive',
  '.letter-swap',
  '@keyframes pageIn',
  '@media (prefers-reduced-motion: reduce)'
]) {
  assert(allNewCss.includes(token), `Exhibition/detail CSS rule missing: ${token}`);
}

for (const token of [
  'class="work-detail"',
  'data-work-source',
  'data-work-curation',
  'data-work-process',
  'data-work-meta-table',
  '返回作品档案',
  '作品详情',
  '策展说明',
  '修订过程',
  '档案信息',
  '关联手稿',
  '延伸阅读',
  'href="./works.html"'
]) {
  assert(workDetailHtml.includes(token), `Work detail handbook markup missing: ${token}`);
}

for (const token of [
  'renderMetaTable',
  'source ||',
  'Source pending review',
  '策展说明',
  '修订过程',
  '打开文章',
  'data-work-source',
  'data-work-curation',
  'data-work-process'
]) {
  assert(workDetailJs.includes(token), `Work detail handbook renderer missing: ${token}`);
}

for (const forbidden of [
  ':root {\n  --paper:#f5f1e8',
  '--paper:#f5f1e8',
  '--paper-soft:#faf7ef',
  '--ink:#2f2923',
  'background: var(--paper) !important',
  'color: var(--ink) !important',
  '.works-carousel',
  '.work-card-figure',
  '.work-card-body',
  '.works-selected',
  '.works-stage'
]) {
  assert(!worksCss.includes(forbidden), `Works cleanup regression: ${forbidden}`);
}

for (const required of [
  '--works-bg: var(--page-bg)',
  '--works-ink: var(--text-strong)',
  'min-height: calc(100svh - 72px)',
  '.home-redesign .hero',
  '.exhibition-stage.has-active-card .exhibition-card.is-inactive',
  'filter: saturate(0.65) brightness(0.86)'
]) {
  assert([worksCss, homeCss].join('\n').includes(required), `Missing cleanup rule: ${required}`);
}

for (const forbiddenText of [
  'Return to Works',
  'Work Detail',
  'Curatorial Note',
  'Archive Metadata',
  'Related Manuscript',
  'Companion Reading',
  'Enter work'
]) {
  assert(![worksHtml, worksJs, workDetailHtml, workDetailJs].join('\n').includes(forbiddenText), `English framework copy still present: ${forbiddenText}`);
}

for (const work of works) {
  assert(work.source, `Work missing source for exhibition/detail: ${work.slug}`);
  assert(work.medium, `Work missing medium for exhibition/detail: ${work.slug}`);
  assert(work.summary, `Work missing summary for exhibition/detail: ${work.slug}`);
  assert(work.detailUrl, `Work missing stable detailUrl: ${work.slug}`);
  assert(work.titleDisplay, `Work missing titleDisplay: ${work.slug}`);
  assert(work.thumb, `Work missing exhibition thumb: ${work.slug}`);
  assert(exists(normalizeAsset(work.thumb)), `Work exhibition thumb does not exist: ${work.slug} -> ${work.thumb}`);
}

const legacyAstronautWork = works.find((work) => work.slug === 'astronaut-blue-stage');
assert(
  legacyAstronautWork && /Chainsaw Man|电锯人/.test(legacyAstronautWork.source),
  'Former astronaut-blue-stage item must be source-corrected as Chainsaw Man / 电锯人'
);

assert(packageJson.version === '1.6.0', 'package.json version must be 1.6.0');

function worksDataText() {
  return read('works-data.js');
}

console.log('QA checks passed for Aleksi Lab v1.6 dark archive system.');
