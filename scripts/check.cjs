'use strict';
const {spawnSync} = require('node:child_process');
const {readFileSync} = require('node:fs');
const files = ['model.js','art.js','lore.js','ambience.js','app.js','scripts/serve.cjs','tests/model.test.cjs','tests/model.property.test.cjs','tests/browser.cjs','scripts/verify-report.cjs'];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {encoding:'utf8'});
  if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
}
const html = readFileSync('index.html','utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML id.');
for (const file of ['model.js','art.js','lore.js','ambience.js','app.js','style.css']) {
  if (!html.includes(`"${file}"`) && !html.includes(`"${file}?v=`)) throw new Error(`Missing asset ${file}.`);
}
console.log(`Syntax passed for ${files.length} JavaScript files; HTML ids and asset references passed.`);
