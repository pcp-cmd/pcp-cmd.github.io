const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const defaultOutput = path.join(root, 'dist', 'public');

function isPathInside(parentPath, childPath) {
  const relative = path.relative(parentPath, childPath);
  return relative === ''
    || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function copyFile(relativePath, outputDir) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
  const source = path.resolve(root, normalized);
  if (!isPathInside(root, source) || !fs.statSync(source).isFile()) {
    throw new Error(`Refusing invalid public source file: ${relativePath}`);
  }
  const target = path.join(outputDir, normalized);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(relativeDirectory, outputDir) {
  const directory = path.resolve(root, relativeDirectory);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDirectory.replace(/\\/g, '/'), entry.name);
    if (entry.isDirectory()) copyDirectory(relativePath, outputDir);
    else if (entry.isFile()) copyFile(relativePath, outputDir);
  }
}

function loadWindowScript(relativePath) {
  const sandbox = { window: {}, encodeURIComponent };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), sandbox, {
    filename: relativePath
  });
  return sandbox.window;
}

function assertSafeOutput(outputDir) {
  const resolved = path.resolve(outputDir);
  if (
    resolved === root
    || isPathInside(resolved, root)
    || isPathInside(path.join(root, '.git'), resolved)
  ) {
    throw new Error(`Refusing unsafe public output path: ${resolved}`);
  }
  return resolved;
}

function packPublic(requestedOutput = defaultOutput) {
  const outputDir = assertSafeOutput(requestedOutput);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const rootFiles = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of rootFiles) {
    if (entry.isFile() && entry.name.endsWith('.html')) copyFile(entry.name, outputDir);
  }
  for (const runtimeFile of [
    '.nojekyll',
    'styles.css',
    'site-data.js',
    'home.js',
    'site-backdrop.js',
    'reading.js',
    'research-archive.js',
    'gallery.js',
    'works-catalog.js',
    'app.js',
    'article.js',
    'article-content.js',
    'chain.js',
    'content.js',
    'graph-data.js',
    'graph.js',
    'manuscripts.js',
    'math.js',
    'protocol.js',
    'work-detail.js',
    'works-data.js',
    'works.js'
  ]) {
    copyFile(runtimeFile, outputDir);
  }

  copyDirectory('assets', outputDir);
  copyDirectory('licenses', outputDir);

  // Only browser runtime files belong in the public cabin. Keep its local
  // server, source notes, QA scripts and fixtures out of deployment artifacts.
  for (const cabinFile of [
    'index.html',
    'cabin.css',
    'cabin-design.js',
    'book-data.js',
    'book-reader.js',
    'book-pagination.js',
    'library.js',
    'three.min.js',
    'LICENSE'
  ]) {
    copyFile(`magic-cabin/${cabinFile}`, outputDir);
  }
  for (const sound of fs.readdirSync(path.join(root, 'magic-cabin', 'sounds'), { withFileTypes: true })) {
    if (sound.isFile() && sound.name.endsWith('.mp3')) {
      copyFile(`magic-cabin/sounds/${sound.name}`, outputDir);
    }
  }

  const markdownIndex = JSON.parse(
    fs.readFileSync(path.join(root, 'content', 'markdown-index.json'), 'utf8')
  );
  for (const entry of markdownIndex.files) copyFile(entry.source, outputDir);

  copyFile('content/content-bundle.js', outputDir);
  const bundleWindow = loadWindowScript('content/content-bundle.js');
  for (const jsonPath of Object.keys(bundleWindow.ALEKSI_JSON_BUNDLE || {})) {
    copyFile(jsonPath, outputDir);
  }

  const worksWindow = loadWindowScript('works-data.js');
  for (const work of worksWindow.ALEKSI_WORKS || []) {
    copyFile(work.cover, outputDir);
    copyFile(work.thumb, outputDir);
  }

  const fileCount = fs.readdirSync(outputDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile()).length;
  console.log(`Built public deploy directory with ${fileCount} files: ${outputDir}`);
  return { outputDir, fileCount };
}

if (require.main === module) {
  packPublic(process.argv[2] || defaultOutput);
}

module.exports = {
  packPublic
};
