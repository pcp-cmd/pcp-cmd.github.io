#!/usr/bin/env node
'use strict';

// Prepare a public-only Pages commit. This script never pushes or checks out a
// branch, and the source commit is provenance only, never a commit parent.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const gitDir = path.join(root, '.git');
const publicRoot = path.join(root, 'dist', 'public');
const releaseRoot = path.join(root, 'qa-artifacts', 'pages-release');
const releaseRef = 'refs/heads/codex/pages-writing-20261006';
const message = 'Publish Aleksi site and 41 Writing articles';
const zeroSha = '0'.repeat(40);

function parseArguments(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i];
    if (!['--expected-main', '--source-commit'].includes(name) || values[name]) {
      throw new Error('Use --expected-main <40-hex SHA> --source-commit <40-hex SHA> exactly once each.');
    }
    if (!/^[a-f\d]{40}$/i.test(argv[i + 1] || '')) {
      throw new Error(`${name} must be a full 40-hex commit SHA.`);
    }
    values[name] = argv[i + 1].toLowerCase();
  }
  if (!values['--expected-main'] || !values['--source-commit']) {
    throw new Error('Both --expected-main and --source-commit are required.');
  }
  return { expectedMain: values['--expected-main'], sourceCommit: values['--source-commit'] };
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function blobSha(bytes) {
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

function assertDirectory(directory) {
  const info = fs.lstatSync(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(`Expected a real directory, not a symlink: ${directory}`);
  }
}

function assertPublicPath(relativePath) {
  const parts = relativePath.split('/');
  const forbiddenSegments = new Set([
    '.git', '.github', '.gitattributes', '.gitignore', '.codex', '.agents', '.aws',
    '.superpowers', 'docs', 'scripts', 'node_modules', 'qa-artifacts', 'fixtures', '__tests__'
  ]);
  if (parts.some(part => !part || part === '.' || part === '..' || forbiddenSegments.has(part.toLowerCase()))) {
    throw new Error(`Forbidden public path: ${relativePath}`);
  }
  const name = parts[parts.length - 1];
  if (/^(?:package(?:-lock)?\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|server\.(?:[cm]?js)|qa(?:[-_.].*)?|README(?:\.[^/]*)?|DESIGN-NOTES\.md|INTEGRATION\.md|verification\.json)$/i.test(name)
    || /(?:reading-sample|handoff|research-private|source-map|(?:^|\/)[^/]+-build-log\.json|(?:^|\/)[^/]+-template\.md)/i.test(relativePath)) {
    throw new Error(`Non-public material in deployment directory: ${relativePath}`);
  }
}

function snapshotPublic() {
  assertDirectory(path.dirname(publicRoot));
  assertDirectory(publicRoot);
  const files = [];
  function walk(directory, prefix = '') {
    for (const name of fs.readdirSync(directory)) {
      const relativePath = prefix ? `${prefix}/${name}` : name;
      assertPublicPath(relativePath);
      const absolutePath = path.join(directory, name);
      const info = fs.lstatSync(absolutePath);
      if (info.isSymbolicLink()) throw new Error(`Public symlinks are not permitted: ${relativePath}`);
      if (info.isDirectory()) walk(absolutePath, relativePath);
      else if (info.isFile()) {
        const bytes = fs.readFileSync(absolutePath);
        files.push({ path: relativePath, bytes: bytes.length, sha256: sha256(bytes), blobSHA: blobSha(bytes) });
      } else throw new Error(`Non-regular public file: ${relativePath}`);
    }
  }
  walk(publicRoot);
  files.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  for (const required of ['.nojekyll', 'index.html', 'writing.html', 'article.html', 'site-data.js']) {
    if (!files.some(file => file.path === required)) throw new Error(`Public directory is missing ${required}. Run and verify pack:public first.`);
  }
  return { files, hash: sha256(Buffer.from(JSON.stringify(files))) };
}

function normalGitState() {
  const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8');
  const index = path.join(gitDir, 'index');
  const branch = head.match(/^ref: (refs\/heads\/[^\r\n]+)\s*$/)?.[1] || null;
  // HEAD's ref text and the ordinary index must remain byte-identical. The
  // resolved source HEAD is checked separately with read-only Git commands.
  return { head, branch, indexHash: fs.existsSync(index) ? sha256(fs.readFileSync(index)) : null };
}

function writeJsonAtomic(file, value, suffix) {
  const temporary = `${file}.${suffix}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, file);
}

function prepare() {
  const { expectedMain, sourceCommit } = parseArguments(process.argv.slice(2));
  assertDirectory(gitDir);
  assertDirectory(path.dirname(publicRoot));
  assertDirectory(publicRoot);
  const original = normalGitState();
  if (original.branch === releaseRef) throw new Error('Run preparation from the source branch, not the Pages release branch.');

  // An index in a unique directory also isolates Git's index.lock. The normal
  // working tree and .git/index are never passed to a mutating command.
  for (const directory of [path.dirname(releaseRoot), releaseRoot]) {
    if (fs.existsSync(directory)) assertDirectory(directory);
    else fs.mkdirSync(directory);
  }
  const runDirectory = fs.mkdtempSync(path.join(releaseRoot, 'prepare-'));
  const indexFile = path.join(runDirectory, 'index');
  // Do not inherit a shell's repository/object/ref redirections. In particular,
  // GIT_COMMON_DIR would otherwise bypass the explicit .git directory below.
  const redirectedGitVariables = new Set([
    'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_NAMESPACE',
    'GIT_SHALLOW_FILE', 'GIT_REPLACE_REF_BASE', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_PARAMETERS'
  ]);
  const inheritedEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => {
    const key = name.toUpperCase();
    return !redirectedGitVariables.has(key) && !/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/.test(key);
  }));
  const env = {
    ...inheritedEnv,
    GIT_DIR: gitDir,
    GIT_WORK_TREE: publicRoot,
    GIT_INDEX_FILE: indexFile,
    GIT_ATTR_NOSYSTEM: '1',
    GIT_NO_REPLACE_OBJECTS: '1',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_TERMINAL_PROMPT: '0'
  };
  function git(args, options = {}) {
    const result = spawnSync('git', args, {
      cwd: publicRoot,
      env,
      shell: false,
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
      input: options.input
    });
    if (result.error) throw result.error;
    if (!(options.allowedStatuses || [0]).includes(result.status)) {
      const detail = (result.stderr || Buffer.alloc(0)).toString('utf8').trim()
        .replace(/(https?:\/\/)[^\s/@]+@/g, '$1[redacted]@');
      throw new Error(`git ${args.join(' ')} failed (${result.status}): ${detail}`);
    }
    return { status: result.status, text: (result.stdout || Buffer.alloc(0)).toString('utf8') };
  }
  let originalCommit;
  try {
    // First Git operation is a read of the actual remote, not a cached ref.
    const remote = git(['ls-remote', '--exit-code', 'origin', 'refs/heads/main']).text.trim();
    const remoteMatch = remote.match(/^([a-f\d]{40})\s+refs\/heads\/main$/i);
    if (!remoteMatch || remoteMatch[1].toLowerCase() !== expectedMain) {
      throw new Error(`Remote main no longer equals ${expectedMain}. Review remote changes before preparing another release.`);
    }
    const remoteCheckedAt = new Date().toISOString();
    if (git(['rev-parse', '--show-object-format']).text.trim() !== 'sha1') {
      throw new Error('This release verifier requires a SHA-1 Git repository.');
    }
    for (const sha of [expectedMain, sourceCommit]) {
      if (git(['cat-file', '-t', sha]).text.trim() !== 'commit') throw new Error(`Not a locally readable commit: ${sha}`);
    }
    originalCommit = git(['rev-parse', '--verify', 'HEAD']).text.trim();
    const before = snapshotPublic();

    git(['read-tree', '--empty']);
    git(['-c', 'core.autocrlf=false', '-c', `core.attributesFile=${process.platform === 'win32' ? 'NUL' : '/dev/null'}`, 'add', '-f', '-A']);
    const treeSHA = git(['write-tree']).text.trim();
    if (!/^[a-f\d]{40}$/.test(treeSHA)) throw new Error('Git returned an invalid tree SHA.');

    const entries = git(['ls-tree', '-r', '-z', '--full-tree', treeSHA]).text.split('\0').filter(Boolean);
    const expectedFiles = new Map(before.files.map(file => [file.path, file]));
    const seen = new Set();
    for (const entry of entries) {
      const match = entry.match(/^(100644|100755) blob ([a-f\d]{40})\t([\s\S]+)$/);
      if (!match) throw new Error(`Unexpected Git tree entry: ${entry}`);
      const [, , storedBlob, filename] = match;
      assertPublicPath(filename);
      const expectedFile = expectedFiles.get(filename);
      if (!expectedFile || seen.has(filename)) throw new Error(`Unexpected or duplicate published file: ${filename}`);
      if (storedBlob !== expectedFile.blobSHA) {
        throw new Error(`Git changed public bytes (attributes/filter/newline conversion): ${filename}`);
      }
      seen.add(filename);
    }
    if (seen.size !== expectedFiles.size) {
      throw new Error(`Git tree is missing public files: ${[...expectedFiles.keys()].filter(name => !seen.has(name)).join(', ')}`);
    }
    if (snapshotPublic().hash !== before.hash) throw new Error('dist/public changed during preparation. Re-run its verification first.');

    function inspectCommit(sha) {
      const headers = git(['cat-file', '-p', sha]).text.split('\n\n', 1)[0].split('\n');
      return {
        tree: headers.find(line => line.startsWith('tree '))?.slice(5),
        parents: headers.filter(line => line.startsWith('parent ')).map(line => line.slice(7))
      };
    }
    function assertReleaseCommit(sha) {
      const commit = inspectCommit(sha);
      if (commit.tree !== treeSHA || commit.parents.length !== 1 || commit.parents[0] !== expectedMain) {
        throw new Error(`Release branch/commit differs from the verified public tree or single expected parent. Refusing to overwrite ${releaseRef}.`);
      }
    }
    const existing = git(['show-ref', '--verify', '--quiet', releaseRef], { allowedStatuses: [0, 1] });
    const reusedBranch = existing.status === 0;
    let publishSHA;
    if (reusedBranch) {
      publishSHA = git(['rev-parse', '--verify', releaseRef]).text.trim();
      assertReleaseCommit(publishSHA);
    } else {
      publishSHA = git(['-c', 'commit.gpgsign=false', 'commit-tree', treeSHA, '-p', expectedMain, '-F', '-'], { input: `${message}\n` }).text.trim();
      if (!/^[a-f\d]{40}$/.test(publishSHA)) throw new Error('Git returned an invalid release commit SHA.');
      assertReleaseCommit(publishSHA);
      // Compare-and-create: another process cannot cause an existing branch to
      // be replaced between the existence check and this update.
      git(['update-ref', releaseRef, publishSHA, zeroSha]);
    }

    const unchanged = JSON.stringify(normalGitState()) === JSON.stringify(original)
      && git(['rev-parse', '--verify', 'HEAD']).text.trim() === originalCommit;
    if (!unchanged) throw new Error('The ordinary Git index/HEAD/source branch changed during preparation.');
    const preparedFile = path.join(runDirectory, 'prepared.json');
    const record = {
      preparedAt: new Date().toISOString(),
      sourceSHA: sourceCommit,
      treeSHA,
      publishSHA,
      parent: expectedMain,
      fileCount: before.files.length,
      publicSnapshotHash: before.hash,
      publicSnapshotHashAlgorithm: 'SHA-256 of UTF-8 JSON files array (path, bytes, sha256, blobSHA), sorted by UTF-8 path bytes',
      publicDirectory: publicRoot,
      isolatedIndex: indexFile,
      localBranch: releaseRef.slice('refs/heads/'.length),
      reusedBranch,
      remote: { name: 'origin', ref: 'refs/heads/main', observedSHA: expectedMain, checkedAt: remoteCheckedAt },
      verification: {
        remoteMainMatched: true,
        expectedParentReadableLocally: true,
        sourceCommitReadableLocally: true,
        forbiddenPathsAbsent: true,
        treePathsMatchPublic: true,
        everyRawBlobSHA1Matched: true,
        publicSnapshotUnchanged: true,
        singleParentIsExpectedMain: true,
        ordinaryIndexHeadAndBranchUnchanged: true
      },
      files: before.files,
      preparedFile,
      pushed: false
    };
    writeJsonAtomic(preparedFile, record, 'record');
    writeJsonAtomic(path.join(releaseRoot, 'prepared.json'), record, path.basename(runDirectory));
    console.log(JSON.stringify({ preparedFile, latestRecord: path.join(releaseRoot, 'prepared.json'), publishSHA, treeSHA, parent: expectedMain, fileCount: before.files.length, reusedBranch, pushed: false }, null, 2));
  } finally {
    if (JSON.stringify(normalGitState()) !== JSON.stringify(original)
      || (originalCommit && git(['rev-parse', '--verify', 'HEAD']).text.trim() !== originalCommit)) {
      throw new Error('The ordinary Git index/HEAD/source branch changed during preparation; no checkout, reset, or normal-index write was requested by this script.');
    }
  }
}

try { prepare(); }
catch (error) {
  console.error(`Pages release preparation failed: ${error.message}`);
  process.exitCode = 1;
}
