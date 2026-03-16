/**
 * CashFlow — Store
 * Secure, versioned localStorage data layer.
 * No seed data. All state persisted safely.
 */

const Store = (() => {
  'use strict';

  const VERSION  = 'cf_v1';
  const KEYS = {
    transactions: `${VERSION}_transactions`,
    budgets:      `${VERSION}_budgets`,
    settings:     `${VERSION}_settings`,
  };

  // ── Secure read/write with error boundaries ──
  function _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[Store] read error', key, e);
      return fallback;
    }
  }

  function _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // Handle quota exceeded
      if (e.name === 'QuotaExceededError') {
        console.error('[Store] Storage quota exceeded. Cannot save data.');
        _dispatchEvent('storage:quota_exceeded');
      } else {
        console.error('[Store] write error', key, e);
      }
      return false;
    }
  }

  function _dispatchEvent(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // ── UID generator ──
  function uid() {
    return [
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 6),
      Math.random().toString(36).slice(2, 6),
    ].join('_');
  }

  // ── Default values ──
  const DEFAULTS = {
    settings: {
      userName:    'My Account',
      currency:    '৳',
      dateLocale:  'en-BD',
      notifications: true,
      compactView: false,
    },
    budgets: {},
    transactions: [],
  };

  // ── Load state ──
  let _txs      = _read(KEYS.transactions, DEFAULTS.transactions);
  let _budgets  = _read(KEYS.budgets,      DEFAULTS.budgets);
  let _settings = { ...DEFAULTS.settings, ..._read(KEYS.settings, {}) };

  // Validate loaded data
  if (!Array.isArray(_txs))   _txs = [];
  if (typeof _budgets !== 'object' || Array.isArray(_budgets)) _budgets = {};

  // ── Persist helpers ──
  function _saveTx()  {
    const ok = _write(KEYS.transactions, _txs);
    if (ok) _dispatchEvent('cf:data_changed', { type: 'transactions' });
    return ok;
  }
  function _saveBudgets() {
    const ok = _write(KEYS.budgets, _budgets);
    if (ok) _dispatchEvent('cf:data_changed', { type: 'budgets' });
    return ok;
  }
  function _saveSettings() {
    return _write(KEYS.settings, _settings);
  }

  // ══════════════════════════════════════════
  // TRANSACTIONS API
  // ══════════════════════════════════════════

  function getAll() {
    return [..._txs];
  }

  function getById(id) {
    return _txs.find(t => t.id === id) || null;
  }

  function add(data) {
    const tx = {
      id:       uid(),
      type:     data.type,
      desc:     String(data.desc || '').trim().slice(0, 100),
      amount:   Math.abs(parseFloat(data.amount) || 0),
      category: data.category || 'other',
      date:     data.date || _todayISO(),
      note:     String(data.note || '').trim().slice(0, 200),
      createdAt: Date.now(),
    };
    _txs.unshift(tx);
    _saveTx();
    return tx;
  }

  function update(id, data) {
    const idx = _txs.findIndex(t => t.id === id);
    if (idx === -1) return false;
    _txs[idx] = {
      ..._txs[idx],
      type:     data.type     || _txs[idx].type,
      desc:     data.desc     !== undefined ? String(data.desc).trim().slice(0, 100)  : _txs[idx].desc,
      amount:   data.amount   !== undefined ? Math.abs(parseFloat(data.amount) || 0)  : _txs[idx].amount,
      category: data.category || _txs[idx].category,
      date:     data.date     || _txs[idx].date,
      note:     data.note     !== undefined ? String(data.note).trim().slice(0, 200)  : _txs[idx].note,
      updatedAt: Date.now(),
    };
    _saveTx();
    return true;
  }

  function remove(id) {
    const before = _txs.length;
    _txs = _txs.filter(t => t.id !== id);
    if (_txs.length < before) { _saveTx(); return true; }
    return false;
  }

  function clearAll() {
    _txs = [];
    _saveTx();
  }

  // ── Computed ──
  function getByMonth(year, month) {
    return _txs.filter(t => {
      const d = _parseDate(t.date);
      return d && d.getFullYear() === year && d.getMonth() === month;
    });
  }

  function getThisMonth() {
    const n = new Date();
    return getByMonth(n.getFullYear(), n.getMonth());
  }

  function sumType(list, type) {
    return list
      .filter(t => t.type === type)
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }

  function totalBalance() {
    return sumType(_txs, 'income') - sumType(_txs, 'expense');
  }

  function spendByCategory(list) {
    const map = {};
    list.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + (Number(t.amount) || 0);
    });
    return map;
  }

  function incomeByCategory(list) {
    const map = {};
    list.filter(t => t.type === 'income').forEach(t => {
      map[t.category] = (map[t.category] || 0) + (Number(t.amount) || 0);
    });
    return map;
  }

  function last7Days() {
    const rows = [];
    for (let i = 6; i >= 0; i--) {
      const d  = new Date();
      d.setDate(d.getDate() - i);
      const ds = _isoDate(d);
      const txs = _txs.filter(t => t.date === ds);
      rows.push({
        date:  ds,
        label: d.toLocaleDateString('en', { weekday: 'short' }),
        inc:   sumType(txs, 'income'),
        exp:   sumType(txs, 'expense'),
      });
    }
    return rows;
  }

  function last6Months() {
    const rows = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const list = getByMonth(d.getFullYear(), d.getMonth());
      rows.push({
        label: d.toLocaleString('default', { month: 'short' }),
        year:  d.getFullYear(),
        month: d.getMonth(),
        inc:   sumType(list, 'income'),
        exp:   sumType(list, 'expense'),
      });
    }
    return rows;
  }

  function averageDailyExpense() {
    const monthly = getThisMonth();
    const exp = sumType(monthly, 'expense');
    return exp / new Date().getDate();
  }

  // ══════════════════════════════════════════
  // BUDGETS API
  // ══════════════════════════════════════════

  function getBudgets() { return { ..._budgets }; }

  function setBudget(cat, limit) {
    _budgets[cat] = Math.abs(parseFloat(limit) || 0);
    _saveBudgets();
  }

  function deleteBudget(cat) {
    delete _budgets[cat];
    _saveBudgets();
  }

  // ══════════════════════════════════════════
  // SETTINGS API
  // ══════════════════════════════════════════

  function getSettings()      { return { ..._settings }; }
  function getSetting(key)    { return _settings[key]; }
  function updateSettings(s)  {
    _settings = { ..._settings, ...s };
    _saveSettings();
    _dispatchEvent('cf:settings_changed');
  }

  // ══════════════════════════════════════════
  // FORMAT HELPERS
  // ══════════════════════════════════════════

  function fmt(n) {
    const num = Number(n) || 0;
    return _settings.currency + num.toLocaleString('en', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function fmtDate(dateStr) {
    const d = _parseDate(dateStr);
    if (!d) return dateStr;
    return d.toLocaleDateString('en-BD', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  function fmtDateShort(dateStr) {
    const d = _parseDate(dateStr);
    if (!d) return dateStr;
    return d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short' });
  }

  // ══════════════════════════════════════════
  // EXPORT / IMPORT
  // ══════════════════════════════════════════

  function exportJSON() {
    return JSON.stringify({
      version:      VERSION,
      exported_at:  new Date().toISOString(),
      transactions: _txs,
      budgets:      _budgets,
      settings:     _settings,
    }, null, 2);
  }

  function exportCSV() {
    const header = 'Date,Type,Description,Category,Amount,Note';
    const rows   = [..._txs]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(t =>
        [
          t.date,
          t.type,
          `"${(t.desc || '').replace(/"/g, '""')}"`,
          t.category,
          t.amount,
          `"${(t.note || '').replace(/"/g, '""')}"`,
        ].join(',')
      );
    return [header, ...rows].join('\n');
  }

  function importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.transactions)) {
        _txs = data.transactions;
        _saveTx();
      }
      if (data.budgets && typeof data.budgets === 'object') {
        _budgets = data.budgets;
        _saveBudgets();
      }
      return true;
    } catch (e) {
      console.error('[Store] import failed', e);
      return false;
    }
  }

  // ── Storage usage ──
  function storageInfo() {
    try {
      const txSize  = (localStorage.getItem(KEYS.transactions) || '').length;
      const bSize   = (localStorage.getItem(KEYS.budgets) || '').length;
      const sSize   = (localStorage.getItem(KEYS.settings) || '').length;
      const total   = txSize + bSize + sSize;
      return {
        transactions: _bytesToKB(txSize),
        budgets:      _bytesToKB(bSize),
        settings:     _bytesToKB(sSize),
        total:        _bytesToKB(total),
        totalBytes:   total,
      };
    } catch { return null; }
  }

  // ── Private helpers ──
  function _parseDate(str) {
    if (!str) return null;
    const d = new Date(str + 'T00:00:00');
    return isNaN(d) ? null : d;
  }
  function _isoDate(d) {
    return d.toISOString().split('T')[0];
  }
  function _todayISO() {
    return _isoDate(new Date());
  }
  function _bytesToKB(bytes) {
    return (bytes / 1024).toFixed(2) + ' KB';
  }

  // ── Public API ──
  return Object.freeze({
    // Transactions
    getAll, getById, add, update, remove, clearAll,
    getByMonth, getThisMonth,
    sumType, totalBalance, spendByCategory, incomeByCategory,
    last7Days, last6Months, averageDailyExpense,
    // Budgets
    getBudgets, setBudget, deleteBudget,
    // Settings
    getSettings, getSetting, updateSettings,
    // Format
    fmt, fmtDate, fmtDateShort,
    // Export/Import
    exportJSON, exportCSV, importJSON,
    storageInfo,
    uid,
    todayISO: () => _isoDate(new Date()),
  });
})();

window.Store = Store;
