/**
 * CashFlow — App Controller
 */
const App = (() => {
  'use strict';

  // ── State ──
  let _page        = 'dashboard';
  let _dashFilter  = 'all';
  let _histFilter  = 'all';
  let _histSearch  = '';
  let _modalType   = 'income';
  let _quickType   = 'income';
  let _editId      = null;

  // ══════════════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════════════
  function goTo(name) {
    if (_page === name) return;
    _page = name;

    // Pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pg = document.getElementById('page-' + name);
    if (pg) pg.classList.add('active');

    // Sidebar nav
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.page === name);
    });

    // Bottom nav
    document.querySelectorAll('.bn-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === name);
    });

    // Topbar title
    const titles = {
      dashboard: 'Dashboard', history: 'History',
      budget: 'Budget', reports: 'Reports', settings: 'Settings',
    };
    setText('topbar-title', titles[name] || '');

    // Render
    _renderPage(name);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function _renderPage(name) {
    switch (name) {
      case 'dashboard': _renderDashboard(); break;
      case 'history':   _renderHistory();   break;
      case 'budget':    _renderBudget();     break;
      case 'reports':   _renderReports();    break;
      case 'settings':  _renderSettings();   break;
    }
  }

  function _refresh() { _renderPage(_page); }

  // ══════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════
  function _renderDashboard() {
    const monthly = Store.getThisMonth();
    const inc     = Store.sumType(monthly, 'income');
    const exp     = Store.sumType(monthly, 'expense');
    const bal     = Store.totalBalance();
    const net     = inc - exp;

    setText('d-month', currentMonthLabel());
    setText('d-balance', Store.fmt(bal));
    setText('d-income',  Store.fmt(inc));
    setText('d-expense', Store.fmt(exp));
    setText('d-net',     Store.fmt(net));

    const balEl = document.getElementById('d-balance');
    if (balEl) balEl.className = 'kpi-value ' + (bal < 0 ? 'negative' : 'accent');

    const netEl = document.getElementById('d-net');
    if (netEl) netEl.className = 'kpi-value ' + (net < 0 ? 'negative' : 'positive');

    // Recent transactions (last 8)
    _renderTxTable('d-tx-body', 'd-empty', _dashFilter, 8, '');

    // 7-day chart
    renderBarChart('d-chart', Store.last7Days(), 100);

    // Savings summary
    const rate = inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0;
    setText('d-save-rate', (rate < 0 ? 0 : rate) + '%');

    // Budget warning badges
    _updateBudgetBadges();
  }

  function _setDashFilter(f, btn) {
    _dashFilter = f;
    document.querySelectorAll('#page-dashboard .tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    _renderTxTable('d-tx-body', 'd-empty', _dashFilter, 8, '');
  }

  // ══════════════════════════════════════════
  // HISTORY
  // ══════════════════════════════════════════
  function _renderHistory() {
    _histSearch = document.getElementById('hist-search')?.value || '';
    _renderTxTable('h-tx-body', 'h-empty', _histFilter, null, _histSearch);

    const all = Store.getAll();
    const inc = Store.sumType(all, 'income');
    const exp = Store.sumType(all, 'expense');
    setText('h-total-inc', Store.fmt(inc));
    setText('h-total-exp', Store.fmt(exp));
    setText('h-total-bal', Store.fmt(inc - exp));
    setText('h-count', all.length + ' transaction' + (all.length !== 1 ? 's' : ''));
  }

  function _setHistFilter(f, btn) {
    _histFilter = f;
    document.querySelectorAll('#page-history .tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    _renderHistory();
  }

  // ══════════════════════════════════════════
  // SHARED TABLE RENDERER
  // ══════════════════════════════════════════
  function _renderTxTable(bodyId, emptyId, filter, limit, search) {
    let list = Store.getAll().sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filter !== 'all') list = list.filter(t => t.type === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.desc || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.note || '').toLowerCase().includes(q)
      );
    }
    if (limit !== null && limit !== undefined) list = list.slice(0, limit);

    const body  = document.getElementById(bodyId);
    const empty = document.getElementById(emptyId);
    if (!body) return;

    if (!list.length) {
      body.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    body.innerHTML = list.map(txRow).join('');
  }

  // ══════════════════════════════════════════
  // BUDGET
  // ══════════════════════════════════════════
  function _renderBudget() {
    const monthly  = Store.getThisMonth();
    const spent    = Store.spendByCategory(monthly);
    const budgets  = Store.getBudgets();

    const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
    const totalSpent  = Object.keys(budgets).reduce((s, k) => s + (spent[k] || 0), 0);

    setText('b-total',     Store.fmt(totalBudget));
    setText('b-spent',     Store.fmt(totalSpent));
    setText('b-remaining', Store.fmt(Math.max(totalBudget - totalSpent, 0)));

    // Overall progress
    const overallPct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;
    const overallFill = document.getElementById('b-overall-fill');
    if (overallFill) {
      const cls = overallPct >= 90 ? 'danger' : overallPct >= 70 ? 'warn' : 'safe';
      overallFill.className = `progress-fill ${cls}`;
      overallFill.style.width = overallPct + '%';
    }
    setText('b-overall-pct', overallPct + '%');

    // Category list
    const list = document.getElementById('b-list');
    if (!list) return;

    const cats = Object.keys(budgets);
    if (!cats.length) {
      list.innerHTML = `<div class="empty" style="padding:32px 0">
        <div class="empty-emoji">🎯</div>
        <p>No budgets set. Tap "+ Add Budget" to begin.</p>
      </div>`;
      return;
    }

    list.innerHTML = cats.map(cat => {
      const limit    = budgets[cat];
      const spentAmt = spent[cat] || 0;
      const pct      = limit > 0 ? Math.min(Math.round((spentAmt / limit) * 100), 100) : 0;
      const cls      = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'safe';
      const m        = catMeta(cat);

      return `
        <div class="budget-item">
          <div class="budget-top">
            <span class="budget-name">${m.emoji} ${m.label}</span>
            <div class="budget-right">
              <span class="budget-nums">${Store.fmt(spentAmt)} / ${Store.fmt(limit)}</span>
              <span class="budget-pct ${cls}">${pct}%</span>
              <button class="budget-del" onclick="App.deleteBudget('${h(cat)}')" title="Remove" aria-label="Remove ${m.label} budget">✕</button>
            </div>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${cls}" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('');
  }

  function _updateBudgetBadges() {
    const monthly = Store.getThisMonth();
    const spent   = Store.spendByCategory(monthly);
    const budgets = Store.getBudgets();
    let overBudget = 0;

    Object.keys(budgets).forEach(cat => {
      const pct = budgets[cat] > 0 ? (spent[cat] || 0) / budgets[cat] : 0;
      if (pct >= 0.9) overBudget++;
    });

    // Badge on bottom nav
    const dot = document.getElementById('bn-budget-dot');
    if (dot) dot.classList.toggle('visible', overBudget > 0);

    // Badge on sidebar nav
    const badge = document.getElementById('nav-budget-badge');
    if (badge) {
      badge.textContent = overBudget > 0 ? overBudget : '';
      badge.classList.toggle('visible', overBudget > 0);
    }
  }

  // ══════════════════════════════════════════
  // REPORTS
  // ══════════════════════════════════════════
  function _renderReports() {
    const monthly  = Store.getThisMonth();
    const inc      = Store.sumType(monthly, 'income');
    const exp      = Store.sumType(monthly, 'expense');
    const catSpend = Store.spendByCategory(monthly);
    const avgDay   = Store.averageDailyExpense();
    const rate     = inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0;
    const allBal   = Store.totalBalance();

    setText('r-avg-daily',  Store.fmt(avgDay));
    setText('r-save-rate',  (rate < 0 ? 0 : rate) + '%');
    setText('r-net-worth',  Store.fmt(allBal));

    // Top category
    const sorted = Object.entries(catSpend).sort((a, b) => b[1] - a[1]);
    if (sorted.length) {
      const [topCat, topAmt] = sorted[0];
      const m = catMeta(topCat);
      setText('r-top-cat', m.emoji + ' ' + m.label);
      setText('r-top-amt', Store.fmt(topAmt));
    } else {
      setText('r-top-cat', '—');
      setText('r-top-amt', '');
    }

    // 6-month chart
    renderBarChart('r-monthly-chart', Store.last6Months(), 150);

    // Donut
    const donutData = sorted.slice(0, 7).map(([cat, val], i) => ({
      label: catMeta(cat).label,
      value: val,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

    const donutLegend = donutData.map(d =>
      `<div class="dl-item">
        <span class="dl-dot" style="background:${d.color}"></span>
        <span class="dl-name">${h(d.label)}</span>
        <span class="dl-val">${Store.fmt(d.value)}</span>
      </div>`
    ).join('');

    setHTML('r-donut', `
      <div class="donut-wrap">
        ${renderDonut(donutData, 'EXPENSES')}
        <div class="donut-legend">${donutLegend || '<p style="color:var(--t-muted);font-size:13px">No expense data.</p>'}</div>
      </div>`);
  }

  // ══════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════
  function _renderSettings() {
    const s = Store.getSettings();
    const nameEl = document.getElementById('s-name');
    const currEl = document.getElementById('s-currency');
    if (nameEl) nameEl.value = s.userName || '';
    if (currEl) currEl.value = s.currency || '৳';

    // Toggles
    const ntEl = document.getElementById('toggle-notif');
    const cvEl = document.getElementById('toggle-compact');
    if (ntEl) ntEl.classList.toggle('on', !!s.notifications);
    if (cvEl) cvEl.classList.toggle('on', !!s.compactView);

    // Storage info
    const info = Store.storageInfo();
    if (info) {
      setText('s-storage-size', info.total);
      setText('s-tx-count', Store.getAll().length + ' transactions');
    }

    // User avatar initials
    _updateAvatarInitials(s.userName);
  }

  function saveSettings() {
    const name = document.getElementById('s-name')?.value?.trim();
    const curr = document.getElementById('s-currency')?.value;
    if (!name) { Toast.show('Name cannot be empty.', 'error'); return; }
    Store.updateSettings({ userName: name, currency: curr || '৳' });
    _updateAvatarInitials(name);
    setText('sidebar-username', name);
    Toast.show('Settings saved!', 'success');
  }

  function toggleSetting(key, btn) {
    const s   = Store.getSettings();
    const val = !s[key];
    Store.updateSettings({ [key]: val });
    if (btn) btn.classList.toggle('on', val);
  }

  function _updateAvatarInitials(name) {
    const parts = (name || 'My Account').trim().split(/\s+/);
    const init  = parts.length >= 2
      ? parts[0][0].toUpperCase() + parts[1][0].toUpperCase()
      : (parts[0] || 'M').slice(0, 2).toUpperCase();
    document.querySelectorAll('.user-avatar').forEach(el => el.textContent = init);
  }

  // ══════════════════════════════════════════
  // QUICK ADD (Dashboard)
  // ══════════════════════════════════════════
  function setQuickType(t) {
    _quickType = t;
    document.getElementById('q-inc').classList.toggle('on', t === 'income');
    document.getElementById('q-exp').classList.toggle('on', t === 'expense');
    setHTML('q-category', catOptions(t));
  }

  function quickAdd() {
    const desc   = document.getElementById('q-desc')?.value?.trim();
    const amount = parseFloat(document.getElementById('q-amount')?.value || '');
    const cat    = document.getElementById('q-category')?.value;
    const date   = document.getElementById('q-date')?.value;

    if (!desc)           { Toast.show('Enter a description.', 'error'); return; }
    if (!amount || amount <= 0) { Toast.show('Enter a valid amount.', 'error'); return; }
    if (!date)           { Toast.show('Select a date.', 'error'); return; }

    Store.add({ type: _quickType, desc, amount, category: cat, date });

    // Reset
    document.getElementById('q-desc').value   = '';
    document.getElementById('q-amount').value = '';
    document.getElementById('q-date').value   = todayISO();

    Toast.show(`${_quickType === 'income' ? 'Income' : 'Expense'} added!`, 'success');
    _renderDashboard();
  }

  // ══════════════════════════════════════════
  // TRANSACTION MODAL
  // ══════════════════════════════════════════
  function openAdd(type = 'income') {
    _editId     = null;
    _modalType  = type;
    setText('m-title', 'Add Transaction');
    _clearTxForm();
    _syncModalType();
    document.getElementById('m-date').value = todayISO();
    Modal.open('tx-modal');
  }

  function editTx(id) {
    const tx = Store.getById(id);
    if (!tx) return;
    _editId    = id;
    _modalType = tx.type;

    setText('m-title', 'Edit Transaction');
    setEl('m-desc',     tx.desc);
    setEl('m-amount',   tx.amount);
    setEl('m-date',     tx.date);
    setEl('m-note',     tx.note || '');

    _syncModalType();
    setHTML('m-category', catOptions(tx.type));
    document.getElementById('m-category').value = tx.category;

    Modal.open('tx-modal');
  }

  function setModalType(t) {
    _modalType = t;
    _syncModalType();
    setHTML('m-category', catOptions(t));
  }

  function _syncModalType() {
    document.getElementById('m-inc').classList.toggle('on', _modalType === 'income');
    document.getElementById('m-exp').classList.toggle('on', _modalType === 'expense');
  }

  function _clearTxForm() {
    ['m-desc', 'm-amount', 'm-note'].forEach(id => setEl(id, ''));
    setHTML('m-category', catOptions(_modalType));
  }

  function submitTx() {
    const desc   = document.getElementById('m-desc')?.value?.trim();
    const amount = parseFloat(document.getElementById('m-amount')?.value || '');
    const cat    = document.getElementById('m-category')?.value;
    const date   = document.getElementById('m-date')?.value;
    const note   = document.getElementById('m-note')?.value?.trim();

    if (!desc)                { Toast.show('Enter a description.', 'error');  return; }
    if (!amount || amount <= 0) { Toast.show('Enter a valid amount.', 'error'); return; }
    if (!date)                { Toast.show('Select a date.', 'error');        return; }

    const data = { type: _modalType, desc, amount, category: cat, date, note: note || '' };

    if (_editId) {
      Store.update(_editId, data);
      Toast.show('Transaction updated.', 'success');
    } else {
      Store.add(data);
      Toast.show(`${_modalType === 'income' ? '📈' : '📉'} Transaction saved!`, 'success');
    }

    Modal.close('tx-modal');
    _refresh();
  }

  function deleteTx(id) {
    Confirm('Delete this transaction?', () => {
      Store.remove(id);
      Toast.show('Deleted.', 'info');
      _refresh();
    });
  }

  // ══════════════════════════════════════════
  // BUDGET MODAL
  // ══════════════════════════════════════════
  function openBudgetModal() {
    setEl('b-modal-limit', '');
    Modal.open('budget-modal');
  }

  function submitBudget() {
    const cat   = document.getElementById('b-modal-cat')?.value;
    const limit = parseFloat(document.getElementById('b-modal-limit')?.value || '');
    if (!limit || limit <= 0) { Toast.show('Enter a valid monthly limit.', 'error'); return; }
    Store.setBudget(cat, limit);
    Modal.close('budget-modal');
    _renderBudget();
    Toast.show(`Budget set for ${catMeta(cat).label}!`, 'success');
  }

  function deleteBudget(cat) {
    Confirm(`Remove budget for ${catMeta(cat).label}?`, () => {
      Store.deleteBudget(cat);
      _renderBudget();
      Toast.show('Budget removed.', 'info');
    });
  }

  // ══════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════
  function exportCSV() {
    if (!Store.getAll().length) { Toast.show('No data to export.', 'error'); return; }
    download(Store.exportCSV(), `cashflow_${todayISO()}.csv`, 'text/csv');
    Toast.show('CSV downloaded!', 'success');
  }

  function exportJSON() {
    download(Store.exportJSON(), `cashflow_backup_${todayISO()}.json`, 'application/json');
    Toast.show('Backup downloaded!', 'success');
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        const ok = Store.importJSON(evt.target.result);
        if (ok) {
          Toast.show('Data imported!', 'success');
          _refresh();
        } else {
          Toast.show('Import failed — invalid file.', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function clearAllData() {
    Confirm('Delete ALL transactions? This cannot be undone.', () => {
      Store.clearAll();
      Toast.show('All transactions deleted.', 'info');
      _refresh();
    });
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════
  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  // ══════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════
  function init() {
    // Set today's date in all date inputs
    const today = todayISO();
    document.querySelectorAll('input[type=date]').forEach(el => {
      if (!el.value) el.value = today;
    });

    // Populate quick-add category
    setHTML('q-category', catOptions('income'));

    // Initial avatar
    const s = Store.getSettings();
    _updateAvatarInitials(s.userName);
    setText('sidebar-username', s.userName);
    document.querySelectorAll('.user-role').forEach(el => el.textContent = 'Personal Finance');

    // Search debounce
    const searchEl = document.getElementById('hist-search');
    if (searchEl) {
      let t;
      searchEl.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => _renderHistory(), 220);
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        Modal.close('tx-modal');
        Modal.close('budget-modal');
        const c = document.getElementById('confirm-overlay');
        if (c) c.classList.remove('open');
        document.body.style.overflow = '';
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openAdd();
      }
    });

    // Listen for storage changes
    window.addEventListener('storage:quota_exceeded', () => {
      Toast.show('Storage is full. Please export and clear data.', 'error', 5000);
    });

    // Render initial page
    goTo('dashboard');
  }

  // Public API
  return Object.freeze({
    init,
    goTo,
    // Dashboard
    setDashFilter: _setDashFilter,
    setQuickType,
    quickAdd,
    // History
    setHistFilter: _setHistFilter,
    // Budget
    openBudgetModal,
    submitBudget,
    deleteBudget,
    // Transaction modal
    openAdd,
    editTx,
    deleteTx,
    setModalType,
    submitTx,
    // Settings
    saveSettings,
    toggleSetting,
    // Export/Import
    exportCSV,
    exportJSON,
    importJSON,
    clearAllData,
  });
})();

document.addEventListener('DOMContentLoaded', App.init);
window.App = App;
