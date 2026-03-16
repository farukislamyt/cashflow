# 💸 CashFlow — Personal Cash Management

> Production-grade personal finance tracker. Responsive, SEO-friendly, offline-first.
> Zero frameworks · Zero backend · Zero tracking.

🌐 **Live:** [farukislamyt.github.io/CashFlow](https://farukislamyt.github.io/CashFlow/)

---

## ✨ Features

| Feature | Details |
|---|---|
| 📊 **Dashboard** | KPI cards, 7-day chart, quick-add form |
| 📋 **History** | Full transaction list with search & filter |
| 🎯 **Budget** | Per-category monthly limits + progress bars |
| 📈 **Reports** | 6-month chart, expense donut, savings rate |
| ⚙️ **Settings** | Name, currency, export/import, data management |
| 📱 **Bottom Nav** | Native-feeling mobile nav with badge indicators |
| 🔒 **Private** | 100% localStorage — data never leaves your device |
| 📤 **Export** | CSV + JSON backup/restore |
| ♿ **Accessible** | ARIA labels, semantic HTML, keyboard navigation |
| 🔍 **SEO** | Meta tags, Open Graph, Twitter Card, JSON-LD |

---

## 🗂 File Structure

```
CashFlow/
├── index.html                ← App shell (all 5 pages)
├── README.md
├── .nojekyll                 ← Required for GitHub Pages
└── assets/
    ├── css/
    │   ├── tokens.css        ← Design tokens (CSS variables)
    │   ├── base.css          ← Reset, layout shell
    │   ├── nav.css           ← Sidebar + TopBar + BottomNav
    │   └── components.css    ← All UI components
    ├── js/
    │   ├── store.js          ← Data layer (localStorage, no seed data)
    │   ├── ui.js             ← Render helpers, toast, modal, charts
    │   └── app.js            ← App controller, page logic
    └── icons/
        └── favicon.svg
```

---

## 🚀 Deploy to GitHub Pages

1. Push all files to your `CashFlow` repo (root of `main` branch)
2. **Settings → Pages → Source → Deploy from branch → `main` / `root`**
3. Live at `https://farukislamyt.github.io/CashFlow/`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + K` | Open Add Transaction modal |
| `Esc` | Close any open modal |

---

## 🏗 Architecture

| File | Role |
|---|---|
| `store.js` | Single source of truth. All reads/writes. Versioned keys. Quota handling. |
| `ui.js` | Stateless helpers: `txRow()`, `renderBarChart()`, `renderDonut()`, `Toast`, `Modal`, `Confirm`. |
| `app.js` | Controller. Owns page state, wires all user events, calls Store + UI. |

---

Built by [Faruk Islam](https://github.com/farukislamyt) · MIT License
