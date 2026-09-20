/* ============================================================
   Sổ Chi Tiêu — Tính sao Starbucks Rewards™ VN
   Module 1: Ước tính số sao · Module 2: Tiến độ hạng Gold
   Tỷ lệ theo T&C chính thức: 40k / 60k / 80k VNĐ = 1 sao.
   ============================================================ */
(function () {
  'use strict';

  var RATES = { card: 40000, general: 60000, third: 80000 };
  var GOLD_TARGET = 100;
  var KEY = 'starbucks.state';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var storage = {
    get: function (key, fallback) {
      try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
      catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }
  };

  /* ---------------- Định dạng số VNĐ (dấu chấm nghìn) ---------------- */
  function fmt(n) {
    if (!isFinite(n)) return '0';
    var s = String(Math.round(Math.abs(n)));
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '-' : '') + s;
  }
  function fmtMoney(n) { return fmt(n) + ' đ'; }

  /* Lấy chuỗi chữ số thuần từ input (bỏ dấu phân tách & ký tự lạ) */
  function digitsOnly(str) { return String(str == null ? '' : str).replace(/[^0-9]/g, ''); }
  function parseAmount(str) {
    var n = Number(digitsOnly(str));
    return isFinite(n) && n > 0 ? n : 0;
  }

  /* ---------------- Toán tích sao (T&C) ---------------- */
  /* 40k/star: Thẻ Starbucks đã đăng ký · 60k: Tiền mặt/Ví/POS/App · 80k: App thứ 3 */
  function starsFor(amount, method) {
    amount = Number(amount) || 0;
    var rate = RATES[method] || RATES.general;
    return amount > 0 ? Math.floor(amount / rate) : 0;
  }
  function spentForStars(stars, method) {
    var rate = RATES[method] || RATES.general;
    return Math.max(0, Math.ceil(stars)) * rate;
  }
  function starsRemaining(current) { return Math.max(0, GOLD_TARGET - Math.max(0, Math.floor(current))); }

  /* ---------------- Module 1: Star Estimator ---------------- */
  function checkedRadio(name) {
    var els = $$('input[name="' + name + '"]');
    for (var i = 0; i < els.length; i++) {
      if (els[i].checked) return els[i].value;
    }
    return 'card';
  }

  function perkText(stars) {
    if (stars <= 0) return 'Nhập số tiền để xem giá trị phần thưởng tương đương.';
    if (stars < 10) {
      var more = spentForStars(10 - stars, checkedRadio('sbMethod'));
      return 'Còn thiếu ' + (10 - stars) + ' sao nữa để đạt 10 sao → giảm 20.000đ (cần thêm ~' + fmtMoney(more) + ' theo cách thanh toán này).';
    }
    if (stars < 20) return 'Tương đương phần thưởng: 10 sao → giảm 20.000đ.';
    if (stars < 30) return 'Tương đương phần thưởng: 20 sao → giảm 50.000đ.';
    return 'Tương đương phần thưởng: 30 sao → 1 đồ uống Grande miễn phí.';
  }

  function updateEstimate() {
    var amount = parseAmount($('#sb-amount').value);
    var method = checkedRadio('sbMethod');
    var stars = starsFor(amount, method);
    var out = $('#sb-stars-out');
    if (out) out.innerHTML = fmt(stars) + ' <b>sao</b>';
    var perk = $('#sb-stars-perk');
    if (perk) perk.textContent = perkText(stars);
  }

  /* ---------------- Module 2: Gold Tier Progress ---------------- */
  function updateGold() {
    var cur = parseAmount($('#sb-current').value);
    cur = Math.min(cur, 999);
    var method = $('#sb-method2').value || 'card';
    var remain = starsRemaining(cur);
    var spend = spentForStars(remain, method);
    var pct = Math.min(100, Math.round((Math.min(cur, GOLD_TARGET) / GOLD_TARGET) * 100));

    var rEl = $('#sb-remain');
    if (rEl) rEl.textContent = fmt(remain);

    var sEl = $('#sb-spend');
    if (sEl) sEl.textContent = fmtMoney(spend);

    var fill = $('#sb-bar-fill');
    if (fill) fill.style.width = pct + '%';
    var bar = $('.sb-bar');
    if (bar) bar.setAttribute('aria-valuenow', String(pct));

    var tEl = $('#sb-bar-text');
    if (tEl) {
      tEl.textContent = cur >= GOLD_TARGET
        ? '✅ Bạn đã đạt hạng Gold — duy trì 100 sao mỗi chu kỳ 12 tháng'
        : cur + ' / ' + GOLD_TARGET + ' sao · ' + pct + '%';
    }
  }

  /* ---------------- Định dạng input tiền / sao khi gõ ---------------- */
  function wireNumeric(el) {
    if (!el) return;
    el.addEventListener('input', function () {
      var digits = digitsOnly(this.value);
      var pretty = digits ? fmt(Number(digits)) : '';
      if (this.value !== pretty) this.value = pretty;
    });
  }

  /* ---------------- Lưu / khôi phục trạng thái ---------------- */
  function save() {
    storage.set(KEY, {
      a: $('#sb-amount').value,
      m: checkedRadio('sbMethod'),
      c: $('#sb-current').value,
      m2: $('#sb-method2').value
    });
  }

  function restore() {
    var s = storage.get(KEY, null);
    if (!s) return;
    if (s.a) $('#sb-amount').value = s.a;
    if (s.m) {
      $$('input[name="sbMethod"]').forEach(function (el) { el.checked = el.value === s.m; });
    }
    if (s.c) $('#sb-current').value = s.c;
    if (s.m2) $('#sb-method2').value = s.m2;
  }

  /* ---------------- Khởi động ---------------- */
  function init() {
    if (!document.getElementById('sb-form')) return;

    restore();
    wireNumeric($('#sb-amount'));
    wireNumeric($('#sb-current'));

    updateEstimate();
    updateGold();
    save();

    $('#sb-amount').addEventListener('input', function () { updateEstimate(); save(); });
    $('#sb-current').addEventListener('input', function () { updateGold(); save(); });
    $('#sb-method2').addEventListener('change', function () { updateGold(); save(); });
    $$('input[name="sbMethod"]').forEach(function (el) {
      el.addEventListener('change', function () { updateEstimate(); save(); });
    });

    $('#sb-form').addEventListener('submit', function (ev) { ev.preventDefault(); });
    $('#sb-gold-form').addEventListener('submit', function (ev) { ev.preventDefault(); });
  }

  /* Expose để test (và tiện tùy chỉnh) */
  var api = { RATES: RATES, fmt: fmt, fmtMoney: fmtMoney, starsFor: starsFor, spentForStars: spentForStars, starsRemaining: starsRemaining, perkText: perkText };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  if (typeof window !== 'undefined' && window) { window.StarbucksCalc = api; }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();