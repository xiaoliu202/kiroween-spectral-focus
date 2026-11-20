'use strict';
/* Runs the full verification and writes evidence/verification.txt with local paths removed. */
const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const steps = [
  ['Syntax, HTML ids and asset references', ['scripts/check.cjs']],
  ['Model example and property-based tests', ['--test', '--test-reporter=spec', 'tests/model.test.cjs', 'tests/model.property.test.cjs']],
  ['Real-browser checks', ['tests/browser.cjs']]
];

// Replace anything that could identify the machine or its user.
const secrets = [root, os.homedir(), path.dirname(process.execPath), os.userInfo().username, os.hostname()]
  .filter(value => value && value.length > 2)
  .sort((a, b) => b.length - a.length);
function scrub(text) {
  let out = text;
  for (const value of secrets) {
    for (const variant of new Set([value, value.replace(/\\/g, '/'), value.replace(/\\/g, '\\\\')])) {
      out = out.split(variant).join(value === root ? '<project>' : '<local>');
    }
  }
  return out.replace(/\r\n/g, '\n');
}

let report = `Spectral Focus verification\nDate: ${new Date().toISOString()}\nNode: ${process.version}\nPlatform: ${process.platform}\n`;
let failed = false;
for (const [title, args] of steps) {
  const result = spawnSync(process.execPath, args, {cwd: root, encoding: 'utf8', env: {...process.env, FORCE_COLOR: '0'}});
  const output = scrub(`${result.stdout || ''}${result.stderr || ''}`).trim();
  report += `\n== ${title} (exit ${result.status}) ==\n${output}\n`;
  process.stdout.write(`${title}: exit ${result.status}\n`);
  if (result.status !== 0) { failed = true; break; }
}
report += `\nResult: ${failed ? 'FAILED' : 'PASSED'}\n`;
fs.writeFileSync(path.join(root, 'evidence', 'verification.txt'), report, 'utf8');
process.exit(failed ? 1 : 0);
