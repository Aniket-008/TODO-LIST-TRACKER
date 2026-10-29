# TodoTrack — Smart Productivity Web App & Cross-App Floating Island

TodoTrack provides a true **"App-in-App" floating island interface** that floats over other websites and desktop applications. You can capture, view, and complete tasks from anywhere without needing to switch tabs or open the website.

---

## 🌟 3 Ways to Float Over Other Websites & Apps

### 1. In-Browser: Native "Float Over Apps" (Picture-in-Picture)
Built directly into the web app:
- Click the **"Float Over Apps"** button (or the PiP icon on the island).
- The Dynamic Island detaches into an **Always-on-Top floating mini-window**.
- It stays pinned on top of Word, VS Code, Discord, games, and other browser windows.
- Add tasks, view lists, and check off completed items in real time.

---

### 2. Browser Extension: Island on EVERY Website You Visit
Located in [`A:\Portfolio\website\extension`](./extension/):
The extension automatically injects the Dynamic Island onto **every website you browse** (Google, YouTube, GitHub, Reddit, news, work tools) using Shadow DOM (isolated styling).

**How to Install in Chrome or Edge (takes 10 seconds):**
1. Open your browser and go to `chrome://extensions` or `edge://extensions`.
2. Toggle on **"Developer mode"** (top right).
3. Click **"Load unpacked"**.
4. Select the folder: `A:\Portfolio\website\extension`.
5. Done! Now when browsing any website:
   - A sleek island floats at the top-center of the page.
   - Click to type a task and press <kbd>Enter</kbd> to save.
   - Click the **📋 Tasks** button to see your tasks and mark them done/undone on the spot.
   - Shortcut: Press <kbd>Alt + T</kbd> to toggle the island on any webpage!

---

### 3. Windows Desktop Island: Floats Over Any Software
Located in [`desktop_island.py`](./desktop_island.py):
A standalone, frameless desktop widget that floats at the top of your Windows monitor above **all desktop applications**.

**How to Run:**
- Double-click [`run_desktop_island.bat`](./run_desktop_island.bat) or run:
  ```bash
  python desktop_island.py
  ```
- **Features**:
  - Always on top of any software (`-topmost`).
  - Draggable anywhere on your screen.
  - Click to expand Quick Add input, press <kbd>Enter</kbd> to save.
  - Click `📋` to view tasks, double-click or click `☐` to mark as done/undone.
  - Saves to [`todos_db.json`](./todos_db.json).

---

## ⌨️ Shortcuts Summary

| Shortcut | Context | Action |
|---|---|---|
| <kbd>Ctrl + K</kbd> or <kbd>Cmd + K</kbd> | Main Web App | Toggle Floating Dynamic Island |
| <kbd>Alt + T</kbd> | Any Website (Extension) | Toggle Floating Island anywhere |
| <kbd>Enter</kbd> | Any Island Form | Submit and save task |
| <kbd>/</kbd> | Web App | Focus search bar |
| <kbd>Escape</kbd> | Anywhere | Collapse island or close dialogs |
