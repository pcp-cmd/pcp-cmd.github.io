const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const generatedFiles = [
  'content/markdown-index.json',
  'content/content-bundle.js',
  'content/manifest.json'
];

function hashFile(relativePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest('hex');
}

const before = new Map(generatedFiles.map((file) => [file, hashFile(file)]));
const npmCli = process.env.npm_execpath;
if (!npmCli || !fs.existsSync(npmCli)) {
  throw new Error('npm_execpath is unavailable. Run this verifier through npm run verify:generated.');
}
const build = spawnSync(process.execPath, [npmCli, 'run', 'build'], {
  cwd: root,
  stdio: 'inherit',
  shell: false
});

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);

const changed = generatedFiles.filter((file) => before.get(file) !== hashFile(file));
if (changed.length > 0) {
  console.error(`Generated artifacts were stale and have been rebuilt: ${changed.join(', ')}`);
  console.error('Review and retain the rebuilt files, then run npm run verify again.');
  process.exit(1);
}

console.log(`Generated artifacts are current: ${generatedFiles.join(', ')}`);
