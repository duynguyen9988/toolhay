(() => {
  'use strict';

  const form = document.getElementById('detailed-transaction-form');
  if (!form) return;

  const STORAGE_KEY = 'so-chi-tieu-transactions-v1';
  const number = new Intl.NumberFormat('vi-VN');
  const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  const amountInput = document.getElementById('input-amount');
  const taxRateInput = document.getElementById('select-tax-rate');
  const beforeTaxInput = document.getElementById('display-amount-before-tax');
  const taxAmountInput = document.getElementById('display-tax-amount');
  const dateInput = document.getElementById('detailed-date');
  const errorElement = document.getElementById('logger-error');
  const list = document.getElementById('detailed-transaction-list');
  const summary = document.getElementById('logger-history-summary');

  function localDateString(date) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date - offset).toISOString().slice(0, 10);
  }
  function getRawAmount() { return Number(amountInput.value.replace(/\D/g, '')) || 0; }
  function formatAmount(value) { return number.format(value); }
  function escapeHTML(value) {
    return String(value || '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
  }
  function formatDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
  }
  function loadTransactions() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(stored) ? stored.filter(item => item && typeof item.id === 'string' && typeof item.amount === 'number') : [];
    } catch (_) { return []; }
  }
  function saveTransactions(transactions) { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
  function showError(message) { errorElement.textContent = message; errorElement.hidden = false; }
  function clearError() { errorElement.textContent = ''; errorElement.hidden = true; }

  // The final invoice amount is entered by the user. These two fields are
  // intentionally derived values to avoid conflicting manual input.
  function calculateTaxFields() {
    const amount = getRawAmount();
    const taxRate = parseFloat(taxRateInput.value) || 0;
    const amountBeforeTax = Math.round(amount / (1 + taxRate));
    const taxAmount = amount - amountBeforeTax;
    beforeTaxInput.value = amountBeforeTax.toLocaleString('vi-VN');
    taxAmountInput.value = taxAmount.toLocaleString('vi-VN');
  }
  function formatInputAmount() {
    const rawAmount = getRawAmount();
    amountInput.value = rawAmount ? formatAmount(rawAmount) : '';
    calculateTaxFields();
  }
  function renderHistory() {
    const recent = loadTransactions().filter(item => item.itemName || item.productCode || item.merchant).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 5);
    summary.textContent = recent.length ? `${number.format(recent.length)} giao dịch chi tiết gần nhất.` : 'Chưa có giao dịch chi tiết nào.';
    if (!recent.length) { list.innerHTML = '<div class="logger-empty"><span>◌</span><p>Giao dịch chi tiết sẽ xuất hiện ở đây.</p></div>'; return; }
    list.innerHTML = recent.map(item => `<article class="detailed-log-row">
      <div class="detailed-log-icon">${escapeHTML(item.category === 'Mua sắm' ? '🛍️' : '₫')}</div>
      <div class="detailed-log-main"><strong>${escapeHTML(item.itemName || item.category)}</strong><span>${escapeHTML(item.merchant || item.category)} · ${formatDate(item.date)}</span></div>
      <div class="detailed-log-spec">${escapeHTML([item.productCode, item.size, item.color].filter(Boolean).join(' · ') || 'Không có mã / quy cách')}</div>
      <div class="detailed-log-tax">VAT ${Math.round((Number(item.taxRate) || 0) * 100)}%</div>
      <strong class="detailed-log-amount">−${money.format(item.amount)}</strong>
    </article>`).join('');
  }
  function addTransaction(event) {
    event.preventDefault();
    clearError();
    const amount = getRawAmount();
    const itemName = document.getElementById('item-name').value.trim();
    const date = dateInput.value;
    if (!amount) { showError('Hãy nhập tổng tiền thanh toán lớn hơn 0.'); amountInput.focus(); return; }
    if (!date) { showError('Hãy chọn ngày mua.'); dateInput.focus(); return; }
    if (!itemName) { showError('Hãy nhập tên món hàng.'); document.getElementById('item-name').focus(); return; }
    const taxRate = parseFloat(taxRateInput.value) || 0;
    const amountBeforeTax = Math.round(amount / (1 + taxRate));
    const transactions = loadTransactions();
    transactions.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: 'expense', amount, date, category: document.getElementById('detailed-category').value,
      paymentMethod: document.getElementById('payment-method').value,
      merchant: document.getElementById('merchant').value.trim(), itemName,
      productCode: document.getElementById('product-code').value.trim(),
      size: document.getElementById('item-size').value.trim(), color: document.getElementById('item-color').value.trim(),
      taxRate, amountBeforeTax, taxAmount: amount - amountBeforeTax,
      note: document.getElementById('detailed-note').value.trim(), createdAt: Date.now()
    });
    try { saveTransactions(transactions); }
    catch (_) { showError('Không thể lưu trên trình duyệt này. Hãy kiểm tra dung lượng lưu trữ.'); return; }
    form.reset();
    dateInput.value = localDateString(new Date());
    taxRateInput.value = '0.08';
    calculateTaxFields();
    renderHistory();
    amountInput.focus();
  }

  dateInput.value = localDateString(new Date());
  amountInput.addEventListener('input', formatInputAmount);
  taxRateInput.addEventListener('change', calculateTaxFields);
  form.addEventListener('submit', addTransaction);
  form.addEventListener('reset', () => window.setTimeout(() => { clearError(); dateInput.value = localDateString(new Date()); taxRateInput.value = '0.08'; calculateTaxFields(); }, 0));
  calculateTaxFields();
  renderHistory();
})();
