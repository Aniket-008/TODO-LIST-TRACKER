"""
TodoTrack - Desktop Floating Dynamic Island
Always-on-top desktop widget for Windows/macOS/Linux.
Floats over any application (Word, games, code editor, browser).
"""

import sys
import json
import os
import time
import tkinter as tk
from tkinter import ttk

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "todos_db.json")

def load_todos():
    if not os.path.exists(DB_FILE):
        default_todos = [
            {"id": "d-1", "title": "Welcome to Desktop Island! Double click task to toggle done", "completed": False, "priority": "high"},
            {"id": "d-2", "title": "Type your task here & press Enter from any desktop app", "completed": False, "priority": "medium"}
        ]
        save_todos(default_todos)
        return default_todos
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_todos(todos):
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(todos, f, indent=2)
    except Exception as e:
        print("Error saving todos:", e)

class DesktopDynamicIsland(tk.Tk):
    def __init__(self):
        super().__init__()
        self.todos = load_todos()

        # Frameless, Always on Top, No Taskbar button
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        
        # Windows dark mode background
        self.configure(bg="#0f172a")

        # Dimensions & screen position (Top Center)
        screen_w = self.winfo_screenwidth()
        self.pill_w = 260
        self.pill_h = 42
        self.expanded_w = 420
        self.expanded_h = 340
        self.x = (screen_w - self.pill_w) // 2
        self.y = 10

        self.geometry(f"{self.pill_w}x{self.pill_h}+{self.x}+{self.y}")

        self.is_expanded = False
        self.current_mode = "add" # "add" or "list"

        self.setup_ui()
        self.update_pending_count()

        # Make window draggable
        self.bind("<ButtonPress-1>", self.start_move)
        self.bind("<B1-Motion>", self.do_move)

    def start_move(self, event):
        self._drag_x = event.x
        self._drag_y = event.y

    def do_move(self, event):
        deltax = event.x - self._drag_x
        deltay = event.y - self._drag_y
        new_x = self.winfo_x() + deltax
        new_y = self.winfo_y() + deltay
        self.geometry(f"+{new_x}+{new_y}")

    def setup_ui(self):
        # Pill Frame (Collapsed State)
        self.pill_frame = tk.Frame(self, bg="#0f172a", cursor="hand2")
        self.pill_frame.pack(fill=tk.BOTH, expand=True)

        self.dot = tk.Label(self.pill_frame, text="●", fg="#10b981", bg="#0f172a", font=("Segoe UI", 11, "bold"))
        self.dot.pack(side=tk.LEFT, padx=(12, 4))

        self.lbl_title = tk.Label(self.pill_frame, text="Island", fg="#ffffff", bg="#0f172a", font=("Segoe UI", 9, "bold"))
        self.lbl_title.pack(side=tk.LEFT)

        self.lbl_count = tk.Label(self.pill_frame, text="0 pending", fg="#94a3b8", bg="#0f172a", font=("Segoe UI", 8))
        self.lbl_count.pack(side=tk.LEFT, padx=(6, 8))

        self.btn_pill_add = tk.Label(self.pill_frame, text=" + ", fg="#ffffff", bg="#4f46e5", font=("Segoe UI", 9, "bold"), cursor="hand2", padx=6, pady=2)
        self.btn_pill_add.pack(side=tk.RIGHT, padx=4)
        self.btn_pill_add.bind("<Button-1>", lambda e: self.toggle_expand("add"))

        self.btn_pill_list = tk.Label(self.pill_frame, text=" 📋 ", fg="#ffffff", bg="#1e293b", font=("Segoe UI", 9), cursor="hand2", padx=4, pady=2)
        self.btn_pill_list.pack(side=tk.RIGHT, padx=2)
        self.btn_pill_list.bind("<Button-1>", lambda e: self.toggle_expand("list"))

        self.pill_frame.bind("<Button-1>", lambda e: self.toggle_expand("add"))
        self.lbl_title.bind("<Button-1>", lambda e: self.toggle_expand("add"))
        self.lbl_count.bind("<Button-1>", lambda e: self.toggle_expand("add"))

        # Expanded Frame (Panel State)
        self.expanded_frame = tk.Frame(self, bg="#0f172a", padx=12, pady=10)

        # Header with Tabs and Close button
        header = tk.Frame(self.expanded_frame, bg="#0f172a")
        header.pack(fill=tk.X, pady=(0, 8))

        self.tab_add_btn = tk.Button(header, text="＋ Quick Add", font=("Segoe UI", 8, "bold"), fg="#ffffff", bg="#4f46e5", relief=tk.FLAT, command=lambda: self.switch_mode("add"))
        self.tab_add_btn.pack(side=tk.LEFT, padx=(0, 4))

        self.tab_list_btn = tk.Button(header, text="📋 Tasks", font=("Segoe UI", 8, "bold"), fg="#94a3b8", bg="#1e293b", relief=tk.FLAT, command=lambda: self.switch_mode("list"))
        self.tab_list_btn.pack(side=tk.LEFT)

        btn_close = tk.Label(header, text=" ✕ ", fg="#cbd5e1", bg="#1e293b", font=("Segoe UI", 8, "bold"), cursor="hand2")
        btn_close.pack(side=tk.RIGHT)
        btn_close.bind("<Button-1>", lambda e: self.collapse())

        # Sub-pane: Add Form
        self.pane_add = tk.Frame(self.expanded_frame, bg="#0f172a")
        self.pane_add.pack(fill=tk.BOTH, expand=True)

        lbl_input = tk.Label(self.pane_add, text="What do you want to accomplish?", fg="#94a3b8", bg="#0f172a", font=("Segoe UI", 8))
        lbl_input.pack(anchor=tk.W, pady=(4, 4))

        input_row = tk.Frame(self.pane_add, bg="#1e293b", padx=6, pady=4)
        input_row.pack(fill=tk.X, pady=(0, 8))

        self.entry_task = tk.Entry(input_row, fg="#ffffff", bg="#1e293b", insertbackground="#ffffff", font=("Segoe UI", 10), relief=tk.FLAT)
        self.entry_task.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)
        self.entry_task.bind("<Return>", self.add_task)

        btn_add = tk.Button(input_row, text="Add", fg="#ffffff", bg="#4f46e5", font=("Segoe UI", 8, "bold"), relief=tk.FLAT, command=self.add_task)
        btn_add.pack(side=tk.RIGHT)

        hint = tk.Label(self.pane_add, text="Press Enter to save instantly from any app.", fg="#64748b", bg="#0f172a", font=("Segoe UI", 7))
        hint.pack(anchor=tk.W)

        # Sub-pane: Task List
        self.pane_list = tk.Frame(self.expanded_frame, bg="#0f172a")

        self.listbox_frame = tk.Frame(self.pane_list, bg="#0f172a")
        self.listbox_frame.pack(fill=tk.BOTH, expand=True)

        self.list_canvas = tk.Canvas(self.listbox_frame, bg="#0f172a", highlightthickness=0)
        self.scrollbar = ttk.Scrollbar(self.listbox_frame, orient="vertical", command=self.list_canvas.yview)
        self.scrollable_list = tk.Frame(self.list_canvas, bg="#0f172a")

        self.scrollable_list.bind("<Configure>", lambda e: self.list_canvas.configure(scrollregion=self.list_canvas.bbox("all")))
        self.list_canvas.create_window((0, 0), window=self.scrollable_list, anchor="nw")
        self.list_canvas.configure(xscrollcommand=None, yscrollcommand=self.scrollbar.set)

        self.list_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    def toggle_expand(self, mode="add"):
        if not self.is_expanded:
            self.expand(mode)
        else:
            if self.current_mode == mode:
                self.collapse()
            else:
                self.switch_mode(mode)

    def expand(self, mode="add"):
        self.is_expanded = True
        screen_w = self.winfo_screenwidth()
        cur_x = (screen_w - self.expanded_w) // 2
        self.geometry(f"{self.expanded_w}x{self.expanded_h}+{cur_x}+10")
        self.pill_frame.pack_forget()
        self.expanded_frame.pack(fill=tk.BOTH, expand=True)
        self.switch_mode(mode)

    def collapse(self):
        self.is_expanded = False
        screen_w = self.winfo_screenwidth()
        cur_x = (screen_w - self.pill_w) // 2
        self.geometry(f"{self.pill_w}x{self.pill_h}+{cur_x}+10")
        self.expanded_frame.pack_forget()
        self.pill_frame.pack(fill=tk.BOTH, expand=True)
        self.update_pending_count()

    def switch_mode(self, mode):
        self.current_mode = mode
        if mode == "add":
            self.tab_add_btn.configure(bg="#4f46e5", fg="#ffffff")
            self.tab_list_btn.configure(bg="#1e293b", fg="#94a3b8")
            self.pane_list.pack_forget()
            self.pane_add.pack(fill=tk.BOTH, expand=True)
            self.entry_task.focus_set()
        else:
            self.tab_list_btn.configure(bg="#4f46e5", fg="#ffffff")
            self.tab_add_btn.configure(bg="#1e293b", fg="#94a3b8")
            self.pane_add.pack_forget()
            self.pane_list.pack(fill=tk.BOTH, expand=True)
            self.render_task_items()

    def add_task(self, event=None):
        title = self.entry_task.get().strip()
        if not title:
            return
        new_task = {
            "id": f"desk_{int(time.time()*1000)}",
            "title": title,
            "completed": False,
            "priority": "medium",
            "createdAt": int(time.time()*1000)
        }
        self.todos.insert(0, new_task)
        save_todos(self.todos)
        self.entry_task.delete(0, tk.END)
        self.update_pending_count()

    def toggle_task_done(self, task_id):
        for t in self.todos:
            if t["id"] == task_id:
                t["completed"] = not t["completed"]
                break
        save_todos(self.todos)
        self.update_pending_count()
        self.render_task_items()

    def delete_task(self, task_id):
        self.todos = [t for t in self.todos if t["id"] != task_id]
        save_todos(self.todos)
        self.update_pending_count()
        self.render_task_items()

    def update_pending_count(self):
        active = sum(1 for t in self.todos if not t.get("completed", False))
        total = len(self.todos)
        if active == 0 and total > 0:
            self.lbl_count.configure(text="All done! 🎉")
        else:
            self.lbl_count.configure(text=f"{active} pending")
        self.tab_list_btn.configure(text=f"📋 Tasks ({total})")

    def render_task_items(self):
        for widget in self.scrollable_list.winfo_children():
            widget.destroy()

        if not self.todos:
            lbl = tk.Label(self.scrollable_list, text="No tasks added yet.", fg="#64748b", bg="#0f172a", font=("Segoe UI", 9))
            lbl.pack(pady=20)
            return

        for task in self.todos:
            t_id = task["id"]
            completed = task.get("completed", False)
            title = task["title"]

            row = tk.Frame(self.scrollable_list, bg="#1e293b", padx=6, pady=5)
            row.pack(fill=tk.X, pady=2)

            chk_txt = "☑" if completed else "☐"
            chk_color = "#10b981" if completed else "#94a3b8"
            chk = tk.Label(row, text=chk_txt, fg=chk_color, bg="#1e293b", font=("Segoe UI", 11), cursor="hand2")
            chk.pack(side=tk.LEFT, padx=(2, 6))
            chk.bind("<Button-1>", lambda e, tid=t_id: self.toggle_task_done(tid))

            txt_fg = "#64748b" if completed else "#ffffff"
            title_lbl = tk.Label(row, text=title, fg=txt_fg, bg="#1e293b", font=("Segoe UI", 9), anchor="w")
            title_lbl.pack(side=tk.LEFT, fill=tk.X, expand=True)
            title_lbl.bind("<Button-1>", lambda e, tid=t_id: self.toggle_task_done(tid))

            btn_del = tk.Label(row, text="✕", fg="#94a3b8", bg="#1e293b", font=("Segoe UI", 8), cursor="hand2")
            btn_del.pack(side=tk.RIGHT, padx=4)
            btn_del.bind("<Button-1>", lambda e, tid=t_id: self.delete_task(tid))

if __name__ == "__main__":
    app = DesktopDynamicIsland()
    app.mainloop()
