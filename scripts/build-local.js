const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredSources = [
  {
    name: 'ALEKSI_REVISION_SKILL',
    script: 'scripts/import-skill.js'
  },
  {
    name: 'ALEKSI_MATH_CHAPTER_01',
    script: 'scripts/import-math-chapter.js'
  }
];

function runNodeScript(script, args = []) {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    stdio: 'inherit'
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

const missing = requiredSources
  .filter(({ name }) => !process.env[name])
  .map(({ name }) => name);

if (missing.length) {
  console.error(
    `Missing local source environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`
  );
  console.error('See README.md#local-source-build for setup instructions.');
  process.exit(1);
}

for (const { name, script } of requiredSources) {
  runNodeScript(script, [process.env[name]]);
}

runNodeScript('scripts/build-markdown.js');
runNodeScript('scripts/build-content-manifest.js');
runNodeScript('scripts/build-content-bundle.js');
