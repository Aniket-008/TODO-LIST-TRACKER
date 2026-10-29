/**
 * TodoTrack Floating Dynamic Island - Content Script
 * Floats an interactive Dynamic Island on any website using Shadow DOM
 */

(function () {
  'use strict';

  if (document.getElementById('todotrack-island-host')) return;

  const STORAGE_KEY = 'todotrack_todos_v1';

  let todos = [];
  let isExpanded = false;
  let currentMode = 'add'; // 'add' | 'list'
  let listFilter = 'all';  // 'all' | 'active' | 'completed'
  let selectedPriority = 'medium';

  // --- Storage Helpers ---
  function loadTasks(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (res) => {
        if (res && res[STORAGE_KEY]) {
          todos = res[STORAGE_KEY];
        } else {
          // Initial demo tasks if empty
          todos = [
            { id: 'ext-1', title: 'Welcome to your Floating Island! Check this done', completed: false, priority: 'high', createdAt: Date.now() },
            { id: 'ext-2', title: 'Add any task from this page & press Enter', completed: false, priority: 'medium', createdAt: Date.now() - 3600000 }
          ];
          saveTasks();
        }
        if (callback) callback();
      });
    } else {
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        todos = local ? JSON.parse(local) : [];
      } catch (e) {
        todos = [];
      }
      if (callback) callback();
    }
  }

  function saveTasks() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: todos });
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
      } catch (e) {}
    }
    render();
  }

  // --- Create Shadow Root Host ---
  const host = document.createElement('div');
  host.id = 'todotrack-island-host';
  host.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:0; pointer-events:none; z-index:2147483647;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // --- Injected Isolated CSS ---
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    
    .island-container {
      position: fixed;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.94);
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      overflow: hidden;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      z-index: 2147483647;
    }

    .island-container.collapsed {
      width: auto;
      min-width: 230px;
      height: 42px;
      border-radius: 9999px;
      cursor: pointer;
    }

    .island-container.collapsed .expanded-box { display: none; }

    .island-container.expanded {
      width: min(94vw, 440px);
      border-radius: 22px;
      box-shadow: 0 24px 50px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.14);
    }

    .island-container.expanded .pill-box { display: none; }

    /* Pill View */
    .pill-box {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.5rem 0 0.85rem;
      gap: 0.65rem;
    }

    .pulse-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .pill-text {
      font-size: 0.785rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      white-space: nowrap;
    }

    .pill-brand {
      color: #ffffff;
      font-weight: 700;
    }

    .pill-btn-group {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .pill-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #ffffff;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .pill-btn:hover {
      background: #4f46e5;
      transform: scale(1.08);
    }

    /* Expanded Box */
    .expanded-box {
      padding: 1rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .island-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 0.65rem;
    }

    .nav-tabs {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .nav-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
    }

    .nav-btn.active {
      color: #ffffff;
      background: #4f46e5;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.4);
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: #cbd5e1;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #f87171;
    }

    /* Form */
    .input-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      padding: 0.25rem 0.35rem 0.25rem 0.85rem;
    }

    .input-row:focus-within {
      border-color: #818cf8;
      box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.3);
    }

    .text-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 0.9rem;
      outline: none;
    }

    .text-input::placeholder { color: #64748b; }

    .send-btn {
      background: #4f46e5;
      border: none;
      color: #ffffff;
      width: 36px;
      height: 36px;
      border-radius: 9px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .send-btn:hover {
      background: #4338ca;
      transform: scale(1.05);
    }

    .options-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.25rem;
    }

    .prio-group {
      display: flex;
      gap: 0.3rem;
    }

    .prio-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid transparent;
      color: #94a3b8;
      font-size: 0.725rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      cursor: pointer;
    }

    .prio-btn.active[data-prio="low"] { background: rgba(16, 185, 129, 0.25); color: #34d399; }
    .prio-btn.active[data-prio="medium"] { background: rgba(245, 158, 11, 0.25); color: #fbbf24; }
    .prio-btn.active[data-prio="high"] { background: rgba(239, 68, 68, 0.25); color: #f87171; }

    .hint-text {
      font-size: 0.725rem;
      color: #64748b;
    }

    /* List Pane */
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .summary-text { font-size: 0.75rem; color: #94a3b8; }

    .filters-mini {
      display: flex;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 2px;
    }

    .chip-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
    }

    .chip-btn.active { background: #4f46e5; color: #ffffff; }

    .task-scroll {
      list-style: none;
      max-height: 230px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .task-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 0.5rem 0.65rem;
      gap: 0.5rem;
    }

    .task-item.done {
      opacity: 0.5;
    }

    .task-item.done .item-text {
      text-decoration: line-through;
      color: #94a3b8;
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-width: 0;
      flex: 1;
    }

    .chk {
      width: 17px;
      height: 17px;
      cursor: pointer;
      accent-color: #10b981;
    }

    .item-text {
      font-size: 0.825rem;
      color: #ffffff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-prio {
      font-size: 0.65rem;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .item-prio.high { color: #f87171; background: rgba(239, 68, 68, 0.2); }
    .item-prio.medium { color: #fbbf24; background: rgba(245, 158, 11, 0.2); }
    .item-prio.low { color: #34d399; background: rgba(16, 185, 129, 0.2); }

    .empty-note {
      text-align: center;
      padding: 1.25rem 0.5rem;
      font-size: 0.8rem;
      color: #64748b;
    }
  `;
  shadow.appendChild(styleEl);

  // --- HTML Template ---
  const container = document.createElement('div');
  container.className = 'island-container collapsed';
  container.innerHTML = `
    <!-- Pill View -->
    <div class="pill-box" id="pillBox">
      <span class="pulse-dot"></span>
      <div class="pill-text">
        <span class="pill-brand">Island</span>
        <span id="pendingText">0 pending</span>
      </div>
      <div class="pill-btn-group">
        <button class="pill-btn" id="btnQuickAdd" title="Quick Add Task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="pill-btn" id="btnViewTasks" title="View & Complete Tasks">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- Expanded View -->
    <div class="expanded-box" id="expandedBox">
      <div class="island-header">
        <div class="nav-tabs">
          <button class="nav-btn active" id="tabAdd">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Quick Add
          </button>
          <button class="nav-btn" id="tabList">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Tasks (<span id="tasksTotalBadge">0</span>)
          </button>
        </div>
        <button class="close-btn" id="btnClose" title="Close Island">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Add Pane -->
      <div id="paneAdd">
        <form id="addForm">
          <div class="input-row">
            <input type="text" id="taskInput" class="text-input" placeholder="Type a task on any website & press Enter..." maxlength="160" autocomplete="off" />
            <button type="submit" class="send-btn" title="Add Task">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div class="options-row" style="margin-top:0.6rem;">
            <div class="prio-group">
              <button type="button" class="prio-btn" data-prio="low">Low</button>
              <button type="button" class="prio-btn active" data-prio="medium">Medium</button>
              <button type="button" class="prio-btn" data-prio="high">High</button>
            </div>
            <span class="hint-text">Press ↵ Enter to save</span>
          </div>
        </form>
      </div>

      <!-- List Pane -->
      <div id="paneList" style="display:none;">
        <div class="list-header">
          <span class="summary-text" id="summaryStats">0 done</span>
          <div class="filters-mini">
            <button class="chip-btn active" data-filter="all">All</button>
            <button class="chip-btn" data-filter="active">Active</button>
            <button class="chip-btn" data-filter="completed">Done</button>
          </div>
        </div>
        <ul class="task-scroll" id="taskScroll"></ul>
      </div>
    </div>
  `;
  shadow.appendChild(container);

  // --- Element References ---
  const pillBox = shadow.getElementById('pillBox');
  const pendingText = shadow.getElementById('pendingText');
  const btnQuickAdd = shadow.getElementById('btnQuickAdd');
  const btnViewTasks = shadow.getElementById('btnViewTasks');
  const btnClose = shadow.getElementById('btnClose');
  const tabAdd = shadow.getElementById('tabAdd');
  const tabList = shadow.getElementById('tabList');
  const tasksTotalBadge = shadow.getElementById('tasksTotalBadge');
  const paneAdd = shadow.getElementById('paneAdd');
  const paneList = shadow.getElementById('paneList');
  const addForm = shadow.getElementById('addForm');
  const taskInput = shadow.getElementById('taskInput');
  const prioBtns = shadow.querySelectorAll('.prio-btn');
  const summaryStats = shadow.getElementById('summaryStats');
  const chipBtns = shadow.querySelectorAll('.chip-btn');
  const taskScroll = shadow.getElementById('taskScroll');

  // --- Island Functions ---
  function openIsland(mode = 'add') {
    isExpanded = true;
    container.classList.remove('collapsed');
    container.classList.add('expanded');
    setMode(mode);
  }

  function closeIsland() {
    isExpanded = false;
    container.classList.remove('expanded');
    container.classList.add('collapsed');
  }

  function setMode(mode) {
    currentMode = mode;
    if (mode === 'add') {
      tabAdd.classList.add('active');
      tabList.classList.remove('active');
      paneAdd.style.display = 'block';
      paneList.style.display = 'none';
      setTimeout(() => taskInput.focus(), 100);
    } else {
      tabAdd.classList.remove('active');
      tabList.classList.add('active');
      paneAdd.style.display = 'none';
      paneList.style.display = 'block';
      renderList();
    }
  }

  function render() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const active = total - completed;

    pendingText.textContent = active === 0 && total > 0 ? 'All done! 🎉' : `${active} pending`;
    tasksTotalBadge.textContent = total;
    summaryStats.textContent = `${completed} of ${total} done`;

    if (isExpanded && currentMode === 'list') {
      renderList();
    }
  }

  function renderList() {
    taskScroll.innerHTML = '';
    const filtered = todos.filter(t => {
      if (listFilter === 'active') return !t.completed;
      if (listFilter === 'completed') return t.completed;
      return true;
    });

    if (filtered.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty-note';
      li.textContent = listFilter === 'active' ? 'No pending tasks!' : 'No tasks found.';
      taskScroll.appendChild(li);
      return;
    }

    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'done' : ''}`;
      li.innerHTML = `
        <div class="item-left">
          <input type="checkbox" class="chk" ${task.completed ? 'checked' : ''} />
          <span class="item-text" title="${task.title.replace(/"/g, '&quot;')}">${task.title}</span>
        </div>
        <span class="item-prio ${task.priority || 'medium'}">${task.priority || 'med'}</span>
      `;

      const chk = li.querySelector('.chk');
      chk.addEventListener('change', () => {
        task.completed = !task.completed;
        saveTasks();
      });

      taskScroll.appendChild(li);
    });
  }

  // --- Event Listeners ---
  pillBox.addEventListener('click', (e) => {
    if (e.target.closest('#btnQuickAdd')) {
      openIsland('add');
      return;
    }
    if (e.target.closest('#btnViewTasks')) {
      openIsland('list');
      return;
    }
    openIsland('add');
  });

  tabAdd.addEventListener('click', () => setMode('add'));
  tabList.addEventListener('click', () => setMode('list'));
  btnClose.addEventListener('click', closeIsland);

  prioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      prioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPriority = btn.dataset.prio;
    });
  });

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = taskInput.value.trim();
    if (!val) return;

    todos.unshift({
      id: 'task_' + Date.now().toString(36),
      title: val,
      completed: false,
      priority: selectedPriority,
      createdAt: Date.now()
    });

    saveTasks();
    taskInput.value = '';
    taskInput.focus();
  });

  chipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chipBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      listFilter = btn.dataset.filter;
      renderList();
    });
  });

  // Keyboard shortcut: Alt+T or Ctrl+Shift+K to toggle island anywhere
  window.addEventListener('keydown', (e) => {
    if ((e.altKey && e.key.toLowerCase() === 't') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      if (isExpanded) closeIsland();
      else openIsland('add');
    } else if (e.key === 'Escape' && isExpanded) {
      closeIsland();
    }
  });

  // Click outside to collapse
  document.addEventListener('click', (e) => {
    if (isExpanded && !host.contains(e.target)) {
      closeIsland();
    }
  });

  // Listen for storage changes from other tabs
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes[STORAGE_KEY]) {
        todos = changes[STORAGE_KEY].newValue || [];
        render();
      }
    });
  }

  // Init
  loadTasks(render);
})();
