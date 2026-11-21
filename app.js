'use strict';
(() => {
  const M = window.SpectralModel, A = window.SpectralArt, L = window.SpectralLore;
  const $ = id => document.getElementById(id);
  const all = selector => Array.from(document.querySelectorAll(selector));
  const text = (id, value) => { $(id).textContent = value; };
  const views = {town: 'The Town', tasks: 'Hauntings', focus: 'Candle Room', cabinet: 'Folklore Cabinet'};
  let storage;
  try { storage = window.localStorage; } catch { /* Model handles an unavailable storage object. */ }
  const loaded = M.load(storage);
  const state = loaded.state;
  let saveBlocked = !!loaded.warning;
  let editingId = null, taskFilter = 'all', currentView = 'town';
  let pendingBackup = null;
  let toastTimeout, lastClock = '', lastTimerControl = '', lastDate = M.localDate(Date.now());
  const dialogTriggers = new Map();

  function storageWarning(message) {
    $('storage-warning').hidden = false;
    text('storage-warning', message);
  }
  if (loaded.warning) storageWarning(`${loaded.warning} This visit will stay in memory to protect existing saved records.`);
  function persist() {
    if (saveBlocked) return;
    if (!M.save(storage, state)) {
      saveBlocked = true;
      storageWarning('Browser storage is unavailable or full. Your current changes remain usable in this tab, but may not survive a refresh.');
    }
  }
  function announce(message) { text('announcement', message); }
  function toast(message) {
    clearTimeout(toastTimeout);
    text('toast', message); $('toast').hidden = false;
    toastTimeout = setTimeout(() => { $('toast').hidden = true; }, 4200);
  }
  function element(tag, cls, content) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function iconButton(icon, label, action, id) {
    const button = element('button', 'icon-button');
    button.type = 'button'; button.innerHTML = A.icon(icon);
    button.setAttribute('aria-label', label); button.dataset.action = action;
    if (id) button.dataset.id = id;
    return button;
  }
  function openDialog(id, initialFocus) {
    const dialog = $(id);
    dialogTriggers.set(id, document.activeElement);
    dialog.returnValue = '';
    dialog.showModal();
    if (initialFocus) $(initialFocus).focus();
  }
  all('dialog').forEach(dialog => {
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(control => !control.disabled && control.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dialog.addEventListener('close', () => {
      const trigger = dialogTriggers.get(dialog.id);
      if (trigger?.isConnected && !trigger.disabled && trigger.getClientRects().length) trigger.focus();
      else if (currentView === 'tasks') $('new-task').focus();
      else $(`${currentView}-title`).focus();
    });
  });
  function askConfirmation(message, accept = 'Start fresh', cancel = 'Keep this session', title = 'Start a new spell?') {
    if ($('confirm-dialog').open) return Promise.resolve(false);
    text('confirm-title', title); text('confirm-message', message);
    text('confirm-accept', accept); text('confirm-cancel', cancel);
    openDialog('confirm-dialog', 'confirm-cancel');
    return new Promise(resolve => $('confirm-dialog').addEventListener('close', () => resolve($('confirm-dialog').returnValue === 'yes'), {once:true}));
  }
  $('confirm-accept').addEventListener('click', () => $('confirm-dialog').close('yes'));
  $('confirm-cancel').addEventListener('click', () => $('confirm-dialog').close('no'));
  all('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close('no')));

  $('backup-export').addEventListener('click', () => {
    try {
      const backup = M.createBackup(state, Date.now());
      const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
      if (blob.size > M.MAX_BACKUP_BYTES) {
        text('backup-status','This backup exceeds the 1 MB restore limit. No file was downloaded; your local data is unchanged.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = element('a');
      link.href = url; link.download = `spectral-focus-backup-${M.localDate(Date.now())}.json`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      text('backup-status','Backup downloaded. It contains your task notes and local history; keep the file somewhere private.');
      announce('Local backup downloaded.');
    } catch (_) {
      text('backup-status','The backup could not be created. Your saved data has not changed.');
    }
  });
  $('backup-import-trigger').addEventListener('click', () => $('backup-file').click());
  $('backup-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    pendingBackup = null; $('backup-confirm').disabled = true; text('backup-error','');
    if (file.size > M.MAX_BACKUP_BYTES) { text('backup-status','The backup file is too large (maximum 1 MB).'); return; }
    text('backup-status','Checking backup file…');
    try {
      const parsed = M.parseBackup(await file.text());
      if (parsed.error || !parsed.state) { text('backup-status',parsed.error || 'The backup could not be read.'); return; }
      pendingBackup = parsed.state;
      const info = parsed.summary;
      const exported = new Date(info.exportedAt).toLocaleString();
      const timer = ' The timer, if present, will be restored paused at its saved remaining time.';
      const taskWord = info.tasks === 1 ? 'task' : 'tasks';
      text('backup-preview',`Backup format v${M.BACKUP_VERSION}, exported ${exported}: ${info.tasks} ${taskWord} (${info.completedTasks} completed), ${info.sessions} completed focus sessions.${timer} Restoring it replaces all current local tasks, notes, timer, settings, rewards and lanterns.`);
      text('backup-status','Backup checked. Review the replacement details before continuing.');
      $('backup-confirm').disabled = false;
      openDialog('backup-dialog','backup-cancel');
    } catch (_) {
      text('backup-status','The backup file could not be read. Your saved data has not changed.');
    }
  });
  $('backup-dialog').addEventListener('close', () => {
    if ($('backup-dialog').open) return;
    pendingBackup = null;
    $('backup-confirm').disabled = true;
  });
  $('backup-confirm').addEventListener('click', () => {
    if (!pendingBackup) return;
    const replacement = pendingBackup;
    if (!M.save(storage,replacement)) {
      text('backup-status','Restore failed. Existing local data has not been replaced.');
      text('backup-error','Could not save the backup. Your current data has not been replaced.');
      return;
    }
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state,replacement);
    saveBlocked = false;
    $('storage-warning').hidden = true; text('storage-warning','');
    $('audio-volume').value = state.settings.volume * 100;
    text('volume-value',`${Math.round(state.settings.volume*100)}%`);
    window.SpectralAudio.setVolume(state.settings.volume);
    $('reduce-motion').checked = state.settings.reducedMotion;
    document.body.classList.toggle('reduce-motion',state.settings.reducedMotion);
    $('backup-dialog').close('yes');
    lastClock = ''; lastTimerControl = ''; renderAll(); settle();
    text('backup-status','Backup restored. This browser’s local data has been replaced.');
    announce('Local backup restored.');
  });

  all('[data-icon]').forEach(node => { node.innerHTML = A.icon(node.dataset.icon); });
  all('[data-art]').forEach(node => { node.innerHTML = node.dataset.art === 'ghost' ? A.ghost() : node.dataset.art === 'bat' ? A.bat() : A.lantern(); });
  $('town-art').innerHTML = A.town();
  // Only reveal the drift layer once its own stylesheet rules are active. A stale cached
  // style.css would otherwise render the unsized ghost SVGs at full page width.
  const driftLayer = document.querySelector('.night-drift');
  if (driftLayer) {
    driftLayer.hidden = false;
    if (getComputedStyle(driftLayer).position !== 'fixed') driftLayer.remove();
  }

  function showView(view, focus = true) {
    if (!Object.hasOwn(views, view)) view = 'town';
    currentView = view;
    all('.view').forEach(section => { section.hidden = section.id !== `view-${view}`; });
    all('[data-nav]').forEach(link => {
      if (link.dataset.nav === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    text('breadcrumb-current', views[view]);
    if (focus) { $(`${view}-title`).focus(); window.scrollTo(0, 0); }
  }
  function navigate(view) {
    if (!Object.hasOwn(views, view)) return;
    if (location.hash !== `#${view}`) history.pushState(null, '', `#${view}`);
    showView(view);
  }
  all('[data-nav]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); navigate(link.dataset.nav); }));
  window.addEventListener('popstate', () => showView(location.hash.slice(1)));
  window.addEventListener('hashchange', () => { if (location.hash !== '#main') showView(location.hash.slice(1)); });
  all('[data-go]').forEach(button => button.addEventListener('click', () => {
    navigate(button.dataset.go);
    if (button.closest('.town-heading')) openTask();
  }));

  function openTask(task) {
    editingId = task?.id || null;
    $('task-form').reset(); $('task-title').setCustomValidity('');
    text('task-dialog-title', task ? 'A haunting, reconsidered' : 'A new haunting');
    text('save-task', task ? 'Save changes' : 'Add haunting');
    $('task-title').value = task?.text || '';
    $('task-note').value = task?.note || '';
    $('task-priority').value = task?.priority || 'normal';
    text('task-error', ''); openDialog('task-dialog', 'task-title');
  }
  $('new-task').addEventListener('click', () => openTask());
  $('task-title').addEventListener('input', () => { $('task-title').setCustomValidity(''); text('task-error', ''); });
  $('task-form').addEventListener('submit', event => {
    event.preventDefault();
    const fields = {text:$('task-title').value, note:$('task-note').value, priority:$('task-priority').value};
    if (!fields.text.trim()) { $('task-title').setCustomValidity('Give this haunting a name.'); $('task-title').reportValidity(); return; }
    try {
      if (editingId) M.editTask(state, editingId, fields);
      else M.addTask(state, fields);
      const wasEditing = !!editingId;
      persist(); $('task-dialog').close(); renderAll();
      toast(wasEditing ? 'A little clearer. Your task is updated.' : 'Your haunting has a home. One small step next.');
    } catch (error) { text('task-error', error.message); }
  });

  function taskRow(task) {
    const row = element('article', `task-card${task.done ? ' done' : ''}`);
    row.dataset.taskId = task.id;
    const art = element('div', 'task-ghost'); art.innerHTML = A.ghost();
    const body = element('div', 'task-body');
    const check = element('input', 'task-check'); check.type = 'checkbox'; check.checked = task.done;
    check.id = `task-check-${task.id}`; check.dataset.complete = task.id;
    const label = element('label', '', task.text); label.htmlFor = check.id;
    const note = element('p', 'task-note', task.note); note.hidden = !task.note;
    const meta = element('div', 'task-meta');
    meta.append(element('span', `priority ${task.priority}`, `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`));
    meta.append(element('span', 'task-reward-note', state.rewardedTaskIds.includes(task.id) ? 'Treat already collected' : '+10 candy on first completion'));
    body.append(label, note, meta);
    const actions = element('div', 'task-actions');
    if (!task.done) {
      const focus = element('button', 'button secondary', 'Focus'); focus.type = 'button';
      focus.prepend(document.createRange().createContextualFragment(A.icon('candle')));
      focus.dataset.focusTask = task.id; focus.setAttribute('aria-label', `Focus on ${task.text}`); actions.append(focus);
    }
    actions.append(iconButton('edit', `Edit ${task.text}`, 'edit', task.id), iconButton('trash', `Delete ${task.text}`, 'delete', task.id));
    row.append(art, body, actions, check); return row;
  }
  // Purely decorative first-completion moment. The faded ghost itself is the static end state.
  function releaseGhost(row) {
    if (document.body.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ghost = row.querySelector('.task-ghost');
    ghost.querySelectorAll('.settle-wisp, .settle-treat').forEach(node => node.remove());
    const wisp = element('span', 'settle-wisp'); wisp.innerHTML = A.ghost();
    const treat = element('span', 'settle-treat', `+${M.REWARD}`);
    for (const node of [wisp, treat]) {
      node.setAttribute('aria-hidden', 'true');
      node.addEventListener('animationend', () => node.remove(), { once: true });
      setTimeout(() => node.remove(), 2400);
    }
    row.classList.add('just-settled');
    setTimeout(() => row.classList.remove('just-settled'), 2400);
    ghost.append(wisp, treat);
  }
  function renderTaskList() {
    const search = $('task-search').value.toLowerCase().trim();
    const visible = state.tasks.filter(task => (taskFilter === 'all' || (taskFilter === 'done' ? task.done : !task.done)) && `${task.text} ${task.note}`.toLowerCase().includes(search));
    const container = $('task-list'); container.replaceChildren();
    if (!visible.length) {
      const empty = element('div', 'empty-state'); empty.innerHTML = A.ghost();
      empty.append(element('h2', '', state.tasks.length ? 'No ghosts in this corner.' : 'A fresh start, not a haunted house.'));
      empty.append(element('p', '', state.tasks.length ? 'Try another filter or a different search.' : 'Give one lingering thought a name. We’ll take it from there.'));
      if (!state.tasks.length) {
        const button = element('button', 'button primary', 'Add your first haunting');
        button.addEventListener('click', () => openTask()); empty.append(button);
      }
      container.append(empty);
    } else visible.forEach(task => container.append(taskRow(task)));
    text('task-list-summary', `${visible.length} shown · ${state.tasks.filter(t => !t.done).length} unsettled · ${state.tasks.filter(t => t.done).length} settled`);
    $('clear-completed').disabled = !state.tasks.some(t => t.done);
    text('all-count', state.tasks.length);
  }
  all('[data-filter]').forEach(button => button.addEventListener('click', () => {
    taskFilter = button.dataset.filter;
    all('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    renderTaskList();
  }));
  $('task-search').addEventListener('input', renderTaskList);
  $('task-list').addEventListener('change', event => {
    const id = event.target.dataset.complete;
    if (!id) return;
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const reward = M.toggleTask(state, id, event.target.checked);
    const row = event.target.closest('.task-card');
    row.classList.toggle('done', task.done);
    row.querySelector('.task-reward-note').textContent = state.rewardedTaskIds.includes(id) ? 'Treat already collected' : '+10 candy on first completion';
    const actions = row.querySelector('.task-actions');
    if (task.done) actions.querySelector('[data-focus-task]')?.remove();
    else {
      const focus = taskRow(task).querySelector('[data-focus-task]');
      if (focus) actions.prepend(focus);
    }
    if (reward) releaseGhost(row);
    persist(); renderAll(false);
    if (taskFilter !== 'all') { renderTaskList(); all(`[data-filter]`).find(b => b.dataset.filter === taskFilter)?.focus(); }
    text('task-list-summary', `${$('task-list').querySelectorAll('.task-card').length} shown · ${state.tasks.filter(t => !t.done).length} unsettled · ${state.tasks.filter(t => t.done).length} settled`);
    toast(reward ? '+10 candy. One less ghost to carry. A new story may be waiting.' : task.done ? 'Settled again. Its treat was already collected.' : 'Reopened. Take your time.');
  });
  $('clear-completed').addEventListener('click', async () => {
    if (!await askConfirmation('Remove settled tasks from your board? Earned candy and discoveries will stay. This cannot be undone.', 'Clear settled tasks', 'Keep them', 'Tidy the house?')) return;
    state.tasks.filter(t => t.done).forEach(task => M.deleteTask(state, task.id));
    persist(); renderAll(); $('new-task').focus(); toast('A little more room. Your progress is safe.');
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.action) {
      const task = state.tasks.find(t => t.id === button.dataset.id);
      if (!task) return;
      if (button.dataset.action === 'edit') openTask(task);
      if (button.dataset.action === 'delete') {
        const id = task.id;
        if (!await askConfirmation('Remove this task? Its earned candy and past focus time will stay. This cannot be undone.', 'Delete task', 'Keep task', 'Let this one go?')) return;
        M.deleteTask(state, id); persist(); renderAll(); $('new-task').focus(); toast('Task removed. Any earned progress stays with you.');
      }
    }
    if (button.dataset.focusTask) {
      const task = state.tasks.find(t => t.id === button.dataset.focusTask);
      if (task && !task.done) await focusOn(task.id);
    }
    if (button.dataset.skin) {
      const id = button.dataset.skin;
      if (!state.owned.includes(id) && !M.buySkin(state, id)) return toast('That lantern needs a few more treats.');
      M.selectSkin(state, id); persist(); renderAll();
      const target = all('[data-skin]').find(b => b.dataset.skin === id);
      target?.closest('article')?.querySelector('h3')?.focus();
      toast('Your doorstep has a new glow. Visit the Town to see it.');
    }
    if (button.dataset.read) openLore(button.dataset.read);
  });

  function renderTown() {
    const progress = M.progress(state), stats = M.stats(state);
    const unlocked = L.cards.filter(card => M.isLoreUnlocked(state, card.id)).length;
    text('stat-today', stats.todaySessions); text('stat-minutes', stats.totalMinutes);
    text('stat-tasks', progress.tasks); text('stat-lore', unlocked);
    text('nav-task-count', state.tasks.filter(t => !t.done).length);
    text('town-progress', `${progress.tasks} haunting${progress.tasks === 1 ? '' : 's'} settled`);
    document.body.classList.toggle('has-settled', progress.tasks > 0);
    const town = $('town-tasks'); town.replaceChildren();
    const active = state.tasks.filter(task => !task.done).slice(0, 2);
    if (!active.length) {
      const empty = element('div', 'mini-empty'); empty.innerHTML = A.ghost();
      const p = element('p'); p.append(element('strong', '', state.tasks.length ? 'All quiet on your doorstep.' : 'No hauntings. Just possibilities.'), document.createTextNode('Add a small task to start your next chapter.'));
      empty.append(p); town.append(empty);
    } else active.forEach(task => {
      const row = element('div', 'mini-task'); row.innerHTML = A.ghost();
      row.append(element('span', 'mini-title', task.text));
      const button = element('button', 'icon-button'); button.innerHTML = A.icon('arrow');
      button.dataset.focusTask = task.id; button.setAttribute('aria-label', `Focus on ${task.text}`); row.append(button); town.append(row);
    });
    renderChart(stats.days);
    $('town-lantern').innerHTML = A.lantern(state.lantern);
    $('town-lantern').dataset.lantern = state.lantern;
    all('[data-art="lantern"]').filter(el => el.closest('.side-companion')).forEach(el => { el.innerHTML = A.lantern(state.lantern); });
    renderDrift();
    all('[data-balance]').forEach(el => { el.textContent = state.balance; });
  }
  // Page-wide drifting spirits mirror the task board: one ghost per unsettled task (up to four),
  // two friendly visitors on an empty board, none once every haunting is settled. Decorative only.
  function renderDrift() {
    const open = state.tasks.filter(t => !t.done).length;
    const visible = state.tasks.length ? Math.min(open, 4) : 2;
    all('.drift-ghost').forEach((node, index) => node.classList.toggle('is-settled', index >= visible));
    all('.drift-lantern .drift-body').forEach(node => {
      if (node.dataset.lantern !== state.lantern) { node.innerHTML = A.lantern(state.lantern); node.dataset.lantern = state.lantern; }
    });
  }
  function renderChart(days) {
    const maximum = Math.max(25, ...days.map(day => day.minutes));
    const pieces = [`<svg class="week-chart" viewBox="0 0 380 140" role="img" aria-labelledby="chart-title"><title id="chart-title">Completed focus minutes in the last seven days</title><path d="M28 15h346M28 60h346M28 105h346" stroke="#58405e" stroke-width=".6" stroke-dasharray="3 4"/><text class="chart-label" x="0" y="18">${maximum}</text><text class="chart-label" x="13" y="108">0</text>`];
    days.forEach((day, i) => {
      const x = 46 + i * 48;
      const height = day.minutes / maximum * 85;
      const date = new Date(`${day.date}T12:00:00`);
      const label = date.toLocaleDateString('en', {weekday:'short'});
      pieces.push(`<rect x="${x}" y="${105-height}" width="23" height="${height}" rx="3" fill="${i === 6 ? '#f4a264' : '#8c6b91'}"/><text class="chart-value" text-anchor="middle" x="${x+11.5}" y="${day.minutes ? 98-height : 95}">${day.minutes}</text><text class="chart-label" text-anchor="middle" x="${x+11.5}" y="128">${label}</text>`);
    });
    pieces.push('</svg>'); $('week-chart').innerHTML = pieces.join('');
    const table = element('table', 'sr-only');
    const caption = element('caption', '', 'Focus minutes by local completion date'); table.append(caption);
    const head = element('tr'); head.append(element('th', '', 'Date'), element('th', '', 'Minutes'), element('th', '', 'Sessions')); table.append(head);
    days.forEach(day => { const row = element('tr'); row.append(element('td', '', day.date),element('td', '', day.minutes),element('td', '', day.sessions)); table.append(row); });
    $('week-chart').append(table);
  }
  function loreArt(card) {
    if (card.art === 'turnip' || card.art === 'harvest') return A.lantern(card.art);
    if (card.art === 'ghost') return A.ghost();
    return A.icon(card.art);
  }
  function sourceLink(source) {
    const a = element('a', '', source.title + ' ↗');
    a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  function renderCabinet() {
    const progress = M.progress(state);
    const unlocked = L.cards.filter(card => M.isLoreUnlocked(state, card.id)).length;
    text('lore-progress', `${unlocked} / ${L.cards.length}`);
    text('milestone-progress', `${progress.tasks} first completions · ${progress.sessions} focus sessions`);
    const descriptions = {harvest:'Your first, familiar autumn glow.',turnip:'A nod to old-world root lanterns.',violet:'An original moon-purple daydream.',ember:'An original charcoal-and-gold glow.'};
    $('skin-grid').replaceChildren();
    for (const skin of M.SKINS) {
      const equipped = state.lantern === skin.id, owned = state.owned.includes(skin.id);
      const card = element('article', `skin-card${equipped ? ' equipped' : ''}`); card.dataset.skinCard = skin.id;
      card.innerHTML = A.lantern(skin.id);
      const heading = element('h3', '', skin.name); heading.tabIndex = -1;
      card.append(heading, element('p', 'skin-subtitle', descriptions[skin.id]));
      const button = element('button', 'button secondary', equipped ? 'On your doorstep ✓' : owned ? 'Use this lantern' : state.balance < skin.cost ? `Needs ${skin.cost} candy` : `Unlock · ${skin.cost} candy`);
      button.dataset.skin = skin.id; button.disabled = equipped || (!owned && state.balance < skin.cost);
      button.setAttribute('aria-label', equipped ? `${skin.name}, equipped` : owned ? `Use ${skin.name}` : `Unlock ${skin.name} for ${skin.cost} candy`);
      card.append(button); $('skin-grid').append(card);
    }
    $('lore-grid').replaceChildren();
    L.cards.forEach((card, index) => {
      const unlocked = M.isLoreUnlocked(state, card.id), rule = M.LORE_RULES.find(rule => rule.id === card.id);
      const container = element('article', `lore-card${unlocked ? ' unlocked' : ''}`); container.dataset.loreCard = card.id;
      const art = element('div', 'lore-illustration'); art.innerHTML = loreArt(card);
      art.append(element('span','lore-number',`FIELD NOTE ${String(index+1).padStart(2,'0')}`));
      const status = element('span','lore-status', unlocked ? 'DISCOVERED' : 'STILL A MYSTERY'); status.prepend(document.createRange().createContextualFragment(A.icon(unlocked ? 'check' : 'lock'))); art.append(status);
      const content = element('div','lore-card-content');
      content.append(element('p','lore-region',card.region),element('h3','',card.title),element('p','lore-teaser',card.teaser));
      const requirement = rule.tasks ? `${Math.min(progress.tasks,rule.tasks)} / ${rule.tasks} tasks settled for the first time` : rule.sessions ? `${Math.min(progress.sessions,rule.sessions)} / ${rule.sessions} focus sessions completed` : 'Your first story · always open';
      content.append(element('p','lore-requirement',requirement));
      const read = element('button','button secondary lore-read', unlocked ? 'Read the story ↗' : 'Keep exploring to discover');
      read.dataset.read = card.id; read.disabled = !unlocked; read.setAttribute('aria-label', `${unlocked ? 'Read' : 'Locked'}: ${card.title}`); content.append(read);
      const source = element('div','lore-source');
      card.sources.forEach(item => { source.append(element('span','',item.institution),sourceLink(item)); }); content.append(source);
      container.append(art,content); $('lore-grid').append(container);
    });
  }
  function openLore(id) {
    const card = L.cards.find(card => card.id === id);
    if (!card || !M.isLoreUnlocked(state, id)) return;
    text('lore-dialog-region',card.region);
    text('lore-dialog-number', `FIELD NOTE ${String(L.cards.indexOf(card)+1).padStart(2,'0')} · ORIGINAL SUMMARY`);
    text('lore-dialog-title',card.title); $('lore-dialog-art').innerHTML = loreArt(card);
    $('lore-dialog-body').replaceChildren(...card.body.map(paragraph => element('p','',paragraph)));
    $('lore-dialog-sources').replaceChildren(...card.sources.map(source => {
      const div = element('div'); div.append(element('p','fine-print',source.institution),sourceLink(source)); return div;
    }));
    openDialog('lore-dialog');
  }

  function hasSessionProgress() { const timer = state.timer; return !!timer.end || (timer.remaining > 0 && timer.remaining < timer.minutes * 60); }
  async function changeTimer(mode, minutes, taskId = state.timer.taskId) {
    if (hasSessionProgress() && !await askConfirmation('Changing this setting resets the current session. Part-finished time is not added to your journal.')) return false;
    M.setTimer(state, {mode, minutes, taskId}); persist(); lastClock = ''; renderAll(); return true;
  }
  async function focusOn(id) {
    if (state.timer.taskId !== id || state.timer.mode !== 'focus') {
      if (!await changeTimer('focus', state.timer.mode === 'focus' ? state.timer.minutes : 25, id)) return;
    }
    navigate('focus'); $('timer-start').focus();
  }
  function renderFocusTasks() {
    const select = $('focus-task'); select.replaceChildren(new Option('An open-ended focus session',''));
    state.tasks.filter(t => !t.done || t.id === state.timer.taskId).forEach(task => select.add(new Option(`${task.text}${task.done ? ' (settled)' : ''}`,task.id)));
    select.value = state.timer.taskId || '';
    const task = state.tasks.find(t => t.id === state.timer.taskId);
    text('focus-note', task?.note || 'You don’t need a perfect plan. Just a place to begin.');
  }
  $('focus-task').addEventListener('change', async () => {
    const selected = $('focus-task').value || null;
    await changeTimer(state.timer.mode,state.timer.minutes,selected); renderFocusTasks();
  });
  all('[data-mode]').forEach(button => button.addEventListener('click', async () => {
    if (state.timer.mode === button.dataset.mode) return;
    await changeTimer(button.dataset.mode,button.dataset.mode === 'break' ? 5 : 25);
  }));
  all('[data-minutes]').forEach(button => button.addEventListener('click', async () => {
    const minutes = Number(button.dataset.minutes);
    if (minutes !== state.timer.minutes) await changeTimer('focus',minutes);
  }));
  $('timer-start').addEventListener('click', () => {
    const wasRunning = !!state.timer.end;
    settle();
    if (wasRunning && !state.timer.end) return;
    if (state.timer.end) { M.pauseTimer(state); announce('Focus timer paused.'); }
    else { M.startTimer(state); announce(state.timer.mode === 'break' ? 'Your five-minute rest has started.' : 'Your focus session has started.'); }
    persist(); renderTimer();
  });
  $('timer-reset').addEventListener('click', async () => {
    if (hasSessionProgress() && !await askConfirmation('Reset this session? Partial time is not added to the journal.', 'Reset candle', 'Keep this session', 'Relight from the beginning?')) return;
    M.resetTimer(state); persist(); renderAll(); announce('Timer reset.');
  });
  function renderTimer() {
    const timer = state.timer, seconds = Math.ceil(timer.remaining);
    const clock = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    if (lastClock !== clock) { text('clock',clock); lastClock = clock; }
    const running = !!timer.end, finished = seconds === 0;
    const paused = !running && !finished && timer.remaining < timer.minutes * 60;
    const controls = `${running}|${finished}|${paused}|${timer.mode}|${timer.minutes}`;
    if (lastTimerControl !== controls) {
      const label = running ? 'Pause the spell' : finished ? 'Light a new candle' : paused ? 'Continue the spell' : timer.mode === 'break' ? 'Begin a little rest' : 'Light the candle';
      text('timer-start-label', label);
      $('timer-start').querySelector('[data-icon]').innerHTML = A.icon(running ? 'pause' : 'play');
      text('timer-status', running ? timer.mode === 'break' ? 'A BREATH BETWEEN ADVENTURES' : 'LET THE WORLD WAIT A LITTLE' : finished ? 'A LITTLE TIME, WELL SPENT' : paused ? 'YOUR CANDLE CAN WAIT' : 'YOUR CANDLE IS WAITING');
      text('timer-help', finished ? 'A small ending. A fresh beginning whenever you’re ready.' : 'A small beginning is still a beginning.');
      $('focus-durations').hidden = timer.mode === 'break';
      all('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === timer.mode)));
      all('[data-minutes]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.minutes) === timer.minutes)));
      $('session-complete').hidden = !finished;
      text('completion-title', timer.mode === 'break' ? 'A little rest, well taken.' : 'A spell well spent.');
      text('completion-description', timer.mode === 'break' ? 'Breaks aren’t added to focus statistics. Return when you feel ready.' : 'Your focus time is in the journal. Complete your task when you’re ready.');
      lastTimerControl = controls;
    }
    document.body.classList.toggle('is-focusing', running && timer.mode === 'focus');
    document.querySelector('.candle-wrap').classList.toggle('is-snuffed', finished && !running && timer.mode === 'focus');
    document.querySelector('.candle-wrap').style.setProperty('--wax-height', `${22 + 123 * Math.min(1,seconds/(timer.minutes*60))}px`);
    document.title = running ? `${clock} · Spectral Focus` : 'Spectral Focus · Halloween Town';
    const task = state.tasks.find(t => t.id === timer.taskId);
    text('active-summary', `${task?.text || 'An open-ended session'} · ${running ? clock + ' remaining' : finished ? 'completed' : paused ? clock + ' paused' : 'ready when you are'}`);
    text('town-night-status', running ? timer.mode === 'focus' ? 'A candle is burning for you' : 'Taking a quiet little rest' : 'A peaceful kind of spooky');
  }
  function settle() {
    const wasRunning = !!state.timer.end, mode = state.timer.mode;
    const completed = M.tick(state);
    if (completed || (wasRunning && !state.timer.end && state.timer.remaining === 0)) {
      persist(); renderTown(); renderCabinet();
      const message = mode === 'break' ? 'Your short rest is complete.' : 'Focus complete. Your minutes are in the journal; your task is still yours to complete.';
      announce(message); toast(message);
    }
    renderTimer();
    const today = M.localDate(Date.now());
    if (today !== lastDate) { lastDate = today; renderTown(); renderDate(); }
  }

  $('audio-toggle').addEventListener('click', async () => {
    const button = $('audio-toggle'); button.disabled = true;
    try {
      const active = await window.SpectralAudio.setPlaying(!window.SpectralAudio.isPlaying,state.settings.volume);
      button.setAttribute('aria-pressed', String(active));
      text('audio-label', active ? 'Turn off night wind' : 'Turn on night wind');
      text('audio-status', active ? 'A little wind, just for this visit.' : 'Quiet again. Sound will stay off until you choose.');
      announce(active ? 'Night wind on.' : 'Night wind off.');
    } catch (error) { text('audio-status', error.message); announce(error.message); }
    finally { button.disabled = false; }
  });
  $('audio-volume').value = state.settings.volume * 100;
  text('volume-value',`${Math.round(state.settings.volume*100)}%`);
  $('audio-volume').addEventListener('input', () => {
    state.settings.volume = Number($('audio-volume').value)/100;
    text('volume-value',`${$('audio-volume').value}%`); window.SpectralAudio.setVolume(state.settings.volume); persist();
  });
  $('reduce-motion').checked = state.settings.reducedMotion;
  document.body.classList.toggle('reduce-motion',state.settings.reducedMotion);
  $('reduce-motion').addEventListener('change', () => {
    state.settings.reducedMotion = $('reduce-motion').checked;
    document.body.classList.toggle('reduce-motion',state.settings.reducedMotion); persist(); announce(state.settings.reducedMotion ? 'Decorative motion reduced.' : 'Decorative motion enabled, subject to system preferences.');
  });
  function renderDate() { text('today-date',new Date().toLocaleDateString('en',{month:'short',day:'numeric',weekday:'short'})); }
  function renderAll(tasks = true) {
    if (tasks) renderTaskList();
    else { text('all-count',state.tasks.length); $('clear-completed').disabled = !state.tasks.some(t => t.done); }
    renderTown(); renderCabinet(); renderFocusTasks(); renderTimer();
  }
  renderDate(); renderAll(); showView(location.hash.slice(1),false); settle();
  if (loaded.migrated && !loaded.warning) toast('Welcome back. Your old tasks and candle have moved safely into the town.');
  document.addEventListener('visibilitychange', settle);
  setInterval(settle,250);
})();
