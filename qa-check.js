const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

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
  vm.runInContext(read('works-data.js'), sandbox, { filename: 'works-data.js' });
  return {
    works: sandbox.window.ALEKSI_WORKS,
    aliases: sandbox.window.ALEKSI_WORK_ALIASES
  };
}

function loadContent() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read('content.js'), sandbox, { filename: 'content.js' });
  return sandbox.window.ALEKSI_CONTENT;
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
const content = loadContent();
for (const artifact of content.selectedArtifacts || []) {
  if (!artifact.image) continue;
  const imagePath = artifact.image.replace(/^\.\//, '');
  assert(exists(imagePath), `Homepage selected artifact image is missing: ${artifact.image}`);
}
const worksDataSource = read('works-data.js');
const { works, aliases: workAliases } = loadWorks();
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
assert(
  contentManifest.math.length === 1
    && JSON.stringify(contentManifest.math[0]) === JSON.stringify(mathChapterManifest),
  'Generated content manifest must embed the canonical chapter manifest'
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
  assert(sourceImages.length === 1, `${work.slug} must contain exactly one canonical source image`);
  assertCanonicalWorkImage(work, 'source', `./${directory}/${sourceImages[0]}`);
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
  packageJson.scripts.verify === 'npm run qa && npm run build && npm run qa',
  'npm run verify must use the stable static QA/build/QA chain'
);
assert(
  packageJson.scripts['verify:browser'] === 'npm run qa:browser',
  'verify:browser must expose the optional browser QA separately'
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
for (const setupCommand of ['npm install -D playwright', 'npx playwright install chromium']) {
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
for (const requiredRepositoryFile of ['.gitignore', '.nojekyll', 'README.md', 'package.json', 'package-lock.json']) {
  assert(exists(requiredRepositoryFile), `GitHub repository file must be retained: ${requiredRepositoryFile}`);
}
for (const forbiddenRepositoryPath of [
  'node_modules',
  'qa-artifacts',
  '.superpowers',
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini'
]) {
  assert(!exists(forbiddenRepositoryPath), `Repository contains transient path: ${forbiddenRepositoryPath}`);
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

for (const htmlFile of ['index.html', 'works.html', 'work-detail.html', 'math.html', 'manuscripts.html', 'protocol.html']) {
  const html = read(htmlFile);
  assert(html.includes('<link rel="stylesheet" href="./styles.css">'), `${htmlFile} does not load styles.css`);
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
const allFormalCss = formalCss.map(read).join('\n');
const worksJs = read('works.js');
const desktopSlot = loadDesktopSlot();

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
  '作品档案',
  'Works / 作品档案',
  '一面可以被打开的展览墙。',
  '视觉实验、排版练习、二创研究与未完成手稿，按作品关系重新陈列。',
  '档案索引'
];
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
const homeRuntime = read('app.js');
const lottieOriginalPath = 'assets/lottie/overview.json';
const lottieDarkPath = 'assets/lottie/overview-dark.json';
const lottieFallbackPath = 'assets/hero/infinite-progress-hero.webp';

assert(exists(lottieOriginalPath), `${lottieOriginalPath} missing`);
assert(exists(lottieDarkPath), `${lottieDarkPath} missing`);
assert(exists(lottieFallbackPath), `${lottieFallbackPath} missing`);

if (exists(lottieOriginalPath) && exists(lottieDarkPath)) {
  const originalLottieSource = read(lottieOriginalPath);
  const darkLottieSource = read(lottieDarkPath);
  const blackFill = '[0.074509803922,0.074509803922,0.078431372549,1]';
  const warmWhiteFill = '[0.9098,0.8706,0.8157,1]';
  const clayFill = '[0.85098,0.4667,0.3412,1]';
  const accentFill = '[0.8627,0.5059,0.3216,1]';
  const count = (source, value) => source.split(value).length - 1;
  const restoredDarkSource = darkLottieSource
    .split(warmWhiteFill).join(blackFill)
    .split(accentFill).join(clayFill);

  assertDoesNotThrow(() => JSON.parse(originalLottieSource), 'Original overview Lottie must be valid JSON');
  assertDoesNotThrow(() => JSON.parse(darkLottieSource), 'Dark overview Lottie must be valid JSON');
  assert(count(originalLottieSource, blackFill) > 0, 'Original overview Lottie must contain the expected black fills');
  assert(count(darkLottieSource, blackFill) === 0, 'Dark overview Lottie must not retain the target black fill');
  assert(
    count(darkLottieSource, warmWhiteFill) === count(originalLottieSource, blackFill),
    'Every target black fill must become the approved warm white'
  );
  assert(
    restoredDarkSource === originalLottieSource,
    'overview-dark.json may only change the approved fill colors'
  );
}

const appScriptIndex = homeHtml.indexOf('<script defer src="./app.js"></script>');
assert(
  appScriptIndex >= 0,
  'index.html must load the homepage runtime'
);
assert(
  /<aside class="hero-card hero-illustration-card hero-lottie-card" aria-label="Aleksi Lab living glyph">/.test(homeHtml),
  'Homepage hero aside must use the isolated Lottie card class and label'
);
assert(
  /<figure class="hero-figure hero-lottie-figure">[\s\S]*?<div class="hero-glyph-lottie" id="heroGlyphLottie" aria-hidden="true"><\/div>[\s\S]*?<img class="hero-illustration hero-lottie-fallback" src="\.\/assets\/hero\/infinite-progress-hero\.webp"/.test(homeHtml),
  'Homepage hero must render the Lottie mount before the static fallback'
);

for (const selector of [
  '.hero-lottie-card',
  '.hero-lottie-card .hero-card-top',
  '.hero-lottie-figure',
  '.hero-lottie-figure::before',
  '.hero-glyph-lottie',
  '.hero-glyph-lottie.is-ready',
  '.hero-lottie-card:hover .hero-glyph-lottie',
  '.hero-lottie-fallback',
  '.hero-lottie-figure.has-lottie .hero-lottie-fallback',
  '.hero-lottie-figure.lottie-failed .hero-lottie-fallback'
]) {
  assert(homeCss.includes(selector), `home.css missing Lottie selector: ${selector}`);
}
assert(
  /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.hero-glyph-lottie\s*\{[^}]*transition:\s*none;[^}]*transform:\s*none;/s.test(homeCss),
  'Homepage Lottie must disable its CSS transition and transform for reduced motion'
);
const lottieCardRule = homeCss.match(/\.home-redesign \.hero-card\.hero-lottie-card\s*\{([^}]*)\}/s)?.[1] || '';
assert(
  /\bborder\s*:\s*0\s*;/.test(lottieCardRule)
    && /\bpadding\s*:\s*0\s*;/.test(lottieCardRule)
    && /\bbackground\s*:\s*transparent\s*;/.test(lottieCardRule)
    && /\bbox-shadow\s*:\s*none\s*;/.test(lottieCardRule)
    && /\boverflow\s*:\s*visible\s*;/.test(lottieCardRule),
  'Homepage Lottie wrapper must be visually unboxed'
);
const lottieCardTopRule = homeCss.match(
  /\.home-redesign \.hero-lottie-card \.hero-card-top\s*\{([^}]*)\}/s
)?.[1] || '';
assert(
  /\bdisplay\s*:\s*none\s*;/.test(lottieCardTopRule),
  'Homepage Lottie title strip must be hidden'
);
const lottieFigureRule = homeCss.match(/\.home-redesign \.hero-lottie-figure\s*\{([^}]*)\}/s)?.[1] || '';
assert(
  /\bborder\s*:\s*0\s*;/.test(lottieFigureRule)
    && /\bborder-radius\s*:\s*0\s*;/.test(lottieFigureRule)
    && /\bwidth\s*:\s*100%\s*;/.test(lottieFigureRule)
    && /\bbackground\s*:\s*transparent\s*;/.test(lottieFigureRule)
    && /\boverflow\s*:\s*visible\s*;/.test(lottieFigureRule),
  'Homepage Lottie figure must be frameless, transparent, and free to breathe'
);
const lottieGlyphRule = homeCss.match(/\.hero-glyph-lottie\s*\{([^}]*)\}/s)?.[1] || '';
const desktopGlyphSize = lottieGlyphRule.match(/\bwidth\s*:\s*min\(([\d.]+)%,\s*([\d.]+)px\)\s*;/);
assert(
  desktopGlyphSize
    && Number(desktopGlyphSize[1]) >= 100
    && Number(desktopGlyphSize[2]) >= 600,
  'Homepage Lottie glyph must be a large right-side visual rather than a small card illustration'
);
const mobileGlyphRule = collectCssRules(homeCss).find(
  (rule) => rule.scope === '@media (max-width: 640px)' && rule.selector === '.hero-glyph-lottie'
)?.body || '';
const mobileGlyphSize = mobileGlyphRule.match(/\bwidth\s*:\s*min\(([\d.]+)%,\s*([\d.]+)px\)\s*;/);
assert(
  mobileGlyphSize
    && Number(mobileGlyphSize[1]) <= 108
    && Number(mobileGlyphSize[2]) <= 420,
  'Homepage Lottie glyph must remain bounded on mobile'
);
const fallbackRule = homeCss.match(/\.hero-lottie-fallback\s*\{([^}]*)\}/s)?.[1] || '';
const failedFallbackRule = homeCss.match(
  /\.hero-lottie-figure\.lottie-failed \.hero-lottie-fallback\s*\{([^}]*)\}/s
)?.[1] || '';
assert(
  /\bopacity\s*:\s*0\s*;/.test(fallbackRule)
    && /\bopacity\s*:\s*0?\.[1-9]\d*\s*;/.test(failedFallbackRule),
  'Homepage fallback must stay quiet during normal playback and become visible on failure'
);

assert(/function initHeroLottie\(\)/.test(homeRuntime), 'app.js must define initHeroLottie');
assert(
  /if\s*\(!window\.lottie\s*\|\|\s*typeof window\.lottie\.loadAnimation !== 'function'\)/.test(homeRuntime)
    && /markFailed\(/.test(homeRuntime),
  'initHeroLottie must preserve the fallback when lottie-web is unavailable'
);
assert(
  /addEventListener\(['"]data_failed['"]/.test(homeRuntime)
    && /lottie-failed/.test(homeRuntime),
  'initHeroLottie must reveal its fallback when animation data fails'
);
assert(
  /prefers-reduced-motion:\s*reduce/.test(homeRuntime)
    && /loop:\s*!reduceMotion/.test(homeRuntime)
    && /if\s*\(reduceMotion\)\s*\{[\s\S]*?goToAndStop\(/s.test(homeRuntime),
  'Homepage Lottie must respect reduced-motion preferences'
);
assert(
  homeRuntime.indexOf("window.addEventListener('pagehide'") >= 0
    && homeRuntime.indexOf("window.addEventListener('pagehide'") < homeRuntime.indexOf('if (reduceMotion) return;'),
  'Homepage Lottie cleanup must be registered for reduced-motion sessions too'
);
assert(
  /renderNavigation\(\);\s*renderHeroCopy\(\);\s*initHeroLottie\(\);\s*renderGuideRows\(\);/s.test(homeRuntime),
  'initHeroLottie must run after hero copy and before the remaining homepage renderers'
);

console.log(`QA checks passed for Aleksi Lab v1.7.2-clean-reset: ${assertions}`);
