'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const M = require('../model.js');
const MODEL_PATH = path.resolve(__dirname, '../model.js');
const SOURCE = fs.readFileSync(MODEL_PATH, 'utf8');
const NOW = new Date(2026, 10, 17, 12, 0, 0).getTime();

function memoryStorage(entries = []) {
  const data = new Map(entries);
  return {
    data,
    reads: [],
    writes: [],
    getItem(key) {
      this.reads.push(key);
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      this.writes.push([key, value]);
      data.set(key, value);
    }
  };
}

function stored(state) {
  return memoryStorage([[M.KEY, JSON.stringify(state)]]);
}

function session(id, minutes = 25, completedAt = NOW, taskId = null) {
  return { id, minutes, completedAt, taskId };
}

function browserModel(overrides = {}) {
  const context = vm.createContext({ ...overrides });
  vm.runInContext(SOURCE, context, { filename: 'model.js' });
  return context.SpectralModel;
}

function finish(state, minutes = 15, now = NOW) {
  M.setTimer(state, { minutes });
  M.startTimer(state, now);
  return M.tick(state, state.timer.end);
}

test('exports the exact constants and complete synchronous API through CommonJS', () => {
  assert.equal(M.KEY, 'spectral-focus-v2');
  assert.equal(M.LEGACY_KEY, 'spectral-focus-v1');
  assert.equal(M.REWARD, 10);
  assert.deepEqual(M.SKINS, [
    { id: 'harvest', name: 'Harvest Jack', cost: 0 },
    { id: 'turnip', name: 'Old-world Turnip', cost: 10 },
    { id: 'violet', name: 'Moonlit Pumpkin', cost: 20 },
    { id: 'ember', name: 'Ember Keeper', cost: 30 }
  ]);
  assert.deepEqual(M.LORE_RULES, [
    { id: 'lanterns', tasks: 0, sessions: 0 },
    { id: 'samhain', tasks: 1, sessions: 0 },
    { id: 'hallows', tasks: 0, sessions: 1 },
    { id: 'guising', tasks: 3, sessions: 0 },
    { id: 'ghosts', tasks: 0, sessions: 2 },
    { id: 'harvest', tasks: 5, sessions: 0 }
  ]);
  for (const name of [
    'newState', 'load', 'save', 'addTask', 'editTask', 'toggleTask', 'deleteTask',
    'buySkin', 'selectSkin', 'setTimer', 'startTimer', 'pauseTimer', 'resetTimer',
    'tick', 'progress', 'isLoreUnlocked', 'stats', 'localDate', 'createBackup', 'parseBackup'
  ]) assert.equal(typeof M[name], 'function', name);
});

test('versioned backups round-trip local data and pause timers while the backup is away', () => {
  const state = M.newState();
  const task = M.addTask(state, { text: 'Back up this task', note: 'A local note', priority: 'high' }, NOW);
  M.toggleTask(state, task.id, true);
  M.buySkin(state, 'turnip');
  M.selectSkin(state, 'turnip');
  state.settings = { reducedMotion: true, volume: 0.15 };
  state.sessions.push(session('finished-session', 15, NOW, task.id));
  M.setTimer(state, { mode: 'focus', minutes: 25, taskId: task.id });
  M.startTimer(state, NOW);
  M.tick(state, NOW + 10_000);

  const backup = M.createBackup(state, NOW + 10_000);
  assert.equal(backup.format, M.BACKUP_FORMAT);
  assert.equal(backup.formatVersion, M.BACKUP_VERSION);
  assert.equal(backup.data.timer.end, null);
  assert.equal(backup.data.timer.remaining, 1490);
  assert.equal(state.timer.end, NOW + 25 * 60_000, 'export does not mutate the live timer');

  const parsed = M.parseBackup(JSON.stringify(backup), NOW + 24 * 60 * 60_000);
  assert.equal(parsed.error, null);
  assert.equal(parsed.summary.tasks, 1);
  assert.equal(parsed.summary.completedTasks, 1);
  assert.equal(parsed.summary.sessions, 1);
  assert.equal(parsed.summary.timerRunning, false);
  assert.deepEqual(parsed.state, backup.data);

  const forgedRunning = structuredClone(backup);
  forgedRunning.data.timer = { ...forgedRunning.data.timer, end: NOW + 5000, remaining: 5, id: 'pending-session' };
  const paused = M.parseBackup(JSON.stringify(forgedRunning), NOW + 6000);
  assert.equal(paused.state.timer.end, null);
  assert.equal(paused.state.timer.remaining, 0);
  assert.equal(paused.state.sessions.length, 1, 'importing an expired timer does not mint a completed session');
});

test('backup parser rejects malformed, unsupported, non-canonical and oversized files', () => {
  const valid = M.createBackup(M.newState(), NOW);
  const cases = [
    ['{bad', 'This file is not valid JSON.'],
    [JSON.stringify({ format: M.BACKUP_FORMAT, formatVersion: 99, exportedAt: NOW, data: M.newState() }), 'This is not a supported Spectral Focus backup.'],
    [JSON.stringify({ ...valid, data: { ...valid.data, tasks: [{ id: 'bad', text: ' ', done: false }] } }), 'The backup contains invalid or unsupported data.']
  ];
  for (const [json, error] of cases) {
    const parsed = M.parseBackup(json, NOW);
    assert.equal(parsed.state, null);
    assert.equal(parsed.error, error);
  }
  assert.equal(M.parseBackup('x'.repeat(M.MAX_BACKUP_BYTES + 1), NOW).error, 'The backup file is too large.');
  assert.throws(() => M.createBackup({ ...M.newState(), unexpected: true }, NOW), /not valid for backup/);
});

test('backup validation rejects duplicate IDs and out-of-bound fields without changing its input', () => {
  const source = M.newState();
  const task = M.addTask(source, {text:'Validate fields'}, NOW);
  const valid = M.createBackup(source, NOW);
  const invalidChanges = [
    state => state.tasks.push({...state.tasks[0]}),
    state => { state.sessions = [session('same'),session('same')]; },
    state => { state.rewardedTaskIds = [task.id,task.id]; },
    state => { state.owned = ['harvest','harvest']; },
    state => { state.tasks[0].text = 'x'.repeat(121); },
    state => { state.tasks[0].note = 'n'.repeat(501); },
    state => { state.settings.volume = 1.1; },
    state => { state.balance = -1; },
    state => { state.timer.remaining = 1501; },
    state => { state.version = 3; }
  ];
  for (const change of invalidChanges) {
    const backup = structuredClone(valid);
    change(backup.data);
    const json = JSON.stringify(backup);
    const result = M.parseBackup(json, NOW);
    assert.equal(result.state,null,json);
    assert.ok(result.error);
    assert.equal(JSON.stringify(backup),json,'validation cannot mutate the source');
  }
  const oversizedUtf8 = JSON.stringify(valid) + '中'.repeat(Math.floor(M.MAX_BACKUP_BYTES / 3));
  assert.equal(M.parseBackup(oversizedUtf8,NOW).error,'The backup file is too large.');
});

test('restoring a backup preserves reward ledgers, deleted-task progress and session uniqueness', () => {
  const source = M.newState();
  const task = M.addTask(source,{text:'Earned once'},NOW);
  const deleted = M.addTask(source,{text:'Deleted but remembered'},NOW);
  M.toggleTask(source,task.id,true);
  M.toggleTask(source,deleted.id,true);
  M.deleteTask(source,deleted.id);
  finish(source,15,NOW);
  const parsed = M.parseBackup(JSON.stringify(M.createBackup(source,NOW + 15*60_000)),NOW + 20*60_000);
  assert.equal(parsed.error,null);
  const restored = parsed.state;
  M.toggleTask(restored,task.id,false);
  assert.equal(M.toggleTask(restored,task.id,true),0);
  assert.equal(restored.balance,20);
  assert.equal(M.progress(restored).tasks,2);
  assert.equal(M.tick(restored,NOW + 60*60_000),null);
  assert.equal(restored.sessions.length,1);
  assert.equal(M.stats(restored,NOW + 60*60_000).totalMinutes,15);
});

test('newState has the exact defaults and no shared mutable collections', () => {
  const state = M.newState();
  assert.deepEqual(state, {
    version: 2, tasks: [], balance: 0, rewardedTaskIds: [], owned: ['harvest'], lantern: 'harvest',
    timer: { mode: 'focus', minutes: 25, remaining: 1500, end: null, id: null, taskId: null },
    sessions: [], settings: { reducedMotion: false, volume: 0.3 }
  });
  const other = M.newState();
  state.tasks.push({ id: 'x' });
  state.rewardedTaskIds.push('x');
  state.owned.push('turnip');
  state.sessions.push(session('s'));
  state.timer.remaining = 1;
  state.settings.volume = 1;
  assert.deepEqual(other, M.newState());
});

test('browser UMD exposes globalThis.SpectralModel without DOM, require or browser APIs', () => {
  let calls = 0;
  const model = browserModel({ crypto: { randomUUID: () => 'uuid-' + ++calls } });
  const state = model.newState();
  const task = model.addTask(state, { text: 'Visit the town' }, NOW);
  assert.equal(task.id, 'uuid-1');
  model.startTimer(state, NOW);
  assert.equal(state.timer.id, 'uuid-2');
  assert.equal(model.tick(state, state.timer.end).minutes, 25);
  assert.equal(model.progress(state).sessions, 1);
});

test('fallback IDs remain unique with a fixed clock/random source and no crypto', () => {
  const fixedMath = Object.create(Math);
  fixedMath.random = () => 0;
  const model = browserModel({ Math: fixedMath });
  const state = model.newState();
  const ids = new Set();
  for (let index = 0; index < 100; index += 1) {
    const task = model.addTask(state, { text: 'Task ' + index }, NOW);
    assert.equal(ids.has(task.id), false);
    ids.add(task.id);
    model.toggleTask(state, task.id, true);
    model.deleteTask(state, task.id);
  }
  for (let index = 0; index < 20; index += 1) {
    model.startTimer(state, NOW);
    assert.equal(ids.has(state.timer.id), false);
    ids.add(state.timer.id);
    model.resetTimer(state);
  }
  assert.equal(ids.size, 120);
});

test('unavailable crypto and collisions with deleted task ledgers use the safe fallback', () => {
  const unavailable = browserModel({ crypto: { randomUUID() { throw new Error('blocked'); } } });
  assert.ok(unavailable.addTask(unavailable.newState(), { text: 'Safe' }, NOW).id);
  const model = browserModel({ crypto: { randomUUID: () => '__proto__' } });
  const state = model.newState();
  const first = model.addTask(state, { text: 'First' }, NOW);
  assert.equal(first.id, '__proto__');
  model.toggleTask(state, first.id, true);
  model.deleteTask(state, first.id);
  const second = model.addTask(state, { text: 'Second' }, NOW);
  assert.notEqual(second.id, first.id);
  assert.equal(model.toggleTask(state, second.id, true), 10);
});

test('empty storage yields clean defaults without writing', () => {
  const storage = memoryStorage();
  assert.deepEqual(M.load(storage, NOW), { state: M.newState(), warning: null, migrated: false });
  assert.deepEqual(storage.reads, [M.KEY, M.LEGACY_KEY]);
  assert.equal(storage.writes.length, 0);
});

test('valid v2 takes precedence over v1 and preserves all current fields', () => {
  const state = M.newState();
  const task = M.addTask(state, { text: 'Pumpkins', note: 'Keep the seeds', priority: 'high' }, NOW);
  M.toggleTask(state, task.id, true);
  M.buySkin(state, 'turnip');
  M.selectSkin(state, 'turnip');
  state.rewardedTaskIds.push('deleted-task');
  state.settings = { reducedMotion: true, volume: 0.85 };
  finish(state, 45);
  const storage = stored(state);
  storage.data.set(M.LEGACY_KEY, '{broken legacy');
  const result = M.load(storage, NOW);
  assert.deepEqual(result, { state, warning: null, migrated: false });
  assert.deepEqual(storage.reads, [M.KEY]);
  assert.equal(storage.writes.length, 0);
});

test('v2 property order alone is not treated as corruption', () => {
  const original = M.newState();
  const reversed = Object.fromEntries(Object.entries(original).reverse());
  reversed.timer = Object.fromEntries(Object.entries(original.timer).reverse());
  assert.equal(M.load(stored(reversed), NOW).warning, null);
});

test('migration preserves original v1 bytes, valid running deadline, tasks and duration', () => {
  const legacy = {
    tasks: [{ id: 'done', text: 'Old complete', done: true }, { id: 'open', text: 'Old open', done: false }],
    minutes: 45, remaining: 1200, end: NOW + 900250
  };
  const raw = '  ' + JSON.stringify(legacy) + '\n';
  const storage = memoryStorage([[M.LEGACY_KEY, raw]]);
  const { state, warning, migrated } = M.load(storage, NOW);
  assert.equal(migrated, true);
  assert.equal(warning, null);
  assert.equal(storage.data.get(M.LEGACY_KEY), raw);
  assert.deepEqual(storage.writes.map(([key]) => key), [M.KEY]);
  assert.equal(state.version, 2);
  assert.equal(state.balance, 0);
  assert.deepEqual(state.rewardedTaskIds, ['done']);
  assert.deepEqual(state.tasks.map(task => [task.id, task.text, task.done, task.note, task.priority, task.createdAt]), [
    ['done', 'Old complete', true, '', 'normal', NOW], ['open', 'Old open', false, '', 'normal', NOW]
  ]);
  assert.equal(state.timer.minutes, 45);
  assert.equal(state.timer.end, legacy.end);
  assert.equal(state.timer.remaining, 901);
  assert.equal(typeof state.timer.id, 'string');
  assert.equal(M.toggleTask(state, 'done', false), 0);
  assert.equal(M.toggleTask(state, 'done', true), 0);
  assert.equal(M.toggleTask(state, 'open', true), 10);
  const again = M.load(storage, NOW);
  assert.equal(again.migrated, false);
  assert.equal(again.warning, null);
  assert.equal(again.state.timer.id, state.timer.id);
  assert.equal(M.tick(again.state, legacy.end).minutes, 45);
  assert.equal(M.tick(again.state, legacy.end + 1), null);
  assert.equal(storage.data.get(M.LEGACY_KEY), raw);
});

test('legacy paused timer preserves remaining seconds and resumes without counting paused time', () => {
  const storage = memoryStorage([[M.LEGACY_KEY, JSON.stringify({ tasks: [], minutes: 15, remaining: 123, end: null })]]);
  const { state } = M.load(storage, NOW);
  assert.equal(state.timer.remaining, 123);
  assert.equal(state.timer.end, null);
  assert.equal(M.tick(state, NOW + 999999), null);
  assert.equal(state.sessions.length, 0);
  M.startTimer(state, NOW + 999999);
  assert.equal(state.timer.end, NOW + 999999 + 123000);
  assert.equal(M.tick(state, state.timer.end).minutes, 15);
});

test('expired migrated running timer settles only on tick, at its original deadline', () => {
  const deadline = NOW - 5000;
  const storage = memoryStorage([[M.LEGACY_KEY, JSON.stringify({ tasks: [], minutes: 25, remaining: 1, end: deadline })]]);
  const { state } = M.load(storage, NOW);
  assert.equal(state.sessions.length, 0);
  assert.equal(state.timer.remaining, 0);
  assert.equal(state.timer.end, deadline);
  const result = M.tick(state, NOW);
  assert.equal(result.completedAt, deadline);
  assert.equal(result.minutes, 25);
  assert.equal(M.save(storage, state), true);
  const restored = M.load(storage, NOW + 1000).state;
  assert.equal(M.tick(restored, NOW + 1000), null);
  assert.equal(restored.sessions.length, 1);
});

test('an initially completed legacy timer does not count unless started again', () => {
  const storage = memoryStorage([[M.LEGACY_KEY, JSON.stringify({ tasks: [], minutes: 15, remaining: 0, end: null })]]);
  const { state } = M.load(storage, NOW);
  assert.equal(M.tick(state, NOW), null);
  assert.equal(state.sessions.length, 0);
  M.startTimer(state, NOW);
  assert.equal(state.timer.remaining, 900);
  assert.equal(state.timer.end, NOW + 900000);
  assert.ok(M.tick(state, state.timer.end));
});

test('migration deduplicates IDs safely including Object prototype names', () => {
  const legacy = {
    tasks: [
      { id: '__proto__', text: 'Original', done: false },
      { id: '__proto__', text: 'Duplicate', done: true },
      { id: 'constructor', text: 'Constructor', done: true },
      { id: 'toString', text: 'To string', done: false },
      { id: '', text: 'Missing id', done: false },
      { id: 4, text: 'Numeric id', done: true },
      { id: 'empty', text: '   ', done: false }, null
    ],
    minutes: 15, remaining: 42, end: null
  };
  const storage = memoryStorage([[M.LEGACY_KEY, JSON.stringify(legacy)]]);
  const { state } = M.load(storage, NOW);
  assert.equal(state.tasks.length, 5);
  assert.equal(new Set(state.tasks.map(task => task.id)).size, 5);
  assert.equal(state.tasks[0].text, 'Original');
  assert.equal(state.tasks[0].done, true);
  assert.equal(state.balance, 0);
  assert.equal(M.progress(state).tasks, 3);
  assert.equal(M.toggleTask(state, '__proto__', true), 0);
  assert.equal(M.toggleTask(state, 'constructor', true), 0);
  assert.equal(M.toggleTask(state, 'toString', true), 10);
  assert.equal(Object.prototype.polluted, undefined);
});

test('storage access failures return valid state and a warning rather than throwing', () => {
  for (const storage of [undefined, null, {}, { getItem() { throw new Error('denied'); } }]) {
    const result = M.load(storage, NOW);
    assert.deepEqual(result.state, M.newState());
    assert.equal(result.migrated, false);
    assert.equal(typeof result.warning, 'string');
  }
  const storage = { getItem(key) { if (key === M.KEY) return null; throw new Error('legacy denied'); } };
  assert.ok(M.load(storage, NOW).warning);
});

test('guarded migration still returns restored data when quota blocks the v2 write', () => {
  const raw = JSON.stringify({ tasks: [{ id: 'a', text: 'Keep me', done: true }], minutes: 45, remaining: 66, end: null });
  const storage = memoryStorage([[M.LEGACY_KEY, raw]]);
  storage.setItem = () => { throw new Error('quota'); };
  const result = M.load(storage, NOW);
  assert.equal(result.migrated, true);
  assert.ok(result.warning);
  assert.equal(result.state.tasks[0].text, 'Keep me');
  assert.equal(result.state.timer.remaining, 66);
  assert.equal(storage.data.get(M.LEGACY_KEY), raw);
  assert.equal(storage.data.has(M.KEY), false);
});

test('save guards write and serialization failures without touching the legacy key', () => {
  const storage = memoryStorage([[M.LEGACY_KEY, 'unchanged']]);
  const state = M.newState();
  assert.equal(M.save(storage, state), true);
  assert.deepEqual(JSON.parse(storage.data.get(M.KEY)), state);
  assert.equal(storage.data.get(M.LEGACY_KEY), 'unchanged');
  assert.equal(M.save(undefined, state), false);
  assert.equal(M.save({ setItem() { throw new Error('quota'); } }, state), false);
  const cyclic = M.newState();
  cyclic.cycle = cyclic;
  const count = storage.writes.length;
  assert.equal(M.save(storage, cyclic), false);
  assert.equal(M.save(storage, { value: 1n }), false);
  assert.equal(M.save(storage, undefined), false);
  assert.equal(storage.writes.length, count);
});

test('corrupted v2 is preserved byte-for-byte and never falls back to or overwrites v1', () => {
  for (const raw of ['{bad', 'null', '[]', 'true', '23', '"state"', '']) {
    const storage = memoryStorage([
      [M.KEY, raw],
      [M.LEGACY_KEY, JSON.stringify({ tasks: [{ id: 'old', text: 'Old', done: true }] })]
    ]);
    const result = M.load(storage, NOW);
    assert.deepEqual(result.state, M.newState(), raw);
    assert.equal(result.migrated, false);
    assert.ok(result.warning, raw);
    assert.equal(storage.data.get(M.KEY), raw);
    assert.deepEqual(storage.reads, [M.KEY]);
    assert.equal(storage.writes.length, 0);
  }
});

test('invalid legacy JSON or non-object data returns a warning and preserves the original', () => {
  for (const raw of ['{bad', 'null', '[]', 'false']) {
    const storage = memoryStorage([[M.LEGACY_KEY, raw]]);
    const result = M.load(storage, NOW);
    assert.ok(result.warning);
    assert.equal(result.migrated, false);
    assert.equal(storage.writes.length, 0);
    assert.equal(storage.data.get(M.LEGACY_KEY), raw);
  }
});

test('malformed current data is repaired with bounded fields, unique IDs and a safe wallet', () => {
  const raw = {
    version: 999,
    tasks: [
      { id: '__proto__', text: ' A ', note: 'n'.repeat(600), priority: 'urgent', done: true, createdAt: 'bad' },
      { id: '__proto__', text: 'Duplicate', done: false },
      { id: 'constructor', text: 'b'.repeat(121), note: 7, done: false, createdAt: NOW },
      { id: null, text: 'Generate an id' }, { id: 'blank', text: '  ' }, 4
    ],
    balance: -10,
    rewardedTaskIds: ['__proto__', '__proto__', 'deleted', null, 7, ''],
    owned: ['turnip', 'turnip', '__proto__', 'constructor'],
    lantern: 'ember',
    timer: { mode: 'nope', minutes: 1e300, remaining: -4, end: 'bad', id: 7, taskId: 'missing' },
    sessions: [
      session('__proto__'), session('__proto__', 45), session('constructor', 15),
      session('break', 5), session('bad-duration', 1e300), session('bad-date', 25, 1e300),
      session('', 25), { id: 'missing-time', minutes: 25 }, null
    ],
    settings: { reducedMotion: 'yes', volume: 10 },
    __extra: { polluted: true }
  };
  const storage = stored(raw);
  const before = storage.data.get(M.KEY);
  const { state, warning } = M.load(storage, NOW);
  assert.ok(warning);
  assert.equal(storage.data.get(M.KEY), before);
  assert.equal(storage.writes.length, 0);
  assert.equal(state.version, 2);
  assert.equal(state.tasks.length, 3);
  assert.equal(new Set(state.tasks.map(task => task.id)).size, 3);
  assert.equal(state.tasks[0].text, 'A');
  assert.equal(state.tasks[0].note.length, 500);
  assert.equal(state.tasks[0].priority, 'normal');
  assert.equal(state.tasks[0].createdAt, NOW);
  assert.equal(state.tasks[1].text.length, 120);
  assert.equal(state.balance, 0);
  assert.deepEqual(state.rewardedTaskIds, ['__proto__', 'deleted']);
  assert.deepEqual(state.owned, ['harvest', 'turnip']);
  assert.equal(state.lantern, 'harvest');
  assert.deepEqual(state.timer, { mode: 'focus', minutes: 25, remaining: 0, end: null, id: null, taskId: null });
  assert.deepEqual(state.sessions.map(item => item.id), ['__proto__', 'constructor']);
  assert.deepEqual(state.settings, { reducedMotion: false, volume: 0.3 });
  assert.deepEqual(M.progress(state), { tasks: 2, sessions: 2 });
  assert.equal(M.stats(state, NOW).totalMinutes, 40);
  assert.equal(M.toggleTask(state, '__proto__', true), 0);
  assert.equal(M.toggleTask(state, 'constructor', true), 10);
  assert.equal(M.buySkin(state, '__proto__'), false);
  assert.equal(M.selectSkin(state, 'constructor'), false);
  assert.equal(Object.prototype.polluted, undefined);
});

test('all malformed root containers recover and numeric overflow cannot create infinite timers', () => {
  for (const raw of [
    {}, { tasks: {}, sessions: {}, rewardedTaskIds: {}, owned: {}, settings: null, timer: null },
    { timer: { mode: 'break', minutes: 45, remaining: 1e300, end: -1 }, balance: 1e300 }
  ]) {
    const { state, warning } = M.load(stored(raw), NOW);
    assert.ok(warning);
    assert.ok(Number.isFinite(state.timer.remaining));
    assert.ok(Number.isFinite(state.timer.minutes));
    assert.equal(state.balance, 0);
    assert.equal(M.tick(state, NOW), null);
  }
  const storage = memoryStorage([[M.KEY, '{"timer":{"minutes":1e400,"remaining":1e400,"end":1e400},"balance":1e400}']]);
  const { state, warning } = M.load(storage, NOW);
  assert.ok(warning);
  assert.equal(state.timer.minutes, 25);
  assert.equal(state.timer.remaining, 1500);
  assert.equal(state.timer.end, null);
  assert.equal(state.balance, 0);
});

test('JSON __proto__ fields never modify prototypes during recovery', () => {
  const storage = memoryStorage([[M.KEY, '{"__proto__":{"polluted":true},"tasks":[{"id":"__proto__","text":"Safe","done":false}]}']]);
  const result = M.load(storage, NOW);
  assert.ok(result.warning);
  assert.equal(result.state.tasks[0].id, '__proto__');
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(result.state.polluted, undefined);
});

test('addTask mutates state, trims the title and returns its exact task object', () => {
  const state = M.newState();
  const tasks = state.tasks;
  const task = M.addTask(state, { text: '  Carve a lantern  ' }, NOW);
  assert.equal(state.tasks, tasks);
  assert.equal(state.tasks[0], task);
  assert.equal(task.text, 'Carve a lantern');
  assert.equal(task.note, '');
  assert.equal(task.priority, 'normal');
  assert.equal(task.createdAt, NOW);
  assert.equal(task.done, false);
  assert.equal(typeof task.id, 'string');
  assert.equal(state.balance, 0);
  for (const priority of ['low', 'normal', 'high']) {
    const added = M.addTask(state, { text: 'x'.repeat(120), note: 'n'.repeat(500), priority }, NOW);
    assert.equal(added.priority, priority);
    assert.equal(added.note.length, 500);
  }
});

test('invalid task input throws before mutation for both addition and editing', () => {
  const invalid = [
    undefined, null, {}, { text: '' }, { text: ' \t\n ' }, { text: 'x'.repeat(121) },
    { text: 1 }, { text: null }, { text: 'Good', note: 'x'.repeat(501) },
    { text: 'Good', note: 12 }, { text: 'Good', note: null },
    { text: 'Good', priority: 'urgent' }, { text: 'Good', priority: '__proto__' },
    { text: 'Good', priority: null }
  ];
  const state = M.newState();
  const task = M.addTask(state, { text: 'Original', note: 'Keep this', priority: 'high' }, NOW);
  for (const input of invalid) {
    const before = JSON.stringify(state);
    assert.throws(() => M.addTask(state, input, NOW), Error);
    assert.equal(JSON.stringify(state), before);
    assert.throws(() => M.editTask(state, task.id, input), Error);
    assert.equal(JSON.stringify(state), before);
  }
  assert.throws(() => M.addTask(state, { text: 'Invalid timestamp' }, Infinity), Error);
  assert.equal(state.tasks.length, 1);
});

test('editTask updates values in place while preserving identity, completion and createdAt', () => {
  const state = M.newState();
  const task = M.addTask(state, { text: 'Before' }, NOW);
  M.toggleTask(state, task.id, true);
  assert.equal(M.editTask(state, task.id, { text: ' After ', note: 'Two\nlines', priority: 'low' }), task);
  assert.deepEqual(task, { id: task.id, text: 'After', note: 'Two\nlines', priority: 'low', done: true, createdAt: NOW });
  assert.deepEqual(state.rewardedTaskIds, [task.id]);
  assert.equal(state.balance, 10);
});

test('unknown task IDs and invalid done values throw without mutation', () => {
  const state = M.newState();
  const task = M.addTask(state, { text: 'Known' }, NOW);
  const before = JSON.stringify(state);
  for (const id of ['missing', '__proto__', 'constructor', 'toString', null, 1]) {
    assert.throws(() => M.editTask(state, id, { text: 'Edit', note: '', priority: 'normal' }), Error);
    assert.throws(() => M.toggleTask(state, id, true), Error);
    assert.throws(() => M.deleteTask(state, id), Error);
    assert.throws(() => M.setTimer(state, { taskId: id === null ? 'missing' : id }), Error);
  }
  for (const done of [undefined, null, 0, 1, 'false', 'true']) assert.throws(() => M.toggleTask(state, task.id, done), Error);
  assert.equal(JSON.stringify(state), before);
});

test('task rewards cannot be farmed by repeated completion, reopening, refreshing or deletion', () => {
  let state = M.newState();
  const task = M.addTask(state, { text: 'One reward' }, NOW);
  assert.equal(M.toggleTask(state, task.id, false), 0);
  assert.equal(M.toggleTask(state, task.id, true), 10);
  assert.equal(M.toggleTask(state, task.id, true), 0);
  assert.equal(M.toggleTask(state, task.id, false), 0);
  assert.equal(M.toggleTask(state, task.id, true), 0);
  const storage = memoryStorage();
  assert.equal(M.save(storage, state), true);
  state = M.load(storage, NOW).state;
  assert.equal(M.toggleTask(state, task.id, false), 0);
  assert.equal(M.toggleTask(state, task.id, true), 0);
  M.deleteTask(state, task.id);
  assert.equal(state.balance, 10);
  assert.deepEqual(state.rewardedTaskIds, [task.id]);
  assert.deepEqual(M.progress(state), { tasks: 1, sessions: 0 });
  M.save(storage, state);
  state = M.load(storage, NOW).state;
  assert.equal(state.tasks.length, 0);
  assert.deepEqual(state.rewardedTaskIds, [task.id]);
  // Even reintroducing the old ID cannot mint a second reward.
  state.tasks.push({ ...task, done: false });
  assert.equal(M.toggleTask(state, task.id, true), 0);
  assert.equal(state.balance, 10);
});

test('deleting the selected task nulls its timer link without stopping or restarting the timer', () => {
  const state = M.newState();
  const selected = M.addTask(state, { text: 'Selected' }, NOW);
  const other = M.addTask(state, { text: 'Other' }, NOW);
  M.setTimer(state, { minutes: 15, taskId: selected.id });
  M.startTimer(state, NOW);
  const { end, id } = state.timer;
  M.deleteTask(state, other.id);
  assert.equal(state.timer.taskId, selected.id);
  M.toggleTask(state, selected.id, true);
  M.deleteTask(state, selected.id);
  assert.equal(state.timer.taskId, null);
  assert.equal(state.timer.end, end);
  assert.equal(state.timer.id, id);
  assert.equal(M.tick(state, end).taskId, null);
  assert.deepEqual(state.rewardedTaskIds, [selected.id]);
});

test('wallet purchases deduct exactly once, never become negative and persist selection', () => {
  const state = M.newState();
  for (let index = 0; index < 6; index += 1) M.toggleTask(state, M.addTask(state, { text: 'Candy ' + index }, NOW).id, true);
  assert.equal(state.balance, 60);
  assert.equal(M.buySkin(state, 'harvest'), false);
  for (const [id, balance] of [['turnip', 50], ['violet', 30], ['ember', 0]]) {
    assert.equal(M.buySkin(state, id), true);
    assert.equal(state.balance, balance);
    assert.equal(M.buySkin(state, id), false);
    assert.equal(state.balance, balance);
    assert.equal(M.selectSkin(state, id), true);
  }
  assert.deepEqual(state.owned, ['harvest', 'turnip', 'violet', 'ember']);
  const storage = stored(state);
  const restored = M.load(storage, NOW);
  assert.equal(restored.warning, null);
  assert.equal(restored.state.balance, 0);
  assert.equal(restored.state.lantern, 'ember');
  assert.deepEqual(restored.state.owned, state.owned);
});

test('insufficient, unknown and unowned skin operations return false without spending', () => {
  const state = M.newState();
  for (const id of ['turnip', 'violet', 'ember', '__proto__', 'constructor', 'toString', 'missing', null]) {
    assert.equal(M.buySkin(state, id), false);
    assert.equal(M.selectSkin(state, id), false);
    assert.equal(state.balance, 0);
    assert.equal(state.lantern, 'harvest');
  }
  assert.equal(M.selectSkin(state, 'harvest'), true);
  state.balance = 9;
  assert.equal(M.buySkin(state, 'turnip'), false);
  assert.equal(state.balance, 9);
});

test('validated settings boundary values survive refresh', () => {
  for (const volume of [0, 0.3, 1]) {
    const state = M.newState();
    state.settings = { reducedMotion: true, volume };
    const restored = M.load(stored(state), NOW);
    assert.equal(restored.warning, null);
    assert.deepEqual(restored.state.settings, state.settings);
  }
});

test('setTimer selects supported modes/durations and resets in place with no credits', () => {
  const state = M.newState();
  const task = M.addTask(state, { text: 'Linked' }, NOW);
  const timer = state.timer;
  for (const minutes of [15, 25, 45]) {
    M.setTimer(state, { minutes, taskId: task.id });
    assert.equal(state.timer, timer);
    assert.deepEqual(timer, { mode: 'focus', minutes, remaining: minutes * 60, end: null, id: null, taskId: task.id });
    M.startTimer(state, NOW);
  }
  M.setTimer(state, { mode: 'break', minutes: 45 });
  assert.deepEqual(timer, { mode: 'break', minutes: 5, remaining: 300, end: null, id: null, taskId: null });
  M.setTimer(state, {});
  assert.deepEqual(timer, M.newState().timer);
  assert.equal(state.sessions.length, 0);
});

test('invalid timer selections throw atomically', () => {
  const state = M.newState();
  M.startTimer(state, NOW);
  const before = JSON.stringify(state);
  for (const options of [
    { mode: 'unknown' }, { mode: '__proto__' }, { minutes: 5 }, { minutes: 0 },
    { minutes: 1.5 }, { minutes: Infinity }, { minutes: NaN }, { minutes: '25' }, { taskId: 'missing' }
  ]) {
    assert.throws(() => M.setTimer(state, options), Error);
    assert.equal(JSON.stringify(state), before);
  }
});

test('tick uses the absolute deadline and ceiling, completes once and never completes the task', () => {
  const state = M.newState();
  const task = M.addTask(state, { text: 'Remain open' }, NOW);
  M.setTimer(state, { minutes: 15, taskId: task.id });
  M.startTimer(state, NOW);
  const { id, end } = state.timer;
  assert.equal(end, NOW + 900000);
  assert.equal(M.tick(state, NOW + 1), null);
  assert.equal(state.timer.remaining, 900);
  assert.equal(M.tick(state, NOW + 1001), null);
  assert.equal(state.timer.remaining, 899);
  assert.equal(M.tick(state, end - 1), null);
  assert.equal(state.timer.remaining, 1);
  const completed = M.tick(state, end);
  assert.deepEqual(completed, { id, minutes: 15, completedAt: end, taskId: task.id });
  assert.equal(state.sessions[0], completed);
  assert.equal(state.timer.end, null);
  assert.equal(state.timer.remaining, 0);
  assert.equal(task.done, false);
  assert.equal(state.balance, 0);
  assert.equal(M.tick(state, end), null);
  assert.equal(M.tick(state, end + 999999), null);
  assert.equal(state.sessions.length, 1);
});

test('paused and initially complete timers do not award focus sessions', () => {
  const state = M.newState();
  assert.equal(M.tick(state, NOW), null);
  M.pauseTimer(state, NOW);
  assert.equal(state.timer.id, null);
  state.timer.remaining = 0;
  assert.equal(M.tick(state, NOW + 1000), null);
  state.timer.id = 'not-running';
  assert.equal(M.tick(state, NOW + 2000), null);
  assert.equal(state.sessions.length, 0);
  M.startTimer(state, NOW + 3000);
  assert.notEqual(state.timer.id, 'not-running');
  assert.equal(state.timer.remaining, 1500);
  assert.equal(state.timer.end, NOW + 3000 + 1500000);
});

test('pause settles elapsed time and resume preserves ID while excluding paused time', () => {
  const state = M.newState();
  M.startTimer(state, NOW);
  const id = state.timer.id;
  M.pauseTimer(state, NOW + 2501);
  assert.equal(state.timer.end, null);
  assert.equal(state.timer.remaining, 1498);
  assert.equal(state.timer.id, id);
  assert.equal(state.sessions.length, 0);
  assert.equal(M.tick(state, NOW + 100000), null);
  assert.equal(state.timer.remaining, 1498);
  M.startTimer(state, NOW + 100000);
  assert.equal(state.timer.id, id);
  assert.equal(state.timer.end, NOW + 100000 + 1498000);
  assert.ok(M.tick(state, state.timer.end));
  assert.equal(state.sessions.length, 1);
});

test('pause after the deadline settles the actual completed session exactly once', () => {
  const state = M.newState();
  M.startTimer(state, NOW);
  const end = state.timer.end;
  M.pauseTimer(state, end + 5000);
  assert.equal(state.timer.remaining, 0);
  assert.equal(state.timer.end, null);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].completedAt, end);
  M.pauseTimer(state, end + 6000);
  assert.equal(state.sessions.length, 1);
});

test('reset preserves mode, duration and task, clears session identity and awards nothing', () => {
  const state = M.newState();
  const task = M.addTask(state, { text: 'Reset me' }, NOW);
  M.setTimer(state, { minutes: 45, taskId: task.id });
  M.startTimer(state, NOW);
  const oldId = state.timer.id;
  const oldEnd = state.timer.end;
  M.resetTimer(state);
  assert.deepEqual(state.timer, { mode: 'focus', minutes: 45, remaining: 2700, end: null, id: null, taskId: task.id });
  assert.equal(M.tick(state, oldEnd), null);
  assert.equal(state.sessions.length, 0);
  M.startTimer(state, NOW);
  assert.notEqual(state.timer.id, oldId);
  M.setTimer(state, { mode: 'break', taskId: task.id });
  M.startTimer(state, NOW);
  M.resetTimer(state);
  assert.deepEqual(state.timer, { mode: 'break', minutes: 5, remaining: 300, end: null, id: null, taskId: task.id });
  assert.equal(state.sessions.length, 0);
});

test('break completion never enters focus statistics or completes its linked task', () => {
  const state = M.newState();
  const task = M.addTask(state, { text: 'Rest' }, NOW);
  M.setTimer(state, { mode: 'break', taskId: task.id });
  M.startTimer(state, NOW);
  const end = state.timer.end;
  assert.equal(end, NOW + 300000);
  assert.equal(M.tick(state, end + 1), null);
  assert.equal(state.timer.end, null);
  assert.equal(state.timer.remaining, 0);
  assert.deepEqual(M.progress(state), { tasks: 0, sessions: 0 });
  assert.equal(M.stats(state, end).totalMinutes, 0);
  assert.equal(task.done, false);
});

test('Start on an existing run preserves the deadline; late Start settles without restarting', () => {
  const state = M.newState();
  M.startTimer(state, NOW);
  const { id, end } = state.timer;
  M.startTimer(state, NOW + 1000);
  assert.equal(state.timer.id, id);
  assert.equal(state.timer.end, end);
  assert.equal(state.timer.remaining, 1499);
  M.startTimer(state, end + 1);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.timer.id, id);
  assert.equal(state.timer.end, null);
  assert.equal(state.timer.remaining, 0);
  M.startTimer(state, end + 2);
  assert.notEqual(state.timer.id, id);
  assert.equal(state.timer.end, end + 2 + 1500000);
  assert.equal(state.timer.remaining, 1500);
  assert.equal(state.sessions.length, 1);
});

test('running, paused and ended v2 timers restore across refresh without double-counting', () => {
  let state = M.newState();
  const task = M.addTask(state, { text: 'Persisted link' }, NOW);
  M.setTimer(state, { minutes: 25, taskId: task.id });
  M.startTimer(state, NOW);
  const { id, end } = state.timer;
  const storage = memoryStorage();
  M.save(storage, state);
  const savedRaw = storage.data.get(M.KEY);
  let restored = M.load(storage, NOW + 10500);
  assert.equal(restored.warning, null);
  state = restored.state;
  assert.equal(state.timer.id, id);
  assert.equal(state.timer.end, end);
  assert.equal(state.timer.remaining, 1490);
  assert.equal(state.timer.taskId, task.id);
  assert.equal(storage.data.get(M.KEY), savedRaw);
  assert.equal(state.sessions.length, 0);
  M.pauseTimer(state, NOW + 20000);
  M.save(storage, state);
  restored = M.load(storage, NOW + 999999);
  assert.equal(restored.warning, null);
  state = restored.state;
  assert.equal(state.timer.id, id);
  assert.equal(state.timer.remaining, 1480);
  assert.equal(state.timer.end, null);
  M.startTimer(state, NOW + 999999);
  assert.equal(state.timer.id, id);
  const resumedEnd = state.timer.end;
  M.save(storage, state);
  restored = M.load(storage, resumedEnd + 5000);
  assert.equal(restored.warning, null);
  state = restored.state;
  assert.equal(state.timer.remaining, 0);
  assert.equal(state.sessions.length, 0);
  assert.equal(M.tick(state, resumedEnd + 5000).id, id);
  M.save(storage, state);
  state = M.load(storage, resumedEnd + 10000).state;
  assert.equal(M.tick(state, resumedEnd + 10000), null);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].completedAt, resumedEnd);
  assert.equal(state.tasks[0].done, false);
});

test('stale persisted end for an already credited session cannot award a duplicate', () => {
  const state = M.newState();
  M.startTimer(state, NOW);
  const { id, end } = state.timer;
  state.sessions.push(session(id, 25, end));
  const restored = M.load(stored(state), end + 1000).state;
  assert.equal(M.tick(restored, end + 1000), null);
  assert.equal(restored.sessions.length, 1);
  assert.equal(restored.timer.end, null);
  assert.equal(restored.timer.remaining, 0);
});

test('fresh focus sessions receive different IDs and each earns one completion', () => {
  const state = M.newState();
  const first = finish(state, 15);
  M.startTimer(state, NOW + 1000000);
  assert.notEqual(state.timer.id, first.id);
  const second = M.tick(state, state.timer.end);
  assert.notEqual(first.id, second.id);
  assert.equal(state.sessions.length, 2);
  assert.equal(M.stats(state, NOW).totalMinutes, 30);
});

test('progress deduplicates rewarded and completed IDs, including prototype strings', () => {
  const state = M.newState();
  state.rewardedTaskIds = ['__proto__', '__proto__', 'constructor', 'toString', null, '', 4];
  state.sessions = [session('__proto__'), session('__proto__'), session('constructor'), session('break', 5), null];
  assert.deepEqual(M.progress(state), { tasks: 3, sessions: 2 });
});

test('all six lore thresholds unlock at their exact task/session boundaries', () => {
  const expected = [
    ['lanterns', 0, 0], ['samhain', 1, 0], ['hallows', 0, 1],
    ['guising', 3, 0], ['ghosts', 0, 2], ['harvest', 5, 0]
  ];
  for (let tasks = 0; tasks <= 5; tasks += 1) {
    for (let sessions = 0; sessions <= 2; sessions += 1) {
      const state = M.newState();
      state.rewardedTaskIds = Array.from({ length: tasks }, (_, index) => 't-' + index);
      state.sessions = Array.from({ length: sessions }, (_, index) => session('s-' + index));
      for (const [id, taskThreshold, sessionThreshold] of expected) {
        assert.equal(M.isLoreUnlocked(state, id), tasks >= taskThreshold && sessions >= sessionThreshold, `${id}: ${tasks} tasks, ${sessions} sessions`);
      }
    }
  }
  for (const id of ['unknown', '__proto__', 'constructor', null]) assert.equal(M.isLoreUnlocked(M.newState(), id), false);
});

test('lore progress survives completed-task deletion and actual focus sessions', () => {
  const state = M.newState();
  for (let index = 0; index < 5; index += 1) {
    const task = M.addTask(state, { text: 'Milestone ' + index }, NOW);
    M.toggleTask(state, task.id, true);
    M.toggleTask(state, task.id, false);
    M.deleteTask(state, task.id);
  }
  finish(state, 15, NOW);
  finish(state, 25, NOW + 2000000);
  const restored = M.load(stored(state), NOW).state;
  assert.deepEqual(M.progress(restored), { tasks: 5, sessions: 2 });
  for (const rule of M.LORE_RULES) assert.equal(M.isLoreUnlocked(restored, rule.id), true);
});

test('stats returns seven chronological local dates, zero days, daily counts and lifetime minutes', () => {
  const state = M.newState();
  const today = new Date(2026, 10, 17, 12).getTime();
  const at = (day, hour = 12) => new Date(2026, 10, day, hour).getTime();
  state.sessions = [
    session('older', 45, at(1)), session('first', 15, at(11)), session('middle', 25, at(14)),
    session('today-a', 25, at(17, 8)), session('today-b', 45, at(17, 11)),
    session('today-a', 25, at(17, 8)), session('not-focus', 5, at(17)),
    session('invalid-date', 15, Infinity), session('invalid-minutes', NaN, at(17))
  ];
  assert.deepEqual(M.stats(state, today), {
    todaySessions: 2,
    totalMinutes: 155,
    days: [
      { date: '2026-11-11', minutes: 15, sessions: 1 },
      { date: '2026-11-12', minutes: 0, sessions: 0 },
      { date: '2026-11-13', minutes: 0, sessions: 0 },
      { date: '2026-11-14', minutes: 25, sessions: 1 },
      { date: '2026-11-15', minutes: 0, sessions: 0 },
      { date: '2026-11-16', minutes: 0, sessions: 0 },
      { date: '2026-11-17', minutes: 70, sessions: 2 }
    ]
  });
  assert.deepEqual(M.stats(M.newState(), today).days.map(day => day.minutes), [0, 0, 0, 0, 0, 0, 0]);
});

test('delayed tick across midnight attributes focus to the deadline date rather than the observation date', () => {
  const state = M.newState();
  const start = new Date(2026, 10, 16, 23, 44).getTime();
  const observed = new Date(2026, 10, 17, 1).getTime();
  M.setTimer(state, { minutes: 15 });
  M.startTimer(state, start);
  const deadline = new Date(2026, 10, 16, 23, 59).getTime();
  assert.equal(state.timer.end, deadline);
  assert.equal(M.tick(state, observed).completedAt, deadline);
  const summary = M.stats(state, observed);
  assert.equal(summary.todaySessions, 0);
  assert.deepEqual(summary.days[5], { date: '2026-11-16', minutes: 15, sessions: 1 });
  assert.deepEqual(summary.days[6], { date: '2026-11-17', minutes: 0, sessions: 0 });
});

test('a focus crossing midnight belongs to the date it completes', () => {
  const state = M.newState();
  M.setTimer(state, { minutes: 15 });
  M.startTimer(state, new Date(2026, 10, 16, 23, 55).getTime());
  const end = state.timer.end;
  M.tick(state, end);
  const summary = M.stats(state, end);
  assert.equal(summary.todaySessions, 1);
  assert.deepEqual(summary.days[6], { date: '2026-11-17', minutes: 15, sessions: 1 });
});

test('localDate uses local calendar fields, pads month/day and handles month/year boundaries', () => {
  assert.equal(M.localDate(new Date(2026, 0, 2, 0, 1).getTime()), '2026-01-02');
  const summary = M.stats(M.newState(), new Date(2027, 0, 2, 0, 1).getTime());
  assert.deepEqual(summary.days.map(day => day.date), [
    '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'
  ]);
});

test('DST spring-forward and fall-back retain seven distinct consecutive local dates', () => {
  const code = `
    const assert = require('node:assert/strict');
    const M = require(${JSON.stringify(MODEL_PATH)});
    assert.equal(new Date(2026, 0, 1).getTimezoneOffset(), 300);
    assert.equal(new Date(2026, 6, 1).getTimezoneOffset(), 240);
    const spring = M.newState();
    spring.sessions = [{ id: 'spring', minutes: 15, completedAt: new Date(2026, 2, 8, 23, 59).getTime(), taskId: null }];
    const springStats = M.stats(spring, new Date(2026, 2, 9, 0, 30).getTime());
    assert.deepEqual(springStats.days.map(d => d.date), ['2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09']);
    assert.equal(springStats.days[5].minutes, 15);
    assert.equal(springStats.todaySessions, 0);
    const fall = M.stats(M.newState(), new Date(2026, 10, 2, 0, 30).getTime());
    assert.deepEqual(fall.days.map(d => d.date), ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    assert.equal(new Set(fall.days.map(d => d.date)).size, 7);
    assert.equal(M.localDate(Date.UTC(2026, 10, 17, 2)), '2026-11-16');
  `;
  execFileSync(process.execPath, ['-e', code], { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8' });
});

test('local date and daily stats honor time zones ahead of UTC', () => {
  const code = `
    const assert = require('node:assert/strict');
    const M = require(${JSON.stringify(MODEL_PATH)});
    const time = Date.UTC(2026, 10, 16, 16);
    assert.equal(M.localDate(time), '2026-11-17');
    const state = M.newState();
    state.sessions = [{ id: 'tokyo', minutes: 25, completedAt: time, taskId: null }];
    const summary = M.stats(state, time);
    assert.equal(summary.todaySessions, 1);
    assert.deepEqual(summary.days[6], { date: '2026-11-17', minutes: 25, sessions: 1 });
  `;
  execFileSync(process.execPath, ['-e', code], { env: { ...process.env, TZ: 'Asia/Tokyo' }, encoding: 'utf8' });
});

test('invalid operation timestamps throw instead of producing NaN timer/statistics values', () => {
  const state = M.newState();
  const before = JSON.stringify(state);
  for (const value of [NaN, Infinity, -Infinity, 'now', null, 1e300]) {
    assert.throws(() => M.startTimer(state, value), Error);
    assert.throws(() => M.pauseTimer(state, value), Error);
    assert.throws(() => M.tick(state, value), Error);
    assert.throws(() => M.stats(state, value), Error);
    assert.throws(() => M.localDate(value), Error);
  }
  assert.equal(JSON.stringify(state), before);
});

test('regression (found by PBT): a deadline further away than one session is clamped on load and tick', () => {
  const far = NOW + 25 * 60 * 1000 + 1;
  const storage = stored({ ...M.newState(), timer: { mode: 'focus', minutes: 25, remaining: 1500, end: far, id: 's1', taskId: null } });
  const { state } = M.load(storage, NOW);
  assert.equal(state.timer.remaining, 1500);
  assert.equal(state.timer.end, NOW + 1500 * 1000);
  const clockBack = M.newState();
  M.startTimer(clockBack, NOW);
  M.tick(clockBack, NOW - 60 * 60 * 1000); // Local clock moved back one hour.
  assert.equal(clockBack.timer.remaining, 1500);
  assert.equal(clockBack.timer.end, NOW - 60 * 60 * 1000 + 1500 * 1000);
});
