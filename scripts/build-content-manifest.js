const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content');

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
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

function buildContentManifest() {
  const chain = [
    'Raw Experience',
    'Prediction Error',
    'Personal Delta',
    'Connection',
    'Compression',
    'Skill',
    'Revision Loop'
  ].map((title, index) => ({
    title,
    order: index + 1,
    status: title === 'Prediction Error' ? 'active' : 'available'
  }));

  const manuscripts = [
    {
      title: 'Math Analysis / Chapter 01',
      room: 'Math Lab',
      status: 'under revision',
      chain: ['Prediction Error', 'Compression'],
      source: 'content/math/analysis/chapter-01/index.md'
    },
    {
      title: 'Set Axioms Learning',
      room: 'Math Lab',
      status: 'working draft',
      chain: ['Raw Experience', 'Prediction Error'],
      source: 'content/math/analysis/chapter-01/notes/01-1-set-axioms-learning.md'
    },
    {
      title: 'Revision Protocol',
      room: 'Skill Library',
      status: 'reusable artifact',
      chain: ['Compression', 'Skill'],
      source: 'content/system/revision-protocol/index.md'
    },
    {
      title: 'v1.1 markdown-first article system',
      room: 'System Log',
      status: 'under revision',
      chain: ['Skill', 'Revision Loop'],
      source: 'content/log/v1.1-markdown-first-article-system.md'
    }
  ];

  const payload = {
    site: 'Aleksi Lab',
    version: 'v1.7.2-clean-reset',
    staticUpload: true,
    localCompiler: false,
    contentEngine: 'markdown',
    article: {
      renderer: 'marked',
      math: 'katex',
      layout: 'warm-manuscript'
    },
    chain,
    manuscripts,
    systems: [],
    math: [],
    logs: []
  };

  if (exists('content/system/revision-protocol/index.md')) {
    payload.systems.push({
      title: 'Revision Protocol',
      cn: '可迭代修订协议',
      source: 'content/system/revision-protocol/index.md',
      status: 'reusable artifact',
      chain: ['Compression', 'Skill']
    });
  }

  if (exists('content/math/analysis/chapter-01/manifest.json')) {
    payload.math.push(readJson('content/math/analysis/chapter-01/manifest.json'));
  }

  const logDir = path.join(contentDir, 'log');
  if (fs.existsSync(logDir)) {
    payload.logs = fs.readdirSync(logDir)
      .filter((name) => name.endsWith('.md'))
      .sort()
      .map((name) => `content/log/${name}`);
  }

  const outputFile = path.join(contentDir, 'manifest.json');
  const manifest = {
    site: payload.site,
    version: payload.version,
    generatedAt: generatedAtForPayload(outputFile, payload),
    staticUpload: payload.staticUpload,
    localCompiler: payload.localCompiler,
    contentEngine: payload.contentEngine,
    article: payload.article,
    chain: payload.chain,
    manuscripts: payload.manuscripts,
    systems: payload.systems,
    math: payload.math,
    logs: payload.logs
  };

  fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Built content/manifest.json for v1.7.2-clean-reset.');
}

if (require.main === module) buildContentManifest();

module.exports = {
  buildContentManifest,
  generatedAtForPayload,
  stableStringify
};
