const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function readConfigSource() {
  for (const name of ['site.local.config.json', 'site.config.json']) {
    const configPath = path.join(root, name);
    if (!fs.existsSync(configPath)) continue;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const source = config.sources && config.sources.revisionSkill;
    if (source && !source.startsWith('[')) return source;
  }
  return null;
}

const sourceDir = process.argv[2] || process.env.ALEKSI_REVISION_SKILL || readConfigSource();

if (!sourceDir) {
  console.error('Usage: node scripts/import-skill.js <local-skill-directory>');
  process.exit(1);
}

const sourceFile = path.join(sourceDir, 'SKILL.md');
if (!fs.existsSync(sourceFile)) {
  console.error(`Missing SKILL.md at ${sourceFile}`);
  process.exit(1);
}

const raw = fs.readFileSync(sourceFile, 'utf8');
const outputDir = path.join(root, 'content', 'system', 'revision-protocol');
const designSystemDir = path.join(root, 'design-system');
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(designSystemDir, { recursive: true });

function section(title) {
  const match = raw.match(new RegExp(`## ${title}[\\s\\S]*?(?=\\n## |$)`));
  return match ? match[0].replace(`## ${title}`, '').trim() : '';
}

const protocol = `# Revision Protocol / 可迭代修订协议

Aleksi Lab uses this protocol to turn learning, design, writing, AI coworking, and math training into reusable knowledge artifacts.

This page is generated from a local Codex learning skill, but the public site uses the calmer name **Revision Protocol** rather than the internal folder name.

## Core Rule

Do not judge identity or talent. Diagnose the system that produced the block.

Every difficult moment is routed through:

\`\`\`text
input quality x schema structure x training density x feedback speed x time accumulation x transfer ability x tool system
\`\`\`

The output is never pure encouragement. It must produce a next action, a real training output, and an asset that can be reused.

## Seven-Link Diagnosis

- Input: are the materials systematic and paired with examples and exercises?
- Schema: does the learner know the problem type, first step, search path, and common patterns?
- Training: has the learner produced enough independent output under realistic constraints?
- Feedback: has any answer key, teacher, peer, AI check, or rubric corrected the output?
- Time: is the learner expecting a skill to form faster than the training cycle allows?
- Transfer: can the learner apply the idea to variants or adjacent topics?
- Tool System: are notes, templates, wrong-answer reviews, prompts, and review rules in place?

## Math Flywheel

For math learning, one cycle should produce:

\`\`\`text
1 definition -> 1 example -> 1 counterexample or boundary case -> 1 proof attempt -> 1 check -> 1 card
\`\`\`

## Asset Levels

- Inbox: raw record, allowed to be messy.
- Candidate: possible asset extracted from a note, mistake, proof attempt, or synthesis.
- Reference: human-approved asset with source evidence and future value.
- Core: repeatedly reused and strengthened tool.

## Website Use

The protocol informs:

- Cognitive Revision Chain nodes.
- Skill Library protocol assets.
- Math Lab card types.
- Workbench status language.
- Revision Log decisions.

## Source Notes Extracted

### Response Protocol

${section('Response Protocol')}

### Block Types

${section('Block Types')}
`;

const designSystemProtocol = `# Revision Protocol Design Note

The public site should call the system **Revision Protocol**, **Cognitive Revision System**, or **Unfinished Manuscript System**.

Avoid exposing internal skill folder names in public UI. The protocol should feel like an editorial research method, not a slogan.

## Voice Rules

- Prefer diagnosis over encouragement.
- Prefer reusable assets over one-time notes.
- Prefer small training outputs over vague plans.
- Always ask: source material, personal delta, compressed asset, next revision.

## UI Surfaces

- Chain nodes describe the revision path.
- Skill Library stores protocols, workflows, prompts, checklists, and revision rules.
- Math Lab applies the protocol to definitions, examples, counterexamples, proofs, and tool cards.
`;

const sourceMap = {
  publicName: 'Revision Protocol',
  sourceType: 'local Codex learning skill',
  sourcePathRedacted: true,
  generatedAt: new Date().toISOString(),
  outputs: [
    'content/system/revision-protocol/index.md',
    'design-system/revision-protocol.md'
  ],
  publicNaming: [
    'Revision Protocol',
    'Cognitive Revision System',
    'Unfinished Manuscript System',
    '可迭代修订协议'
  ]
};

fs.writeFileSync(path.join(outputDir, 'index.md'), protocol, 'utf8');
fs.writeFileSync(path.join(outputDir, 'source-map.json'), JSON.stringify(sourceMap, null, 2), 'utf8');
fs.writeFileSync(path.join(designSystemDir, 'revision-protocol.md'), designSystemProtocol, 'utf8');

console.log('Imported Revision Protocol content.');
