'use strict';
/* Real Chromium UI tests. All data lives in disposable browser contexts. */
const {chromium} = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createServer} = require('../scripts/serve.cjs');
const M = require('../model.js');
const evidence = path.resolve(__dirname, '..', 'evidence');
fs.mkdirSync(evidence, {recursive:true});
const report = {startedAt:new Date().toISOString(), engine:'Chrome via Playwright', clock:'Controlled clock; no full-length wall-clock endurance claim.', checks:[], screenshots:[], errors:[]};
const fixed = new Date('2026-11-17T20:00:00+08:00');
let browser, server, base, page;
const contexts = [];
async function check(name, fn) {
  console.log('RUN ', name);
  await fn(); report.checks.push({name,status:'passed'}); console.log('PASS', name);
}
async function makePage(seed, options = {}) {
  const context = await browser.newContext({viewport:{width:1280,height:900},timezoneId:'Asia/Shanghai', ...options});
  contexts.push(context);
  if (seed) await context.addInitScript(({key,value}) => {
    if (!sessionStorage.getItem('fixture-seeded')) {
      localStorage.setItem(key,value); sessionStorage.setItem('fixture-seeded','yes');
    }
  }, seed);
  const p = await context.newPage();
  p.on('pageerror', error => report.errors.push(error.message));
  p.on('console', msg => { if (msg.type() === 'error') report.errors.push(msg.text()); });
  await p.clock.install({time:fixed});
  await p.clock.pauseAt(fixed);
  await p.goto(base);
  await p.locator('#town-title').waitFor();
  assert.equal(await p.locator('.lore-card').count(),6, 'Application initialized');
  return p;
}
async function driftGhosts(p = page) { return p.locator('.drift-ghost:not(.is-settled)').count(); }
async function expectedDrift(p = page) { const s = await state(p); const open = s ? s.tasks.filter(t => !t.done).length : 0; return s && s.tasks.length ? Math.min(open, 4) : 2; }async function state(p = page) { return p.evaluate(key => JSON.parse(localStorage.getItem(key)), M.KEY); }
async function nav(view, p = page) { await p.locator(`[data-nav="${view}"]`).click(); assert.equal(await p.locator(`#view-${view}`).isVisible(),true); }
async function addTask(title, note = '', priority = 'normal', p = page) {
  await nav('tasks',p); await p.locator('#new-task').click();
  await p.locator('#task-title').fill(title); await p.locator('#task-note').fill(note);
  await p.locator('#task-priority').selectOption(priority); await p.locator('#save-task').click();
  assert.equal(await p.locator('#task-dialog').isVisible(),false);
}
async function screenshot(p, name) {
  await p.screenshot({path:path.join(evidence,name),fullPage:true,animations:'disabled'});
  report.screenshots.push(name);
}
async function axe(p, name) {
  let watchdog;
  const result = await Promise.race([
    new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(),
    new Promise((_,reject) => { watchdog = setTimeout(() => reject(new Error(`Accessibility scan timed out: ${name}`)),20000); })
  ]).finally(() => clearTimeout(watchdog));
  const violations = result.violations.map(v => ({id:v.id,impact:v.impact,nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary}))}));
  assert.deepEqual(violations,[], `${name} accessibility violations: ${JSON.stringify(violations)}`);
}
(async () => {
  server = createServer(); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.env.SPECTRAL_BROWSER_PATH ? {executablePath:process.env.SPECTRAL_BROWSER_PATH,headless:true} : {channel:process.env.SPECTRAL_BROWSER_CHANNEL || 'chrome',headless:true});
  report.browserVersion=browser.version();
  page = await makePage();
  await check('Four populated views, named scene destinations, no remote runtime requests', async () => {
    const external = []; page.on('request', request => { if (!request.url().startsWith(base)) external.push(request.url()); });
    for (const view of ['tasks','focus','cabinet','town']) await nav(view);
    assert.equal(await page.locator('.town-art').count(),1);
    assert.equal(await page.locator('.place').count(),3);
    for (const view of ['tasks','focus','cabinet']) { await page.locator(`.place-${view === 'tasks' ? 'tasks' : view === 'focus' ? 'focus' : 'cabinet'}`).click(); assert(await page.locator(`#view-${view}`).isVisible()); await nav('town'); }
    assert.deepEqual(external,[]);
    const drift = page.locator('.night-drift');
    assert.equal(await drift.getAttribute('aria-hidden'),'true');
    assert.equal(await drift.evaluate(el => getComputedStyle(el).pointerEvents),'none');
    assert.equal(await page.locator('.drift-ghost').count(),4); assert.equal(await page.locator('.drift-lantern .lantern-art').count(),2); assert.equal(await page.locator('.drift-bat .bat-art').count(),2);
    assert.equal(await page.locator('.drift-g1').evaluate(el => getComputedStyle(el).animationName),'drift-across');
    assert.equal(await page.locator('.bat-one').evaluate(el => getComputedStyle(el).animationName),'bat-glide');
    assert.equal(await page.locator('.chimney-smoke circle').first().evaluate(el => getComputedStyle(el).animationName),'chimney-puff');
    assert.equal(await driftGhosts(),2, 'An empty board has two friendly visitors');
    const behind = await page.evaluate(() => { const r = document.querySelector('.town-heading .button.primary').getBoundingClientRect(); return document.elementFromPoint(r.left + r.width/2, r.top + r.height/2).closest('.night-drift') === null; });
    assert(behind, 'Drift layer never sits on top of controls');
  });
  await check('Task editor, whitespace validation, editing, notes, priority and safe literal text', async () => {
    await nav('tasks'); await page.locator('#new-task').click();
    await page.locator('#task-title').fill('   '); await page.locator('#save-task').click();
    assert(await page.locator('#task-dialog').isVisible()); assert.equal(await page.locator('.task-card').count(),0);
    await page.locator('#task-title').fill('Write the Halloween chapter');
    await page.locator('#task-note').fill('Begin with the lantern story.');
    await page.locator('#task-priority').selectOption('high'); await page.locator('#save-task').click();
    await page.locator('[data-action="edit"]').click();
    await page.locator('#task-title').fill('Finish the Halloween chapter');
    await page.locator('#task-note').fill('Start small. Check the cultural sources.'); await page.locator('#save-task').click();
    const first = (await state()).tasks[0];
    assert.equal(first.text,'Finish the Halloween chapter'); assert.equal(first.priority,'high'); assert(first.note.includes('cultural'));
    await addTask('<img src=x onerror=alert(1)>', 'Literal <b>text</b>', 'low');
    assert.equal(await page.locator('.task-card img').count(),0);
    assert((await page.locator('.task-list').innerText()).includes('<img src=x onerror=alert(1)>'));
    await page.locator('#task-search').fill('chapter'); assert.equal(await page.locator('.task-card').count(),1);
    await page.locator('#task-search').fill(''); assert.equal(await page.locator('.task-card').count(),2);
  });
  await check('Associated 25-minute candle, pause/resume, navigation, refresh and exactly one completion', async () => {
    await page.locator('.task-card [data-focus-task]').first().click();
    assert(await page.locator('#view-focus').isVisible()); assert((await page.locator('#focus-note').textContent()).includes('cultural'));
    await page.locator('#timer-start').click(); const deadline = (await state()).timer.end;
    await page.clock.fastForward(5*60*1000);
    assert.equal(await page.locator('#clock').textContent(),'20:00');
    const wax = await page.locator('.candle-wrap').evaluate(el => parseFloat(el.style.getPropertyValue('--wax-height')));
    assert(wax<145 && wax>100);
    await page.locator('#timer-start').click(); const paused = await page.locator('#clock').textContent();
    await page.clock.fastForward(60*60*1000); assert.equal(await page.locator('#clock').textContent(),paused);
    assert.equal((await state()).sessions.length,0);
    await page.locator('#timer-start').click(); const resumedDeadline = (await state()).timer.end; assert(resumedDeadline>deadline);
    await nav('town'); assert(await page.locator('body').evaluate(el => el.classList.contains('is-focusing')));
    await nav('cabinet'); assert.equal((await state()).timer.end,resumedDeadline);
    await page.reload(); assert.equal((await state()).timer.end,resumedDeadline);
    await nav('focus'); await page.clock.fastForward(20*60*1000+1000);
    assert.equal(await page.locator('#clock').textContent(),'00:00');
    assert(await page.locator('#session-complete').isVisible());
    assert(await page.locator('.candle-wrap').evaluate(el => el.classList.contains('is-snuffed')), 'Finished candle shows smoke');
    assert.equal(await page.locator('.smoke').evaluate(el => { el.style.transition = 'none'; const value = getComputedStyle(el).opacity; el.style.transition = ''; return value; }),'1');
    assert(await page.locator('.smoke').evaluate(el => !!el.closest('[aria-hidden="true"]')), 'Smoke is decorative');
    await screenshot(page,'focus-complete-1280.png');
    assert.equal((await state()).sessions.length,1); assert.equal((await state()).tasks[0].done,false);
    await page.reload(); assert.equal((await state()).sessions.length,1);
    assert.equal(await page.locator('#stat-today').textContent(),'1'); assert.equal(await page.locator('#stat-minutes').textContent(),'25');
    assert.equal(await page.locator('#town-title').evaluate(() => getComputedStyle(document.querySelector('.flame')).opacity),'0');
  });
  await check('Task completion fades ghost; reopen/recomplete cannot farm candy; filters work', async () => {
    await nav('tasks'); const driftBefore = await driftGhosts(); assert.equal(driftBefore, await expectedDrift());
    await page.locator('.task-check').first().check();
    assert.equal(await driftGhosts(), await expectedDrift(), 'A drifting ghost settles with its task'); assert(await driftGhosts() <= driftBefore);
    const first = page.locator('.task-card').first();
    assert(await first.evaluate(el => el.classList.contains('just-settled')), 'First completion highlights the card');
    assert.equal(await first.locator('.settle-wisp').count(),1); assert.equal(await first.locator('.settle-treat').textContent(),'+10');
    assert.equal(await first.locator('.settle-treat').getAttribute('aria-hidden'),'true');
    assert.equal(await first.locator('.settle-wisp').evaluate(el => getComputedStyle(el).animationName),'ghost-release');
    await page.clock.runFor(2500); assert.equal(await first.locator('.settle-wisp, .settle-treat').count(),0, 'Decorations clean up');
    await page.waitForTimeout(950);
    const opacity = await page.locator('.task-ghost .ghost-art').first().evaluate(el => getComputedStyle(el).opacity);
    assert(Number(opacity)<.2); assert.equal((await state()).balance,10);
    await page.locator('.task-check').first().uncheck(); await page.locator('.task-check').first().check(); assert.equal((await state()).balance,10);
    assert.equal(await first.locator('.settle-wisp').count(),0, 'Repeat completion has no reward moment');
    await page.locator('[data-filter="done"]').click(); assert.equal(await page.locator('.task-card').count(),1);
    await page.locator('[data-filter="active"]').click(); assert.equal(await page.locator('.task-card').count(),1);
    await page.locator('[data-filter="all"]').click();
  });
  await check('Buy/equip turnip, reject unaffordable skins, open earned stories and retain on refresh', async () => {
    await nav('cabinet'); assert(await page.locator('[data-skin="violet"]').isDisabled());
    await page.locator('[data-skin="turnip"]').click(); assert.equal((await state()).balance,0); assert.equal((await state()).lantern,'turnip');
    assert(await page.locator('[data-skin="turnip"]').isDisabled());
    await page.locator('[data-lore-card="samhain"] [data-read]').click();
    assert((await page.locator('#lore-dialog-body').textContent()).includes('disputed'));
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#lore-dialog').isVisible(),false);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.read),'samhain');
    assert.equal(await page.locator('[data-lore-card="hallows"] .lore-read').isEnabled(),true);
    await page.reload(); assert.equal((await state()).lantern,'turnip'); assert.equal((await state()).balance,0);
    await nav('town'); assert.equal(await page.locator('#town-lantern').getAttribute('data-lantern'),'turnip');
    assert(await page.locator('body').evaluate(el => el.classList.contains('has-settled')));
  });
  await check('Duration/reset confirmations cancel safely; 15-minute focus and five-minute rest have distinct statistics', async () => {
    await nav('focus'); await page.locator('[data-minutes="45"]').click(); assert.equal(await page.locator('#clock').textContent(),'45:00');
    await page.locator('#timer-start').click(); await page.clock.fastForward(10000);
    await page.locator('[data-minutes="15"]').click(); assert(await page.locator('#confirm-dialog').isVisible());
    await page.keyboard.press('Escape'); assert.equal((await state()).timer.minutes,45); assert((await state()).timer.end);
    await page.locator('#timer-reset').click(); await page.locator('#confirm-cancel').click(); assert((await state()).timer.end);
    await page.locator('#timer-reset').click(); await page.locator('#confirm-accept').click();
    await page.waitForFunction(({key, remaining}) => {
      const stored = JSON.parse(localStorage.getItem(key));
      return stored?.timer?.remaining === remaining && stored.timer.end === null && stored.timer.id === null && stored.sessions.length === 1;
    }, {key:M.KEY, remaining:45*60});
    assert.equal(await page.locator('#clock').textContent(),'45:00');
    assert.equal((await state()).sessions.length,1);
    await page.locator('[data-minutes="15"]').click(); await page.locator('#timer-start').click();
    await page.locator('[data-mode="break"]').click(); await page.locator('#confirm-cancel').click(); assert.equal((await state()).timer.mode,'focus');
    await page.clock.fastForward(15*60*1000+1000); assert.equal((await state()).sessions.length,2);
    await page.locator('[data-mode="break"]').click(); assert.equal(await page.locator('#clock').textContent(),'05:00');
    await page.locator('#timer-start').click(); await page.clock.fastForward(5*60*1000+1000);
    assert.equal((await state()).sessions.length,2); assert.equal(await page.locator('#stat-minutes').textContent(),'40');
    assert((await page.locator('#completion-description').textContent()).includes('Breaks'));
  });
  await check('All six culture milestones, full source metadata, virtual-candy disclaimer and second skin purchase', async () => {
    for (let i=1;i<=4;i++) {
      await addTask(`Small step ${i}`,`A thoughtful note ${i}.`);
      await page.locator('.task-check').last().check();
    }
    assert.equal((await state()).balance,40);
    await nav('cabinet'); assert.equal(await page.locator('.lore-card.unlocked').count(),6);
    assert.equal(await page.locator('.lore-source a').count(),7);
    for (const id of ['lanterns','samhain','hallows','guising','ghosts','harvest']) {
      const card=page.locator(`[data-lore-card="${id}"]`);
      assert((await card.locator('.lore-region').textContent()).length>4);
      assert((await card.locator('.lore-requirement').textContent()).length>5);
      const source = card.locator('.lore-source a').first(); assert((await source.getAttribute('href')).startsWith('https://'));
      await card.locator('[data-read]').click(); assert(await page.locator('#lore-dialog').isVisible());
      assert((await page.locator('#lore-dialog-body').textContent()).length>200); await page.keyboard.press('Escape');
    }
    assert((await page.locator('.reward-disclaimer').textContent()).includes('not Kiro credit'));
    await page.locator('[data-skin="violet"]').click(); assert.equal((await state()).balance,20); assert.equal((await state()).lantern,'violet');
    assert(await page.locator('[data-skin="ember"]').isDisabled());
    const selected=(await state()).owned.length;
    await page.locator('[data-skin="harvest"]').click(); await page.locator('[data-skin="turnip"]').click();
    assert.equal((await state()).balance,20); assert.equal((await state()).owned.length,selected);
    await page.reload(); assert.equal(await page.locator('.lore-card.unlocked').count(),6);
  });
  await check('Delete/clear preserve earned progress, current links and seven local-day statistics', async () => {
    await nav('tasks'); await page.locator('[data-action="delete"]').first().click();
    await page.locator('#confirm-cancel').click(); assert.equal((await state()).tasks.length,6);
    await page.locator('[data-action="delete"]').first().click(); await page.locator('#confirm-accept').click();
    await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).tasks.length===5,M.KEY);
    assert.equal((await state()).tasks.length,5); assert.equal((await state()).rewardedTaskIds.length,5);
    await page.locator('#clear-completed').click(); await page.locator('#confirm-accept').click();
    await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).tasks.length===1,M.KEY);
    assert.equal((await state()).tasks.length,1); assert.equal((await state()).balance,20);
    assert.equal((await state()).rewardedTaskIds.length,5); assert.equal((await state()).sessions.length,2);
    await nav('town'); assert.equal(await page.locator('#stat-today').textContent(),'2'); assert.equal(await page.locator('#stat-minutes').textContent(),'40');
    assert.equal(await page.locator('#week-chart table tr').count(),8);
    const days = await page.locator('#week-chart table tr').allTextContents(); assert(days.at(-1).includes('40'));
  });
  await check('Synthesized wind requires a click, supports volume/off, and reloads silently', async () => {
    await nav('focus'); assert.equal(await page.evaluate(() => window.SpectralAudio.contextState),'not-created');
    await page.locator('#audio-toggle').click(); await page.waitForFunction(() => window.SpectralAudio.isPlaying);
    assert.equal(await page.evaluate(() => window.SpectralAudio.contextState),'running');
    await page.locator('#audio-volume').fill('15'); await page.locator('#audio-volume').dispatchEvent('input');
    assert.equal((await state()).settings.volume,.15);
    await page.locator('#audio-toggle').click(); assert.equal(await page.evaluate(() => window.SpectralAudio.contextState),'suspended');
    await page.locator('#audio-toggle').click(); await page.waitForFunction(() => window.SpectralAudio.isPlaying);
    await page.reload(); assert.equal(await page.evaluate(() => window.SpectralAudio.isPlaying),false); assert.equal(await page.locator('#audio-volume').inputValue(),'15');
  });
  await check('Keyboard dialog focus containment, Escape restoration, custom and system reduced motion', async () => {
    await nav('tasks'); await page.locator('#new-task').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id),'task-title');
    for(const key of ['Tab','Shift+Tab']) for(let i=0;i<12;i++) { await page.keyboard.press(key); assert(await page.evaluate(() => document.querySelector('#task-dialog').contains(document.activeElement))); }
    await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => document.activeElement.id),'new-task');
    await page.locator('#reduce-motion').check(); await nav('town');
    assert.equal(await page.locator('.town-spirit').evaluate(el => getComputedStyle(el).animationName),'none');
    assert.equal(await page.locator('.night-drift').evaluate(el => getComputedStyle(el).display),'none', 'App setting removes the drift layer');
    assert.equal(await page.locator('.bat-one').evaluate(el => getComputedStyle(el).animationName),'none');
    await page.reload(); assert(await page.locator('#reduce-motion').isChecked());
    await page.locator('#reduce-motion').uncheck(); await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.town-spirit').evaluate(el => getComputedStyle(el).animationName),'none');
    assert.equal(await page.locator('.smoke span').first().evaluate(el => getComputedStyle(el).animationName),'none');
    assert.equal(await page.locator('.night-drift').evaluate(el => getComputedStyle(el).display),'none', 'System setting removes the drift layer');
    assert.equal(await page.locator('.town-wanderer').evaluate(el => getComputedStyle(el).animationName),'none');
    const calm = await makePage(); await calm.emulateMedia({reducedMotion:'reduce'});
    await addTask('A quiet completion','', 'normal', calm); await calm.locator('.task-check').first().check();
    assert.equal(await calm.locator('.settle-wisp, .settle-treat').count(),0, 'No release animation under reduced motion');
    assert.equal((await state(calm)).balance,10);
    await nav('focus'); await page.locator('[data-mode="focus"]').click(); await page.locator('#timer-start').click();
    await page.clock.fastForward(1000); assert((await page.locator('#clock').textContent())<'25:00');
    await page.locator('#timer-start').click();
  });
  await check('Axe WCAG A/AA checks across all views and three keyboard-safe dialogs', async () => {
    await page.clock.resume();
    for(const view of ['town','tasks','focus','cabinet']) { await nav(view); await axe(page,view); }
    await nav('tasks'); await page.locator('#new-task').click(); await axe(page,'task dialog'); await page.keyboard.press('Escape');
    await nav('focus'); await page.locator('#timer-reset').click(); await axe(page,'confirmation dialog');
    for(const key of ['Tab','Shift+Tab']) for(let i=0;i<5;i++) { await page.keyboard.press(key); assert(await page.evaluate(() => document.querySelector('#confirm-dialog').contains(document.activeElement))); }
    await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => document.activeElement.id),'timer-reset');
    await nav('cabinet'); await page.locator('[data-lore-card="lanterns"] [data-read]').click(); await axe(page,'folklore dialog');
    for(const key of ['Tab','Shift+Tab']) for(let i=0;i<5;i++) { await page.keyboard.press(key); assert(await page.evaluate(() => document.querySelector('#lore-dialog').contains(document.activeElement))); }
    await page.keyboard.press('Escape');
  });
  await check('375 / 768 / 1280 layouts, long text and real rendered screenshots', async () => {
    await addTask('A'.repeat(120),'Long notes still wrap. '.repeat(18),'high');
    for(const width of [375,768,1280]) {
      await page.setViewportSize({width,height:900});
      for(const view of ['town','tasks','focus','cabinet']) {
        await nav(view);
        const dimensions=await page.evaluate(() => ({viewport:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
        assert(dimensions.scroll<=width && dimensions.body<=width,`${width}px ${view} overflow: ${JSON.stringify(dimensions)}`);
        if(width===375) {
          assert(await page.evaluate(() => document.querySelector('.brand').getBoundingClientRect().right < document.querySelector('.motion-control').getBoundingClientRect().left),'Mobile brand and motion control overlap');
          assert.equal(await page.locator('.town-scene').evaluate(el => getComputedStyle(el,'::after').content),'""','Mobile moon is present');
        }
        if(width!==768) await screenshot(page,`${view}-${width}.png`);
      }
    }
    await nav('focus'); await page.locator('#timer-start').click(); await screenshot(page,'focus-active-1280.png'); await page.locator('#timer-start').click();
  });
  await check('Non-destructive v1 running migration, completion/reload deduplication and paid legacy-task protection', async () => {
    const legacy={tasks:[{id:'old-active',text:'An old thought',done:false},{id:'old-done',text:'Already settled',done:true}],minutes:45,remaining:2,end:fixed.getTime()+2000};
    const raw=JSON.stringify(legacy);
    const p=await makePage({key:M.LEGACY_KEY,value:raw});
    assert.equal(await p.evaluate(key => localStorage.getItem(key),M.LEGACY_KEY),raw);
    const restored=await state(p); assert.equal(restored.tasks.length,2); assert.equal(restored.timer.minutes,45); assert.equal(restored.timer.end,legacy.end);
    assert.equal(restored.balance,0); assert(restored.rewardedTaskIds.includes('old-done'));
    await p.clock.fastForward(2100); assert.equal((await state(p)).sessions.length,1);
    await p.reload(); assert.equal((await state(p)).sessions.length,1); assert.equal(await p.evaluate(key => localStorage.getItem(key),M.LEGACY_KEY),raw);
    const paused=await makePage({key:M.LEGACY_KEY,value:JSON.stringify({...legacy,minutes:15,remaining:600,end:null})});
    await nav('focus',paused); assert.equal(await paused.locator('#clock').textContent(),'10:00');
    await paused.locator('[data-minutes="45"]').click(); assert(await paused.locator('#confirm-dialog').isVisible()); await paused.keyboard.press('Escape');
    assert.equal(await paused.locator('#clock').textContent(),'10:00'); await paused.locator('#timer-start').click(); await paused.clock.fastForward(1000); assert.equal(await paused.locator('#clock').textContent(),'09:59');
  });
  await check('Local backup download, preview, cancel safety and confirmed replacement', async () => {
    await addTask('Keep this local task','This should survive cancellation.');
    await nav('cabinet');
    const [download] = await Promise.all([page.waitForEvent('download'),page.locator('#backup-export').click()]);
    const downloaded = JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(downloaded.format,M.BACKUP_FORMAT); assert.equal(downloaded.data.tasks.at(-1).text,'Keep this local task');

    const replacement=M.newState();
    const restoredTask=M.addTask(replacement,{text:'Restored locally',note:'No upload',priority:'normal'},fixed.getTime());
    M.toggleTask(replacement,restoredTask.id,true);
    replacement.settings = {reducedMotion:true,volume:0.23};
    const file={name:'spectral-focus-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(M.createBackup(replacement,fixed.getTime())))};
    const original=await state();
    const chooseFile=async inputFile=>{
      const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.locator('#backup-import-trigger').click()]);
      await chooser.setFiles(inputFile);
    };
    await chooseFile(file);
    await page.locator('#backup-dialog').waitFor({state:'visible'});
    assert(await page.locator('#backup-confirm').isEnabled(),'a validated backup enables explicit confirmation');
    assert((await page.locator('#backup-preview').textContent()).includes('1 task (1 completed)'));
    assert((await page.locator('#backup-preview').textContent()).includes(`Backup format v${M.BACKUP_VERSION}`));
    assert((await page.locator('#backup-preview').textContent()).includes('restored paused at its saved remaining time'));
    assert.deepEqual(await state(),original,'preview does not alter current data');
    await axe(page,'backup preview dialog');
    for(const width of [375,1280]) {
      await page.setViewportSize({width,height:900});
      const bounds=await page.locator('#backup-dialog').evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,overflow:el.scrollWidth>el.clientWidth}));
      assert(bounds.left>=0 && bounds.right<=width && !bounds.overflow,`${width}px backup preview fits the viewport`);
    }
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Close backup preview');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'backup-confirm');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Close backup preview');
    await page.locator('#backup-cancel').click(); await page.locator('#backup-dialog').waitFor({state:'hidden'});
    assert.deepEqual(await state(),original,'cancel leaves current data untouched');
    await page.waitForFunction(()=>document.activeElement.id==='backup-import-trigger');

    await chooseFile(file);
    await page.locator('#backup-dialog').waitFor({state:'visible'});
    await page.waitForFunction(() => !document.querySelector('#backup-confirm').disabled);
    await page.locator('#backup-confirm').click(); await page.locator('#backup-dialog').waitFor({state:'hidden'});
    const imported=await state();
    assert.equal(imported.tasks.length,1); assert.equal(imported.tasks[0].text,'Restored locally');
    assert.equal(imported.tasks[0].note,'No upload'); assert.equal(imported.balance,10);
    assert.deepEqual(imported.rewardedTaskIds,[restoredTask.id]);
    assert.equal(await page.locator('#reduce-motion').isChecked(),true);
    assert.equal(await page.locator('#audio-volume').inputValue(),'23');
    assert.equal(await page.locator('#volume-value').textContent(),'23%');
    assert(await page.locator('body').evaluate(el=>el.classList.contains('reduce-motion')));
    await page.reload();
    assert.deepEqual(await state(),imported,'restore persists after reload');
    await nav('tasks');
    await page.locator('.task-check').uncheck(); await page.locator('.task-check').check();
    assert.equal((await state()).balance,10,'restored tasks do not receive a second reward');
    await nav('cabinet');

    const afterRestore=await state();
    await chooseFile({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
    await page.waitForFunction(() => document.querySelector('#backup-status').textContent.includes('valid JSON'));
    assert.deepEqual(await state(),afterRestore,'invalid file cannot replace saved data');
    await chooseFile({name:'large.json',mimeType:'application/json',buffer:Buffer.alloc(M.MAX_BACKUP_BYTES+1,32)});
    await page.waitForFunction(()=>document.querySelector('#backup-status').textContent.includes('too large'));
    assert.deepEqual(await state(),afterRestore,'oversized file cannot replace saved data');

    const beforeQuotaFailure=JSON.stringify(afterRestore);
    await page.evaluate(key=>{
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(name,value){
        if(name===key) {
          Storage.prototype.setItem=original;
          throw new DOMException('Quota exceeded','QuotaExceededError');
        }
        return original.call(this,name,value);
      };
    },M.KEY);
    const different=M.newState();
    M.addTask(different,{text:'Must not replace saved data'},fixed.getTime());
    const differentFile={...file,buffer:Buffer.from(JSON.stringify(M.createBackup(different,fixed.getTime())))};
    await chooseFile(differentFile);
    await page.locator('#backup-dialog').waitFor({state:'visible'});
    await page.waitForFunction(() => !document.querySelector('#backup-confirm').disabled);
    await page.locator('#backup-confirm').click();
    assert(await page.locator('#backup-dialog').isVisible(),'failed write leaves confirmation open');
    assert((await page.locator('#backup-error').textContent()).includes('has not been replaced'));
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),M.KEY),beforeQuotaFailure);
    assert.deepEqual(await state(),afterRestore,'failed storage write leaves application state unchanged');
    await page.locator('#backup-cancel').click();
    await nav('tasks');
    assert.equal(await page.locator('.task-body > label').textContent(),'Restored locally','failed restore also leaves the live state untouched');
    await page.locator('.task-check').uncheck();
    assert.equal((await state()).tasks[0].done,false,'a failed restore does not block later normal saves');
  });
  await check('Corrupted and blocked storage stay usable, warn clearly and preserve original data', async () => {
    const damaged='{not-json'; const p=await makePage({key:M.KEY,value:damaged});
    assert(await p.locator('#storage-warning').isVisible()); await addTask('Memory-only task','','normal',p);
    assert.equal(await p.evaluate(key => localStorage.getItem(key),M.KEY),damaged);
    const context=await browser.newContext({viewport:{width:1280,height:900}}); contexts.push(context);
    await context.addInitScript(() => Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
    const blocked=await context.newPage(); blocked.on('pageerror',e=>report.errors.push(e.message)); await blocked.goto(base);
    assert(await blocked.locator('#storage-warning').isVisible()); await addTask('Still usable without storage','','normal',blocked);
    assert.equal(await blocked.locator('.task-card').count(),1);
  });
  assert.deepEqual(report.errors,[], 'Browser console/runtime errors');
  report.finishedAt=new Date().toISOString(); report.status='passed';
  fs.writeFileSync(path.join(evidence,'browser-results.json'),JSON.stringify(report,null,2));
  console.log(`Browser checks passed: ${report.checks.length}. Screenshots: ${report.screenshots.length}. No console/runtime errors.`);
})().catch(async error => {
  report.status='failed'; report.failure=error.stack; report.finishedAt=new Date().toISOString();
  if(page) { try { await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}); } catch {} }
  fs.writeFileSync(path.join(evidence,'browser-results.json'),JSON.stringify(report,null,2));
  console.error(error); process.exitCode=1;
}).finally(async () => {
  for(const context of contexts) await context.close().catch(()=>{});
  if(browser) await browser.close();
  if(server) await new Promise(resolve=>server.close(resolve));
});
