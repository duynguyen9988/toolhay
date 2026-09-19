(() => {
  'use strict';

  const STORAGE_KEY = 'so-chi-tieu-transactions-v1';
  const categoryIcons = {
    'Ăn uống': '🍜', 'Di chuyển': '🛵', 'Mua sắm': '🛍️', 'Hóa đơn': '⌂',
    'Sức khỏe': '✚', 'Giải trí': '✦', 'Khác': '•••', 'Lương': '💼',
    'Thưởng': '✦', 'Kinh doanh': '↗', 'Thu nhập': '↗'
  };
  const categoryOptions = {
    expense: [['Ăn uống', '🍜 Ăn uống'], ['Di chuyển', '🛵 Di chuyển'], ['Mua sắm', '🛍️ Mua sắm'], ['Hóa đơn', '⌂ Hóa đơn'], ['Sức khỏe', '✚ Sức khỏe'], ['Giải trí', '✦ Giải trí'], ['Khác', '••• Khác']],
    income: [['Lương', '💼 Lương'], ['Thưởng', '✦ Thưởng'], ['Kinh doanh', '↗ Kinh doanh'], ['Khác', '••• Khác']]
  };
  const categoryColors = ['#08796d', '#3f9e8c', '#e4a84b', '#d8755b', '#5b9b9c', '#7b8cce', '#9c8475'];
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  const number = new Intl.NumberFormat('vi-VN');
  const today = new Date();
  const dateInput = $('#transaction-date');
  const monthInput = $('#dashboard-month');
  const form = $('#transaction-form');
  const amountInput = $('#amount');
  const errorElement = $('#form-error');
  let transactions = loadTransactions();

  dateInput.value = localDateString(today);
  monthInput.value = localMonthString(today);

  function localDateString(date) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date - offset).toISOString().slice(0, 10);
  }
  function localMonthString(date) { return localDateString(date).slice(0, 7); }
  function loadTransactions() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(stored) ? stored.filter(validTransaction) : [];
    } catch (_) { return []; }
  }
  function validTransaction(item) {
    return item && typeof item.id === 'string' && ['income', 'expense'].includes(item.type) &&
      typeof item.amount === 'number' && item.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(item.date);
  }
  function saveTransactions() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
    catch (_) { showError('Không thể lưu trên trình duyệt này. Hãy kiểm tra dung lượng lưu trữ.'); }
  }
  function showError(message) { errorElement.textContent = message; errorElement.hidden = false; }
  function clearError() { errorElement.textContent = ''; errorElement.hidden = true; }
  function escapeHTML(value) {
    return String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }
  function formatMoney(value) { return money.format(value).replace(/\s/g, ' '); }
  function formatDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
  }
  function formatDateShort(value) {
    const [, month, day] = value.split('-');
    return `${day}/${month}`;
  }
  function sorted(items) { return [...items].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt); }
  function getMonthTransactions() { return transactions.filter(item => item.date.startsWith(monthInput.value)); }
  function calculate(items) {
    return items.reduce((total, item) => {
      if (item.type === 'income') total.income += item.amount;
      else total.expense += item.amount;
      return total;
    }, { income: 0, expense: 0 });
  }
  function amountPercent(expense, income) {
    if (!income) return expense ? 100 : 0;
    return Math.min(100, Math.round((expense / income) * 100));
  }
  function renderCategoryOptions(type) {
    const select = $('#category');
    const previous = select.value;
    const options = categoryOptions[type];
    select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    if (options.some(([value]) => value === previous)) select.value = previous;
  }
  function renderAll() { renderTransactions(); renderDashboard(); renderHero(); }

  function renderHero() {
    const selected = getMonthTransactions();
    const totals = calculate(selected);
    $('[data-hero-expense]').textContent = formatMoney(totals.expense);
    $('[data-hero-income]').textContent = formatMoney(totals.income);
    $('[data-hero-count]').textContent = number.format(selected.length);
    $('[data-hero-progress]').style.width = `${amountPercent(totals.expense, totals.income)}%`;
  }
  function renderTransactions() {
    const list = $('#transaction-list');
    const recent = sorted(transactions).slice(0, 6);
    $('[data-transaction-summary]').textContent = transactions.length
      ? `${number.format(transactions.length)} giao dịch đã được lưu trên thiết bị này.`
      : 'Chưa có giao dịch nào.';
    $('#clear-all').hidden = !transactions.length;
    if (!recent.length) {
      list.innerHTML = '<div class="empty-state"><span class="empty-icon">◌</span><p>Chưa có giao dịch nào</p><small>Khoản chi đầu tiên sẽ xuất hiện ở đây.</small></div>';
      return;
    }
    list.innerHTML = recent.map(item => {
      const icon = item.type === 'income' ? '↗' : (categoryIcons[item.category] || '•••');
      const typeLabel = item.type === 'income' ? 'Thu nhập' : 'Chi tiêu';
      const sign = item.type === 'income' ? '+' : '−';
      return `<article class="transaction-item" data-id="${escapeHTML(item.id)}">
        <span class="transaction-avatar">${icon}</span>
        <div class="transaction-main"><strong>${escapeHTML(item.category)}</strong><small>${formatDate(item.date)}</small></div>
        <span class="transaction-note">${escapeHTML(item.note || '—')}</span>
        <span class="transaction-type ${item.type}">${typeLabel}</span>
        <span class="transaction-money ${item.type}">${sign}${formatMoney(item.amount)}</span>
        <button class="delete-transaction" type="button" aria-label="Xóa giao dịch ${escapeHTML(item.category)}" title="Xóa giao dịch">×</button>
      </article>`;
    }).join('');
  }
  function renderDashboard() {
    const items = sorted(getMonthTransactions());
    const totals = calculate(items);
    const balance = totals.income - totals.expense;
    $('[data-stat-income]').textContent = formatMoney(totals.income);
    $('[data-stat-expense]').textContent = formatMoney(totals.expense);
    $('[data-stat-balance]').textContent = formatMoney(balance);
    $('[data-stat-count]').textContent = number.format(items.length);
    $('[data-stat-income-note]').textContent = totals.income ? 'Tổng khoản thu' : 'Chưa có dữ liệu';
    $('[data-stat-expense-note]').textContent = totals.expense ? 'Tổng khoản chi' : 'Chưa có dữ liệu';
    $('[data-stat-balance-note]').textContent = totals.income || totals.expense ? (balance >= 0 ? 'Số dư dương' : 'Cần cân đối lại') : 'Thu − Chi';
    $('[data-category-total]').textContent = formatMoney(totals.expense);
    renderCategoryChart(items.filter(item => item.type === 'expense'), totals.expense);
    renderTrendChart(items.filter(item => item.type === 'expense'));
    renderHistory(items);
  }
  function renderCategoryChart(expenses, total) {
    const chart = $('#category-chart');
    if (!expenses.length) { chart.innerHTML = '<div class="chart-empty">Chưa có khoản chi trong tháng này.</div>'; return; }
    const groups = expenses.reduce((grouped, item) => {
      grouped[item.category] = (grouped[item.category] || 0) + item.amount;
      return grouped;
    }, {});
    chart.innerHTML = Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([category, value], index) => {
      const percent = Math.round((value / total) * 100);
      return `<div class="category-row"><span class="category-emoji">${categoryIcons[category] || '•••'}</span><strong>${escapeHTML(category)}</strong><span class="category-bar"><span style="width:${percent}%;background:${categoryColors[index % categoryColors.length]}"></span></span><b>${formatMoney(value)} · ${percent}%</b></div>`;
    }).join('');
  }
  function renderTrendChart(expenses) {
    const chart = $('#trend-chart');
    const axis = $('#trend-axis');
    if (!expenses.length) { chart.innerHTML = '<div class="trend-no-data">Hãy thêm giao dịch để xem nhịp chi tiêu.</div>'; axis.innerHTML = ''; return; }
    const selectedMonth = monthInput.value;
    const lastDate = new Date(`${selectedMonth}-01T12:00:00`);
    lastDate.setMonth(lastDate.getMonth() + 1, 0);
    if (selectedMonth === localMonthString(today)) lastDate.setTime(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime());
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(lastDate);
      day.setDate(lastDate.getDate() - (6 - index));
      const date = localDateString(day);
      return { date, label: `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`, amount: 0 };
    });
    expenses.forEach(item => { const found = days.find(day => day.date === item.date); if (found) found.amount += item.amount; });
    const maximum = Math.max(...days.map(day => day.amount), 1);
    chart.innerHTML = days.map(day => `<div class="trend-bar-wrap" title="${day.label}: ${formatMoney(day.amount)}"><span class="trend-bar ${day.amount ? 'has-spend' : ''}" style="height:${day.amount ? Math.max(7, Math.round(day.amount / maximum * 100)) : 2}%"></span></div>`).join('');
    axis.innerHTML = days.map((day, index) => `<span>${index % 2 === 0 ? day.label : ''}</span>`).join('');
  }
  function renderHistory(items) {
    const body = $('#dashboard-history');
    $('[data-dashboard-history-note]').textContent = `${number.format(items.length)} giao dịch trong khoảng đã chọn`;
    if (!items.length) { body.innerHTML = '<tr class="table-empty"><td colspan="5">Chưa có dữ liệu cho tháng này.</td></tr>'; return; }
    body.innerHTML = items.map(item => {
      const sign = item.type === 'income' ? '+' : '−';
      const className = item.type === 'income' ? 'table-income' : 'table-expense';
      return `<tr><td>${formatDateShort(item.date)}</td><td>${categoryIcons[item.category] || '•••'} ${escapeHTML(item.category)}</td><td>${escapeHTML(item.note || '—')}</td><td class="table-type">${item.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}</td><td class="${className}">${sign}${formatMoney(item.amount)}</td></tr>`;
    }).join('');
  }
  function setView(view) {
    const isDashboard = view === 'dashboard';
    $('[data-view="input"]').hidden = isDashboard;
    $('[data-view="dashboard"]').hidden = !isDashboard;
    $$('[data-tab], [data-view-link]').forEach(button => {
      const active = button.dataset.tab === view || button.dataset.viewLink === view;
      button.classList.toggle('is-active', active);
      if (button.hasAttribute('role')) button.setAttribute('aria-selected', String(active));
    });
    if (isDashboard) renderDashboard();
  }
  function addTransaction(event) {
    event.preventDefault(); clearError();
    const rawAmount = amountInput.value.replace(/\D/g, '');
    const amount = Number(rawAmount);
    const date = dateInput.value;
    if (!Number.isFinite(amount) || amount <= 0) { showError('Hãy nhập số tiền lớn hơn 0.'); amountInput.focus(); return; }
    if (!date) { showError('Hãy chọn ngày giao dịch.'); dateInput.focus(); return; }
    transactions.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: $('input[name="type"]:checked').value,
      amount,
      category: $('#category').value,
      date,
      note: $('#note').value.trim(),
      createdAt: Date.now()
    });
    saveTransactions();
    form.reset();
    dateInput.value = localDateString(today);
    $('#type-expense').checked = true;
    amountInput.value = '';
    renderAll();
    amountInput.focus();
  }
  function deleteTransaction(event) {
    const button = event.target.closest('.delete-transaction');
    if (!button) return;
    const row = button.closest('[data-id]');
    transactions = transactions.filter(item => item.id !== row.dataset.id);
    saveTransactions(); renderAll();
  }
  function clearAll() {
    if (!transactions.length || !window.confirm('Xóa toàn bộ giao dịch đã lưu trên thiết bị này?')) return;
    transactions = []; saveTransactions(); renderAll();
  }
  function exportCSV() {
    const items = sorted(getMonthTransactions());
    if (!items.length) { window.alert('Chưa có giao dịch để xuất trong tháng đang chọn.'); return; }
    const quote = value => `"${String(value || '').replace(/"/g, '""')}"`;
    const lines = [['Ngày', 'Loại', 'Danh mục', 'Ghi chú', 'Số tiền'], ...items.map(item => [item.date, item.type === 'income' ? 'Thu nhập' : 'Chi tiêu', item.category, item.note, item.amount])];
    const blob = new Blob(['\uFEFF' + lines.map(row => row.map(quote).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `so-chi-tieu-${monthInput.value}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }
  function formatAmountWhileTyping() {
    const digits = amountInput.value.replace(/\D/g, '');
    amountInput.value = digits ? number.format(Number(digits)) : '';
  }
  $$('[data-tab]').forEach(button => button.addEventListener('click', () => { setView(button.dataset.tab); history.replaceState(null, '', `#${button.dataset.tab}`); }));
  $$('[data-view-link]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const view = link.dataset.viewLink;
    setView(view);
    history.replaceState(null, '', link.getAttribute('href'));
    document.getElementById(view).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  $$('[data-scroll-to]').forEach(button => button.addEventListener('click', () => { setView(button.dataset.scrollTo); document.getElementById(button.dataset.scrollTo).scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  form.addEventListener('submit', addTransaction);
  form.addEventListener('reset', () => setTimeout(() => { clearError(); dateInput.value = localDateString(today); renderCategoryOptions('expense'); }, 0));
  amountInput.addEventListener('input', formatAmountWhileTyping);
  $$('input[name="type"]').forEach(input => input.addEventListener('change', () => renderCategoryOptions(input.value)));
  $('#transaction-list').addEventListener('click', deleteTransaction);
  $('#clear-all').addEventListener('click', clearAll);
  $('#export-csv').addEventListener('click', exportCSV);
  monthInput.addEventListener('input', renderAll);
  renderCategoryOptions('expense');
  if (location.hash === '#dashboard') setView('dashboard');
  renderAll();
})();
