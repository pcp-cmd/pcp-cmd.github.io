const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function readConfigSource() {
  for (const name of ['site.local.config.json', 'site.config.json']) {
    const configPath = path.join(root, name);
    if (!fs.existsSync(configPath)) continue;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const source = config.sources && config.sources.mathAnalysisChapter01;
    if (source && !source.startsWith('[')) return source;
  }
  return null;
}

const sourceDir = process.argv[2] || process.env.ALEKSI_MATH_CHAPTER_01 || readConfigSource();

if (!sourceDir) {
  console.error('Usage: node scripts/import-math-chapter.js <chapter-01-directory>');
  process.exit(1);
}

if (!fs.existsSync(sourceDir)) {
  console.error(`Missing chapter directory: ${sourceDir}`);
  process.exit(1);
}

const outputDir = path.join(root, 'content', 'math', 'analysis', 'chapter-01');
const notesDir = path.join(outputDir, 'notes');
const webLatexDir = path.join(outputDir, 'web-latex');
const cardsDir = path.join(outputDir, 'cards');
const pdfDir = path.join(outputDir, 'pdf');

for (const dir of [outputDir, notesDir, webLatexDir, cardsDir, pdfDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

function listMarkdown(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listMarkdown(fullPath);
    return entry.name.toLowerCase().endsWith('.md') ? [fullPath] : [];
  });
}

function copyMarkdown(files, targetDir, prefix = '') {
  return files.map((file) => {
    const safeName = `${prefix}${path.basename(file)}`;
    const target = path.join(targetDir, safeName);
    fs.copyFileSync(file, target);
    const text = fs.readFileSync(file, 'utf8');
    const heading = text.match(/^#\s+(.+)$/m)?.[1] || path.basename(file, '.md');
    return {
      title: heading,
      file: path.relative(outputDir, target).replace(/\\/g, '/'),
      bytes: Buffer.byteLength(text, 'utf8')
    };
  });
}

const rootMarkdown = fs.readdirSync(sourceDir)
  .filter((name) => name.toLowerCase().endsWith('.md'))
  .map((name) => path.join(sourceDir, name));
const obsidianDir = path.join(sourceDir, 'obsidian-latex');
const obsidianMarkdown = fs.existsSync(obsidianDir) ? listMarkdown(obsidianDir) : [];

const notes = copyMarkdown(rootMarkdown, notesDir);
const webLatex = copyMarkdown(obsidianMarkdown, webLatexDir, 'web-');
const cardFiles = rootMarkdown
  .concat(obsidianMarkdown)
  .filter((file) => /card|cards|复习卡片|测试/i.test(path.basename(file)));
const cards = copyMarkdown(cardFiles, cardsDir, 'card-');

const manifest = {
  title: 'Math Analysis / Chapter 01',
  cn: '数学分析第一章',
  status: 'revision',
  sourceType: 'local math analysis learning system',
  sourcePathRedacted: true,
  generatedAt: new Date().toISOString(),
  siteMode: 'static upload',
  localCompiler: false,
  webMath: true,
  outputs: {
    index: 'content/math/analysis/chapter-01/index.md',
    manifest: 'content/math/analysis/chapter-01/manifest.json',
    pdf: null
  },
  assetTypes: [
    'Definition Card',
    'Example / Counterexample',
    'Proof Deconstruction',
    'Prediction Error',
    'Toolbox Card',
    'Revision Log'
  ],
  notes,
  webLatex,
  cards
};

const index = `# Math Analysis / Chapter 01

Status: revision

Chapter 01 is being converted from raw set-theory learning notes into reusable mathematical assets.

## Current Focus

- definitions
- examples and counterexamples
- proof deconstruction
- common misunderstandings
- toolbox cards
- revision records
- web-readable math notation

## Asset Pipeline

\`\`\`text
raw notes -> structure -> web math notes -> website display -> toolbox compression -> revision log
\`\`\`

## Asset Types

- Definition Card
- Example / Counterexample
- Proof Deconstruction
- Prediction Error
- Toolbox Card
- Revision Log

## Imported Notes

${notes.map((item) => `- [${item.title}](./${item.file})`).join('\n')}

## Web Math Notes

${webLatex.map((item) => `- [${item.title}](./${item.file})`).join('\n')}

## Cards

${cards.map((item) => `- [${item.title}](./${item.file})`).join('\n')}
`;

const buildLog = {
  status: 'skipped',
  reason: 'Static website mode. No local TeX compiler is required or invoked.',
  generatedAt: new Date().toISOString(),
  pdf: null
};

fs.writeFileSync(path.join(outputDir, 'index.md'), index, 'utf8');
fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
fs.writeFileSync(path.join(outputDir, 'math-build-log.json'), JSON.stringify(buildLog, null, 2), 'utf8');

console.log('Imported Math Analysis Chapter 01 content.');
