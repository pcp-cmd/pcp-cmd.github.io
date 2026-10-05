const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = __dirname;
let assertions = 0;

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  assertions += 1;
  if (!condition) fail(message);
}

function assertThrows(action, expected, message) {
  assertions += 1;
  try {
    action();
  } catch (error) {
    if (expected.test(String(error && error.message))) return;
    fail(`${message}; received: ${error && error.message}`);
  }
  fail(`${message}; no error was thrown`);
}

function assertDoesNotThrow(action, message) {
  assertions += 1;
  try {
    action();
  } catch (error) {
    fail(`${message}; received: ${error && error.message}`);
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function loadServerModule() {
  const moduleRecord = { exports: {} };
  const mockRequire = (request) => {
    if (request === 'http') {
      return {
        createServer() {
          return { listen() {} };
        }
      };
    }
    return require(request);
  };
  mockRequire.main = {};

  const sandbox = {
    URL,
    __dirname: root,
    console,
    module: moduleRecord,
    exports: moduleRecord.exports,
    process,
    require: mockRequire
  };
  vm.createContext(sandbox);
  vm.runInContext(read('server.js'), sandbox, { filename: 'server.js' });
  return moduleRecord.exports;
}

function listFiles(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory.replace(/\\/g, '/'), entry.name);
    return entry.isDirectory() ? listFiles(relativePath) : [relativePath];
  });
}

function sha256(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relativePath))).digest('hex');
}

function isPathInside(parentPath, childPath) {
  const relative = path.relative(parentPath, childPath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function inspectJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
  ]);
  let offset = 2;

  while (offset + 3 < buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xff) offset += 1;
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) break;
    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue;
    if (offset + 1 >= buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;

    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        format: 'jpeg',
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3)
      };
    }
    offset += segmentLength;
  }
  return null;
}

function inspectWebp(buffer) {
  if (
    buffer.length < 30
    || buffer.toString('ascii', 0, 4) !== 'RIFF'
    || buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) return null;

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString('ascii', offset, offset + 4);
    const chunkLength = buffer.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (payload + chunkLength > buffer.length) return null;

    if (chunkType === 'VP8X' && chunkLength >= 10) {
      return {
        format: 'webp',
        width: readUInt24LE(buffer, payload + 4) + 1,
        height: readUInt24LE(buffer, payload + 7) + 1
      };
    }
    if (
      chunkType === 'VP8 '
      && chunkLength >= 10
      && buffer[payload + 3] === 0x9d
      && buffer[payload + 4] === 0x01
      && buffer[payload + 5] === 0x2a
    ) {
      return {
        format: 'webp',
        width: buffer.readUInt16LE(payload + 6) & 0x3fff,
        height: buffer.readUInt16LE(payload + 8) & 0x3fff
      };
    }
    if (chunkType === 'VP8L' && chunkLength >= 5 && buffer[payload] === 0x2f) {
      const bits = buffer.readUInt32LE(payload + 1);
      return {
        format: 'webp',
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1
      };
    }

    offset = payload + chunkLength + (chunkLength % 2);
  }
  return null;
}

function inspectSupportedImage(filePath) {
  const buffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  let image = null;

  if (
    extension === '.png'
    && buffer.length >= 24
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    && buffer.toString('ascii', 12, 16) === 'IHDR'
  ) {
    image = { format: 'png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  } else if (extension === '.jpg' || extension === '.jpeg') {
    image = inspectJpeg(buffer);
  } else if (
    extension === '.gif'
    && buffer.length >= 10
    && /^(?:GIF87a|GIF89a)$/.test(buffer.toString('ascii', 0, 6))
  ) {
    image = { format: 'gif', width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  } else if (extension === '.webp') {
    image = inspectWebp(buffer);
  } else if (extension === '.svg') {
    const source = buffer.toString('utf8');
    const viewBox = source.match(/\bviewBox\s*=\s*["']\s*[-+.\d]+\s+[-+.\d]+\s+([-+.\d]+)\s+([-+.\d]+)\s*["']/i);
    const width = source.match(/\bwidth\s*=\s*["']\s*([-+.\d]+)(?:px)?\s*["']/i);
    const height = source.match(/\bheight\s*=\s*["']\s*([-+.\d]+)(?:px)?\s*["']/i);
    if (/<svg\b/i.test(source) && (viewBox || (width && height))) {
      image = {
        format: 'svg',
        width: Number(viewBox ? viewBox[1] : width[1]),
        height: Number(viewBox ? viewBox[2] : height[1])
      };
    }
  }

  if (!image || !Number.isFinite(image.width) || !Number.isFinite(image.height)) return null;
  return image;
}

function countTopLevelRules(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (css.match(new RegExp(`^${escaped}\\s*\\{`, 'gm')) || []).length;
}

function maskCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

function normalizeCssPrelude(value) {
  return value.trim().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ');
}

function findCssBlockEnd(css, openIndex, endIndex) {
  let depth = 1;
  let quote = '';
  let escaped = false;

  for (let index = openIndex + 1; index < endIndex; index += 1) {
    const character = css[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}' && --depth === 0) return index;
  }

  fail(`Unclosed CSS block at index ${openIndex}`);
}

function parseCssDeclarations(body) {
  const declarations = new Map();
  let quote = '';
  let escaped = false;
  let parentheses = 0;
  let brackets = 0;
  let start = 0;

  for (let index = 0; index <= body.length; index += 1) {
    const character = body[index] || ';';
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '(') parentheses += 1;
    else if (character === ')') parentheses -= 1;
    else if (character === '[') brackets += 1;
    else if (character === ']') brackets -= 1;
    else if (character === ';' && parentheses === 0 && brackets === 0) {
      const declaration = body.slice(start, index).trim();
      const match = declaration.match(/^([\w-]+)\s*:\s*([\s\S]*)$/);
      if (match) {
        declarations.set(match[1].toLowerCase(), /!important\s*$/i.test(match[2]));
      }
      start = index + 1;
    }
  }

  return declarations;
}

function collectCssRules(css) {
  const source = maskCssComments(css);
  const rules = [];

  function parseRange(startIndex, endIndex, scope) {
    let index = startIndex;
    while (index < endIndex) {
      while (index < endIndex && /\s/.test(source[index])) index += 1;
      if (index >= endIndex) break;

      const preludeStart = index;
      let quote = '';
      let escaped = false;
      let parentheses = 0;
      let brackets = 0;

      for (; index < endIndex; index += 1) {
        const character = source[index];
        if (quote) {
          if (escaped) escaped = false;
          else if (character === '\\') escaped = true;
          else if (character === quote) quote = '';
          continue;
        }
        if (character === '"' || character === "'") {
          quote = character;
          continue;
        }
        if (character === '(') parentheses += 1;
        else if (character === ')') parentheses -= 1;
        else if (character === '[') brackets += 1;
        else if (character === ']') brackets -= 1;
        else if (parentheses === 0 && brackets === 0 && (character === '{' || character === ';')) break;
      }

      if (index >= endIndex) break;
      const prelude = normalizeCssPrelude(source.slice(preludeStart, index));
      if (source[index] === ';') {
        index += 1;
        continue;
      }

      const blockStart = index;
      const blockEnd = findCssBlockEnd(source, blockStart, endIndex);
      const line = source.slice(0, preludeStart).split('\n').length;

      if (prelude.startsWith('@')) {
        if (/^@(media|supports|container|layer|scope)\b/i.test(prelude)) {
          parseRange(blockStart + 1, blockEnd, scope.concat(prelude));
        }
      } else if (prelude) {
        rules.push({
          selector: prelude,
          scope: scope.join(' > ') || 'base',
          line,
          body: source.slice(blockStart + 1, blockEnd),
          declarations: parseCssDeclarations(source.slice(blockStart + 1, blockEnd))
        });
      }
      index = blockEnd + 1;
    }
  }

  parseRange(0, source.length, []);
  return rules;
}

function countCssRules(css, selector, scope = 'base') {
  const normalizedSelector = normalizeCssPrelude(selector);
  return collectCssRules(css)
    .filter((rule) => rule.scope === scope && rule.selector === normalizedSelector)
    .length;
}

function findFullyShadowedCssRules(css) {
  const groups = new Map();
  for (const rule of collectCssRules(css)) {
    const key = `${rule.scope}\u0000${rule.selector}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rule);
  }

  const shadowed = [];
  for (const rules of groups.values()) {
    for (let index = 0; index < rules.length - 1; index += 1) {
      const earlier = rules[index];
      const laterDeclarations = new Map();
      for (const later of rules.slice(index + 1)) {
        for (const [property, important] of later.declarations) {
          laterDeclarations.set(property, laterDeclarations.get(property) || important);
        }
      }
      const fullyShadowed = earlier.declarations.size > 0
        && [...earlier.declarations].every(([property, important]) => {
          if (!laterDeclarations.has(property)) return false;
          return !important || laterDeclarations.get(property);
        });
      if (fullyShadowed) shadowed.push(earlier);
    }
  }
  return shadowed;
}

function loadWorks() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(
    `${read('works-data.js')}
window.__ALEKSI_WORK_SOURCES = workSources;
window.__ALEKSI_WORK_DETAILS = typeof workDetails === 'undefined' ? {} : workDetails;`,
    sandbox,
    { filename: 'works-data.js' }
  );
  return {
    works: sandbox.window.ALEKSI_WORKS,
    aliases: sandbox.window.ALEKSI_WORK_ALIASES,
    sources: sandbox.window.__ALEKSI_WORK_SOURCES,
    details: sandbox.window.__ALEKSI_WORK_DETAILS
  };
}

function loadContent() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read('content.js'), sandbox, { filename: 'content.js' });
  return sandbox.window.ALEKSI_CONTENT;
}

function loadContentBundle() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read('content/content-bundle.js'), sandbox, {
    filename: 'content/content-bundle.js'
  });
  return {
    markdown: sandbox.window.ALEKSI_MARKDOWN_BUNDLE,
    json: sandbox.window.ALEKSI_JSON_BUNDLE
  };
}

function loadDesktopSlot() {
  const sandbox = {
    window: { ALEKSI_WORKS: [] },
    document: { addEventListener() {} },
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(read('works.js'), sandbox, { filename: 'works.js' });
  return vm.runInContext('desktopSlot', sandbox, { filename: 'works.js:desktopSlot' });
}

function createListenerTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    },
    dispatch(type, event = {}) {
      for (const handler of [...(listeners.get(type) || [])]) {
        handler({ type, target: this, ...event });
      }
    }
  };
}

function createStyleDeclaration() {
  const properties = new Map();
  return {
    setProperty(name, value) {
      properties.set(name, String(value));
    },
    removeProperty(name) {
      properties.delete(name);
    }
  };
}

function createClassList() {
  const classes = new Set();
  return {
    toggle(name, force) {
      if (force) classes.add(name);
      else classes.delete(name);
    },
    contains(name) {
      return classes.has(name);
    }
  };
}

function hasNestedInteractiveControls(markup) {
  let depth = 0;
  for (const match of markup.matchAll(/<(\/?)(?:a|button)\b[^>]*>/gi)) {
    if (match[1]) {
      depth = Math.max(0, depth - 1);
    } else {
      if (depth > 0) return true;
      depth += 1;
    }
  }
  return false;
}

function createWorksRuntime({ useResizeObserver = true, works = [] } = {}) {
  const documentTarget = createListenerTarget();
  const windowTarget = createListenerTarget();
  const stageTarget = createListenerTarget();
  const observerState = { active: 0, disconnected: 0 };
  const index = { innerHTML: '' };
  const stage = {
    ...stageTarget,
    clientWidth: 1440,
    innerHTML: '',
    style: createStyleDeclaration(),
    classList: { toggle() {} },
    querySelectorAll() {
      return [];
    }
  };
  const document = {
    ...documentTarget,
    querySelector(selector) {
      if (selector === '[data-exhibition-stage]') return stage;
      if (selector === '[data-works-index]') return index;
      return null;
    }
  };
  const window = {
    ...windowTarget,
    ALEKSI_WORKS: works,
    location: { pathname: '/works.html' },
    matchMedia() {
      return { matches: true };
    },
    setTimeout,
    clearTimeout
  };
  const sandbox = {
    window,
    document,
    URL,
    console,
    setTimeout,
    clearTimeout
  };

  if (useResizeObserver) {
    class FakeResizeObserver {
      observe() {
        observerState.active += 1;
      }

      disconnect() {
        observerState.active -= 1;
        observerState.disconnected += 1;
      }
    }
    window.ResizeObserver = FakeResizeObserver;
    sandbox.ResizeObserver = FakeResizeObserver;
  }

  vm.createContext(sandbox);
  vm.runInContext(read('works.js'), sandbox, { filename: 'works.js' });
  return { sandbox, window, document, stage, index, observerState };
}

function createInteractiveWorksRuntime() {
  const runtime = createWorksRuntime();
  const attributes = new Map([['aria-expanded', 'false']]);
  const title = { textContent: 'Test work' };
  const button = {
    textContent: '聚焦',
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) || null;
    }
  };
  const card = {
    dataset: { id: 'test-work' },
    classList: createClassList(),
    querySelector(selector) {
      if (selector === '.exhibition-card__toggle') return button;
      if (selector === '.exhibition-card__title') return title;
      return null;
    }
  };
  const target = (kind) => ({
    closest(selector) {
      if (selector === '[data-work-card]') return card;
      if (selector === '.exhibition-card__toggle') return kind === 'button' ? button : null;
      if (selector === 'a, button') return kind === 'button' || kind === 'link' ? this : null;
      return null;
    }
  });

  runtime.stage.classList = createClassList();
  runtime.stage.querySelectorAll = (selector) => selector === '[data-work-card]' ? [card] : [];
  runtime.sandbox.interactiveStage = runtime.stage;
  return {
    ...runtime,
    card,
    button,
    buttonTarget: target('button'),
    linkTarget: target('link'),
    plainTarget: target('plain')
  };
}

function assertDesktopSlot(desktopSlot, input, expected) {
  const actual = desktopSlot(input.index, input.count, input.width);
  for (const property of ['x', 'y', 'rotate']) {
    assert(
      actual[property] === expected[property],
      `desktopSlot(${input.index}, ${input.count}, ${input.width}).${property} must be ${expected[property]}; found ${actual[property]}`
    );
  }
}

function renderNavigationWithLabel(file, pathname, label) {
  const nav = {
    html: '',
    imgNodeCount: 0,
    set innerHTML(value) {
      this.html = String(value);
      this.imgNodeCount = (this.html.match(/<img\b/gi) || []).length;
    },
    get innerHTML() {
      return this.html;
    }
  };
  const document = {
    documentElement: { classList: { add() {} } },
    getElementById() {
      return null;
    },
    querySelector(selector) {
      return selector === '.desktop-nav' ? nav : null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {}
  };
  const window = {
    ALEKSI_CONTENT: {
      nav: [{ label, href: './works.html' }]
    },
    ALEKSI_WORKS: [],
    location: { pathname },
    addEventListener() {},
    matchMedia() {
      return { matches: true };
    }
  };
  const sandbox = {
    window,
    document,
    URLSearchParams,
    Blob,
    console,
    setInterval() {
      return 0;
    },
    clearInterval() {}
  };
  vm.createContext(sandbox);
  vm.runInContext(read(file), sandbox, { filename: file });
  vm.runInContext('renderNavigation()', sandbox, { filename: `${file}:renderNavigation` });
  return nav;
}

function createWorkDetailRuntime({ search, works, aliases }) {
  const createNode = (initial = {}) => ({
    textContent: '',
    innerHTML: '',
    hidden: false,
    href: '',
    src: '',
    alt: '',
    loading: '',
    ...initial
  });
  const nodes = {
    detail: createNode(),
    curationHeading: createNode(),
    processHeading: createNode(),
    title: createNode(),
    source: createNode(),
    summary: createNode(),
    curation: createNode(),
    process: createNode(),
    meta: createNode(),
    scores: createNode(),
    tags: createNode(),
    image: createNode({ src: './content/design/works/ayase-momo-dandadan/hero.webp' }),
    articleSection: createNode({ hidden: true }),
    articleLink: createNode(),
    articleTitle: createNode()
  };
  const selectors = new Map([
    ['[data-work-detail]', nodes.detail],
    ['.work-curation h2', nodes.curationHeading],
    ['.work-process h2', nodes.processHeading],
    ['[data-work-title]', nodes.title],
    ['[data-work-source]', nodes.source],
    ['[data-work-summary]', nodes.summary],
    ['[data-work-curation]', nodes.curation],
    ['[data-work-process]', nodes.process],
    ['[data-work-meta-table]', nodes.meta],
    ['[data-work-scores]', nodes.scores],
    ['[data-work-tags]', nodes.tags],
    ['[data-work-image]', nodes.image],
    ['[data-work-article-section]', nodes.articleSection],
    ['[data-work-article-link]', nodes.articleLink],
    ['[data-work-article-title]', nodes.articleTitle]
  ]);
  const document = {
    title: '',
    querySelector(selector) {
      return selectors.get(selector) || null;
    },
    addEventListener() {}
  };
  const window = {
    ALEKSI_WORKS: works,
    ALEKSI_WORK_ALIASES: aliases,
    location: {
      pathname: '/work-detail.html',
      search
    },
    matchMedia() {
      return { matches: true };
    }
  };
  const sandbox = {
    window,
    document,
    URL,
    URLSearchParams,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(read('work-detail.js'), sandbox, { filename: 'work-detail.js' });
  return { sandbox, window, document, nodes };
}

const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');
const contentManifest = readJson('content/manifest.json');
const markdownIndex = readJson('content/markdown-index.json');
const mathChapterManifest = readJson('content/math/analysis/chapter-01/manifest.json');
const contentBundle = loadContentBundle();
const serverModule = loadServerModule();
assert(
  typeof serverModule.resolvePublicPath === 'function',
  'server.js must export resolvePublicPath for security verification'
);
assert(
  serverModule.resolvePublicPath('/index.html') === path.join(root, 'index.html'),
  'server.js must resolve ordinary public files inside the repository root'
);
for (const forbiddenRequest of [
  '/.git/HEAD',
  '/.env',
  '/../outside.txt',
  '/%2e%2e/outside.txt',
  '/folder/%2ehidden/file.txt'
]) {
  assert(
    serverModule.resolvePublicPath(forbiddenRequest) === null,
    `server.js must reject forbidden request path: ${forbiddenRequest}`
  );
}
const content = loadContent();
for (const artifact of content.selectedArtifacts || []) {
  if (!artifact.image) continue;
  const imagePath = artifact.image.replace(/^\.\//, '');
  assert(exists(imagePath), `Homepage selected artifact image is missing: ${artifact.image}`);
}
const worksDataSource = read('works-data.js');
const {
  works,
  aliases: workAliases,
  sources: workSources,
  details: workDetails
} = loadWorks();
const forbiddenRootNotes = fs.readdirSync(root).filter((name) => /^FIX_NOTES_.*\.md$/i.test(name));
const mathChapterRoot = 'content/math/analysis/chapter-01';
const publicMathMarkdown = [
  ...listFiles(`${mathChapterRoot}/cards`),
  ...listFiles(`${mathChapterRoot}/notes`)
].filter((file) => file.endsWith('.md'));
const publicMathHashes = new Map();
const duplicatePublicMath = [];
const malformedUnicodeToken = /#U[0-9a-f]{4}/i;
const malformedContentPaths = listFiles('content').filter((file) => malformedUnicodeToken.test(file));
const buildMarkdownSource = read('scripts/build-markdown.js');
const buildManifestSource = read('scripts/build-content-manifest.js');
const buildBundleSource = read('scripts/build-content-bundle.js');

assert(
  /if \(require\.main === module\)/.test(buildMarkdownSource)
    && /module\.exports/.test(buildMarkdownSource)
    && /if \(require\.main === module\)/.test(buildManifestSource)
    && /module\.exports/.test(buildManifestSource),
  'JSON builders must expose non-mutating deterministic helpers behind require.main guards'
);
if (
  /if \(require\.main === module\)/.test(buildMarkdownSource)
  && /module\.exports/.test(buildMarkdownSource)
  && /if \(require\.main === module\)/.test(buildManifestSource)
  && /module\.exports/.test(buildManifestSource)
) {
  const markdownBuilder = require('./scripts/build-markdown.js');
  const manifestBuilder = require('./scripts/build-content-manifest.js');
  const fixture = path.join(root, 'content', '.qa-generated-at.json');
  const existing = {
    generatedAt: '2026-01-02T03:04:05.000Z',
    nested: { second: 2, first: 1 },
    value: 'same'
  };

  try {
    fs.writeFileSync(fixture, JSON.stringify(existing), 'utf8');
    for (const [name, builder] of [
      ['Markdown', markdownBuilder],
      ['Manifest', manifestBuilder]
    ]) {
      assert(
        builder.stableStringify({ nested: { second: 2, first: 1 } })
          === builder.stableStringify({ nested: { first: 1, second: 2 } }),
        `${name} builder stableStringify must ignore object key insertion order`
      );
      assert(
        builder.generatedAtForPayload(fixture, {
          value: 'same',
          nested: { first: 1, second: 2 }
        }, '2030-01-01T00:00:00.000Z') === existing.generatedAt,
        `${name} builder must preserve generatedAt for an unchanged semantic payload`
      );
      assert(
        builder.generatedAtForPayload(fixture, {
          value: 'changed',
          nested: { first: 1, second: 2 }
        }, '2030-01-01T00:00:00.000Z') === '2030-01-01T00:00:00.000Z',
        `${name} builder must use the supplied current ISO time for a changed payload`
      );
    }
  } finally {
    if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
  }
}
assert(
  /function assertContainedRealPath\(/.test(buildMarkdownSource)
    && /lstatSync/.test(buildMarkdownSource)
    && /realpathSync/.test(buildMarkdownSource)
    && /function assertContainedRealPath\(/.test(buildBundleSource)
    && /lstatSync/.test(buildBundleSource)
    && /realpathSync/.test(buildBundleSource)
    && /if \(require\.main === module\)/.test(buildBundleSource)
    && /module\.exports/.test(buildBundleSource),
  'Recursive content builders must expose contained realpath walkers behind require.main guards'
);
if (
  /function assertContainedRealPath\(/.test(buildMarkdownSource)
  && /function assertContainedRealPath\(/.test(buildBundleSource)
  && /if \(require\.main === module\)/.test(buildBundleSource)
  && /module\.exports/.test(buildBundleSource)
) {
  const markdownBuilder = require('./scripts/build-markdown.js');
  const bundleBuilder = require('./scripts/build-content-bundle.js');
  const linkPath = path.join(root, 'content', '.qa-outside-link.md');
  let symlinkCreated = false;

  try {
    try {
      fs.symlinkSync(path.join(root, 'package.json'), linkPath, 'file');
      symlinkCreated = true;
    } catch (error) {
      if (!['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
    }

    if (symlinkCreated) {
      assertThrows(
        () => markdownBuilder.listMarkdown(path.join(root, 'content')),
        /symbolic link|reparse point/i,
        'Markdown walker must reject a symbolic link inside content'
      );
      assertThrows(
        () => bundleBuilder.walk(path.join(root, 'content')),
        /symbolic link|reparse point/i,
        'Bundle walker must reject a symbolic link inside content'
      );
    } else {
      const symbolicFs = {
        lstatSync() {
          return { isSymbolicLink: () => true };
        }
      };
      for (const [name, builder] of [
        ['Markdown', markdownBuilder],
        ['Bundle', bundleBuilder]
      ]) {
        assertThrows(
          () => builder.assertContainedRealPath('fixture', path.join(root, 'content'), symbolicFs),
          /symbolic link|reparse point/i,
          `${name} containment helper must reject a symbolic-link lstat result`
        );
      }
    }
  } finally {
    try {
      fs.lstatSync(linkPath);
      fs.unlinkSync(linkPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}
if (
  /if \(require\.main === module\)/.test(buildMarkdownSource)
  && /module\.exports/.test(buildMarkdownSource)
) {
  const markdownBuilder = require('./scripts/build-markdown.js');
  const outputPath = path.join(root, 'content', 'markdown-index.json');
  const originalOutput = fs.readFileSync(outputPath);
  const duplicatePath = path.join(
    root,
    'content',
    'math',
    'analysis',
    'chapter-01',
    'web-latex',
    '.qa-duplicate.md'
  );

  try {
    fs.copyFileSync(
      path.join(root, 'content', 'math', 'analysis', 'chapter-01', 'notes', '01-3-cardinality-learning.md'),
      duplicatePath
    );
    assertThrows(
      () => markdownBuilder.buildMarkdown(),
      /Byte-identical Math chapter Markdown entries:/,
      'Markdown builder must reject byte-identical Markdown anywhere in chapter-01'
    );
  } finally {
    if (fs.existsSync(duplicatePath)) fs.unlinkSync(duplicatePath);
    fs.writeFileSync(outputPath, originalOutput);
  }

  const outsideDuplicateA = path.join(root, 'content', '.qa-duplicate-a.md');
  const outsideDuplicateB = path.join(root, 'content', '.qa-duplicate-b.md');
  try {
    fs.writeFileSync(outsideDuplicateA, '# QA duplicate outside Math chapter\n', 'utf8');
    fs.copyFileSync(outsideDuplicateA, outsideDuplicateB);
    const originalLog = console.log;
    try {
      console.log = () => {};
      assertDoesNotThrow(
        () => markdownBuilder.buildMarkdown(),
        'Markdown builder must allow byte-identical Markdown outside chapter-01'
      );
    } finally {
      console.log = originalLog;
    }
  } finally {
    for (const fixture of [outsideDuplicateA, outsideDuplicateB]) {
      if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
    }
    fs.writeFileSync(outputPath, originalOutput);
  }
}

assert(
  malformedContentPaths.length === 0,
  `Content filenames must not contain #U[hex4] path tokens: ${malformedContentPaths.join(', ')}`
);
assert(
  /function assertSafeRelativePath\(/.test(buildMarkdownSource)
    && /assertSafeRelativePath\(source\)/.test(buildMarkdownSource),
  'Markdown builder must validate each indexed source with assertSafeRelativePath'
);
assert(
  /function assertSafeRelativePath\(/.test(buildBundleSource)
    && /assertSafeRelativePath\(rel\(file\)\)/.test(buildBundleSource),
  'Content bundle builder must validate each bundled relative path with assertSafeRelativePath'
);
assert(
  /Duplicate Markdown source path:/.test(buildMarkdownSource),
  'Markdown builder must reject duplicate source paths with a clear error'
);
assert(
  /Byte-identical Math chapter Markdown entries:/.test(buildMarkdownSource),
  'Markdown builder must reject byte-identical chapter Markdown entries with a clear error'
);
assert(
  !malformedUnicodeToken.test(read('content/markdown-index.json'))
    && !malformedUnicodeToken.test(read('content/content-bundle.js')),
  'Generated Markdown index and content bundle must not contain #U[hex4] path tokens'
);

for (const file of publicMathMarkdown) {
  const hash = sha256(file);
  if (publicMathHashes.has(hash)) duplicatePublicMath.push([publicMathHashes.get(hash), file]);
  else publicMathHashes.set(hash, file);
}

assert(
  duplicatePublicMath.length === 0,
  `Public Math cards/notes contain byte-identical duplicates: ${duplicatePublicMath.map((files) => files.join(' = ')).join('; ')}`
);
assert(
  JSON.stringify(mathChapterManifest.webLatex.map((entry) => entry.file)) === JSON.stringify([
    'web-latex/web-01-set-theory-index.md',
    'web-latex/web-02-set-axioms.md',
    'web-latex/web-03-order-structures.md',
    'web-latex/web-04-cardinality.md',
    'web-latex/web-05-set-theory-solutions.md',
    'web-latex/web-06-review-cards-and-test.md',
    'web-latex/web-README.md'
  ]),
  'Chapter manifest webLatex entries must match the seven canonical paths'
);
assert(
  JSON.stringify(mathChapterManifest.cards.map((entry) => entry.file))
    === JSON.stringify(['cards/card-06-review-cards-and-test.md']),
  'Chapter manifest cards must contain only canonical card-06'
);
for (const group of ['notes', 'webLatex', 'cards']) {
  for (const entry of mathChapterManifest[group]) {
    const source = `${mathChapterRoot}/${entry.file}`;
    assert(exists(source), `Chapter manifest source is missing: ${source}`);
    assert(
      fs.statSync(path.join(root, source)).size === entry.bytes,
      `Chapter manifest byte count is stale for ${source}`
    );
    assert(!entry.title.includes('\uFFFD'), `Chapter manifest title contains a replacement character: ${entry.title}`);
  }
}
assert(
  markdownIndex.count === markdownIndex.files.length,
  'Markdown index count must equal its files array length'
);
assert(
  new Set(markdownIndex.files.map((entry) => entry.source)).size === markdownIndex.files.length,
  'Markdown index source paths must be unique'
);
for (const entry of markdownIndex.files) {
  assert(exists(entry.source), `Indexed Markdown source is missing: ${entry.source}`);
  assert(
    entry.article === `article.html?src=${encodeURIComponent(entry.source)}`,
    `Indexed article URL must encode its canonical source: ${entry.source}`
  );
}
const nonPublicMarkdownSources = markdownIndex.files
  .map((entry) => entry.source)
  .filter((source) =>
    /(?:^|\/)[^/]*README\.md$/i.test(source)
      || /(?:^|\/)[^/]+-template\.md$/i.test(source)
      || /(?:^|\/)archive(?:\/|$)/i.test(source)
  );
assert(
  nonPublicMarkdownSources.length === 0,
  `Markdown index must exclude README, template, and archive content: ${nonPublicMarkdownSources.join(', ')}`
);
assert(
  JSON.stringify(Object.keys(contentBundle.markdown).sort())
    === JSON.stringify(markdownIndex.files.map((entry) => entry.source).sort()),
  'Browser Markdown bundle must contain exactly the public Markdown index sources'
);
const writingSandbox = { window: {} };
vm.runInNewContext(read('site-data.js'), writingSandbox, { filename: 'site-data.js' });
const writingEntries = writingSandbox.window.ALEKSI_SITE.writing;
const expectedWritingSources = Array.from({ length: 41 }, (_, index) => `content/writing/${String(index + 1).padStart(2, '0')}.md`);
assert(Array.isArray(writingEntries) && writingEntries.length === 41, 'Writing index must contain the 41 approved imported articles');
const writingSources = writingEntries.map((entry) => entry.source);
assert(new Set(writingSources).size === 41, 'Writing sources must be unique');
assert(JSON.stringify([...writingSources].sort()) === JSON.stringify(expectedWritingSources), 'Writing must map one-to-one to all 41 imported Markdown sources');
for (const entry of writingEntries) {
  assert(entry.approved === true, `Writing article must be approved: ${entry.source}`);
  assert(typeof entry.title === 'string' && entry.title.trim().length > 0, `Writing article needs its real title: ${entry.source}`);
  assert(['long', 'note'].includes(entry.type), `Writing article needs a supported type: ${entry.source}`);
  assert(exists(entry.source), `Writing Markdown source is missing: ${entry.source}`);
  assert(markdownIndex.files.some((item) => item.source === entry.source), `Writing source must be indexed: ${entry.source}`);
  assert(contentBundle.markdown[entry.source] === read(entry.source), `Writing bundle must match its Markdown source: ${entry.source}`);
}
const legacyMarkdownSources = markdownIndex.files.map((entry) => entry.source).filter((source) => !writingSources.includes(source)).sort();
// Frozen source-path identity of the 36 public Markdown files before the Writing import.
assert(legacyMarkdownSources.length === 36 && crypto.createHash('sha256').update(legacyMarkdownSources.join('\n')).digest('hex') === '50484f4d3ba90f0effe3c323106c0a9afe902f4f95a04a0bca051e80cd047fa5', 'Writing import must preserve the exact 36-source public Markdown baseline');
assert(markdownIndex.count === 77, 'Markdown index must contain the original 36 public files plus 41 Writing articles');
assert(markdownIndex.files.some((entry) => entry.source === 'content/research/uga-overview.md'), 'Markdown index must include the public UGA overview');
assert(contentBundle.markdown['content/research/uga-overview.md'] === read('content/research/uga-overview.md'), 'UGA bundle must match its downloadable overview');
const forbiddenBundledJson = Object.keys(contentBundle.json).filter((source) =>
  /(?:^|\/)source-map\.json$/i.test(source)
    || /(?:^|\/)[^/]*-build-log\.json$/i.test(source)
    || /(?:^|\/)archive(?:\/|$)/i.test(source)
);
assert(
  forbiddenBundledJson.length === 0,
  `Browser JSON bundle must exclude internal maps and build logs: ${forbiddenBundledJson.join(', ')}`
);
assert(
  /isPublicMarkdownSource/.test(buildBundleSource),
  'Content bundle builder must reuse the public Markdown source filter'
);
assert(
  contentManifest.math.length === 1
    && JSON.stringify(contentManifest.math[0]) === JSON.stringify(mathChapterManifest),
  'Generated content manifest must embed the canonical chapter manifest'
);
assert(
  contentManifest.logs.every((source) =>
    !/(?:^|\/)[^/]*README\.md$/i.test(source)
      && !/(?:^|\/)[^/]+-template\.md$/i.test(source)
      && !/(?:^|\/)archive(?:\/|$)/i.test(source)
  ),
  'Generated content manifest logs must exclude README, template, and archive content'
);

const canonicalWorkAliases = {
  'gravy-raven-starlight-fade-away': 'lucia-punishing-gray-raven',
  'ayase-momo-dandadan': 'ayase-momo-dandadan',
  'yamada-anna-blue-poster': 'anna-yamada-blue-poster',
  'small-kid-sen-music-poster': 'small-kid-sen-music-poster',
  'dark-poster-system': 'dont-shoot-me-down',
  'owari-ni-shitai-spread': 'owari-ni-shitai-spread',
  'the-hills-typographic-study': 'the-hills-typographic-study',
  'chainsaw-raze-zine': 'chainsaw-denji-reze-blue-embrace',
  'blue-night-portrait': 'blue-night-portrait',
  'city-glass-portrait': 'city-glass-portrait',
  'summer-street-frame': 'summer-street-frame',
  'memento-mori-thumbnail': 'komi-purple-monochrome-spread',
  'astronaut-blue-stage': 'chainsaw-denji-reze-blue-monochrome'
};
const canonicalWorkSlugs = Object.values(canonicalWorkAliases);
const canonicalArticleSlugs = new Set([
  'lucia-punishing-gray-raven',
  'ayase-momo-dandadan',
  'anna-yamada-blue-poster',
  'chainsaw-denji-reze-blue-embrace',
  'komi-purple-monochrome-spread',
  'chainsaw-denji-reze-blue-monochrome'
]);
const replacedLegacyWorkSlugs = Object.entries(canonicalWorkAliases)
  .filter(([legacySlug, canonicalSlug]) => legacySlug !== canonicalSlug)
  .map(([legacySlug]) => legacySlug);

assert(
  replacedLegacyWorkSlugs.every((slug) =>
    markdownIndex.files.every((entry) => !entry.source.includes(`/works/${slug}/`))
  ),
  'Markdown index must not retain replaced legacy Works paths'
);
const legacyWorksArticleNames = [
  'anna-yamada-boku-no-kokoro-blue-poster.md',
  'ayase-momo-dandadan.md',
  'chainsaw-man-denji-reze-embrace.md',
  'chainsaw-man-denji-reze-blue-monochrome.md',
  'gravy-raven-starlight-fade-away.md',
  'komi-purple-monochrome-spread.md'
];
const rootWorksMarkdown = fs.readdirSync(path.join(root, 'content', 'design', 'works'), {
  withFileTypes: true
})
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
  .map((entry) => entry.name);
assert(
  rootWorksMarkdown.length === 0,
  `Legacy Works Markdown must leave the content build tree: ${rootWorksMarkdown.join(', ')}`
);
const legacyRootWorkAssets = fs.readdirSync(path.join(root, 'content', 'design', 'works'), {
  withFileTypes: true
})
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);
assert(
  legacyRootWorkAssets.length === 0,
  `Works assets must live only in canonical slug directories: ${legacyRootWorkAssets.join(', ')}`
);
for (const legacyName of legacyWorksArticleNames) {
  assert(
    exists(`docs/archive/works-legacy/${legacyName}`),
    `Archived legacy Works article is missing: ${legacyName}`
  );
  assert(
    markdownIndex.files.every((entry) => entry.source !== `content/design/works/${legacyName}`),
    `Markdown index must not include archived legacy Works article: ${legacyName}`
  );
}

assert(works.length === 13, `Works data must contain exactly 13 records; found ${works.length}`);
assert(new Set(works.map((work) => work.slug)).size === works.length, 'Works data slugs must be unique');
const canonicalWorkSourceFields = [
  'slug',
  'title',
  'subtitle',
  'category',
  'status',
  'date',
  'cover',
  'thumb',
  'alt',
  'sourceWork',
  'medium',
  'tools',
  'summary',
  'article',
  'tags',
  'scores',
  'detailMode'
].sort();
for (const source of workSources) {
  assert(
    JSON.stringify(Object.keys(source).sort()) === JSON.stringify(canonicalWorkSourceFields),
    `${source.slug} canonical source fields must match the v4 schema`
  );
}
assert(
  JSON.stringify(Object.keys(workDetails).sort()) === JSON.stringify(works.map((work) => work.slug).sort()),
  'Works detail metadata must contain exactly one entry per canonical slug'
);
for (const [slug, detail] of Object.entries(workDetails)) {
  for (const forbiddenField of [
    'href',
    'detailUrl',
    'articleHref',
    'image',
    'heroImage',
    'thumbnail',
    'hasArticle',
    'source'
  ]) {
    assert(!(forbiddenField in detail), `${slug} detail metadata must not store derived field ${forbiddenField}`);
  }
}
assert(
  canonicalWorkSlugs.every((slug) => works.some((work) => work.slug === slug))
    && works.every((work) => canonicalWorkSlugs.includes(work.slug)),
  'Works data must contain the complete canonical slug set and no extra slugs'
);
assert(
  replacedLegacyWorkSlugs.every((slug) => !works.some((work) => work.slug === slug)),
  'Works data must not retain replaced legacy slugs as canonical records'
);
assert(
  (worksDataSource.match(/window\.ALEKSI_WORKS\s*=/g) || []).length === 1,
  'works-data.js must contain exactly one window.ALEKSI_WORKS assignment'
);
assert(
  /const workSources\s*=\s*\[/.test(worksDataSource)
    && /window\.ALEKSI_WORKS\s*=\s*workSources\.map\(deriveWork\)/.test(worksDataSource),
  'works-data.js must derive public Works records from compact canonical sources'
);
for (const derivedField of [
  'href',
  'image',
  'articleHref',
  'thumbnail',
  'heroImage',
  'intro',
  'mediaMode',
  'detailUrl',
  'hasArticle'
]) {
  assert(
    !new RegExp(`"${derivedField}"\\s*:`).test(worksDataSource),
    `works-data.js source records must derive ${derivedField} instead of storing it`
  );
}
assert(
  (worksDataSource.match(/"sourceWork"\s*:/g) || []).length === works.length,
  'Each canonical Works source record must use sourceWork instead of ambiguous source'
);
assert(
  !/window\.ALEKSI_WORKS\s*=\s*window\.ALEKSI_WORKS\.map/.test(worksDataSource),
  'works-data.js must not use a post-definition Works map'
);
assert(
  JSON.stringify(workAliases) === JSON.stringify(canonicalWorkAliases),
  'window.ALEKSI_WORK_ALIASES must exactly match the canonical legacy-to-slug plan'
);

const imageInspectionCache = new Map();
function assertCanonicalWorkImage(work, label, reference) {
  assert(typeof reference === 'string' && reference.length > 0, `${work.slug} ${label} reference is missing`);
  assert(!/[?#\0]/.test(reference), `${work.slug} ${label} reference must be a plain local path`);
  assert(!path.isAbsolute(reference) && !reference.includes('\\'), `${work.slug} ${label} reference must be a portable relative path`);

  const canonicalDirectory = path.join(root, 'content', 'design', 'works', work.slug);
  const absolutePath = path.resolve(root, reference.replace(/^\.\//, ''));
  assert(isPathInside(canonicalDirectory, absolutePath), `${work.slug} ${label} escapes its canonical content directory`);
  assert(fs.existsSync(absolutePath), `${work.slug} ${label} is missing: ${reference}`);
  assert(fs.statSync(absolutePath).isFile(), `${work.slug} ${label} is not a file: ${reference}`);

  const realDirectory = fs.realpathSync(canonicalDirectory);
  const realFile = fs.realpathSync(absolutePath);
  assert(isPathInside(realDirectory, realFile), `${work.slug} ${label} real path escapes its canonical content directory`);

  if (!imageInspectionCache.has(realFile)) {
    imageInspectionCache.set(realFile, inspectSupportedImage(realFile));
  }
  const image = imageInspectionCache.get(realFile);
  assert(image !== null, `${work.slug} ${label} is not a decodable supported image: ${reference}`);
  assert(image.width > 0 && image.height > 0, `${work.slug} ${label} must have positive dimensions: ${reference}`);
}

for (const work of works) {
  const directory = `content/design/works/${work.slug}`;
  const image = `./${directory}/hero.webp`;
  const thumb = `./${directory}/thumb.webp`;
  const detailUrl = `./work-detail.html?work=${work.slug}`;
  const hasArticle = canonicalArticleSlugs.has(work.slug);
  const article = hasArticle ? `${directory}/article.md` : null;
  const articleHref = hasArticle
    ? `./article.html?src=${encodeURIComponent(article)}`
    : null;

  assert(typeof work.hasArticle === 'boolean', `${work.slug} hasArticle must be boolean`);
  assert(work.hasArticle === hasArticle, `${work.slug} hasArticle must match the canonical article plan`);
  assert(work.href === detailUrl, `${work.slug} href must be ${detailUrl}`);
  assert(work.detailUrl === detailUrl, `${work.slug} detailUrl must be ${detailUrl}`);
  assert(work.image === image, `${work.slug} image must be ${image}`);
  assert(work.cover === image, `${work.slug} cover must be ${image}`);
  assert(work.heroImage === image, `${work.slug} heroImage must be ${image}`);
  assert(work.thumb === thumb, `${work.slug} thumb must be ${thumb}`);
  assert(work.thumbnail === thumb, `${work.slug} thumbnail must be ${thumb}`);
  assert(work.source === work.sourceWork, `${work.slug} source must derive from sourceWork`);
  assert(work.subtitle === work.category, `${work.slug} subtitle must derive from category`);
  assert(work.intro === work.summary, `${work.slug} intro must derive from summary`);
  assert(work.mediaMode === work.detailMode, `${work.slug} mediaMode must derive from detailMode`);
  assert(exists(image.slice(2)), `${work.slug} hero.webp is missing`);
  assert(exists(thumb.slice(2)), `${work.slug} thumb.webp is missing`);
  for (const [label, reference] of [
    ['cover', work.cover],
    ['image', work.image],
    ['heroImage', work.heroImage],
    ['thumb', work.thumb],
    ['thumbnail', work.thumbnail]
  ]) {
    assertCanonicalWorkImage(work, label, reference);
  }
  const sourceImages = fs.readdirSync(path.join(root, directory))
    .filter((name) => /^source\.(?:jpe?g|png|gif|webp|svg)$/i.test(name));
  // Original source files are archival; live Works requires the checked hero and thumb.
  assert(sourceImages.length <= 1, `${work.slug} has duplicate original source images`);
  if (sourceImages.length) assertCanonicalWorkImage(work, 'source', `./${directory}/${sourceImages[0]}`);
  assert(work.article === article, `${work.slug} article must be ${article}`);
  assert(work.articleHref === articleHref, `${work.slug} articleHref must match its canonical article`);
  if (hasArticle) assert(exists(article), `${work.slug} article.md is missing`);
}

const semanticWorksRuntime = createWorksRuntime({ works });
semanticWorksRuntime.sandbox.canonicalWorks = works;
vm.runInContext('renderExhibitionWorks(canonicalWorks)', semanticWorksRuntime.sandbox, {
  filename: 'works.js:renderExhibitionWorks'
});
const renderedCards = semanticWorksRuntime.stage.innerHTML.match(/<article\b[\s\S]*?<\/article>/gi) || [];
assert(renderedCards.length === 13, `Works renderer must emit 13 semantic article cards; found ${renderedCards.length}`);
for (const [index, markup] of renderedCards.entries()) {
  const work = works[index];
  const openingTag = markup.match(/^<article\b[^>]*>/i)?.[0] || '';
  const requiredClassOrder = [
    'exhibition-card__media',
    'exhibition-card__img',
    'exhibition-card__body',
    'exhibition-card__source',
    'exhibition-card__title',
    'exhibition-card__summary',
    'exhibition-card__actions',
    'exhibition-card__toggle',
    'exhibition-card__cta'
  ];
  let previousIndex = -1;

  assert(/\bclass="exhibition-card"/i.test(openingTag), `${work.slug} must render as an exhibition-card article`);
  assert(new RegExp(`\\bdata-id="${work.slug}"`).test(openingTag), `${work.slug} card must expose its canonical data-id`);
  assert(!/\brole\s*=\s*["']button["']/i.test(openingTag), `${work.slug} article must not impersonate a button`);
  assert(!/\btabindex\s*=/i.test(openingTag), `${work.slug} article must not be an extra tab stop`);
  for (const className of requiredClassOrder) {
    const classIndex = markup.indexOf(className);
    assert(classIndex > previousIndex, `${work.slug} semantic card structure is missing or out of order at ${className}`);
    previousIndex = classIndex;
  }
  assert(
    /<button\s+type="button"\s+class="exhibition-card__toggle"\s+aria-expanded="false"\s+aria-label="[^"]+">[^<]+<\/button>/i.test(markup),
    `${work.slug} must render an explicit collapsed focus toggle button`
  );
  assert(
    /<a\s+class="exhibition-card__cta"\s+href="(?:\.\/|\/|\?|#)[^"]*">[^<]+<\/a>/i.test(markup),
    `${work.slug} CTA must be a local semantic link`
  );
  assert(
    markup.includes(`class="exhibition-card__cta" href="${work.detailUrl}">进入作品</a>`),
    `${work.slug} exhibition CTA must enter the work detail page`
  );
  assert(!hasNestedInteractiveControls(markup), `${work.slug} card must not nest interactive controls`);
}
semanticWorksRuntime.window.dispatch('pagehide');

assert(packageJson.version === '1.7.2', 'package.json version must be 1.7.2');
assert(packageLock.version === '1.7.2', 'package-lock.json version must be 1.7.2');
assert(
  packageLock.packages?.['']?.version === '1.7.2',
  'package-lock.json root package version must be 1.7.2'
);
assert(packageJson.scripts.qa === 'node qa-check.js', 'npm run qa must execute qa-check.js');
assert(packageJson.scripts['qa:browser'] === 'node scripts/browser-qa.js', 'qa:browser script missing');
assert(
  packageJson.scripts['verify:browser'] === 'npm run qa:browser',
  'verify:browser must expose the formal browser release QA separately'
);
assert(
  packageJson.devDependencies?.playwright === '1.60.0',
  'Playwright 1.60.0 must be declared as a reproducible browser QA devDependency'
);
assert(
  packageLock.packages?.['']?.devDependencies?.playwright === '1.60.0',
  'package-lock.json must lock the browser QA Playwright dependency'
);
assert(
  packageJson.scripts['verify:generated'] === 'node scripts/verify-generated.js',
  'verify:generated must check committed build artifacts for drift'
);
assert(
  packageJson.scripts['pack:public'] === 'node scripts/pack-public.js',
  'pack:public must build the clean deploy directory'
);
assert(
  packageJson.scripts['qa:public'] === 'node scripts/qa-public-package.js',
  'qa:public must validate the clean deploy directory'
);
assert(
  packageJson.scripts.verify === 'npm run verify:generated && npm run qa && npm run qa:public',
  'verify must reject stale generated artifacts and validate the public package'
);
assert(exists('scripts/verify-generated.js'), 'scripts/verify-generated.js missing');
assert(exists('scripts/pack-public.js'), 'scripts/pack-public.js missing');
assert(exists('scripts/qa-public-package.js'), 'scripts/qa-public-package.js missing');
assert(read('.gitignore').includes('dist/'), '.gitignore must exclude generated public deploy directories');
const verifyGeneratedRuntime = read('scripts/verify-generated.js');
for (const generatedFile of [
  'content/markdown-index.json',
  'content/content-bundle.js',
  'content/manifest.json'
]) {
  assert(
    verifyGeneratedRuntime.includes(generatedFile),
    `Generated artifact verifier must track ${generatedFile}`
  );
}
assert(
  /spawnSync\(process\.execPath/.test(verifyGeneratedRuntime)
    && /process\.env\.npm_execpath/.test(verifyGeneratedRuntime),
  'Generated artifact verifier must run npm through the current cross-platform Node runtime'
);
assert(
  packageJson.scripts['build:local'] === 'node scripts/build-local.js',
  'build:local must use the cross-platform environment-variable wrapper'
);
assert(exists('scripts/build-local.js'), 'scripts/build-local.js missing');
const buildLocalRuntime = read('scripts/build-local.js');
for (const environmentVariable of ['ALEKSI_REVISION_SKILL', 'ALEKSI_MATH_CHAPTER_01']) {
  assert(
    buildLocalRuntime.includes(`name: '${environmentVariable}'`),
    `build-local wrapper must declare ${environmentVariable}`
  );
}
assert(
  /process\.env\[name\]/.test(buildLocalRuntime),
  'build-local wrapper must read its declared environment variables'
);
assert(
  /spawnSync\(process\.execPath/.test(buildLocalRuntime),
  'build-local wrapper must launch Node scripts without shell-specific syntax'
);
const readme = read('README.md');
for (const setupCommand of ['npm install', 'npx playwright install chromium', 'npm run verify:browser']) {
  assert(readme.includes(setupCommand), `README missing browser QA setup command: ${setupCommand}`);
}
for (const environmentVariable of ['ALEKSI_REVISION_SKILL', 'ALEKSI_MATH_CHAPTER_01']) {
  assert(readme.includes(environmentVariable), `README missing build:local variable: ${environmentVariable}`);
}
assert(!exists('fix-aleksi-local.js'), 'One-off maintenance script must not remain in the project root');
assert(
  !exists('scripts/maintenance/fix-aleksi-local.js'),
  'Obsolete one-off Lottie maintenance script must not remain executable'
);
for (const requiredRepositoryFile of ['.gitattributes', '.gitignore', '.nojekyll', 'README.md', 'package.json', 'package-lock.json']) {
  assert(exists(requiredRepositoryFile), `GitHub repository file must be retained: ${requiredRepositoryFile}`);
}
const gitAttributes = read('.gitattributes');
for (const lineEndingRule of [
  '* text=auto eol=lf',
  '*.js text eol=lf',
  '*.css text eol=lf',
  '*.html text eol=lf',
  '*.md text eol=lf',
  '*.json text eol=lf',
  '*.yml text eol=lf',
  '*.yaml text eol=lf'
]) {
  assert(gitAttributes.includes(lineEndingRule), `.gitattributes missing LF rule: ${lineEndingRule}`);
}
for (const lfFile of [
  'README.md',
  'works-data.js',
  'assets/css/components.css',
  'qa-check.js',
  'scripts/browser-qa.js'
]) {
  assert(!read(lfFile).includes('\r'), `${lfFile} must use LF-only line endings`);
}
for (const forbiddenRepositoryPath of [
  '.superpowers',
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini'
]) {
  assert(!exists(forbiddenRepositoryPath), `Repository contains transient path: ${forbiddenRepositoryPath}`);
}
// Installed development dependencies and browser evidence are local outputs.
// They must remain ignored/untracked and are excluded by the public-package QA.
for (const localOutput of ['node_modules', 'qa-artifacts']) {
  assert(read('.gitignore').split(/\r?\n/).includes(`${localOutput}/`), `${localOutput} must remain ignored`);
  if (exists('.git')) {
    const tracked = execFileSync('git', ['ls-files', '-z', '--', localOutput], { cwd: root, encoding: 'utf8' });
    assert(tracked.length === 0, `${localOutput} must not be tracked`);
  }
}
const rootFiles = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);
const transientRootFiles = rootFiles.filter((name) =>
  /^(?:a-current|b-borderless-breathing|c-fully-frameless|qa-.+)\.(?:png|jpe?g|webp)$/i.test(name)
    || /\.(?:zip|tmp|bak|log)$/i.test(name)
);
assert(
  transientRootFiles.length === 0,
  `Repository root contains transient delivery files: ${transientRootFiles.join(', ')}`
);
assert(
  content.hero.eyebrow === 'v1.7.2-clean-reset / Personal Research Lab × Revision Protocol',
  'Effective content hero eyebrow must match v1.7.2-clean-reset'
);
assert(contentManifest.version === 'v1.7.2-clean-reset', 'content/manifest.json version must be v1.7.2-clean-reset');

const runtimeVersionFiles = [
  'README.md',
  'content.js',
  'scripts/build-content-manifest.js'
];
const staleRuntimePatterns = [
  new RegExp(['Draft', 'v1\\.1'].join(' ')),
  new RegExp(['v1\\.6', 'dark', 'archive', 'system'].join(' ')),
  new RegExp(['browser', 'qa', 'v1\\.6'].join('-'))
];

for (const file of runtimeVersionFiles) {
  const text = read(file);
  assert(text.includes('v1.7.2-clean-reset') || text.includes('"version": "1.7.2"'), `${file} lacks v1.7.2 version`);
  assert(!staleRuntimePatterns.some((pattern) => pattern.test(text)), `${file} contains stale version copy`);
}

assert(forbiddenRootNotes.length === 0, `Root FIX_NOTES files remain: ${forbiddenRootNotes.join(', ')}`);
assert(exists('CHANGELOG.md'), 'CHANGELOG.md missing');
assert(exists('CLEAN_AUDIT_v1.7.2.md'), 'CLEAN_AUDIT_v1.7.2.md missing');
const legacyBrowserQaName = `${['browser', 'qa', 'v1.6'].join('-')}.js`;
assert(!exists(['scripts', legacyBrowserQaName].join('/')), 'Legacy browser QA file remains');

const formalCss = [
  'assets/css/reset.css',
  'assets/css/tokens.css',
  'assets/css/base.css',
  'assets/css/layout.css',
  'assets/css/navigation.css',
  'assets/css/components.css',
  'assets/css/pages/article.css',
  'assets/css/pages/home.css',
  'assets/css/pages/works.css',
  'assets/css/pages/work-detail.css',
  'assets/css/pages/math.css',
  'assets/css/pages/manuscripts.css',
  'assets/css/pages/protocol.css',
  'assets/css/pages/atlas.css',
  'assets/css/utilities.css'
];

for (const file of formalCss) assert(exists(file), `Missing formal CSS file: ${file}`);

const styleManifest = read('styles.css');
for (const file of formalCss) {
  const importPath = file.replace('assets/css/', './assets/css/');
  assert(styleManifest.includes(`@import url("${importPath}")`), `styles.css missing ${file}`);
}

assert(!/(legacy|99-|100-|101-|102-|fix|patch)/i.test(styleManifest), 'styles.css still imports a patch or legacy layer');

const forbiddenPatchNames = listFiles('assets/css')
  .map((file) => path.basename(file))
  .filter((name) => /(?:^|[-_])(fix|patch|hotfix|final)(?:[-_.]|$)/i.test(name));
assert(forbiddenPatchNames.length === 0, `Patch CSS remains: ${forbiddenPatchNames.join(', ')}`);

for (const htmlFile of ['work-detail.html', 'math.html', 'manuscripts.html', 'protocol.html']) {
  const html = read(htmlFile);
  assert(html.includes('<link rel="stylesheet" href="./styles.css">'), `${htmlFile} does not load styles.css`);
}

const canonicalNavigationHrefs = [
  './works.html',
  './math.html',
  './manuscripts.html',
  './protocol.html',
  './atlas.html'
];
const mainNavigationHrefs = ['./writing.html', './project.html', './research.html', './about.html', './works.html', './room.html'];
for (const htmlFile of [
  'chain.html',
  'works.html',
  'work-detail.html',
  'math.html',
  'manuscripts.html',
  'protocol.html',
  'atlas.html'
]) {
  const html = read(htmlFile);
  const navigation = html.match(/<nav class="[^"]*\bdesktop-nav\b[^"]*"[^>]*>([\s\S]*?)<\/nav>/);
  assert(navigation, `${htmlFile} must contain a static desktop navigation fallback`);
  const hrefs = Array.from(navigation[1].matchAll(/<a\b[^>]*href="([^"]+)"/g), (match) => match[1]);
  assert(
    JSON.stringify(hrefs) === JSON.stringify(htmlFile === 'works.html'
      ? mainNavigationHrefs
      : htmlFile === 'work-detail.html' ? mainNavigationHrefs.slice(0, 5) : canonicalNavigationHrefs),
    `${htmlFile} navigation must use its canonical link order`
  );
}

const allRuntimeText = [
  'package.json',
  'package-lock.json',
  'README.md',
  'content.js',
  'qa-check.js',
  'scripts/browser-qa.js'
].map(read).join('\n');
assert(
  !staleRuntimePatterns.some((pattern) => pattern.test(allRuntimeText)),
  'Stale runtime version string remains'
);

const runtimeCssFiles = fs.readdirSync(path.join(root, 'assets/css'), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
  .map((entry) => entry.name);
assert(!runtimeCssFiles.some((name) => /^(?:\d\d-|99-|100-|101-|102-)|legacy|fix|patch/i.test(name)), 'Legacy CSS files remain in assets/css');

const componentsCss = read('assets/css/components.css');
const articleCss = read('assets/css/pages/article.css');
const baseCss = read('assets/css/base.css');
const homeCss = read('assets/css/pages/home.css');
const designTokenReference = read('design-system/tokens.css');
const worksCss = read('assets/css/pages/works.css');
const workDetailCss = read('assets/css/pages/work-detail.css');
const workDetailJs = read('work-detail.js');
const articleHtml = read('article.html');
const articleJs = read('article.js');
const browserQaJs = read('scripts/browser-qa.js');
const allFormalCss = formalCss.map(read).join('\n');
const worksJs = read('works.js');
const desktopSlot = loadDesktopSlot();

assert(
  !/\/\*[\s\S]*?v1\.\d/i.test(allFormalCss),
  'Runtime CSS comments must describe component responsibility instead of historical patch versions'
);
assert(
  /function renderMarkdownSafely\(/.test(articleJs)
    && /window\.marked\s*&&\s*window\.DOMPurify/.test(articleJs),
  'article.js must sanitize parsed Markdown and use a safe text fallback when dependencies are unavailable'
);
assert(
  !/window\.DOMPurify\s*\?\s*DOMPurify\.sanitize\(html\)\s*:\s*html/.test(articleJs),
  'article.js must never inject unsanitized marked output'
);
assert(
  /escapeHtml\(error\.message\)/.test(articleJs),
  'article.js must escape runtime error text before inserting it into the error panel'
);
for (const pinnedArticleDependency of [
  'marked-12.0.2.min.js',
  'purify-3.1.6.min.js',
  'katex@0.16.11',
]) {
  assert(
    articleHtml.includes(pinnedArticleDependency),
    `article.html must pin ${pinnedArticleDependency}`
  );
}
for (const htmlFile of ['article.html', 'chain.html', 'manuscripts.html', 'math.html', 'protocol.html']) {
  assert(
    !/cdn\.jsdelivr\.net\/npm\/gsap@3\//.test(read(htmlFile)),
    `${htmlFile} must pin the exact GSAP version`
  );
}
assert(
  browserQaJs.includes('npm install')
    && browserQaJs.includes('npx playwright install chromium'),
  'Browser QA must explain how to install its declared Playwright dependency'
);

assert(/ALEKSI_WORK_ALIASES/.test(workDetailJs), 'Detail page does not resolve window.ALEKSI_WORK_ALIASES');
assert(!/works\[0\]/.test(workDetailJs), 'Unknown work silently falls back to first item');
assert(/work-not-found/.test(workDetailJs), 'Missing-work state missing');
assert(/\.work-scores\s*\{/.test(workDetailCss), 'Score panel owner missing');
assert(/min-height:\s*(?:7[8-9]|8[0-9]|9[0-9])px/.test(workDetailCss), 'Score item min-height missing');
assert(/gap:\s*(?:1[2-9]|2[0-9])px/.test(workDetailCss), 'Score panel safe gap missing');
assert(
  /\.work-score-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s.test(workDetailCss),
  'Score grid must use three columns'
);
assert(
  /@media \(max-width:\s*767px\)\s*\{[\s\S]*?\.work-score-grid\s*\{[^}]*grid-template-columns:\s*1fr\s*;/s.test(workDetailCss),
  'Mobile score grid must use one column at <=767px'
);
assert(
  !/\.score-item\s*\{[^}]*position:\s*absolute/s.test(workDetailCss),
  'Score items must not use absolute positioning'
);

const detailSafetyRuntime = createWorkDetailRuntime({
  search: '?work=unused',
  works,
  aliases: workAliases
});
for (const prototypeKey of ['__proto__', 'constructor', 'toString']) {
  detailSafetyRuntime.sandbox.prototypeKey = prototypeKey;
  assert(
    vm.runInContext('resolveWorkSlug(prototypeKey)', detailSafetyRuntime.sandbox) === prototypeKey,
    `resolveWorkSlug must not traverse alias prototypes for ${prototypeKey}`
  );

  const prototypeDetailRuntime = createWorkDetailRuntime({
    search: `?work=${encodeURIComponent(prototypeKey)}`,
    works,
    aliases: {}
  });
  vm.runInContext('renderWork()', prototypeDetailRuntime.sandbox, { filename: 'work-detail.js:renderWork' });
  assert(
    prototypeDetailRuntime.nodes.detail.innerHTML.includes('class="work-not-found"'),
    `Prototype-like work slug ${prototypeKey} must render the missing-work state`
  );
}

detailSafetyRuntime.sandbox.spacedAlias = '  gravy-raven-starlight-fade-away  ';
assert(
  vm.runInContext('resolveWorkSlug(spacedAlias)', detailSafetyRuntime.sandbox) === 'lucia-punishing-gray-raven',
  'resolveWorkSlug must normalize surrounding whitespace before alias lookup'
);

for (const localPath of [
  './content/design/works/lucia-punishing-gray-raven/hero.webp',
  'content/design/works/lucia-punishing-gray-raven/hero.webp',
  './article.html?src=content%2Fdesign%2Fworks%2Flucia-punishing-gray-raven%2Farticle.md'
]) {
  detailSafetyRuntime.sandbox.localPath = localPath;
  assert(
    vm.runInContext('safeLocalHref(localPath, "./fallback.html")', detailSafetyRuntime.sandbox) === localPath,
    `Detail URL sanitizer must retain canonical local path ${localPath}`
  );
}

for (const unsafePath of [
  'javascript:alert(1)',
  'data:text/html,unsafe',
  'https://evil.example/work',
  '//evil.example/work',
  '.\\content\\unsafe.webp',
  './content/design/works/unsafe.webp\u0000.png'
]) {
  detailSafetyRuntime.sandbox.unsafePath = unsafePath;
  assert(
    vm.runInContext('safeLocalHref(unsafePath, "./fallback.html")', detailSafetyRuntime.sandbox) === './fallback.html',
    `Detail URL sanitizer must reject unsafe path ${JSON.stringify(unsafePath)}`
  );
}

const canonicalDetailWork = works.find((work) => work.slug === 'lucia-punishing-gray-raven');
const canonicalDetailRuntime = createWorkDetailRuntime({
  search: '?work=lucia-punishing-gray-raven',
  works,
  aliases: workAliases
});
vm.runInContext('renderWork()', canonicalDetailRuntime.sandbox, { filename: 'work-detail.js:renderWork' });

const aliasDetailRuntime = createWorkDetailRuntime({
  search: '?work=gravy-raven-starlight-fade-away',
  works,
  aliases: workAliases
});
vm.runInContext('renderWork()', aliasDetailRuntime.sandbox, { filename: 'work-detail.js:renderWork' });

assert(
  canonicalDetailRuntime.nodes.title.textContent === canonicalDetailWork.title,
  'Canonical work URL must render the requested work'
);
assert(
  aliasDetailRuntime.nodes.title.textContent === canonicalDetailRuntime.nodes.title.textContent,
  'Legacy work alias must render the canonical work title'
);
assert(
  aliasDetailRuntime.nodes.image.src === canonicalDetailRuntime.nodes.image.src
    && canonicalDetailRuntime.nodes.image.src === canonicalDetailWork.heroImage,
  'Canonical and legacy URLs must render the canonical source image'
);
assert(
  aliasDetailRuntime.nodes.articleLink.href === canonicalDetailRuntime.nodes.articleLink.href
    && canonicalDetailRuntime.nodes.articleLink.href === canonicalDetailWork.articleHref,
  'Canonical and legacy URLs must render the canonical article path'
);
assert(
  canonicalDetailRuntime.nodes.articleLink.textContent === '打开阅读',
  'Work detail article CTA must use the canonical reading label'
);

const unsafeDetailWork = {
  ...canonicalDetailWork,
  slug: 'unsafe-detail-sinks',
  heroImage: 'javascript:alert(1)',
  image: '//evil.example/unsafe.webp',
  cover: 'data:image/svg+xml,unsafe',
  article: null,
  articleHref: 'data:text/html,unsafe'
};
const unsafeDetailRuntime = createWorkDetailRuntime({
  search: '?work=unsafe-detail-sinks',
  works: [unsafeDetailWork],
  aliases: {}
});
vm.runInContext('renderWork()', unsafeDetailRuntime.sandbox, { filename: 'work-detail.js:renderWork' });
assert(
  unsafeDetailRuntime.nodes.image.src === './content/design/works/ayase-momo-dandadan/hero.webp',
  'Unsafe work image paths must preserve the canonical local placeholder'
);
assert(
  !unsafeDetailRuntime.nodes.image.src.includes('javascript:')
    && !unsafeDetailRuntime.nodes.image.src.includes('//evil.example')
    && !unsafeDetailRuntime.nodes.image.src.includes('data:'),
  'Unsafe work image values must never reach the DOM'
);
assert(
  unsafeDetailRuntime.nodes.articleSection.hidden === true
    && unsafeDetailRuntime.nodes.articleLink.href === '',
  'Unsafe article href must never reach the DOM and must keep the article section hidden'
);

const noArticleWork = works.find((work) => !work.article && !work.articleHref);
const noArticleDetailRuntime = createWorkDetailRuntime({
  search: `?id=${encodeURIComponent(noArticleWork.slug)}`,
  works,
  aliases: workAliases
});
vm.runInContext('renderWork()', noArticleDetailRuntime.sandbox, { filename: 'work-detail.js:renderWork' });
assert(
  noArticleDetailRuntime.nodes.title.textContent === noArticleWork.title,
  'Detail page must resolve the id query parameter'
);
assert(
  noArticleDetailRuntime.nodes.articleSection.hidden === true,
  'Work without an article must keep the article section hidden'
);

const missingDetailRuntime = createWorkDetailRuntime({
  search: '?work=unknown-work',
  works,
  aliases: workAliases
});
vm.runInContext('renderWork()', missingDetailRuntime.sandbox, { filename: 'work-detail.js:renderWork' });
assert(
  missingDetailRuntime.document.title === 'Aleksi Lab / 未找到作品',
  'Unknown work title must indicate the missing state'
);
assert(
  missingDetailRuntime.nodes.detail.innerHTML.includes('<section class="work-not-found" role="status">')
    && missingDetailRuntime.nodes.detail.innerHTML.includes('<h1>没有找到这件作品</h1>')
    && missingDetailRuntime.nodes.detail.innerHTML.includes('链接可能来自旧版本，或该条目已经归档。')
    && missingDetailRuntime.nodes.detail.innerHTML.includes('href="./works.html">返回作品档案</a>'),
  'Unknown work URL must replace the detail mount with the accessible missing-work state'
);
assert(
  missingDetailRuntime.nodes.title.textContent === '',
  'Unknown work URL must not continue into normal work rendering'
);

for (const useResizeObserver of [true, false]) {
  const runtime = createWorksRuntime({ useResizeObserver });
  vm.runInContext('renderExhibitionWorks([]); renderExhibitionWorks([]);', runtime.sandbox);

  assert(
    runtime.document.listenerCount('keydown') === 1,
    `Works rerender must retain one document keydown listener; found ${runtime.document.listenerCount('keydown')}`
  );
  assert(
    runtime.window.listenerCount('pagehide') === 1,
    `Works rerender must retain one window pagehide listener; found ${runtime.window.listenerCount('pagehide')}`
  );
  assert(
    runtime.stage.listenerCount('click') === 1,
    `Works rerender must retain one stage click listener; found ${runtime.stage.listenerCount('click')}`
  );

  if (useResizeObserver) {
    assert(
      runtime.observerState.active === 1 && runtime.observerState.disconnected === 1,
      `Works rerender must replace its observer; active=${runtime.observerState.active}, disconnected=${runtime.observerState.disconnected}`
    );
  } else {
    assert(
      runtime.window.listenerCount('resize') === 1,
      `Works rerender must retain one window resize listener; found ${runtime.window.listenerCount('resize')}`
    );
  }

  runtime.window.dispatch('pagehide');
  assert(runtime.document.listenerCount('keydown') === 0, 'Works pagehide must remove document keydown');
  assert(runtime.window.listenerCount('pagehide') === 0, 'Works pagehide must remove its own listener');
  assert(runtime.stage.listenerCount('click') === 0, 'Works pagehide must remove stage click');
  assert(runtime.window.listenerCount('resize') === 0, 'Works pagehide must remove window resize fallback');
  assert(runtime.observerState.active === 0, 'Works pagehide must disconnect ResizeObserver');
}

const interactionRuntime = createInteractiveWorksRuntime();
const returnedCleanup = vm.runInContext(
  'bindExhibitionInteractions(interactiveStage)',
  interactionRuntime.sandbox
);
assert(typeof returnedCleanup === 'function', 'bindExhibitionInteractions must return its cleanup');

interactionRuntime.stage.dispatch('click', { target: interactionRuntime.buttonTarget });
assert(interactionRuntime.card.classList.contains('is-active'), 'Toggle button click must activate its card');
assert(
  interactionRuntime.button.getAttribute('aria-expanded') === 'true'
    && interactionRuntime.button.textContent === '取消聚焦'
    && interactionRuntime.button.getAttribute('aria-label') === '取消聚焦：Test work',
  'Active toggle must expose expanded state and cancellation copy'
);

interactionRuntime.stage.dispatch('click', { target: interactionRuntime.linkTarget });
assert(interactionRuntime.card.classList.contains('is-active'), 'CTA click must not toggle its card');

interactionRuntime.stage.dispatch('click', { target: interactionRuntime.buttonTarget });
assert(!interactionRuntime.card.classList.contains('is-active'), 'Second toggle button click must clear its card');
assert(
  interactionRuntime.button.getAttribute('aria-expanded') === 'false'
    && interactionRuntime.button.textContent === '聚焦'
    && interactionRuntime.button.getAttribute('aria-label') === '聚焦作品：Test work',
  'Inactive toggle must restore collapsed state and focus copy'
);

interactionRuntime.stage.dispatch('click', { target: interactionRuntime.plainTarget });
assert(interactionRuntime.card.classList.contains('is-active'), 'Non-interactive card area click must toggle its card');
interactionRuntime.document.dispatch('keydown', { key: 'Escape' });
assert(!interactionRuntime.card.classList.contains('is-active'), 'Escape must clear the active Works card');
interactionRuntime.stage.dispatch('click', { target: interactionRuntime.plainTarget });
interactionRuntime.stage.dispatch('click', { target: interactionRuntime.stage });
assert(!interactionRuntime.card.classList.contains('is-active'), 'Empty stage click must clear the active Works card');
returnedCleanup();
assert(interactionRuntime.document.listenerCount('keydown') === 0, 'Returned cleanup must remove document keydown');
assert(interactionRuntime.window.listenerCount('pagehide') === 0, 'Returned cleanup must remove pagehide');
assert(interactionRuntime.stage.listenerCount('click') === 0, 'Returned cleanup must remove stage click');
assert(interactionRuntime.observerState.active === 0, 'Returned cleanup must disconnect ResizeObserver');

const hrefRuntime = createWorksRuntime();
assert(
  vm.runInContext('typeof safeLocalHref', hrefRuntime.sandbox) === 'function',
  'works.js must define safeLocalHref'
);
for (const href of [
  './article.html?src=content%2Fdesign%2Fworks%2Fsample%2Farticle.md',
  '/work-detail.html?work=sample',
  '?work=sample',
  '#sample',
  'work-detail.html?work=sample',
  'content/design/works/sample/article.md'
]) {
  hrefRuntime.sandbox.hrefCandidate = href;
  assert(
    vm.runInContext('safeLocalHref(hrefCandidate, "./works.html")', hrefRuntime.sandbox) === href,
    `safeLocalHref must retain local href ${href}`
  );
}
for (const href of [
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'https://evil.example/work',
  '//evil.example/work',
  '../outside.html',
  'folder/../work-detail.html',
  'work detail.html'
]) {
  hrefRuntime.sandbox.hrefCandidate = href;
  assert(
    vm.runInContext('safeLocalHref(hrefCandidate, "./works.html")', hrefRuntime.sandbox) === './works.html',
    `safeLocalHref must reject unsafe or non-normalized href ${href}`
  );
}

const maliciousWorks = [
  {
    slug: 'unsafe-article',
    title: 'Unsafe article',
    titleDisplay: 'Unsafe article',
    thumb: './safe.webp',
    alt: 'Unsafe article',
    hasArticle: true,
    articleHref: 'javascript:alert(1)',
    detailUrl: 'javascript:alert(2)'
  },
  {
    slug: 'unsafe-detail',
    title: 'Unsafe detail',
    titleDisplay: 'Unsafe detail',
    thumb: './safe.webp',
    alt: 'Unsafe detail',
    hasArticle: false,
    detailUrl: 'data:text/html,unsafe'
  },
  {
    slug: 'unsafe-index',
    title: 'Unsafe index',
    titleDisplay: 'Unsafe index',
    thumb: './safe.webp',
    alt: 'Unsafe index',
    hasArticle: false,
    detailUrl: 'https://evil.example/work'
  }
];
const markupRuntime = createWorksRuntime({ works: maliciousWorks });
markupRuntime.sandbox.maliciousWorks = maliciousWorks;
vm.runInContext('renderExhibitionWorks(maliciousWorks); renderIndex();', markupRuntime.sandbox);
const articleOpenTags = markupRuntime.stage.innerHTML.match(/<article\b[^>]*>/g) || [];

assert(articleOpenTags.length === maliciousWorks.length, 'Works renderer must emit one article per work');
for (const tag of articleOpenTags) {
  assert(!/\brole\s*=\s*["']button["']/i.test(tag), 'Works article must not use role=button');
  assert(!/\btabindex\s*=/i.test(tag), 'Works article must not be keyboard-focusable');
  assert(!/\baria-(?:expanded|selected)\s*=/i.test(tag), 'Works article must not own selection ARIA');
}
assert(
  (markupRuntime.stage.innerHTML.match(/<button type="button" class="exhibition-card__toggle" aria-expanded="false" aria-label="聚焦作品：[^"]+">聚焦<\/button>/g) || []).length
    === maliciousWorks.length,
  'Each Works card body must contain an explicit collapsed focus toggle button'
);
assert(
  !hasNestedInteractiveControls(markupRuntime.stage.innerHTML),
  'Works markup must not nest interactive controls'
);
assert(
  !/href="(?:javascript:|data:|https:|\/\/)/i.test(markupRuntime.stage.innerHTML),
  'Works card CTA must not render javascript, data, http(s), or protocol-relative hrefs'
);
assert(
  !/href="(?:javascript:|data:|https:|\/\/)/i.test(markupRuntime.index.innerHTML),
  'Works index must not render javascript, data, http(s), or protocol-relative hrefs'
);
assert(
  (markupRuntime.stage.innerHTML.match(/href="\.\/works\.html"/g) || []).length === maliciousWorks.length,
  'Unsafe Works card CTA hrefs must render the local fallback'
);
assert(
  (markupRuntime.index.innerHTML.match(/href="\.\/works\.html"/g) || []).length === maliciousWorks.length,
  'Unsafe Works index hrefs must render the local fallback'
);
markupRuntime.window.dispatch('pagehide');

for (const testCase of [
  {
    input: { index: 0, count: 13, width: 1440 },
    expected: { x: -620, y: -117, rotate: -6 }
  },
  {
    input: { index: 1, count: 13, width: 1440 },
    expected: { x: -620 + 1240 / 6, y: -159, rotate: 4 }
  },
  {
    input: { index: 6, count: 13, width: 1366 },
    expected: { x: 620, y: -117, rotate: -2 }
  },
  {
    input: { index: 7, count: 13, width: 1366 },
    expected: { x: -620, y: 153, rotate: -6 }
  },
  {
    input: { index: 12, count: 13, width: 1440 },
    expected: { x: -620 + 5 * (1240 / 6), y: 111, rotate: 3 }
  },
  {
    input: { index: 0, count: 13, width: 1180 },
    expected: { x: -550, y: -252, rotate: -6 }
  },
  {
    input: { index: 5, count: 13, width: 1180 },
    expected: { x: 550, y: -294, rotate: 3 }
  },
  {
    input: { index: 12, count: 13, width: 1180 },
    expected: { x: -550, y: 288, rotate: 3 }
  },
  {
    input: { index: 1, count: 4, width: 1440 },
    expected: { x: -620 + 1240 / 6, y: -24, rotate: 4 }
  }
]) {
  assertDesktopSlot(desktopSlot, testCase.input, testCase.expected);
}

assert(
  /card\.style\.setProperty\(\s*['"]--stack['"]\s*,\s*`\$\{cards\.length - index\}`\s*\)/.test(worksJs),
  'Desktop Works cards must expose reverse DOM stacking through --stack'
);
assert(
  /@media\s*\(min-width:\s*1180px\)\s*\{[\s\S]*?body\.works-page\s*\{[^}]*--stage-pad:\s*max\(84px,\s*6vw\)\s*;/i.test(worksCss),
  'Desktop Works must reserve enough edge padding for rotated cards'
);
assert(
  /@media\s*\(min-width:\s*1180px\)\s*\{[\s\S]*?\.exhibition-card\s*\{[^}]*z-index:\s*var\(--stack,\s*1\)\s*;/i.test(worksCss),
  'Desktop Works cards must use the planned stack variable'
);
assert(
  /@media\s*\(min-width:\s*1180px\)\s*\{[\s\S]*?\.exhibition-card\.is-muted\s*\{[^}]*z-index:\s*var\(--stack,\s*5\)\s*;/i.test(worksCss),
  'Muted desktop Works cards must preserve row-aware stacking'
);

assert(
  !/snapshotCardMotion|playInterfaceCraftSelectionMotion|\.animate\(/.test(worksJs),
  'Dead WAAPI/FLIP Works logic remains'
);
assert(
  /is-active/.test(worksJs) && /is-muted/.test(worksJs),
  'Works active/muted state logic missing'
);
assert(/ResizeObserver|resize/.test(worksJs), 'Responsive Works layout recalculation missing');
assert(!/work\.hasArticle\s*\?/.test(worksJs), 'Works cards must not branch around the article state');
assert(
  /const ctaLabel = '进入作品';/.test(worksJs)
    && /const ctaHref = safeLocalHref\(\s*work\.detailUrl \|\| work\.href,\s*'\.\/works\.html'\s*\);/s.test(worksJs),
  'Works cards must use one canonical detail-page CTA'
);
assert(
  /<em class="row-action">进入作品 →<\/em>/.test(worksJs),
  'Works index rows must use the canonical enter-work label'
);
for (const cardClass of [
  'exhibition-card__media',
  'exhibition-card__img',
  'exhibition-card__body',
  'exhibition-card__source',
  'exhibition-card__title',
  'exhibition-card__summary',
  'exhibition-card__toggle',
  'exhibition-card__cta'
]) {
  assert(worksJs.includes(cardClass), `Works semantic card structure missing ${cardClass}`);
}
assert(/translateY\(-1[2-6]px\)/.test(worksCss), 'Works hover lift is outside the required range');
assert(/scale\(1\.0(?:18|2[0-9]|30)\)/.test(worksCss), 'Works hover scale missing');
assert(/\.exhibition-card\.is-active/.test(worksCss), 'Works active CSS missing');
assert(/\.exhibition-card\.is-muted/.test(worksCss), 'Works muted CSS missing');
assert(
  /\.exhibition-card__toggle\s*\{[^}]*border:[^}]*background:[^}]*color:/s.test(worksCss),
  'Works toggle must use a subtle warm editorial button treatment'
);
assert(/prefers-reduced-motion:\s*reduce/.test(worksCss), 'Reduced-motion Works CSS missing');
assert(/@media\s*\(max-width:\s*1179px\)/.test(worksCss), 'Tablet Works breakpoint missing');
assert(/@media\s*\(max-width:\s*767px\)/.test(worksCss), 'Mobile Works breakpoint missing');

assert(
  /\.exhibition-card__cta::after\s*\{\s*content:\s*" →";/s.test(worksCss),
  'Works card CTA must use a valid arrow content declaration'
);
assert(
  !/exhibition-card__(?:image-window|image-inner|desc|meta|link)/.test(worksCss),
  'works.css must not retain obsolete absolute-layout card internals'
);
assert(!/[鈫閳�]/u.test(allFormalCss), 'Formal CSS contains mojibake');
for (const selector of ['.chain-path', '.draw-path', '.tone-paper']) {
  assert(componentsCss.includes(selector), `components.css missing required chain selector: ${selector}`);
}
assert(
  /\.home-redesign \.hero-card\s*\{[^}]*border:[^}]*background:[^}]*color:[^}]*box-shadow:/s.test(homeCss),
  'home.css missing the warm editorial .hero-card surface rule'
);
assert(!worksCss.includes('body.work-detail-page'), 'works.css must not own body.work-detail-page rules');
assert(!/\.graph-label\s*\{[^}]*!important/s.test(componentsCss), 'graph-label must not override first-party inline styles with !important');
assert(
  /@media \(max-width: 720px\)\s*\{[\s\S]*?\.atlas-nodes\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s.test(componentsCss),
  'components.css must reflow the seven-column chain atlas to one column on mobile'
);
assert(
  /@media \(max-width: 720px\)\s*\{[\s\S]*?\.chain-node-header\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s.test(componentsCss),
  'components.css must reflow chain node headers to one column on mobile'
);
assert(
  countTopLevelRules(worksCss, '.exhibition-card.is-active') === 1,
  'works.css must have one authoritative top-level .exhibition-card.is-active rule'
);
assert(
  collectCssRules(componentsCss).every((rule) => !rule.selector.includes('.article')),
  'components.css must not own article page rules'
);
assert(
  countTopLevelRules(articleCss, '.article-page') === 1,
  'article.css must have one authoritative top-level .article-page rule'
);
assert(
  countTopLevelRules(articleCss, '.article-shell') === 1,
  'article.css must have one authoritative top-level .article-shell rule'
);
assert(
  countTopLevelRules(articleCss, '.article-body') === 1,
  'article.css must have one authoritative top-level .article-body rule'
);
assert(
  countCssRules(articleCss, '.article-body h2') === 1
    && countCssRules(articleCss, '.article-body h3') === 1,
  'article.css must own the authoritative article heading rules'
);
assert(
  designTokenReference.startsWith('/* Reference only. Runtime tokens live in assets/css/tokens.css. */'),
  'design-system/tokens.css must clearly identify assets/css/tokens.css as the runtime source'
);
assert(
  countCssRules(worksCss, '.exhibition-card.is-active::before') === 1,
  'works.css must have one authoritative base active-card ::before rule'
);
assert(
  countCssRules(articleCss, '.article-manuscript') === 1,
  'article.css must have one authoritative base .article-manuscript rule'
);
assert(
  countCssRules(articleCss, '.article-shell', '@media (max-width: 1180px)') === 1,
  'article.css must have one .article-shell rule in the 1180px media scope'
);
assert(
  countCssRules(workDetailCss, '.work-hero__copy h1') === 1,
  'work-detail.css must have one authoritative base hero title rule'
);

const shadowedFormalRules = formalCss.flatMap((file) =>
  findFullyShadowedCssRules(read(file)).map((rule) => `${file}:${rule.line} ${rule.scope} ${rule.selector}`)
);
assert(
  shadowedFormalRules.length === 0,
  `Formal CSS contains fully shadowed same-scope rules: ${shadowedFormalRules.join('; ')}`
);

const importantCount = formalCss.reduce((total, file) => total + (read(file).match(/!important/g) || []).length, 0);
assert(importantCount <= 3, `Formal CSS uses ${importantCount} !important declarations; maximum is 3`);

const canonicalArticleClassMatches = articleHtml.match(/class="article-manuscript"/g) || [];
assert(
  canonicalArticleClassMatches.length === 1,
  'article.html must contain exactly one class="article-manuscript"'
);
assert(
  !/class="[^"]*\barticle-[^"\s]*[^\x00-\x7f][^"\s]*/u.test(articleHtml),
  'article.html must not contain a mojibake/non-ASCII article class'
);
assert(
  countCssRules(articleCss, '.article-manuscript') === 1,
  'Formal CSS must target one canonical base .article-manuscript rule'
);

const tabletWorksRules = collectCssRules(worksCss).filter((rule) =>
  rule.scope === '@media (max-width: 1179px)'
);
const mobileWorksRules = collectCssRules(worksCss).filter((rule) =>
  rule.scope === '@media (max-width: 767px)'
);
const tabletStageRule = tabletWorksRules.find((rule) => rule.selector === '.exhibition-stage');
const tabletCardRule = tabletWorksRules.find((rule) =>
  rule.selector.includes('.exhibition-card.is-muted')
);
const tabletActiveRule = tabletWorksRules.find((rule) =>
  rule.selector === '.exhibition-card.is-active'
);
const mobileStageRule = mobileWorksRules.find((rule) => rule.selector === '.exhibition-stage');

assert(tabletStageRule, 'Tablet Works CSS must include an .exhibition-stage rule at <=1179px');
assert(
  /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*;/i.test(tabletStageRule?.body || ''),
  'Tablet Works stage must use a stable two-column grid'
);
assert(tabletCardRule, 'Tablet Works CSS must include base and muted card flow rules');
assert(
  /\bposition\s*:\s*relative\s*;/i.test(tabletCardRule?.body || '')
    && /\bwidth\s*:\s*100%\s*;/i.test(tabletCardRule?.body || '')
    && /\bheight\s*:\s*auto\s*;/i.test(tabletCardRule?.body || '')
    && /\bopacity\s*:\s*1\s*;/i.test(tabletCardRule?.body || '')
    && /\bfilter\s*:\s*none\s*;/i.test(tabletCardRule?.body || '')
    && /\btransform\s*:\s*none\s*;/i.test(tabletCardRule?.body || ''),
  'Tablet base/muted Works cards must remain readable in normal flow'
);
assert(
  tabletActiveRule
    && /translateY\(-8px\)\s*scale\(1\.015\)/i.test(tabletActiveRule.body),
  'Tablet active Works card must use the approved restrained emphasis'
);
assert(mobileStageRule, 'Mobile Works CSS must include an .exhibition-stage rule at <=767px');
assert(
  /grid-template-columns:\s*1fr\s*;/i.test(mobileStageRule?.body || ''),
  'Mobile Works stage must use a one-column grid'
);

const sharedCss = `${baseCss}\n${componentsCss}`;
assert(!sharedCss.includes('.article-layout'), 'base/components CSS must not retain stale .article-layout selectors');
assert(!sharedCss.includes('.work-detail-hero'), 'base/components CSS must not retain stale .work-detail-hero selectors');
assert(!sharedCss.includes('.work-detail-section'), 'base/components CSS must not retain stale .work-detail-section selectors');

const navigationCss = read('assets/css/navigation.css');
const navRendererFiles = [
  'app.js',
  'works.js',
  'work-detail.js',
  'math.js',
  'manuscripts.js',
  'protocol.js'
];
const stableNavAnchor = /<a class="nav-link\$\{active \? ' is-active' : ''\}" href="\$\{href\}"\$\{active \? ' aria-current="page"' : ''\}>\$\{label\}<\/a>/;
const activeNavRule = collectCssRules(navigationCss).find((rule) =>
  rule.selector.split(',').map((selector) => selector.trim()).includes('.nav-link.is-active')
);

assert(
  activeNavRule && /font-weight:\s*(?:650|700)\s*;/.test(activeNavRule.body),
  'navigation.css must give the active nav link a strong 650/700 weight'
);
assert(
  activeNavRule && /font-weight:\s*650\s*;/.test(activeNavRule.body),
  'navigation.css must implement the active nav link at weight 650'
);
assert(
  /\.brand-mark span\s*\{[^}]*font-weight:\s*700\s*;/s.test(navigationCss),
  'navigation.css must preserve the brand mark weight at 700'
);
assert(
  /(?:\.desktop-nav|\.site-nav)[^{]*\{[^}]*display:\s*flex\s*;[^}]*gap:/s.test(navigationCss),
  'navigation.css must keep the desktop/site navigation visible in a flex row with a gap'
);
assert(
  /(?:\.desktop-nav a|\.site-nav a)[\s\S]*?\{[^}]*opacity:\s*1\s*;[^}]*visibility:\s*visible\s*;[^}]*color:\s*inherit\s*;/s.test(navigationCss),
  'navigation.css must force navigation anchors/spans visible with inherited color'
);
assert(
  /\.nav-link\.is-active::after[\s\S]*?\{[^}]*opacity:\s*1\s*;[^}]*transform:\s*translateX\(-50%\) scaleX\(1\)\s*;/s.test(navigationCss),
  'navigation.css must show the clay underline for the active nav link'
);
assert(!/letter-swap/i.test(navigationCss), 'navigation.css must not contain letter-swap behavior');

for (const file of navRendererFiles) {
  const source = read(file);
  assert(stableNavAnchor.test(source), `${file} must emit the stable nav-link anchor contract`);
  assert(!/letter-swap|swap-(?:letter|word)|class="[^"]*swap/i.test(source), `${file} must not emit letter-swap markup`);
}

const maliciousNavLabel = '<img src=x onerror=1>';
const navRendererPaths = {
  'app.js': '/works.html',
  'works.js': '/works.html',
  'work-detail.js': '/work-detail.html',
  'math.js': '/math.html',
  'manuscripts.js': '/manuscripts.html',
  'protocol.js': '/protocol.html'
};

for (const [file, pathname] of Object.entries(navRendererPaths)) {
  const renderedNav = renderNavigationWithLabel(file, pathname, maliciousNavLabel);
  assert(
    renderedNav.innerHTML.includes('&lt;img src=x onerror=1&gt;'),
    `${file} must escape a malicious navigation label at render time`
  );
  assert(!renderedNav.innerHTML.includes('<img'), `${file} must not emit a raw img string from a navigation label`);
  assert(renderedNav.imgNodeCount === 0, `${file} must not create an img node from a navigation label`);
}

const worksHtml = read('works.html');
const workDetailHtml = read('work-detail.html');
const canonicalDetailPlaceholder = './content/design/works/ayase-momo-dandadan/hero.webp';
assert(
  workDetailHtml.includes(`data-work-image src="${canonicalDetailPlaceholder}"`),
  'work-detail.html must use an existing canonical placeholder image'
);
const requiredWorksCopy = [
  'Works · Aleksi',
  '← 首页',
  '海报、排版与图像研究。悬停查看，点击放大与阅读作品说明。',
  '13 件作品。',
  'data-gallery-viewer',
  'data-viewer-details',
  'data-viewer-original'
];
assert(!/src="\.\/(?:content|works-data|works)\.js"/.test(worksHtml), 'New Works must not load legacy content or archive rendering');
assert(!/关联手稿|档案索引|进入作品/.test(worksHtml), 'New Works must not present legacy archive links');
assert(worksHtml.includes('./works-catalog.js'), 'Works must load its restored display-only catalog');
const catalogSandbox = { window: {} };
vm.runInNewContext(read('works-catalog.js'), catalogSandbox);
const worksCatalog = catalogSandbox.window.ALEKSI_WORKS_CATALOG;
assert(Array.isArray(worksCatalog) && worksCatalog.length === 13, 'Works catalog must retain all 13 artworks');
assert(JSON.stringify(worksCatalog.map((item) => item.id)) === JSON.stringify(works.map((work) => work.slug)), 'Works catalog must retain the canonical artwork order');
for (const item of worksCatalog) {
  const original = works.find((work) => work.slug === item.id);
  assert(item.title === original.title && item.summary === original.summary, `${item.id} must restore its original title and summary`);
  assert(item.image === original.cover && exists(item.image.replace(/^\.\//, '')), `${item.id} must retain its canonical original image`);
  assert(!['article', 'articleHref', 'detailUrl', 'scores'].some((field) => field in item), `${item.id} catalog must exclude legacy reader routes and generated scores`);
}
assert(worksCatalog[6].id === 'the-hills-typographic-study' && worksCatalog[6].displayTone === 'soft-highlights', 'Artwork 07 must opt into the reversible highlight adjustment');
assert(worksCatalog.filter((item) => item.displayTone).length === 1, 'Highlight adjustment must apply only to artwork 07');
const requiredWorkDetailCopy = [
  '作品详情',
  '返回作品档案',
  '正在加载作品',
  '来源待复核',
  '来自 Aleksi Lab 视觉档案的一件作品。',
  '策展说明',
  '内部评估',
  '作品评分',
  '修订过程',
  '档案信息',
  '关联手稿',
  '延伸阅读',
  '打开阅读'
];

for (const copy of requiredWorksCopy) {
  assert(worksHtml.includes(copy), `works.html missing exact UTF-8 copy: ${copy}`);
}
for (const copy of requiredWorkDetailCopy) {
  assert(workDetailHtml.includes(copy), `work-detail.html missing exact UTF-8 copy: ${copy}`);
}
for (const [file, source] of [['works.html', worksHtml], ['work-detail.html', workDetailHtml]]) {
  assert(!source.includes('\uFFFD'), `${file} contains the Unicode replacement character`);
}

const worksRuntime = read('works.js');
const workDetailRuntime = read('work-detail.js');
assert(
  workDetailRuntime.includes(`const defaultWorkImage = '${canonicalDetailPlaceholder}';`),
  'work-detail.js must use the existing canonical placeholder image'
);
assert(
  !`${workDetailHtml}\n${workDetailRuntime}\n${read('scripts/browser-qa.js')}`
    .includes('./content/design/works/ayase-momo-dandadan.jpg'),
  'Runtime and browser QA must not retain or mask the deleted loose detail placeholder'
);
for (const copy of ['来源待复核', '进入作品', '进入作品 →']) {
  assert(worksRuntime.includes(copy), `works.js missing repaired runtime copy: ${copy}`);
}
for (const copy of [
  '策展说明',
  '修订过程',
  '版式判断',
  '视觉系统',
  '下一轮修订',
  '概念',
  '版式',
  '文字',
  '视觉',
  '系统',
  '修订',
  '来源待复核',
  '来源',
  '媒介',
  '工具',
  '状态',
  '规格',
  '打开阅读'
]) {
  assert(workDetailRuntime.includes(copy), `work-detail.js missing repaired runtime copy: ${copy}`);
}

const homeHtml = read('index.html');
assert((homeHtml.match(/data-window="/g) || []).length === 6, 'Homepage must provide six column windows including Room');
assert((homeHtml.match(/data-photo-window/g) || []).length === 1, 'Homepage must provide one photo window');
assert(!homeHtml.includes('hero-lottie') && homeHtml.includes('./home.js'), 'Homepage must use its photo and six-entry window entrance');
assert(homeHtml.includes('./assets/images/avatar-cat.png') && !homeHtml.includes('照片待提供'), 'Homepage must display the supplied cat avatar instead of the old placeholder');
assert(exists('assets/images/avatar-cat.png'), 'The supplied cat avatar must be available locally');
const catAvatar = inspectSupportedImage(path.join(root, 'assets/images/avatar-cat.png'));
assert(catAvatar && catAvatar.format === 'png' && catAvatar.width > 0 && catAvatar.height > 0, 'The supplied cat avatar must be a valid PNG');
assert(homeHtml.includes('data-window="room"'), 'Homepage must expose a Room entry');
for (const file of ['writing.html', 'project.html', 'research.html', 'about.html']) {
  const html = read(file);
  assert(html.includes('./assets/css/reading.css'), `${file} must use the isolated reader stylesheet`);
  assert(html.includes('data-mobile-navigation'), `${file} must provide an inline mobile navigation`);
}
for (const file of ['writing.html', 'project.html', 'research.html', 'about.html', 'works.html']) {
  const html = read(file);
  const navs = [...html.matchAll(/<nav\b[^>]*aria-label="栏目"[^>]*>([\s\S]*?)<\/nav>/g)];
  assert(navs.length === (file === 'works.html' ? 2 : 3), `${file} must retain all desktop, mobile and applicable sidebar navigation fallbacks`);
  for (const nav of navs) {
    const links = [...nav[1].matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)];
    assert(JSON.stringify(links.map((link) => link[1])) === JSON.stringify(mainNavigationHrefs), `${file} must use the six-section navigation in every menu`);
    const current = links.filter((link) => link[0].includes('aria-current="page"'));
    assert(current.length === 1 && current[0][1] === `./${file}`, `${file} must mark only itself as the current section`);
  }
}
assert(!read('works.html').includes('reading.css'), 'Works must retain its own presentation');
assert(!read('work-detail.html').includes('reading.css'), 'Work details must retain their own presentation');
for (const file of ['index.html', 'writing.html', 'project.html', 'research.html', 'about.html', 'works.html']) {
  const html = read(file);
  assert(html.includes('./assets/css/site-theme.css') && html.includes('./site-backdrop.js'), `${file} must share the Niku interface and halftone renderer`);
  assert(html.indexOf('./assets/vendor/niku-home.js') > 0 && html.indexOf('./assets/vendor/niku-home.js') < html.indexOf('./site-backdrop.js'), `${file} must load the original Niku shaders before their adapter`);
}
const roomHtml = read('room.html');
assert(roomHtml.includes("location.replace('./magic-cabin/index.html?view=shelf')"), 'The existing Room address must enter the shelf without adding an intermediate history entry');
assert(roomHtml.includes('href="./magic-cabin/index.html?view=shelf"'), 'Room must retain a usable cabin link when JavaScript is disabled');
assert(!roomHtml.includes('尚未开放') && !homeHtml.includes('尚未开放'), 'Room and its homepage preview must no longer show a pending state');
assert((homeHtml.match(/href="\.\/room\.html"/g) || []).length === 2, 'Both homepage Room links must use the compatible entry address');
assert(read('magic-cabin/index.html').includes('href="../writing.html"'), 'The existing cabin must retain navigation back to the website');
assert(read('project.html').includes('./assets/css/projects.css'), 'Projects must load its shared-theme content styling');
assert(read('research.html').includes('./assets/css/research.css') && read('research.html').includes('./content/research/uga-overview.md'), 'Research must expose its styled public overview');
assert(read('content/research/uga-overview.md').includes('OPEN / 未解决') && read('content/research/uga-overview.md').includes('independent_verification=false'), 'Research overview must retain the open problem and evidence boundaries');
const nikuSandbox = { window: {} };
vm.runInNewContext(read('assets/vendor/niku-home.js'), nikuSandbox);
const nikuSourceRecord = JSON.parse(read('licenses/Niku-source-record.json'));
for (const [name, key] of [['VERTEX_SHADER', 'vertexShader'], ['FRAGMENT_SHADER', 'fragmentShader']]) {
  assert(crypto.createHash('sha256').update(nikuSandbox.window.NikuHome[key]).digest('hex') === nikuSourceRecord.shaderSha256[name], `Niku ${name} must retain its pinned source text`);
}
assert(read('article.html').includes('site-theme.css') && read('article.html').includes('site-backdrop.js'), 'Article reading must share the Niku interface with the Writing list');
const archiveCatalog = JSON.parse(read('assets/research/uga/catalog.json'));
assert(archiveCatalog.sourceFileCount === 399 && archiveCatalog.files.length === 399, 'UGA must preserve all 399 supplied source files');
assert(archiveCatalog.claimCount === 89 && archiveCatalog.claims.length === 89, 'UGA must index the 89 actual ledger entries without inventing missing numbers');
assert(new Set([...archiveCatalog.files, ...archiveCatalog.claims].map(record => record.id)).size === 488, 'Every archive entry needs a unique stable link');
for (const record of [...archiveCatalog.files, ...archiveCatalog.claims]) {
  assert(/^(raw|claims)\/[a-z0-9-]+\.(txt|pdf)$/.test(record.file), 'Archive content must stay in its safe local data directory');
  const bytes = fs.readFileSync(path.join(root, 'assets/research/uga', record.file));
  assert(bytes.length === record.bytes && crypto.createHash('sha256').update(bytes).digest('hex') === record.sha256, `${record.path} must retain the declared source bytes`);
}
assert((homeHtml.match(/class="window-picture"/g) || []).length === 6, 'Every entrance preview must include its corresponding image');
console.log(`QA checks passed for Aleksi: ${assertions}`);
