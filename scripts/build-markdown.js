const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content');
const outputFile = path.join(contentDir, 'markdown-index.json');
const canonicalContentRoot = fs.realpathSync.native
  ? fs.realpathSync.native(contentDir)
  : fs.realpathSync(contentDir);

function assertContainedRealPath(targetPath, canonicalRoot, fsApi = fs) {
  const stats = fsApi.lstatSync(targetPath);
  if (stats.isSymbolicLink()) {
    throw new Error(`Refusing symbolic link or reparse point in content: ${targetPath}`);
  }

  const realPath = fsApi.realpathSync.native
    ? fsApi.realpathSync.native(targetPath)
    : fsApi.realpathSync(targetPath);
  const relative = path.relative(canonicalRoot, realPath);
  const contained = relative === ''
    || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
  if (!contained) {
    throw new Error(`Content path escapes canonical content root: ${targetPath} -> ${realPath}`);
  }

  return stats;
}

function listMarkdown(targetPath, canonicalRoot = canonicalContentRoot, fsApi = fs) {
  const stats = assertContainedRealPath(targetPath, canonicalRoot, fsApi);
  if (!stats.isDirectory()) {
    return targetPath.toLowerCase().endsWith('.md') ? [targetPath] : [];
  }

  return fsApi.readdirSync(targetPath)
    .sort((left, right) => left.localeCompare(right))
    .flatMap((name) => listMarkdown(path.join(targetPath, name), canonicalRoot, fsApi));
}

function assertSafeRelativePath(relativePath) {
  if (typeof relativePath !== 'string') {
    throw new Error(`Unsafe content source path: ${relativePath}`);
  }

  const normalized = relativePath.replace(/\\/g, '/');
  const resolved = path.resolve(root, normalized);
  const withinRoot = resolved.startsWith(`${root}${path.sep}`);
  const normalizedPath = path.posix.normalize(normalized);
  const unsafeSegment = normalized.split('/').some((segment) => !segment || segment === '.' || segment === '..');

  if (
    path.isAbsolute(relativePath)
    || !withinRoot
    || normalized !== normalizedPath
    || unsafeSegment
    || !normalized.startsWith('content/')
    || /#U[0-9a-f]{4}/i.test(normalized)
  ) {
    throw new Error(`Unsafe content source path: ${relativePath}`);
  }

  return normalized;
}

function titleFromMarkdown(file) {
  const text = fs.readFileSync(file, 'utf8');
  const frontmatterTitle = text.match(/^---[\s\S]*?\ntitle:\s*(.+?)\n[\s\S]*?\n---/);
  const heading = text.match(/^#\s+(.+)$/m);
  return (frontmatterTitle && frontmatterTitle[1].trim()) || (heading && heading[1].trim()) || path.basename(file, '.md');
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function generatedAtForPayload(file, payload, nowIso = new Date().toISOString()) {
  try {
    const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
    const { generatedAt, ...existingPayload } = existing;
    if (
      typeof generatedAt === 'string'
      && stableStringify(existingPayload) === stableStringify(payload)
    ) {
      return generatedAt;
    }
  } catch (error) {
    // Missing or invalid existing output receives a fresh build timestamp.
  }
  return nowIso;
}

function isPublicMarkdownSource(source) {
  return !(
    /(?:^|\/)[^/]*README\.md$/i.test(source)
    || /(?:^|\/)[^/]+-template\.md$/i.test(source)
    || /(?:^|\/)archive(?:\/|$)/i.test(source)
  );
}

function buildMarkdown() {
  const seenSources = new Set();
  const mathChapterHashes = new Map();
  const files = listMarkdown(contentDir)
    .map((file) => ({
      file,
      source: path.relative(root, file).replace(/\\/g, '/')
    }))
    .filter(({ source }) => isPublicMarkdownSource(source))
    .map(({ file, source }) => {
    assertSafeRelativePath(source);

    if (seenSources.has(source)) {
      throw new Error(`Duplicate Markdown source path: ${source}`);
    }
    seenSources.add(source);

    if (source.startsWith('content/math/analysis/chapter-01/')) {
      const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      const previous = mathChapterHashes.get(hash);
      if (previous) {
        throw new Error(`Byte-identical Math chapter Markdown entries: ${previous} = ${source}`);
      }
      mathChapterHashes.set(hash, source);
    }

    return {
      title: titleFromMarkdown(file),
      source,
      article: `article.html?src=${encodeURIComponent(source)}`,
      status: 'under revision'
    };
    });

  const payload = {
    contentEngine: 'markdown',
    renderer: 'marked',
    math: 'katex',
    layout: 'warm-manuscript',
    count: files.length,
    files
  };
  const output = {
    contentEngine: payload.contentEngine,
    generatedAt: generatedAtForPayload(outputFile, payload),
    renderer: payload.renderer,
    math: payload.math,
    layout: payload.layout,
    count: payload.count,
    files: payload.files
  };

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Built content/markdown-index.json with ${files.length} Markdown files.`);
}

if (require.main === module) buildMarkdown();

module.exports = {
  assertContainedRealPath,
  buildMarkdown,
  generatedAtForPayload,
  isPublicMarkdownSource,
  listMarkdown,
  stableStringify
};
