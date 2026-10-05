/* Writing 与书房共用的 Markdown 加载、路径映射和安全渲染。 */
(function () {
'use strict';
const siteRoot = new URL('./', document.currentScript.src);
const validSource = source => typeof source === 'string'
  && /^content\/[\w\u0080-\uFFFF/.-]+\.md$/.test(source)
  && !source.split('/').some(part => part === '.' || part === '..');
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function renderMarkdownSafely(markdown) {
  if (window.marked && window.DOMPurify) return window.DOMPurify.sanitize(window.marked.parse(String(markdown || '')));
  return '<pre>' + escapeHtml(markdown) + '</pre>';
}
function articleHref(src) { return new URL('article.html?src=' + encodeURIComponent(src), siteRoot).href; }
let bundlePromise;
function ensureBundle() {
  if (window.ALEKSI_MARKDOWN_BUNDLE) return Promise.resolve();
  if (!bundlePromise) bundlePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('content/content-bundle.js', siteRoot).href;
    script.onload = resolve;
    script.onerror = () => { bundlePromise = null; script.remove(); reject(new Error('文章暂时无法打开，请稍后重试。')); };
    document.head.append(script);
  });
  return bundlePromise;
}
function normalizePath(path) {
  const parts = String(path || '').replace(/\\/g, '/').split('/');
  const stack = [];
  parts.forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') stack.pop();
    else stack.push(part);
  });
  return stack.join('/');
}

function decodeHashUnicode(path) {
  return String(path || '').replace(/#U([0-9a-fA-F]{4,6})/g, (_, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch (error) {
      return _;
    }
  });
}

function encodeCjkHashUnicode(path) {
  return String(path || '').replace(/[^\x00-\x7F]/g, (char) => {
    return `#U${char.codePointAt(0).toString(16)}`;
  });
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function getMarkdownKeys() {
  return Object.keys(window.ALEKSI_MARKDOWN_BUNDLE || {});
}

function resolveMarkdownSource(src) {
  const decodedInput = safeDecodeURIComponent(src || '').replace(/\\/g, '/');
  const normalized = normalizePath(decodedInput);
  // Old links sometimes contain only a filename. A complete source path must
  // never resolve to an unrelated article merely because its filename matches.
  const legacyLeaf = Boolean(decodedInput) && !decodedInput.includes('/');
  const bundle = window.ALEKSI_MARKDOWN_BUNDLE || {};
  const keys = getMarkdownKeys();

  const candidates = [
    normalized,
    normalizePath(decodeHashUnicode(normalized)),
    normalizePath(encodeCjkHashUnicode(normalized)),
    normalizePath(encodeCjkHashUnicode(decodeHashUnicode(normalized)))
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (bundle[candidate]) return candidate;
  }

  const decodedTarget = normalizePath(decodeHashUnicode(normalized));
  const encodedTarget = normalizePath(encodeCjkHashUnicode(decodedTarget));

  const matchedKey = keys.find((key) => {
    const decodedKey = normalizePath(decodeHashUnicode(key));
    return key === normalized
      || key === encodedTarget
      || decodedKey === decodedTarget
      || (legacyLeaf && decodedKey.endsWith(`/${decodedTarget}`));
  });

  if (matchedKey) return matchedKey;

  const markdownIndex = window.ALEKSI_JSON_BUNDLE && window.ALEKSI_JSON_BUNDLE['content/markdown-index.json'];
  const indexFiles = markdownIndex && Array.isArray(markdownIndex.files) ? markdownIndex.files : [];
  const indexed = indexFiles.find((item) => {
    const source = normalizePath(item.source || '');
    const decodedSource = normalizePath(decodeHashUnicode(source));
    return source === normalized || decodedSource === decodedTarget || source === encodedTarget;
  });

  if (indexed && bundle[indexed.source]) return indexed.source;

  return normalized;
}


function renderArticleBody(markdown, src) {
  // Parse first: reference links and HTML receive the same path handling, while
  // literal Markdown inside code remains untouched.
  const article = document.createElement('div');
  article.innerHTML = renderMarkdownSafely(renderCallouts(String(markdown || '')));
  const base = new URL(src ? resolveMarkdownSource(src) : './', siteRoot);
  article.querySelectorAll('a[href], img[src]').forEach(element => {
    const attribute = element.tagName === 'A' ? 'href' : 'src';
    const target = element.getAttribute(attribute);
    if (!target || target.startsWith('#')) return;
    let resolved;
    try { resolved = new URL(decodeHashUnicode(target), base); } catch (_) { return; }
    if (attribute === 'href' && resolved.origin === siteRoot.origin
      && resolved.pathname.startsWith(siteRoot.pathname) && /\.md$/i.test(resolved.pathname)) {
      const source = safeDecodeURIComponent(resolved.pathname.slice(siteRoot.pathname.length));
      if (validSource(source)) {
        element.setAttribute(attribute, articleHref(source) + resolved.hash);
        return;
      }
    }
    element.setAttribute(attribute, resolved.href);
  });
  return article.innerHTML;
}

async function loadMarkdown(src) {
  const normalized = resolveMarkdownSource(src);
  if (!validSource(normalized)) throw new Error('文章路径无效。');
  if (location.protocol === 'file:') await ensureBundle();
  const bundled = window.ALEKSI_MARKDOWN_BUNDLE?.[normalized];
  if (typeof bundled === 'string') return bundled;
  try {
    const response = await fetch(new URL(normalized, siteRoot));
    if (!response.ok) throw new Error('Missing article');
    return await response.text();
  } catch (error) {
    await ensureBundle();
    const offline = window.ALEKSI_MARKDOWN_BUNDLE?.[normalized];
    if (typeof offline === 'string') return offline;
    throw new Error('文章暂时无法打开，请稍后重试。');
  }
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith('---')) return { meta: {}, body: markdown };
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: markdown };

  const rawMeta = markdown.slice(3, end).trim().split(/\r?\n/);
  const body = markdown.slice(end + 4).trim();
  const meta = {};
  let currentKey = null;

  rawMeta.forEach((line) => {
    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && currentKey) {
      meta[currentKey] = Array.isArray(meta[currentKey]) ? meta[currentKey] : [];
      meta[currentKey].push(listItem[1].trim());
      return;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) return;
    currentKey = pair[1];
    const value = pair[2].trim();
    meta[currentKey] = value || [];
  });

  return { meta, body };
}

function renderCallouts(markdown) {
  const types = ['definition', 'proof', 'error', 'toolbox', 'revision'];
  return markdown.replace(/:::(definition|proof|error|toolbox|revision)\s*([\s\S]*?):::/g, (_, type, body) => {
    const label = types.includes(type) ? type : 'revision';
    return `\n<section class="callout callout-${label}">\n<p class="callout-label">${label}</p>\n${body.trim()}\n</section>\n`;
  });
}


function stripLeadingTitleHeading(body) { return String(body || '').replace(/^\s*#\s+[^\n]+\n+/, ''); }
window.AleksiArticleContent = Object.freeze({ siteRoot: siteRoot.href, validSource,
 loadMarkdown, parseFrontmatter, renderArticleBody, renderCallouts,
 renderMarkdownSafely, stripLeadingTitleHeading, articleHref });
})();
