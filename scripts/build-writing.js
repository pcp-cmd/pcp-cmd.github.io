const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const state = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'site-data.js'), 'utf8'), state, { filename: 'site-data.js' });
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const articles = state.window.ALEKSI_SITE.writing.filter(entry => entry.approved === true);
const sources = new Set();
for (const entry of articles) {
  if (!/^content\/[\w\u0080-\uFFFF/.-]+\.md$/.test(entry.source)
    || entry.source.split('/').some(part => part === '.' || part === '..')
    || sources.has(entry.source) || !fs.existsSync(path.join(root, entry.source))) {
    throw new Error(`Invalid or duplicate Writing source: ${entry.source}`);
  }
  sources.add(entry.source);
}
// A real HTML list keeps links available before JavaScript or animation loads.
// site-data.js remains the single source for metadata and filter behavior.
const entries = articles.map(entry => `        <article class="writing-entry"><p class="writing-entry-meta">${entry.type === 'note' ? '短记' : '长文'} · ${escape(entry.date || '日期待提供')}</p><h2><a href="./article.html?src=${encodeURIComponent(entry.source)}">${escape(entry.title)}</a></h2><p>${escape(entry.description)}</p></article>`).join('\n');
const file = path.join(root, 'writing.html');
const html = fs.readFileSync(file, 'utf8');
const region = /<!-- writing:list:start -->[\s\S]*?<!-- writing:list:end -->/;
if (!region.test(html)) throw new Error('Writing list build markers are missing.');
fs.writeFileSync(file, html.replace(region, `<!-- writing:list:start -->\n${entries || '        <p class="reading-muted">文章待添加。</p>'}\n        <!-- writing:list:end -->`), 'utf8');
console.log(`Built Writing HTML list with ${articles.length} articles.`);
