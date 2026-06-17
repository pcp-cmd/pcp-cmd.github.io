const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content');
const outputFile = path.join(contentDir, 'markdown-index.json');

function listMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listMarkdown(fullPath);
    return entry.name.toLowerCase().endsWith('.md') ? [fullPath] : [];
  });
}

function titleFromMarkdown(file) {
  const text = fs.readFileSync(file, 'utf8');
  const frontmatterTitle = text.match(/^---[\s\S]*?\ntitle:\s*(.+?)\n[\s\S]*?\n---/);
  const heading = text.match(/^#\s+(.+)$/m);
  return (frontmatterTitle && frontmatterTitle[1].trim()) || (heading && heading[1].trim()) || path.basename(file, '.md');
}

const files = listMarkdown(contentDir).map((file) => ({
  title: titleFromMarkdown(file),
  source: path.relative(root, file).replace(/\\/g, '/'),
  article: `article.html?src=${encodeURIComponent(path.relative(root, file).replace(/\\/g, '/'))}`,
  status: 'under revision'
}));

fs.writeFileSync(outputFile, JSON.stringify({
  contentEngine: 'markdown',
  generatedAt: new Date().toISOString(),
  renderer: 'marked',
  math: 'katex',
  layout: 'warm-manuscript',
  count: files.length,
  files
}, null, 2), 'utf8');

console.log(`Built content/markdown-index.json with ${files.length} Markdown files.`);
