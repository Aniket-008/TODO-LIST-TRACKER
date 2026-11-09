/**
 * TodoTrack - Smart Task & Productivity Web App
 * With Interactive Floating Dynamic Island, PiP Always-on-Top, & PWA Support
 */

(function () {
  'use strict';

  // --- Storage Keys ---
  const STORAGE_KEY = 'todotrack_todos_v1';
  const THEME_KEY = 'todotrack_theme_v1';

  // --- Initial Starter Data ---
  const DEFAULT_TODOS = [
    {
      id: 'task-1',
      title: 'Welcome to TodoTrack! Check this task to mark it done',
      completed: false,
      priority: 'high',
      category: 'General',
      dueDate: getTodayDateString(),
      createdAt: Date.now() - 3600000,
      completedAt: null
    },
    {
      id: 'task-2',
      title: 'Try the Dynamic Island at the top to quick-add tasks!',
      completed: false,
      priority: 'medium',
      category: 'Work',
      dueDate: getFutureDateString(1),
      createdAt: Date.now() - 7200000,
      completedAt: null
    },
    {
      id: 'task-3',
      title: 'Float this island over other apps with "Float Over Apps"',
      completed: false,
      priority: 'low',
      category: 'Study',
      dueDate: getTodayDateString(),
      createdAt: Date.now() - 10800000,
      completedAt: null
    }
  ];

  // --- State ---
  let todos = [];
  let currentFilter = 'all'; // 'all' | 'active' | 'completed'
  let searchQuery = '';
  let currentSort = 'created-desc';
  let recentlyDeleted = null;
  let deleteUndoTimer = null;
  let deferredPrompt = null;
  let pipWindow = null;

  // Island State
  let isIslandExpanded = false;
  let islandCurrentMode = 'add'; // 'add' | 'list'
  let islandListFilter = 'all';  // 'all' | 'active' | 'completed'
  let islandSelectedPriority = 'medium';

  // --- DOM Elements ---
  // Main Navigation & Header
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconDark = document.getElementById('themeIconDark');
  const themeIconLight = document.getElementById('themeIconLight');
  const currentDateDisplay = document.getElementById('currentDateDisplay');
  const installAppBtn = document.getElementById('installAppBtn');
  const floatIslandBtn = document.getElementById('floatIslandBtn');

  // Stats / Progress
  const progressBarFill = document.getElementById('progressBarFill');
  const progressBarWrapper = document.getElementById('progressBarWrapper');
  const completionPercentage = document.getElementById('completionPercentage');
  const progressSubtitle = document.getElementById('progressSubtitle');
  const totalTasksCount = document.getElementById('totalTasksCount');
  const activeTasksCount = document.getElementById('activeTasksCount');
  const completedTasksCount = document.getElementById('completedTasksCount');
  const badgeAll = document.getElementById('badgeAll');
  const badgeActive = document.getElementById('badgeActive');
  const badgeCompleted = document.getElementById('badgeCompleted');

  // Main Form inputs
  const todoForm = document.getElementById('todoForm');
  const taskInput = document.getElementById('taskInput');
  const categorySelect = document.getElementById('categorySelect');
  const prioritySelect = document.getElementById('prioritySelect');
  const dueDateInput = document.getElementById('dueDateInput');

  // Toolbar
  const filterTabs = document.querySelectorAll('.filter-tab');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortBySelect = document.getElementById('sortBySelect');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');

  // List & Empty state
  const todoList = document.getElementById('todoList');
  const emptyState = document.getElementById('emptyState');
  const emptyStateTitle = document.getElementById('emptyStateTitle');
  const emptyStateDesc = document.getElementById('emptyStateDesc');

  // Edit Modal
  const editModal = document.getElementById('editModal');
  const editForm = document.getElementById('editForm');
  const editTaskId = document.getElementById('editTaskId');
  const editTaskTitle = document.getElementById('editTaskTitle');
  const editCategory = document.getElementById('editCategory');
  const editPriority = document.getElementById('editPriority');
  const editDueDate = document.getElementById('editDueDate');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  // Export / Import & Toast
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importDataBtn = document.getElementById('importDataBtn');
  const importFileInput = document.getElementById('importFileInput');
  const toastContainer = document.getElementById('toastContainer');

  // Floating Dynamic Island Elements
  const floatingIsland = document.getElementById('floatingIsland');
  const islandPillView = document.getElementById('islandPillView');
  const islandPendingCount = document.getElementById('islandPendingCount');
  const islandQuickAddBtn = document.getElementById('islandQuickAddBtn');
  const islandViewTasksBtn = document.getElementById('islandViewTasksBtn');
  const islandPipBtn = document.getElementById('islandPipBtn');
  const islandExpandedPipBtn = document.getElementById('islandExpandedPipBtn');
  const islandCollapseBtn = document.getElementById('islandCollapseBtn');

  const islandTabAdd = document.getElementById('islandTabAdd');
  const islandTabList = document.getElementById('islandTabList');
  const islandTabCount = document.getElementById('islandTabCount');

  const islandPaneAdd = document.getElementById('islandPaneAdd');
  const islandPaneList = document.getElementById('islandPaneList');
  const islandAddForm = document.getElementById('islandAddForm');
  const islandTaskInput = document.getElementById('islandTaskInput');
  const islandPrioBtns = document.querySelectorAll('.island-prio-btn');

  const islandCompletionStats = document.getElementById('islandCompletionStats');
  const islandTaskListItems = document.getElementById('islandTaskListItems');
  const islandMiniFilters = document.querySelectorAll('.island-filter-chip');
  const islandAddMoreLink = document.getElementById('islandAddMoreLink');

  // --- Greeting Helper ---
  function greet(name = 'to TodoTrack') {
    return `Welcome ${name}!`;
  }

  // --- Date Helpers ---
  function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function getFutureDateString(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function generateId() {
    return 'task_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }

  function getDateStatus(dueDateStr) {
    if (!dueDateStr) return null;
    const today = getTodayDateString();
    if (dueDateStr < today) return 'overdue';
    if (dueDateStr === today) return 'today';
    return 'upcoming';
  }

  // --- Picture-in-Picture (Always on Top Floating Island) ---
  async function togglePictureInPicture() {
    if (pipWindow) {
      pipWindow.close();
      pipWindow = null;
      return;
    }

    if (!('documentPictureInPicture' in window)) {
      showToast('Document Picture-in-Picture is supported in modern Chrome & Edge. You can also load our Extension to float over any website!', 'info');
      return;
    }

    try {
      pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 380,
        height: 480
      });

      // Copy stylesheet rules to PiP window
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = styleSheet.href;
          pipWindow.document.head.appendChild(link);
        }
      });

      // Add fonts
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
      pipWindow.document.head.appendChild(fontLink);

      // Setup body in PiP window
      pipWindow.document.body.className = 'pip-active';
      pipWindow.document.title = 'TodoTrack Floating Island';

      // Move the dynamic island into the PiP window
      pipWindow.document.body.appendChild(floatingIsland);
      openIsland('add');

      // When PiP closes, restore back to main page
      pipWindow.addEventListener('pagehide', () => {
        document.body.prepend(floatingIsland);
        closeIsland();
        pipWindow = null;
        showToast('Floating Island returned to main tab.', 'info');
      });

      showToast('Floating Island is now ALWAYS ON TOP of all other apps & websites!', 'success');
    } catch (err) {
      console.error('Error opening PiP window:', err);
      showToast('Could not open floating window: ' + err.message, 'error');
    }
  }

  // --- PWA Service Worker Registration ---
  function initPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installAppBtn) installAppBtn.style.display = 'inline-flex';
    });

    if (installAppBtn) {
      installAppBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
          showToast('To install, tap Share (iOS) or browser menu (Android) > "Add to Home Screen"', 'info');
          return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          installAppBtn.style.display = 'none';
          showToast('Thank you for installing TodoTrack!', 'success');
        }
        deferredPrompt = null;
      });
    }

    window.addEventListener('appinstalled', () => {
      if (installAppBtn) installAppBtn.style.display = 'none';
      deferredPrompt = null;
      showToast('TodoTrack installed as Web App successfully!', 'success');
    });
  }

  // --- Theme Management ---
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(activeTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    if (theme === 'dark') {
      themeIconDark.style.display = 'none';
      themeIconLight.style.display = 'block';
    } else {
      themeIconDark.style.display = 'block';
      themeIconLight.style.display = 'none';
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  // --- Storage ---
  function loadTodos() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        todos = JSON.parse(data);
      } else {
        todos = [...DEFAULT_TODOS];
        saveTodos();
      }
    } catch (err) {
      console.error('Error loading tasks from localStorage', err);
      todos = [...DEFAULT_TODOS];
    }
  }

  function saveTodos() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (err) {
      console.error('Error saving tasks to localStorage', err);
      showToast('Error saving data. Storage might be full.', 'error');
    }
  }

  // --- Toast Notifications ---
  function showToast(message, type = 'info', actionText = null, actionCallback = null) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    if (actionText && typeof actionCallback === 'function') {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'toast-undo-btn';
      actionBtn.textContent = actionText;
      actionBtn.addEventListener('click', () => {
        actionCallback();
        toast.remove();
      });
      toast.appendChild(actionBtn);
    }

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // --- Task CRUD Operations ---
  function addTask(title, category = 'General', priority = 'medium', dueDate = '') {
    const trimmed = title.trim();
    if (!trimmed) return;

    const newTask = {
      id: generateId(),
      title: trimmed,
      completed: false,
      category: category || 'General',
      priority: priority || 'medium',
      dueDate: dueDate || '',
      createdAt: Date.now(),
      completedAt: null
    };

    todos.unshift(newTask);
    saveTodos();
    render();
    showToast('Task added successfully!', 'success');
  }

  function toggleTask(id) {
    const task = todos.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;

    saveTodos();
    render();

    if (task.completed) {
      showToast('Task completed! Keep up the momentum.', 'success');
    }
  }

  function deleteTask(id) {
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) return;

    const removedItem = todos[index];
    recentlyDeleted = { item: removedItem, index };

    todos.splice(index, 1);
    saveTodos();
    render();

    clearTimeout(deleteUndoTimer);
    showToast(`Deleted "${removedItem.title.substring(0, 24)}${removedItem.title.length > 24 ? '...' : ''}"`, 'undo', 'Undo', () => {
      if (recentlyDeleted && recentlyDeleted.item) {
        todos.splice(recentlyDeleted.index, 0, recentlyDeleted.item);
        recentlyDeleted = null;
        saveTodos();
        render();
        showToast('Task restored!', 'success');
      }
    });

    deleteUndoTimer = setTimeout(() => {
      recentlyDeleted = null;
    }, 5000);
  }

  function updateTask(id, updates) {
    const task = todos.find(t => t.id === id);
    if (!task) return;

    Object.assign(task, updates);
    saveTodos();
    render();
    showToast('Task updated successfully.', 'info');
  }

  function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
      showToast('No completed tasks to clear.', 'info');
      return;
    }

    const previousTodos = [...todos];
    todos = todos.filter(t => !t.completed);
    saveTodos();
    render();

    showToast(`Cleared ${completedCount} completed task${completedCount > 1 ? 's' : ''}`, 'undo', 'Undo', () => {
      todos = previousTodos;
      saveTodos();
      render();
      showToast('Restored completed tasks.', 'success');
    });
  }

  // --- Filtering & Sorting ---
  function getFilteredAndSortedTodos() {
    return todos
      .filter(task => {
        if (currentFilter === 'active' && task.completed) return false;
        if (currentFilter === 'completed' && !task.completed) return false;

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchCategory = task.category.toLowerCase().includes(q);
          if (!matchTitle && !matchCategory) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (currentSort === 'created-asc') return a.createdAt - b.createdAt;
        if (currentSort === 'created-desc') return b.createdAt - a.createdAt;
        if (currentSort === 'alphabetical') return a.title.localeCompare(b.title);
        if (currentSort === 'priority-desc') {
          const priorityWeight = { high: 3, medium: 2, low: 1 };
          const weightDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
          if (weightDiff !== 0) return weightDiff;
          return b.createdAt - a.createdAt;
        }
        if (currentSort === 'due-date') {
          if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        return 0;
      });
  }

  // --- Dynamic Island Management ---
  function openIsland(mode = 'add') {
    isIslandExpanded = true;
    floatingIsland.classList.remove('collapsed');
    floatingIsland.classList.add('expanded');
    setIslandMode(mode);

    if (mode === 'add') {
      setTimeout(() => islandTaskInput.focus(), 150);
    }
  }

  function closeIsland() {
    isIslandExpanded = false;
    floatingIsland.classList.remove('expanded');
    floatingIsland.classList.add('collapsed');
  }

  function toggleIsland(mode = 'add') {
    if (!isIslandExpanded) {
      openIsland(mode);
    } else if (islandCurrentMode === mode) {
      closeIsland();
    } else {
      setIslandMode(mode);
    }
  }

  function setIslandMode(mode) {
    islandCurrentMode = mode;
    if (mode === 'add') {
      islandTabAdd.classList.add('active');
      islandTabList.classList.remove('active');
      islandPaneAdd.style.display = 'flex';
      islandPaneList.style.display = 'none';
      islandTaskInput.focus();
    } else {
      islandTabAdd.classList.remove('active');
      islandTabList.classList.add('active');
      islandPaneAdd.style.display = 'none';
      islandPaneList.style.display = 'flex';
      renderIslandTaskList();
    }
  }

  function renderIsland() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const active = total - completed;

    // Pill display
    if (active === 0 && total > 0) {
      islandPendingCount.textContent = 'All done! 🎉';
    } else {
      islandPendingCount.textContent = `${active} pending`;
    }

    // Tab count & summary stats
    islandTabCount.textContent = total;
    islandCompletionStats.textContent = `${completed} of ${total} done (${total > 0 ? Math.round((completed / total) * 100) : 0}%)`;

    // Re-render task list inside island if open
    if (isIslandExpanded && islandCurrentMode === 'list') {
      renderIslandTaskList();
    }
  }

  function renderIslandTaskList() {
    islandTaskListItems.innerHTML = '';

    const list = todos.filter(t => {
      if (islandListFilter === 'active') return !t.completed;
      if (islandListFilter === 'completed') return t.completed;
      return true;
    });

    if (list.length === 0) {
      const emptyNote = document.createElement('li');
      emptyNote.className = 'island-empty-note';
      if (islandListFilter === 'active') {
        emptyNote.textContent = 'Awesome! No pending tasks.';
      } else if (islandListFilter === 'completed') {
        emptyNote.textContent = 'No completed tasks yet.';
      } else {
        emptyNote.textContent = 'No tasks added yet. Tap "Add another task" above!';
      }
      islandTaskListItems.appendChild(emptyNote);
      return;
    }

    list.forEach(task => {
      const li = document.createElement('li');
      li.className = `island-item ${task.completed ? 'completed' : ''}`;
      li.innerHTML = `
        <div class="island-item-left">
          <input 
            type="checkbox" 
            class="island-checkbox" 
            aria-label="Toggle task ${escapeHTML(task.title)}"
            ${task.completed ? 'checked' : ''} 
          />
          <span class="island-item-title" title="${escapeHTML(task.title)}">${escapeHTML(task.title)}</span>
        </div>
        <span class="island-item-prio ${task.priority}">${task.priority}</span>
      `;

      const chk = li.querySelector('.island-checkbox');
      chk.addEventListener('change', () => {
        toggleTask(task.id);
      });

      islandTaskListItems.appendChild(li);
    });
  }

  // --- Main UI Rendering ---
  function renderStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const active = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    totalTasksCount.textContent = total;
    activeTasksCount.textContent = active;
    completedTasksCount.textContent = completed;

    badgeAll.textContent = total;
    badgeActive.textContent = active;
    badgeCompleted.textContent = completed;

    completionPercentage.textContent = `${percent}%`;
    progressBarFill.style.width = `${percent}%`;
    progressBarWrapper.setAttribute('aria-valuenow', percent);

    if (total === 0) {
      progressSubtitle.textContent = 'No tasks added yet.';
    } else if (percent === 100) {
      progressSubtitle.textContent = '🎉 All caught up! Outstanding job today!';
    } else if (percent >= 50) {
      progressSubtitle.textContent = `Over halfway there! ${active} task${active > 1 ? 's' : ''} left.`;
    } else {
      progressSubtitle.textContent = `Let's make progress! ${active} pending task${active > 1 ? 's' : ''}.`;
    }
  }

  function renderList() {
    const displayedTodos = getFilteredAndSortedTodos();
    todoList.innerHTML = '';

    if (displayedTodos.length === 0) {
      emptyState.style.display = 'block';
      if (searchQuery) {
        emptyStateTitle.textContent = 'No matching tasks';
        emptyStateDesc.textContent = `No tasks matched your search for "${searchQuery}".`;
      } else if (currentFilter === 'completed') {
        emptyStateTitle.textContent = 'No completed tasks';
        emptyStateDesc.textContent = 'Check off some tasks to see them completed here!';
      } else if (currentFilter === 'active') {
        emptyStateTitle.textContent = 'No active tasks';
        emptyStateDesc.textContent = 'You have completed everything! Great work.';
      } else {
        emptyStateTitle.textContent = 'Your todo list is empty';
        emptyStateDesc.textContent = 'Add your first task above or tap the Dynamic Island at the top!';
      }
      return;
    }

    emptyState.style.display = 'none';

    displayedTodos.forEach(task => {
      const li = document.createElement('li');
      li.className = `todo-item ${task.completed ? 'completed' : ''}`;
      li.dataset.id = task.id;

      let dueDateBadge = '';
      if (task.dueDate) {
        const status = getDateStatus(task.dueDate);
        const display = formatDisplayDate(task.dueDate);
        let statusClass = '';
        let statusLabel = display;

        if (status === 'overdue' && !task.completed) {
          statusClass = 'overdue';
          statusLabel = `${display} (Overdue)`;
        } else if (status === 'today' && !task.completed) {
          statusClass = 'today';
          statusLabel = 'Today';
        }

        dueDateBadge = `
          <span class="pill-badge due-badge ${statusClass}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${statusLabel}
          </span>
        `;
      }

      li.innerHTML = `
        <div class="todo-checkbox-wrapper">
          <input 
            type="checkbox" 
            class="custom-checkbox" 
            aria-label="Toggle task ${escapeHTML(task.title)}"
            ${task.completed ? 'checked' : ''} 
          />
        </div>
        <div class="todo-content">
          <div class="todo-title-row">
            <span class="todo-text">${escapeHTML(task.title)}</span>
          </div>
          <div class="todo-meta-row">
            <span class="pill-badge priority-badge ${task.priority}">
              ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
            <span class="pill-badge category-badge">
              ${escapeHTML(task.category)}
            </span>
            ${dueDateBadge}
          </div>
        </div>
        <div class="todo-actions">
          <button class="action-btn edit-btn" title="Edit Task" aria-label="Edit task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="action-btn delete-btn" title="Delete Task" aria-label="Delete task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      `;

      const checkbox = li.querySelector('.custom-checkbox');
      checkbox.addEventListener('change', () => toggleTask(task.id));

      const editBtn = li.querySelector('.edit-btn');
      editBtn.addEventListener('click', () => openEditModal(task));

      const deleteBtn = li.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      todoList.appendChild(li);
    });
  }

  function render() {
    renderStats();
    renderList();
    renderIsland();
  }

  // --- Modal Management ---
  function openEditModal(task) {
    editTaskId.value = task.id;
    editTaskTitle.value = task.title;
    editCategory.value = task.category || 'General';
    editPriority.value = task.priority || 'medium';
    editDueDate.value = task.dueDate || '';

    editModal.style.display = 'flex';
    editTaskTitle.focus();
  }

  function closeEditModal() {
    editModal.style.display = 'none';
    editForm.reset();
  }

  // --- Import / Export Handlers ---
  function exportTodos() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todos, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `todotrack-backup-${getTodayDateString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Tasks exported to JSON file.', 'info');
  }

  function importTodos(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          const validTodos = imported.filter(item => item && typeof item.title === 'string');
          if (validTodos.length > 0) {
            todos = validTodos;
            saveTodos();
            render();
            showToast(`Successfully imported ${validTodos.length} tasks!`, 'success');
          } else {
            showToast('No valid tasks found in the file.', 'error');
          }
        } else {
          showToast('Invalid JSON file structure.', 'error');
        }
      } catch (err) {
        console.error('Import error', err);
        showToast('Error reading JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // --- Setup Today's Date in Header ---
  function setupHeaderDate() {
    const now = new Date();
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    currentDateDisplay.textContent = now.toLocaleDateString(undefined, options);
  }

  // --- Event Bindings ---
  function initEventListeners() {
    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Picture-in-Picture Floating Trigger Buttons
    if (floatIslandBtn) floatIslandBtn.addEventListener('click', togglePictureInPicture);
    if (islandPipBtn) islandPipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePictureInPicture();
    });
    if (islandExpandedPipBtn) islandExpandedPipBtn.addEventListener('click', togglePictureInPicture);

    // Dynamic Island Pill Clicks
    islandPillView.addEventListener('click', (e) => {
      if (e.target.closest('#islandQuickAddBtn')) {
        toggleIsland('add');
        return;
      }
      if (e.target.closest('#islandViewTasksBtn')) {
        toggleIsland('list');
        return;
      }
      if (e.target.closest('#islandPipBtn')) {
        return; // Handled by its own listener
      }
      toggleIsland('add');
    });

    // Expand tabs inside island
    islandTabAdd.addEventListener('click', () => setIslandMode('add'));
    islandTabList.addEventListener('click', () => setIslandMode('list'));
    islandCollapseBtn.addEventListener('click', closeIsland);

    // Island Quick Priority selection
    islandPrioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        islandPrioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        islandSelectedPriority = btn.dataset.priority;
      });
    });

    // Island Quick Add Form Submission
    islandAddForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = islandTaskInput.value.trim();
      if (!val) return;

      addTask(val, 'General', islandSelectedPriority, '');
      islandTaskInput.value = '';
      showToast('Added directly via Island!', 'success');
      islandTaskInput.focus();
    });

    // Island mini filters (All / Active / Done)
    islandMiniFilters.forEach(chip => {
      chip.addEventListener('click', () => {
        islandMiniFilters.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        islandListFilter = chip.dataset.filter;
        renderIslandTaskList();
      });
    });

    // Switch from island list view back to quick add
    islandAddMoreLink.addEventListener('click', () => {
      setIslandMode('add');
    });

    // Close island on click outside (when not in standalone PiP mode)
    document.addEventListener('click', (e) => {
      if (!pipWindow && isIslandExpanded && !floatingIsland.contains(e.target)) {
        closeIsland();
      }
    });

    // Main Add Form Submit
    todoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addTask(
        taskInput.value,
        categorySelect.value,
        prioritySelect.value,
        dueDateInput.value
      );
      taskInput.value = '';
      dueDateInput.value = '';
      taskInput.focus();
    });

    // Main Filter Tabs
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        currentFilter = tab.dataset.filter;
        renderList();
      });
    });

    // Search Input
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      renderList();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      searchInput.focus();
      renderList();
    });

    // Sort Select
    sortBySelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderList();
    });

    // Clear Completed
    clearCompletedBtn.addEventListener('click', clearCompleted);

    // Edit Modal Events
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = editTaskId.value;
      updateTask(id, {
        title: editTaskTitle.value.trim(),
        category: editCategory.value,
        priority: editPriority.value,
        dueDate: editDueDate.value
      });
      closeEditModal();
    });

    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);

    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) {
        closeEditModal();
      }
    });

    // Import / Export
    exportDataBtn.addEventListener('click', exportTodos);
    importDataBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importTodos);

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleIsland('add');
        return;
      }

      if (e.key === 'Escape') {
        if (isIslandExpanded) {
          closeIsland();
        } else if (editModal.style.display === 'flex') {
          closeEditModal();
        } else if (searchInput === document.activeElement) {
          searchInput.value = '';
          searchQuery = '';
          clearSearchBtn.style.display = 'none';
          searchInput.blur();
          renderList();
        }
      } else if (e.key === '/' && document.activeElement !== taskInput && document.activeElement !== editTaskTitle && document.activeElement !== islandTaskInput) {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  // --- App Initialization ---
  function init() {
    initPWA();
    initTheme();
    setupHeaderDate();
    loadTodos();
    initEventListeners();
    render();
    showToast(greet(), 'success');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
