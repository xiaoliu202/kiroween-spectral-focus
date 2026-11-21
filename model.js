(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.SpectralModel = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const KEY = 'spectral-focus-v2';
  const LEGACY_KEY = 'spectral-focus-v1';
  const REWARD = 10;
  const SKINS = Object.freeze([
    { id: 'harvest', name: 'Harvest Jack', cost: 0 },
    { id: 'turnip', name: 'Old-world Turnip', cost: 10 },
    { id: 'violet', name: 'Moonlit Pumpkin', cost: 20 },
    { id: 'ember', name: 'Ember Keeper', cost: 30 }
  ].map(Object.freeze));
  const LORE_RULES = Object.freeze([
    { id: 'lanterns', tasks: 0, sessions: 0 },
    { id: 'samhain', tasks: 1, sessions: 0 },
    { id: 'hallows', tasks: 0, sessions: 1 },
    { id: 'guising', tasks: 3, sessions: 0 },
    { id: 'ghosts', tasks: 0, sessions: 2 },
    { id: 'harvest', tasks: 5, sessions: 0 }
  ].map(Object.freeze));
  const FOCUS_MINUTES = [15, 25, 45];
  const PRIORITIES = ['low', 'normal', 'high'];
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isId = value => typeof value === 'string' && value.trim().length > 0;
  const isTimestamp = value => Number.isFinite(value) && Math.abs(value) <= 8640000000000000;
  const BACKUP_FORMAT = 'spectral-focus-backup';
  const BACKUP_VERSION = 1;
  const MAX_BACKUP_BYTES = 1_000_000;
  let counter = 0;

  function timestamp(value) {
    if (!isTimestamp(value)) throw new Error('Invalid timestamp.');
    return value;
  }

  function uniqueId(kind, now, used) {
    let id;
    try {
      if (root.crypto && typeof root.crypto.randomUUID === 'function') id = root.crypto.randomUUID();
    } catch (_) { /* Restricted contexts may expose an unusable crypto object. */ }
    if (!isId(id) || used.has(id)) {
      do {
        counter += 1;
        id = kind + '-' + now.toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + counter.toString(36);
      } while (used.has(id));
    }
    return id;
  }

  function newState() {
    return {
      version: 2,
      tasks: [],
      balance: 0,
      rewardedTaskIds: [],
      owned: ['harvest'],
      lantern: 'harvest',
      timer: { mode: 'focus', minutes: 25, remaining: 1500, end: null, id: null, taskId: null },
      sessions: [],
      settings: { reducedMotion: false, volume: 0.3 }
    };
  }

  function uniqueIds(values) {
    return [...new Set(Array.isArray(values) ? values.filter(isId) : [])];
  }

  function completedSessions(state) {
    const seen = new Set();
    return (Array.isArray(state.sessions) ? state.sessions : []).filter(session => {
      if (!isRecord(session) || !isId(session.id) || seen.has(session.id) ||
          !FOCUS_MINUTES.includes(session.minutes) || !isTimestamp(session.completedAt) ||
          (session.mode !== undefined && session.mode !== 'focus')) return false;
      seen.add(session.id);
      return true;
    });
  }

  function normalize(raw, now, legacy) {
    const state = newState();
    const taskIds = new Set();
    const rewards = new Set(legacy ? [] : uniqueIds(raw.rewardedTaskIds));
    const tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
    for (const item of tasks) {
      if (!isRecord(item) || typeof item.text !== 'string' || !item.text.trim()) continue;
      const id = isId(item.id) ? item.id : uniqueId('task', now, new Set([...taskIds, ...rewards]));
      if (item.done === true) rewards.add(id); // Imported completions never mint candy.
      if (taskIds.has(id)) {
        if (item.done === true) state.tasks.find(task => task.id === id).done = true;
        continue;
      }
      taskIds.add(id);
      state.tasks.push({
        id,
        text: item.text.trim().slice(0, 120),
        note: !legacy && typeof item.note === 'string' ? item.note.slice(0, 500) : '',
        priority: !legacy && PRIORITIES.includes(item.priority) ? item.priority : 'normal',
        done: item.done === true,
        createdAt: !legacy && isTimestamp(item.createdAt) ? item.createdAt : now
      });
    }
    state.rewardedTaskIds = [...rewards];
    if (!legacy) {
      state.balance = Number.isSafeInteger(raw.balance) && raw.balance >= 0 ? raw.balance : 0;
      state.owned = [...new Set(['harvest', ...(Array.isArray(raw.owned) ? raw.owned : [])
        .filter(id => SKINS.some(skin => skin.id === id))])];
      state.lantern = state.owned.includes(raw.lantern) ? raw.lantern : 'harvest';
      state.sessions = completedSessions(raw).map(session => ({
        id: session.id,
        minutes: session.minutes,
        completedAt: session.completedAt,
        taskId: isId(session.taskId) ? session.taskId : null
      }));
      const settings = isRecord(raw.settings) ? raw.settings : {};
      state.settings = {
        reducedMotion: settings.reducedMotion === true,
        volume: Number.isFinite(settings.volume) && settings.volume >= 0 && settings.volume <= 1 ? settings.volume : 0.3
      };
    }
    const source = legacy ? raw : (isRecord(raw.timer) ? raw.timer : {});
    const mode = !legacy && source.mode === 'break' ? 'break' : 'focus';
    const minutes = mode === 'break' ? 5 : (FOCUS_MINUTES.includes(source.minutes) ? source.minutes : 25);
    const end = isTimestamp(source.end) && source.end > 0 ? source.end : null;
    let id = !legacy && isId(source.id) ? source.id : null;
    if (end !== null && id === null) id = uniqueId('session', now, new Set(state.sessions.map(session => session.id)));
    state.timer = {
      mode,
      minutes,
      remaining: Number.isFinite(source.remaining) ? Math.max(0, Math.min(minutes * 60, Math.ceil(source.remaining))) : minutes * 60,
      end,
      id,
      taskId: !legacy && taskIds.has(source.taskId) ? source.taskId : null
    };
    return state;
  }

  // Ignore object key order when deciding whether persisted v2 data needed repair.
  function sameData(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(b);
    return Object.keys(a).length === keys.length && keys.every(key =>
      Object.prototype.hasOwnProperty.call(a, key) && sameData(a[key], b[key]));
  }

  function save(storage, state) {
    try {
      const json = JSON.stringify(state);
      if (typeof json !== 'string') return false;
      storage.setItem(KEY, json);
      return true;
    } catch (_) {
      return false;
    }
  }

  function load(storage, now = Date.now()) {
    now = isTimestamp(now) ? now : Date.now();
    let json;
    let legacy = false;
    try {
      json = storage.getItem(KEY);
      if (json == null) {
        json = storage.getItem(LEGACY_KEY);
        legacy = json != null;
      }
    } catch (_) {
      return { state: newState(), warning: 'Saved data could not be read. Storage is unavailable.', migrated: false };
    }
    if (json == null) return { state: newState(), warning: null, migrated: false };
    let raw;
    let state;
    let warning = null;
    try {
      raw = JSON.parse(json);
      if (!isRecord(raw)) throw new Error('Invalid saved state.');
      state = normalize(raw, now, legacy);
      if (!legacy && !sameData(raw, state)) warning = 'Some saved data was invalid and has been repaired in memory. The original has been kept.';
    } catch (_) {
      return { state: newState(), warning: 'Saved data is damaged or invalid. The original has been kept.', migrated: false };
    }
    if (state.timer.end !== null) {
      // Leave settlement to tick so the caller receives the completion event.
      clampDeadline(state.timer, now);
      state.timer.remaining = Math.max(0, Math.ceil((state.timer.end - now) / 1000));
    }
    if (legacy && !save(storage, state)) warning = 'Old data was restored, but the upgraded data could not be saved. Storage is unavailable.';
    return { state, warning, migrated: legacy };
  }

  function createBackup(state, exportedAt = Date.now()) {
    timestamp(exportedAt);
    if (!isRecord(state) || state.version !== 2) throw new Error('Only a valid v2 state can be backed up.');
    const snapshot = JSON.parse(JSON.stringify(state));
    const normalized = normalize(snapshot, exportedAt, false);
    if (!sameData(snapshot, normalized)) throw new Error('The current state is not valid for backup.');
    if (snapshot.timer.end !== null) {
      clampDeadline(snapshot.timer, exportedAt);
      snapshot.timer.remaining = Math.max(0, Math.ceil((snapshot.timer.end - exportedAt) / 1000));
      snapshot.timer.end = null;
    }
    return { format: BACKUP_FORMAT, formatVersion: BACKUP_VERSION, exportedAt, data: snapshot };
  }

  function parseBackup(json, now = Date.now()) {
    if (!isTimestamp(now)) now = Date.now();
    if (typeof json !== 'string') return { state: null, error: 'Choose a JSON backup file.' };
    if (json.length > MAX_BACKUP_BYTES) return { state: null, error: 'The backup file is too large.' };
    let bytes;
    try { bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(json).byteLength : json.length * 2; }
    catch (_) { return { state: null, error: 'The backup file could not be read.' }; }
    if (bytes > MAX_BACKUP_BYTES) return { state: null, error: 'The backup file is too large.' };
    let envelope;
    try { envelope = JSON.parse(json); }
    catch (_) { return { state: null, error: 'This file is not valid JSON.' }; }
    if (!isRecord(envelope) || envelope.format !== BACKUP_FORMAT || envelope.formatVersion !== BACKUP_VERSION) {
      return { state: null, error: 'This is not a supported Spectral Focus backup.' };
    }
    if (!isTimestamp(envelope.exportedAt) || !isRecord(envelope.data) || envelope.data.version !== 2) {
      return { state: null, error: 'The backup is incomplete or has an unsupported data version.' };
    }
    try {
      const state = normalize(envelope.data, now, false);
      if (!sameData(envelope.data, state)) return { state: null, error: 'The backup contains invalid or unsupported data.' };
      if (state.timer.end !== null) {
        clampDeadline(state.timer, now);
        state.timer.remaining = Math.max(0, Math.ceil((state.timer.end - now) / 1000));
        state.timer.end = null;
      }
      return {
        state,
        error: null,
        summary: {
          exportedAt: envelope.exportedAt,
          tasks: state.tasks.length,
          completedTasks: state.tasks.filter(task => task.done).length,
          sessions: state.sessions.length,
          timerRunning: state.timer.end !== null
        }
      };
    } catch (_) {
      return { state: null, error: 'The backup contains invalid or unsupported data.' };
    }
  }

  function taskValues({ text, note = '', priority = 'normal' } = {}) {
    if (typeof text !== 'string' || !text.trim() || text.trim().length > 120) {
      throw new Error('Task title must contain 1 to 120 characters.');
    }
    if (typeof note !== 'string' || note.length > 500) throw new Error('Task note must contain at most 500 characters.');
    if (!PRIORITIES.includes(priority)) throw new Error('Unknown task priority.');
    return { text: text.trim(), note, priority };
  }

  function findTask(state, id) {
    const task = state.tasks.find(item => item.id === id);
    if (!task) throw new Error('Unknown task id.');
    return task;
  }

  function addTask(state, input, now = Date.now()) {
    const values = taskValues(input);
    timestamp(now);
    const used = new Set([...state.tasks.map(task => task.id), ...state.rewardedTaskIds]);
    const task = { id: uniqueId('task', now, used), ...values, done: false, createdAt: now };
    state.tasks.push(task);
    return task;
  }

  function editTask(state, id, input) {
    const task = findTask(state, id);
    const values = taskValues(input);
    Object.assign(task, values);
    return task;
  }

  function toggleTask(state, id, done) {
    const task = findTask(state, id);
    if (typeof done !== 'boolean') throw new Error('Task completion must be a boolean.');
    task.done = done;
    if (!done || state.rewardedTaskIds.includes(id)) return 0;
    state.rewardedTaskIds.push(id);
    state.balance += REWARD;
    return REWARD;
  }

  function deleteTask(state, id) {
    const task = findTask(state, id);
    state.tasks.splice(state.tasks.indexOf(task), 1);
    if (state.timer.taskId === id) state.timer.taskId = null;
  }

  function buySkin(state, id) {
    const skin = SKINS.find(item => item.id === id);
    if (!skin || state.owned.includes(id) || !Number.isFinite(state.balance) || state.balance < skin.cost) return false;
    state.balance -= skin.cost;
    state.owned.push(id);
    return true;
  }

  function selectSkin(state, id) {
    if (!SKINS.some(skin => skin.id === id) || !state.owned.includes(id)) return false;
    state.lantern = id;
    return true;
  }

  function setTimer(state, { mode = 'focus', minutes = 25, taskId = null } = {}) {
    if (mode !== 'focus' && mode !== 'break') throw new Error('Unknown timer mode.');
    if (mode === 'break') minutes = 5;
    else if (!FOCUS_MINUTES.includes(minutes)) throw new Error('Focus duration must be 15, 25 or 45 minutes.');
    if (taskId !== null) findTask(state, taskId);
    Object.assign(state.timer, { mode, minutes, remaining: minutes * 60, end: null, id: null, taskId });
    return state.timer;
  }

  function resetTimer(state) {
    Object.assign(state.timer, { remaining: state.timer.minutes * 60, end: null, id: null });
    return state.timer;
  }

  // A deadline can never be further away than one full session. A local clock set
  // backwards (or edited storage) would otherwise show more time than was chosen.
  // Found by the property tests in tests/model.property.test.cjs.
  function clampDeadline(timer, now) {
    const latest = now + timer.minutes * 60 * 1000;
    if (timer.end > latest) timer.end = latest;
  }

  function tick(state, now = Date.now()) {
    timestamp(now);
    const timer = state.timer;
    if (timer.end === null) return null;
    clampDeadline(timer, now);
    const deadline = timer.end;
    timer.remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
    if (timer.remaining > 0) return null;
    timer.end = null;
    if (timer.mode !== 'focus' || !isId(timer.id) || state.sessions.some(session => session.id === timer.id)) return null;
    const session = { id: timer.id, minutes: timer.minutes, completedAt: deadline, taskId: timer.taskId };
    state.sessions.push(session);
    return session;
  }

  function startTimer(state, now = Date.now()) {
    timestamp(now);
    const timer = state.timer;
    if (timer.end !== null) {
      tick(state, now);
      return timer; // A late/double Start settles the old run; it must not silently restart it.
    }
    if (timer.remaining <= 0) resetTimer(state);
    if (timer.id === null) timer.id = uniqueId('session', now, new Set(state.sessions.map(session => session.id)));
    timer.end = now + timer.remaining * 1000;
    return timer;
  }

  function pauseTimer(state, now = Date.now()) {
    tick(state, now);
    state.timer.end = null;
    return state.timer;
  }

  function progress(state) {
    return { tasks: uniqueIds(state.rewardedTaskIds).length, sessions: completedSessions(state).length };
  }

  function isLoreUnlocked(state, id) {
    const rule = LORE_RULES.find(item => item.id === id);
    if (!rule) return false;
    const counts = progress(state);
    return counts.tasks >= rule.tasks && counts.sessions >= rule.sessions;
  }

  function localDate(value) {
    const date = new Date(timestamp(value));
    return String(date.getFullYear()).padStart(4, '0') + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function stats(state, now = Date.now()) {
    timestamp(now);
    const today = localDate(now);
    const days = [];
    // Local calendar arithmetic (at noon) keeps both DST transition days in the window.
    const cursor = new Date(now);
    cursor.setHours(12, 0, 0, 0);
    cursor.setDate(cursor.getDate() - 6);
    for (let index = 0; index < 7; index += 1) {
      days.push({ date: localDate(cursor.getTime()), minutes: 0, sessions: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    const byDate = new Map(days.map(day => [day.date, day]));
    let totalMinutes = 0;
    for (const session of completedSessions(state)) {
      totalMinutes += session.minutes;
      const day = byDate.get(localDate(session.completedAt));
      if (day) {
        day.minutes += session.minutes;
        day.sessions += 1;
      }
    }
    return { todaySessions: byDate.get(today).sessions, totalMinutes, days };
  }

  return {
    KEY, LEGACY_KEY, REWARD, SKINS, LORE_RULES, BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES,
    newState, load, save, addTask, editTask, toggleTask, deleteTask,
    buySkin, selectSkin, setTimer, startTimer, pauseTimer, resetTimer, tick,
    progress, isLoreUnlocked, stats, localDate, createBackup, parseBackup
  };
});
