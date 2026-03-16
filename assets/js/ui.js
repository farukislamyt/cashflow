/**
 * CashFlow — UI Helpers
 */

// ══════════════════════════════════════════
// CATEGORY METADATA
// ══════════════════════════════════════════
const CATS = {
  // income
  salary:        { emoji:'💼', label:'Salary',         pill:'pill-salary',        group:'income' },
  freelance:     { emoji:'💻', label:'Freelance',      pill:'pill-freelance',      group:'income' },
  investment:    { emoji:'📈', label:'Investment',     pill:'pill-investment',     group:'income' },
  business:      { emoji:'🏪', label:'Business',       pill:'pill-salary',         group:'income' },
  // expense
  food:          { emoji:'🍔', label:'Food & Dining',  pill:'pill-food',           group:'expense' },
  transport:     { emoji:'🚗', label:'Transport',      pill:'pill-transport',      group:'expense' },
  shopping:      { emoji:'🛍', label:'Shopping',       pill:'pill-shopping',       group:'expense' },
  health:        { emoji:'💊', label:'Health',         pill:'pill-health',         group:'expense' },
  rent:          { emoji:'🏠', label:'Rent/Housing',   pill:'pill-rent',           group:'expense' },
  entertainment: { emoji:'🎮', label:'Entertainment',  pill:'pill-entertainment',  group:'expense' },
  utilities:     { emoji:'⚡', label:'Utilities',      pill:'pill-utilities',      group:'expense' },
  education:     { emoji:'📚', label:'Education',      pill:'pill-education',      group:'expense' },
  other:         { emoji:'📦', label:'Other',          pill:'pill-other',          group:'both' },
};

const INCOME_CATS  = ['salary','freelance','investment','business','other'];
const EXPENSE_CATS = ['food','transport','shopping','health','rent','entertainment','utilities','education','other'];
const DONUT_COLORS = ['#f05672','#f0c14b','#2dd98f','#4e8ef7','#a78bfa','#ffab40','#f472b6','#7dd3fc','#34d399'];

function catMeta(cat) {
  return CATS[cat] || CATS.other;
}

function catPill(cat) {
  const m = catMeta(cat);
  return `<span class="pill ${m.pill}">${m.emoji} ${m.label}</span>`;
}

function catOptions(type) {
  const list = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  return list.map(cat => {
    const m = catMeta(cat);
    return `<option value="${cat}">${m.emoji} ${m.label}</option>`;
  }).join('');
}

// ══════════════════════════════════════════
// HTML ESCAPE
// ══════════════════════════════════════════
function h(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
const Toast = (() => {
  let _timer;
  function show(msg, type = 'success', ms = 2800) {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(_timer);
    el.className = `toast ${type} show`;
    el.innerHTML = `<span class="t-dot"></span>${h(msg)}`;
    _timer = setTimeout(() => el.classList.remove('show'), ms);
  }
  return { show };
})();

// ══════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════
const Modal = (() => {
  function open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Focus first input
    setTimeout(() => {
      const f = el.querySelector('input:not([type=hidden]), select');
      if (f) f.focus();
    }, 50);
  }
  function close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
  }
  function onBg(e, id) {
    if (e.target.id === id) close(id);
  }
  return { open, close, onBg };
})();

// ══════════════════════════════════════════
// CONFIRM DIALOG
// ══════════════════════════════════════════
function Confirm(msg, onConfirm) {
  const overlay = document.getElementById('confirm-overlay');
  if (!overlay) { if (confirm(msg)) onConfirm(); return; }
  document.getElementById('confirm-msg').textContent = msg;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const yesBtn = document.getElementById('confirm-yes');
  const noBtn  = document.getElementById('confirm-no');

  function cleanup() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    yesBtn.removeEventListener('click', yes);
    noBtn.removeEventListener('click',  no);
  }
  function yes() { cleanup(); onConfirm(); }
  function no()  { cleanup(); }

  yesBtn.addEventListener('click', yes);
  noBtn.addEventListener('click',  no);
}

// ══════════════════════════════════════════
// BAR CHART
// ══════════════════════════════════════════
function renderBarChart(containerId, data, h = 110) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const max = Math.max(...data.map(d => Math.max(d.inc ?? 0, d.exp ?? 0, d.val ?? 0)), 1);
  el.style.height = h + 'px';
  el.className = 'bchart';

  el.innerHTML = data.map(d => {
    const bars = [
      d.inc !== undefined
        ? `<div class="bar inc" style="height:${Math.max((d.inc/max)*100,1.5)}%" title="Income: ${Store.fmt(d.inc)}"></div>`
        : '',
      d.exp !== undefined
        ? `<div class="bar exp" style="height:${Math.max((d.exp/max)*100,1.5)}%" title="Expense: ${Store.fmt(d.exp)}"></div>`
        : '',
      d.val !== undefined
        ? `<div class="bar inc" style="height:${Math.max((d.val/max)*100,1.5)}%" title="${Store.fmt(d.val)}"></div>`
        : '',
    ].join('');
    return `
      <div class="bchart-group">
        <div class="bchart-bars" style="height:${h-22}px;align-items:flex-end">${bars}</div>
        <span class="bchart-lbl">${h(d.label)}</span>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════
// DONUT CHART
// ══════════════════════════════════════════
function renderDonut(data, label = '') {
  const size = 130, r = 48, cx = 65, cy = 65, sw = 18;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);

  if (!total) {
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--c-overlay)" stroke-width="${sw}"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="var(--t-muted)" font-size="10">No data</text>
    </svg>`;
  }

  let offset = -(circ / 4);
  const slices = data.map(d => {
    const pct  = d.value / total;
    const dash = pct * circ;
    const gap  = circ - dash;
    const s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="${d.color}" stroke-width="${sw}"
      stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      stroke-dashoffset="${offset.toFixed(2)}"
      style="transition:stroke-dashoffset .8s var(--ease)">
      <title>${d.label}: ${Store.fmt(d.value)}</title>
    </circle>`;
    offset -= dash;
    return s;
  }).join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Expense breakdown">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--c-overlay)" stroke-width="${sw}"/>
      ${slices}
      <text x="${cx}" y="${cy - 8}" text-anchor="middle" dominant-baseline="middle"
        fill="var(--t-primary)" font-size="13" font-weight="700"
        font-family="'IBM Plex Mono',monospace">${Store.fmt(total)}</text>
      <text x="${cx}" y="${cy + 9}" text-anchor="middle" dominant-baseline="middle"
        fill="var(--t-muted)" font-size="8.5" letter-spacing="1.2">${h(label)}</text>
    </svg>`;
}

// ══════════════════════════════════════════
// TRANSACTION ROW
// ══════════════════════════════════════════
function txRow(tx) {
  const m      = catMeta(tx.category);
  const bgCls  = tx.type === 'income' ? 'bg-income' : 'bg-expense';
  const sign   = tx.type === 'income' ? '+' : '−';
  const amtCls = tx.type === 'income' ? 'inc' : 'exp';

  return `
    <tr data-id="${h(tx.id)}">
      <td>
        <div class="tx-desc-wrap">
          <span class="tx-cat-icon ${bgCls}">${m.emoji}</span>
          <div>
            <div class="tx-name" title="${h(tx.desc)}">${h(tx.desc)}</div>
            ${tx.note ? `<div class="tx-sub">${h(tx.note)}</div>` : ''}
          </div>
        </div>
      </td>
      <td class="hide-mobile">${catPill(tx.category)}</td>
      <td class="tx-date hide-mobile">${Store.fmtDate(tx.date)}</td>
      <td><span class="tx-amount ${amtCls}">${sign}${Store.fmt(tx.amount)}</span></td>
      <td>
        <div class="tx-acts">
          <button class="act-btn" onclick="App.editTx('${h(tx.id)}')" title="Edit" aria-label="Edit transaction">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="act-btn del" onclick="App.deleteTx('${h(tx.id)}')" title="Delete" aria-label="Delete transaction">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
}

// ══════════════════════════════════════════
// DATE HELPERS
// ══════════════════════════════════════════
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function currentMonthLabel() {
  return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
}

// ══════════════════════════════════════════
// TEXT
// ══════════════════════════════════════════
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setHTML(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val;
}

// ══════════════════════════════════════════
// DOWNLOAD HELPER
// ══════════════════════════════════════════
function download(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Expose
window.Toast = Toast;
window.Modal = Modal;
window.Confirm = Confirm;
window.CATS = CATS;
window.INCOME_CATS = INCOME_CATS;
window.EXPENSE_CATS = EXPENSE_CATS;
window.DONUT_COLORS = DONUT_COLORS;
window.catMeta = catMeta;
window.catPill = catPill;
window.catOptions = catOptions;
window.renderBarChart = renderBarChart;
window.renderDonut    = renderDonut;
window.txRow   = txRow;
window.todayISO = todayISO;
window.currentMonthLabel = currentMonthLabel;
window.setText = setText;
window.setHTML = setHTML;
window.download = download;
window.h = h;
