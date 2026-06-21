#!/usr/bin/env node
// One-off maintenance script. Not part of normal build pipeline.
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const join = (...p) => path.join(root, ...p);
const exists = (p) => fs.existsSync(join(p));
const read = (p) => fs.readFileSync(join(p), 'utf8');
const write = (p, s) => fs.writeFileSync(join(p), s, 'utf8');
const unlink = (p) => {
  const full = join(p);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { force: true });
    console.log('deleted:', p);
  }
};

function walk(dir) {
  const full = join(dir);
  if (!fs.existsSync(full)) return [];
  const out = [];
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

function replaceFunction(source, name, replacement) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in app.js`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let template = false;
  let escaped = false;

  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (template) {
      if (ch === '`') template = false;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '`') { template = true; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(0, start) + replacement.trimEnd() + source.slice(i + 1);
    }
  }

  throw new Error(`Could not find end of ${name}`);
}

if (!exists('package.json')) {
  console.error('请先 cd 到项目根目录，也就是 package.json 所在目录，再运行这个脚本。');
  process.exit(1);
}

// 1. 清理 QA 报错的旧残留文件
for (const file of walk('content')) {
  if (/#U[0-9a-f]{4}/i.test(file) && file.endsWith('.md')) unlink(file);
}

for (const file of [
  'content/math/analysis/chapter-01/cards/card-01-3-cardinality-learning.md',
  'content/math/analysis/chapter-01/cards/card-01-set-theory-cards-and-test.md'
]) unlink(file);

if (!exists('CLEAN_AUDIT_v1.7.2.md')) {
  write('CLEAN_AUDIT_v1.7.2.md', `# CLEAN_AUDIT_v1.7.2\n\nAleksi Lab v1.7.2 clean reset audit marker.\n\n- Root FIX_NOTES files removed.\n- Formal CSS modules are the runtime source of truth.\n- Generated Markdown/content bundles should be rebuilt after cleanup.\n`);
  console.log('created: CLEAN_AUDIT_v1.7.2.md');
}

unlink('scripts/browser-qa-v1.6.js');

const styles = exists('styles.css') ? read('styles.css') : '';
for (const file of walk('assets/css')) {
  const name = path.basename(file);
  const looksOld = /^(?:\d\d-|99-|100-|101-|102-)|legacy|(?:^|[-_])(fix|patch|hotfix|final)(?:[-_.]|$)/i.test(name);
  if (!looksOld || !file.endsWith('.css')) continue;
  if (styles.includes(`./${file}`) || styles.includes(file)) {
    console.warn('kept imported old CSS, merge manually:', file);
  } else {
    unlink(file);
  }
}

// 2. 生成 Lottie 本地数据文件，避免本地预览时 JSON fetch 抽风
const lottieJsonPath = 'assets/lottie/overview-dark.json';
const lottieDataPath = 'assets/lottie/overview-dark-data.js';

if (exists(lottieJsonPath)) {
  const data = JSON.parse(read(lottieJsonPath));
  write(lottieDataPath, `window.ALEKSI_HERO_LOTTIE_DATA = ${JSON.stringify(data)};\n`);
  console.log('created/updated:', lottieDataPath);
} else {
  console.warn('missing:', lottieJsonPath, '，跳过 Lottie data 文件生成');
}

// 3. 让 index.html 加载 overview-dark-data.js
if (exists('index.html')) {
  let html = read('index.html');
  const dataScript = '  <script defer src="./assets/lottie/overview-dark-data.js"></script>';

  if (!html.includes('./assets/lottie/overview-dark-data.js')) {
    html = html.replace(
      '  <script defer src="./app.js"></script>',
      `${dataScript}\n  <script defer src="./app.js"></script>`
    );
    write('index.html', html);
    console.log('patched: index.html');
  }
}

// 4. 替换 app.js 里的 initHeroLottie，不动其它代码
if (exists('app.js')) {
  const replacement = `function initHeroLottie() {
  const container = document.getElementById('heroGlyphLottie');
  if (!container) return;

  const figure = container.closest('.hero-lottie-figure');
  const markFailed = (reason) => {
    if (figure) {
      figure.classList.remove('has-lottie');
      figure.classList.add('lottie-failed');
    }
    container.classList.remove('is-ready');
    if (reason) console.warn(\`[Aleksi Lab] Hero Lottie fallback: \${reason}\`);
  };

  if (!window.lottie || typeof window.lottie.loadAnimation !== 'function') {
    markFailed('lottie-web did not load.');
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const firstVisibleFrame = 12;

  const animation = window.lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: !reduceMotion,
    autoplay: false,
    path: './assets/lottie/overview-dark.json',
    animationData: window.ALEKSI_HERO_LOTTIE_DATA || undefined,
    initialSegment: [firstVisibleFrame, 239],
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid meet',
      progressiveLoad: true
    }
  });

  animation.setSpeed(0.82);

  let observer;
  let ready = false;

  const revealLottie = () => {
    if (ready) return;
    ready = true;
    container.classList.add('is-ready');
    if (figure) {
      figure.classList.add('has-lottie');
      figure.classList.remove('lottie-failed');
    }
  };

  window.addEventListener('pagehide', () => {
    if (observer) observer.disconnect();
    animation.destroy();
  }, { once: true });

  animation.addEventListener('DOMLoaded', () => {
    if (reduceMotion) {
      animation.goToAndStop(60, true);
      revealLottie();
      return;
    }

    animation.goToAndStop(firstVisibleFrame, true);
    requestAnimationFrame(() => {
      requestAnimationFrame(revealLottie);
    });
  });

  animation.addEventListener('data_failed', () => markFailed('animation data failed to load.'));
  animation.addEventListener('configError', () => markFailed('animation config error.'));
  animation.addEventListener('renderFrameError', () => markFailed('animation render error.'));

  if (reduceMotion) return;

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) animation.play();
      else animation.pause();
    }, { threshold: 0.24 });

    observer.observe(container);
  } else {
    animation.play();
  }
}
`;

  const updated = replaceFunction(read('app.js'), 'initHeroLottie', replacement);
  write('app.js', updated);
  console.log('patched: app.js');
}

// 5. 补一个 QA 需要的移动端 Lottie 尺寸规则
if (exists('assets/css/pages/home.css')) {
  let css = read('assets/css/pages/home.css');

  if (!/@media\s*\(max-width:\s*640px\)[\s\S]*?\.hero-glyph-lottie\s*\{[^}]*width:\s*min\(82%,\s*300px\);/s.test(css)) {
    css += `\n\n@media (max-width: 640px) {\n  .hero-glyph-lottie {\n    width: min(82%, 300px);\n  }\n}\n`;
    write('assets/css/pages/home.css', css);
    console.log('patched: assets/css/pages/home.css mobile Lottie rule');
  }
}

console.log('\n完成。现在运行：');
console.log('  npm run build');
console.log('  npm run qa');
