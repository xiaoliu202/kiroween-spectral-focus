'use strict';
/* Property-based tests for model.js (spec: .kiro/specs/kiro-iteration, R1). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');
const M = require('../model.js');

const NOW = new Date(2026, 10, 17, 12, 0, 0).getTime();
const RUNS = Number(process.env.SPECTRAL_PBT_RUNS) || 250;
const COST = Object.fromEntries(M.SKINS.map(skin => [skin.id, skin.cost]));
const SKIN_IDS = M.SKINS.map(skin => skin.id);
const LORE_IDS = M.LORE_RULES.map(rule => rule.id);

function memoryStorage(entries = []) {
  const data = new Map(entries);
  return {
    data, writes: [],
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { this.writes.push(key); data.set(key, String(value)); }
  };
}

// --- Generators -----------------------------------------------------------
const title = fc.string({ minLength: 1, maxLength: 120 }).filter(s => s.trim().length > 0 && s.trim().length <= 120);
const note = fc.string({ maxLength: 500 });
const priority = fc.constantFrom('low', 'normal', 'high');
const index = fc.nat({ max: 50 });
const step = fc.oneof(fc.integer({ min: 0, max: 5_000 }), fc.integer({ min: 0, max: 3_600_000 }));

const taskOp = fc.oneof(
  fc.record({ op: fc.constant('add'), text: title, note, priority }),
  fc.record({ op: fc.constant('edit'), i: index, text: title, note, priority }),
  fc.record({ op: fc.constant('toggle'), i: index, done: fc.boolean() }),
  fc.record({ op: fc.constant('delete'), i: index }),
  fc.record({ op: fc.constant('buy'), skin: fc.constantFrom(...SKIN_IDS, 'unknown') }),
  fc.record({ op: fc.constant('select'), skin: fc.constantFrom(...SKIN_IDS, 'unknown') })
);
const timerOp = fc.oneof(
  fc.record({ op: fc.constant('setTimer'), mode: fc.constantFrom('focus', 'break'), minutes: fc.constantFrom(15, 25, 45), link: fc.option(index) }),
  fc.record({ op: fc.constant('start'), dt: step }),
  fc.record({ op: fc.constant('pause'), dt: step }),
  fc.record({ op: fc.constant('tick'), dt: step }),
  fc.record({ op: fc.constant('reset') })
);
const anyOp = fc.oneof({ arbitrary: taskOp, weight: 3 }, { arbitrary: timerOp, weight: 2 });

function pick(state, i) {
  return state.tasks.length ? state.tasks[i % state.tasks.length] : null;
}

function apply(state, action, clock) {
  const task = 'i' in action ? pick(state, action.i) : null;
  switch (action.op) {
    case 'add': M.addTask(state, action, clock.now); break;
    case 'edit': if (task) M.editTask(state, task.id, action); break;
    case 'toggle': if (task) M.toggleTask(state, task.id, action.done); break;
    case 'delete': if (task) M.deleteTask(state, task.id); break;
    case 'buy': M.buySkin(state, action.skin); break;
    case 'select': M.selectSkin(state, action.skin); break;
    case 'setTimer': {
      const linked = action.link === null ? null : pick(state, action.link);
      M.setTimer(state, { mode: action.mode, minutes: action.minutes, taskId: linked ? linked.id : null });
      break;
    }
    case 'start': clock.now += action.dt; M.startTimer(state, clock.now); break;
    case 'pause': clock.now += action.dt; M.pauseTimer(state, clock.now); break;
    case 'tick': clock.now += action.dt; M.tick(state, clock.now); break;
    case 'reset': M.resetTimer(state); break;
    default: throw new Error('Unknown generated op ' + action.op);
  }
}

// --- Invariants -----------------------------------------------------------
function assertShape(state) {
  assert.ok(Number.isSafeInteger(state.balance) && state.balance >= 0, `balance ${state.balance} must be a non-negative integer`);
  assert.equal(new Set(state.rewardedTaskIds).size, state.rewardedTaskIds.length, 'reward ledger has duplicates');
  assert.equal(new Set(state.owned).size, state.owned.length, 'owned lanterns have duplicates');
  assert.ok(state.owned.includes('harvest'), 'Harvest Jack must always be owned');
  assert.ok(state.owned.every(id => SKIN_IDS.includes(id)), 'owned contains an unknown lantern');
  assert.ok(state.owned.includes(state.lantern), 'selected lantern must be owned');
  assert.equal(new Set(state.tasks.map(task => task.id)).size, state.tasks.length, 'task ids are not unique');
  const timer = state.timer;
  assert.ok(timer.remaining >= 0 && timer.remaining <= timer.minutes * 60,
    `timer.remaining ${timer.remaining} outside [0, ${timer.minutes * 60}]`);
  assert.ok(timer.mode === 'break' ? timer.minutes === 5 : [15, 25, 45].includes(timer.minutes), 'invalid timer duration');
}

function assertLedger(state) {
  const spent = state.owned.reduce((sum, id) => sum + COST[id], 0);
  assert.equal(state.balance, M.REWARD * state.rewardedTaskIds.length - spent, 'balance must equal earned minus spent');
}

function assertSessions(state) {
  assert.equal(new Set(state.sessions.map(s => s.id)).size, state.sessions.length, 'duplicate completed session');
  for (const session of state.sessions) assert.ok([15, 25, 45].includes(session.minutes), 'non-focus session recorded');
}

function unlocked(state) {
  return LORE_IDS.filter(id => M.isLoreUnlocked(state, id));
}

// --- Properties -----------------------------------------------------------
test('PBT R1.1-R1.3: rewards, purchases and unlocks hold for any operation sequence', () => {
  fc.assert(fc.property(fc.array(anyOp, { maxLength: 60 }), actions => {
    const state = M.newState();
    const clock = { now: NOW };
    let before = M.progress(state);
    let openStories = unlocked(state);
    for (const action of actions) {
      apply(state, action, clock);
      assertShape(state);
      assertLedger(state);
      const after = M.progress(state);
      assert.ok(after.tasks >= before.tasks && after.sessions >= before.sessions, 'progress went backwards');
      const nowOpen = unlocked(state);
      assert.ok(openStories.every(id => nowOpen.includes(id)), 'a discovered story became locked again');
      before = after; openStories = nowOpen;
    }
  }), { numRuns: RUNS });
});

test('PBT R1.4: timer operations never duplicate sessions, leave range, or complete tasks', () => {
  const setup = fc.array(fc.record({ text: title, done: fc.boolean() }), { maxLength: 4 });
  fc.assert(fc.property(setup, fc.array(timerOp, { maxLength: 80 }), (seed, actions) => {
    const state = M.newState();
    const clock = { now: NOW };
    for (const item of seed) {
      const task = M.addTask(state, { text: item.text }, clock.now);
      if (item.done) M.toggleTask(state, task.id, true);
    }
    const doneFlags = state.tasks.map(task => task.done);
    for (const action of actions) {
      apply(state, action, clock);
      assertShape(state);
      assertSessions(state);
      assert.deepEqual(state.tasks.map(task => task.done), doneFlags, 'a timer operation changed task completion');
    }
  }), { numRuns: RUNS });
});

test('PBT R1.5: save then load returns the same state without a warning', () => {
  fc.assert(fc.property(fc.array(anyOp, { maxLength: 50 }), actions => {
    const state = M.newState();
    const clock = { now: NOW };
    for (const action of actions) apply(state, action, clock);
    const storage = memoryStorage();
    assert.equal(M.save(storage, state), true);
    const loaded = M.load(storage, clock.now);
    assert.equal(loaded.warning, null);
    assert.equal(loaded.migrated, false);
    assert.deepEqual(loaded.state, JSON.parse(JSON.stringify(state)));
  }), { numRuns: RUNS });
});

// Near-valid records reach deeper normalizer branches than pure random JSON.
const looseTimer = fc.record({
  mode: fc.oneof(fc.constantFrom('focus', 'break'), fc.jsonValue()),
  minutes: fc.oneof(fc.constantFrom(5, 15, 25, 45), fc.jsonValue()),
  remaining: fc.oneof(fc.double({ noNaN: false }), fc.integer({ min: -1e6, max: 1e7 }), fc.jsonValue()),
  end: fc.oneof(fc.constant(null), fc.integer({ min: NOW - 1e8, max: NOW + 1e8 }), fc.jsonValue()),
  id: fc.oneof(fc.string(), fc.constant(null)),
  taskId: fc.oneof(fc.string(), fc.constant(null))
}, { requiredKeys: [] });
const looseTask = fc.record({
  id: fc.oneof(fc.string(), fc.constantFrom('__proto__', 'constructor', 'toString'), fc.jsonValue()),
  text: fc.oneof(fc.string({ maxLength: 200 }), fc.jsonValue()),
  note: fc.oneof(fc.string({ maxLength: 600 }), fc.jsonValue()),
  priority: fc.oneof(fc.constantFrom('low', 'normal', 'high'), fc.jsonValue()),
  done: fc.oneof(fc.boolean(), fc.jsonValue()),
  createdAt: fc.oneof(fc.integer(), fc.jsonValue())
}, { requiredKeys: [] });
const looseV2 = fc.record({
  version: fc.constant(2),
  tasks: fc.oneof(fc.array(looseTask, { maxLength: 6 }), fc.jsonValue()),
  balance: fc.oneof(fc.integer({ min: -100, max: 1000 }), fc.jsonValue()),
  rewardedTaskIds: fc.oneof(fc.array(fc.string(), { maxLength: 6 }), fc.jsonValue()),
  owned: fc.oneof(fc.array(fc.constantFrom(...SKIN_IDS, 'x'), { maxLength: 6 }), fc.jsonValue()),
  lantern: fc.oneof(fc.constantFrom(...SKIN_IDS, 'x'), fc.jsonValue()),
  timer: fc.oneof(looseTimer, fc.jsonValue()),
  sessions: fc.oneof(fc.array(fc.record({ id: fc.string(), minutes: fc.constantFrom(5, 15, 25, 45, 60), completedAt: fc.integer({ min: NOW - 1e9, max: NOW }), mode: fc.constantFrom('focus', 'break', undefined) }, { requiredKeys: [] }), { maxLength: 6 }), fc.jsonValue()),
  settings: fc.oneof(fc.record({ reducedMotion: fc.jsonValue(), volume: fc.jsonValue() }), fc.jsonValue())
}, { requiredKeys: [] });

test('PBT R1.6: any stored v2 content loads safely, validly and without writing', () => {
  const content = fc.oneof(fc.jsonValue().map(v => JSON.stringify(v)), looseV2.map(v => JSON.stringify(v)), fc.string());
  fc.assert(fc.property(content, fc.integer({ min: NOW - 1e8, max: NOW + 1e8 }), (json, now) => {
    if (json === undefined) return;
    const storage = memoryStorage([[M.KEY, json]]);
    const result = M.load(storage, now);
    assertShape(result.state);
    assertSessions(result.state);
    assert.deepEqual(storage.writes, [], 'load must never overwrite current data');
    assert.equal(storage.data.get(M.KEY), json, 'original v2 bytes changed');
  }), { numRuns: RUNS * 2 });
});

test('PBT R1.7: v1 migration keeps legacy bytes, mints no candy and ledgers old completions', () => {
  const v1 = fc.record({
    tasks: fc.oneof(fc.array(looseTask, { maxLength: 6 }), fc.jsonValue()),
    minutes: fc.oneof(fc.constantFrom(15, 25, 45), fc.jsonValue()),
    remaining: fc.oneof(fc.integer({ min: -10, max: 4000 }), fc.jsonValue()),
    end: fc.oneof(fc.constant(null), fc.integer({ min: NOW - 1e8, max: NOW + 1e8 }), fc.jsonValue())
  }, { requiredKeys: [] });
  fc.assert(fc.property(v1, raw => {
    const json = JSON.stringify(raw);
    const storage = memoryStorage([[M.LEGACY_KEY, json]]);
    const { state, migrated } = M.load(storage, NOW);
    assert.equal(migrated, true);
    assert.equal(storage.data.get(M.LEGACY_KEY), json, 'v1 bytes changed');
    assert.ok(storage.writes.every(key => key === M.KEY), 'migration wrote to a key other than v2');
    assert.equal(state.balance, 0);
    assertShape(state);
    for (const task of state.tasks.filter(t => t.done)) assert.ok(state.rewardedTaskIds.includes(task.id), 'migrated completion can still earn candy');
    for (const task of state.tasks) {
      const wasDone = task.done;
      assert.equal(M.toggleTask(state, task.id, true), wasDone ? 0 : M.REWARD);
    }
  }), { numRuns: RUNS });
});

test('PBT R1.8: statistics count each valid focus session once', () => {
  const session = fc.record({
    id: fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f'),
    minutes: fc.constantFrom(5, 15, 25, 45),
    completedAt: fc.integer({ min: NOW - 20 * 86_400_000, max: NOW }),
    mode: fc.constantFrom('focus', 'break', undefined)
  }, { requiredKeys: ['id', 'minutes', 'completedAt'] });
  fc.assert(fc.property(fc.array(session, { maxLength: 20 }), sessions => {
    const state = { ...M.newState(), sessions };
    const result = M.stats(state, NOW);
    const seen = new Set();
    let expected = 0;
    for (const s of sessions) {
      if (seen.has(s.id) || s.minutes === 5 || (s.mode !== undefined && s.mode !== 'focus')) continue;
      seen.add(s.id); expected += s.minutes;
    }
    assert.equal(result.totalMinutes, expected);
    assert.equal(result.days.length, 7);
    assert.equal(new Set(result.days.map(d => d.date)).size, 7);
    assert.ok(result.days.reduce((sum, d) => sum + d.minutes, 0) <= result.totalMinutes);
    assert.equal(result.days[6].date, M.localDate(NOW));
    assert.equal(result.todaySessions, result.days[6].sessions);
  }), { numRuns: RUNS });
});
