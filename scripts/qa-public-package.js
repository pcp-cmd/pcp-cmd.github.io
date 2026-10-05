const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { packPublic } = require('./pack-public.js');

let assertions = 0;
function assert(condition, message) {
  assertions += 1;
  if (!condition) throw new Error(message);
}

function listFiles(root, relativeDirectory = '') {
  const directory = path.join(root, relativeDirectory);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory.replace(/\\/g, '/'), entry.name);
    return entry.isDirectory() ? listFiles(root, relativePath) : [relativePath];
  });
}

function loadWindowScript(root, relativePath) {
  const sandbox = { window: {}, encodeURIComponent };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), sandbox, {
    filename: relativePath
  });
  return sandbox.window;
}

function resolveHtmlReference(htmlFile, rawReference) {
  const reference = rawReference.trim();
  // Network URLs, data URLs, mail links and document fragments are not files
  // in the deployment package. Bare paths are relative to their HTML page.
  if (!reference || /^(?:[a-z][a-z0-9+.-]*:|\/\/|[?#])/i.test(reference)) return null;
  const pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  let resolved = path.posix.normalize(pathname.startsWith('/')
    ? pathname.slice(1)
    : path.posix.join(path.posix.dirname(htmlFile), pathname));
  if (resolved === '..' || resolved.startsWith('../')) {
    throw new Error(`${htmlFile} references a file outside the public root: ${rawReference}`);
  }
  if (resolved.endsWith('/')) resolved += 'index.html';
  return resolved;
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aleksi-public-'));
const outputDir = path.join(tempRoot, 'public');

try {
  const result = packPublic(outputDir);
  const files = listFiles(outputDir);
  const fileSet = new Set(files);

  for (const forbiddenPath of [
    '.git',
    '.gitattributes',
    'docs',
    'scripts',
    'node_modules',
    'qa-artifacts',
    'package.json',
    'package-lock.json',
    'qa-check.js',
    'server.js',
    'magic-cabin/server.cjs',
    'magic-cabin/package.json',
    'magic-cabin/scripts',
    'magic-cabin/fixtures',
    'magic-cabin/verification.json',
    'magic-cabin/DESIGN-NOTES.md',
    'magic-cabin/INTEGRATION.md'
  ]) {
    assert(!fs.existsSync(path.join(outputDir, forbiddenPath)), `Public package contains ${forbiddenPath}`);
  }

  for (const requiredPath of [
    'index.html',
    'article.html',
    'article-content.js',
    'works.html',
    'work-detail.html',
    'styles.css',
    'assets/lottie/overview-dark.json',
    'writing.html',
    'project.html',
    'research.html',
    'about.html',
    'room.html',
    'research-record.html',
    'research-archive.js',
    'assets/css/research-archive.css',
    'assets/research/uga/catalog.json',
    'site-data.js',
    'home.js',
    'site-backdrop.js',
    'reading.js',
    'gallery.js',
    'works-catalog.js',
    'assets/css/gallery.css',
    'assets/css/projects.css',
    'assets/css/research.css',
    'assets/images/avatar-cat.png',
    'assets/fonts/DotGothic16-Regular.ttf',
    'licenses/DotGothic16-OFL.txt',
    'assets/css/reading.css',
    'assets/css/entrance.css',
    'assets/css/site-theme.css',
    'assets/vendor/niku-home.js',
    'licenses/Niku-source-record.json',
    'assets/vendor/marked-12.0.2.min.js',
    'assets/vendor/purify-3.1.6.min.js',
    'licenses/assistant-ui-MIT.txt',
    'licenses/THIRD-PARTY.md',
    'content/content-bundle.js',
    'content/markdown-index.json',
    'content/manifest.json',
    'content/research/uga-overview.md',
    'magic-cabin/index.html',
    'magic-cabin/cabin.css',
    'magic-cabin/cabin-design.js',
    'magic-cabin/book-data.js',
    'magic-cabin/book-reader.js',
    'magic-cabin/book-pagination.js',
    'magic-cabin/library.js',
    'magic-cabin/three.min.js',
    'magic-cabin/LICENSE'
  ]) {
    assert(fileSet.has(requiredPath), `Public package is missing ${requiredPath}`);
  }

  assert(
    files.filter((file) => file.startsWith('assets/lottie/')).length === 1,
    'Public package must contain exactly one runtime Lottie asset'
  );
  assert(
    !files.some((file) => /(?:^|\/)(?:README|[^/]+-template)\.md$/i.test(file)),
    'Public package must not contain README or template Markdown'
  );
  assert(
    !files.some((file) => /(?:source-map|[^/]+-build-log)\.json$/i.test(file)),
    'Public package must not contain internal source maps or build logs'
  );
  assert(!files.some((file) => /reading-sample|handoff|research-private/i.test(file)), 'Local fixtures and handoff materials must not be published');

  assert(
    files.filter((file) => /^magic-cabin\/sounds\/[^/]+\.mp3$/.test(file)).length === 11,
    'Public cabin must retain all 11 runtime sound assets'
  );
  assert(resolveHtmlReference('magic-cabin/index.html', './cabin.css?v=1') === 'magic-cabin/cabin.css', 'Cabin relative assets must resolve from their HTML directory');
  assert(resolveHtmlReference('magic-cabin/index.html', '../article.html?src=content/test.md') === 'article.html', 'Cabin parent references must resolve from the public root');
  assert(resolveHtmlReference('magic-cabin/index.html', 'book-reader.js') === 'magic-cabin/book-reader.js', 'Bare HTML references must resolve from their HTML directory');
  assert(resolveHtmlReference('magic-cabin/index.html', 'https://example.com/missing.js') === null, 'External references must not be checked as public files');
  assert(resolveHtmlReference('magic-cabin/index.html', '//example.com/missing.js') === null, 'Protocol-relative references must not be checked as public files');

  for (const htmlFile of files.filter((file) => file.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(outputDir, htmlFile), 'utf8')
      .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, '$1$2');
    const references = Array.from(
      html.matchAll(/\b(?:src|href)\s*=\s*(["'])(.*?)\1/g),
      (match) => resolveHtmlReference(htmlFile, match[2])
    ).filter((reference) => reference !== null);
    for (const reference of references) {
      assert(fileSet.has(reference), `${htmlFile} references missing public file ${reference}`);
    }
  }

  const styleManifest = fs.readFileSync(path.join(outputDir, 'styles.css'), 'utf8');
  for (const match of styleManifest.matchAll(/@import url\("(\.\/[^"]+)"\)/g)) {
    const reference = match[1].replace(/^\.\//, '');
    assert(fileSet.has(reference), `styles.css references missing public file ${reference}`);
  }

  const worksWindow = loadWindowScript(outputDir, 'works-data.js');
  for (const work of worksWindow.ALEKSI_WORKS || []) {
    for (const reference of [work.cover, work.thumb, work.article].filter(Boolean)) {
      assert(fileSet.has(reference.replace(/^\.\//, '')), `${work.slug} public reference is missing: ${reference}`);
    }
  }

  const bundleWindow = loadWindowScript(outputDir, 'content/content-bundle.js');
  const markdownBundle = bundleWindow.ALEKSI_MARKDOWN_BUNDLE || {};
  const writingEntries = loadWindowScript(outputDir, 'site-data.js').ALEKSI_SITE.writing;
  const expectedWritingSources = Array.from({ length: 41 }, (_, index) => `content/writing/${String(index + 1).padStart(2, '0')}.md`);
  assert(Array.isArray(writingEntries) && writingEntries.length === 41, 'Public Writing index must contain all 41 imported articles');
  const writingSources = writingEntries.map((entry) => entry.source);
  assert(new Set(writingSources).size === 41, 'Public Writing sources must be unique');
  assert(JSON.stringify([...writingSources].sort()) === JSON.stringify(expectedWritingSources), 'Public Writing index must map one-to-one to all 41 imported Markdown sources');
  for (const entry of writingEntries) {
    assert(entry.approved === true, `Public Writing article must be approved: ${entry.source}`);
    assert(fileSet.has(entry.source), `Public Writing Markdown source is missing: ${entry.source}`);
    assert(markdownBundle[entry.source] === fs.readFileSync(path.join(outputDir, entry.source), 'utf8'), `Public Writing bundle must match its packaged Markdown source: ${entry.source}`);
  }
  const legacyMarkdownSources = Object.keys(markdownBundle).filter((source) => !writingSources.includes(source)).sort();
  // Same frozen 36-source baseline as qa-check.js, independent of the new Writing records.
  assert(legacyMarkdownSources.length === 36 && crypto.createHash('sha256').update(legacyMarkdownSources.join('\n')).digest('hex') === '50484f4d3ba90f0effe3c323106c0a9afe902f4f95a04a0bca051e80cd047fa5', 'Public package must preserve the exact 36-source Markdown baseline');
  assert(
    Object.keys(markdownBundle).length === 77,
    'Public Markdown bundle must contain the original 36 files plus 41 Writing articles'
  );
  assert(
    Object.keys(bundleWindow.ALEKSI_JSON_BUNDLE || {}).length === 3,
    'Public JSON bundle must contain three public JSON files'
  );
  const researchOverview = fs.readFileSync(path.join(outputDir, 'content/research/uga-overview.md'), 'utf8');
  assert(bundleWindow.ALEKSI_MARKDOWN_BUNDLE['content/research/uga-overview.md'] === researchOverview, 'Bundled UGA overview must match the downloadable public source');
  assert(researchOverview.includes('OPEN / 未解决') && researchOverview.includes('independent_verification=false'), 'Public UGA overview must retain the open problem and evidence status');
  const roomHtml = fs.readFileSync(path.join(outputDir, 'room.html'), 'utf8');
  assert(roomHtml.includes("location.replace('./magic-cabin/index.html?view=shelf')"), 'Public Room must enter the packaged cabin shelf using history replacement');
  assert(roomHtml.includes('href="./magic-cabin/index.html?view=shelf"') && !roomHtml.includes('尚未开放'), 'Public Room must provide a cabin fallback link and remove the pending state');
  const catalog = loadWindowScript(outputDir, 'works-catalog.js').ALEKSI_WORKS_CATALOG || [];
  assert(catalog.length === 13 && new Set(catalog.map((item) => item.id)).size === 13, 'Public Works catalog must contain all 13 unique artworks');
  for (const item of catalog) {
    assert(fileSet.has(item.image.replace(/^\.\//, '')), `${item.id} public gallery image is missing`);
    assert(typeof item.title === 'string' && item.title.length > 0 && typeof item.summary === 'string' && item.summary.length > 0, `${item.id} public gallery must retain its title and description`);
    assert(!['article', 'articleHref', 'detailUrl', 'scores'].some((field) => field in item), `${item.id} must not restore legacy article navigation or generated scores`);
  }
  assert(result.fileCount === files.length, 'Public package file count must be deterministic');

  console.log(`Public package QA passed: ${assertions} assertions, ${files.length} files.`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
