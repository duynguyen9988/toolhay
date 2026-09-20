/* ============================================================
   Sổ Chi Tiêu — Ngân hàng: Quản lý khuyến mãi thẻ (2 module)
   Nhập promo + Tra cứu promo. Lưu trữ: localStorage.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'banking.promos';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var storage = {
    get: function (key, fallback) {
      try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
      catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }
  };

  function pad(n) { return String(n).padStart(2, '0'); }
  function toISODate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function genId(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function todayISO() { return toISODate(new Date()); }

  function fmtDate(iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }

  var BANKS = ['HSBC', 'Shinhan', 'VIB', 'VPBank', 'Techcombank', 'Vietcombank', 'MB Bank', 'Sacombank', 'ACB'];
  var CATS = ['Du lịch', 'Bảo hiểm', 'Giáo dục', 'Âm thực', 'Mua sắm', 'Vé máy bay', 'Y tế', 'Xăng dầu & di chuyển'];

  /* ---------------- Dữ liệu mẫu ---------------- */
  function seedPromos() {
    return [
      {
        id: genId('bk'),
        bank: 'HSBC',
        cardType: 'Credit',
        cardTier: 'Platinum',
        discount: 'Hoàn 10%',
        category: 'Du lịch',
        mcc: '4722',
        start: '2026-09-01',
        end: '2026-12-31',
        brands: ['Agoda', 'Booking.com'],
        channel: 'Online',
        notes: 'Thanh toán trực tuyến trên Agoda bằng thẻ HSBC Visa Platinum — hoàn 10% tối đa 100.000đ/giao dịch, cần chi tiêu tối thiểu 2 triệu/kỳ.',
        savedAt: 0
      },
      {
        id: genId('bk'),
        bank: 'Shinhan',
        cardType: 'Credit',
        cardTier: 'Signature',
        discount: 'Hoàn 500.000đ',
        category: 'Bảo hiểm',
        mcc: '6300',
        start: '2026-01-01',
        end: '2026-03-31',
        brands: ['Manulife', 'Prudential'],
        channel: 'Cả Online & Offline',
        notes: 'Hoàn 500.000đ khi thanh toán phí bảo hiểm nhân thọ bằng thẻ Shinhan Signature — tối đa 1 lần/kỳ đáo hạn.',
        savedAt: 0
      }
    ];
  }

  /* ---------------- Trạng thái ---------------- */
  var promos = storage.get(KEY, null) || seedPromos();
  if (!storage.get(KEY, null)) storage.set(KEY, promos);
  promos = normalize(promos);

  var TAB_PANELS = ['promo-input', 'promo-inquiry'];
  var filters = { q: '', bank: 'all', cat: 'all', tier: 'all', activeOnly: false };
  var editingId = null;

  function normalize(list) {
    var changed = false;
    (list || []).forEach(function (p, i) {
      if (!p.id) { p.id = genId('bk'); changed = true; }
      if (p.savedAt == null) { p.savedAt = 0; changed = true; }
      if (!Array.isArray(p.brands)) {
        p.brands = parseBrands(p.brands);
        changed = true;
      }
      if (i === 0 && !changed) { /* noop */ }
    });
    if (changed) storage.set(KEY, list);
    return list;
  }

  function parseBrands(raw) {
    var seen = {};
    return String(raw == null ? '' : raw)
      .split(/[,\n]/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s; })
      .filter(function (s) {
        var k = s.toLowerCase();
        if (seen[k]) return false;
        seen[k] = true;
        return true;
      });
  }

  function promoStatus(p) {
    var t = todayISO();
    if (p.end && String(p.end) < t) return { key: 'expired', label: 'Hết hạn' };
    return { key: 'active', label: 'Đang hiệu lực' };
  }

  function daysLeft(p) {
    if (!p.end) return null;
    var diff = new Date(p.end + 'T23:59:59').getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  }

  /* ---------------- Toast ---------------- */
  var toastEl = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'flights-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toastEl.classList.remove('is-show'); }, 2600);
  }

  /* ---------------- Form: validation + clear ---------------- */
  function setInvalid(id, bad) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('is-invalid', !!bad);
    return !!bad;
  }

  function wireLiveValidation() {
    ['promo-bank', 'promo-card-tier', 'promo-category', 'promo-discount', 'promo-start', 'promo-end'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var ev = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(ev, function () { setInvalid(id, false); });
    });
  }

  function validPromo() {
    var bad = [];
    var end = document.getElementById('promo-end').value;
    var start = document.getElementById('promo-start').value;
    if (!document.getElementById('promo-bank').value.trim()) bad.push('promo-bank');
    if (!document.getElementById('promo-card-tier').value) bad.push('promo-card-tier');
    if (!document.getElementById('promo-category').value) bad.push('promo-category');
    if (!document.getElementById('promo-discount').value.trim()) bad.push('promo-discount');
    if (!start) bad.push('promo-start');
    if (!end) bad.push('promo-end');
    bad.forEach(function (id) { setInvalid(id, true); });
    if (bad.length) {
      showToast('⚠️ Vui lòng điền đầy đủ các trường bắt buộc (đánh dấu *).');
      return false;
    }
    if (end < start) {
      setInvalid('promo-start', true);
      setInvalid('promo-end', true);
      showToast('⚠️ Ngày kết thúc phải sau (hoặc bằng) ngày bắt đầu.');
      return false;
    }
    return true;
  }

  function clearForm() {
    ['promo-bank', 'promo-mcc', 'promo-brands', 'promo-note'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['promo-card-tier', 'promo-category'].forEach(function (id) { setInvalid(id, false); });
    setInvalid('promo-bank', false);
    setInvalid('promo-discount', false);
    setInvalid('promo-start', false);
    setInvalid('promo-end', false);
    var d = toISODate(new Date());
    $('#promo-start').value = d;
    $('#promo-end').value = '';
  }

  function resetFormLabels() {
    var t = document.getElementById('promo-form-title');
    if (t) t.textContent = 'Nhập thông tin khuyến mãi thẻ';
    var s = document.getElementById('promo-submit-label');
    if (s) s.textContent = '💾 Lưu Khuyến Mãi';
    var c = document.getElementById('promo-cancel-edit');
    if (c) c.hidden = true;
  }

  function cancelEdit() {
    editingId = null;
    clearForm();
    resetFormLabels();
  }

  /* ---------------- Render ---------------- */
  function currentPromos() {
    var q = filters.q.toLowerCase();
    return promos.slice().sort(function (a, b) {
      return (b.savedAt || 0) - (a.savedAt || 0);
    }).filter(function (p) {
      if (filters.bank !== 'all' && p.bank !== filters.bank) return false;
      if (filters.cat !== 'all' && p.category !== filters.cat) return false;
      if (filters.tier !== 'all' && p.cardTier !== filters.tier) return false;
      if (filters.activeOnly && promoStatus(p).key !== 'active') return false;
      if (q) {
        var hay = [p.bank, p.cardType, p.cardTier, p.discount, p.category, p.mcc, p.channel, (p.brands || []).join(' '), p.notes, p.start, p.end].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderPromos() {
    var box = $('#promo-results'), count = $('#promo-count');
    if (!box) return;
    var list = currentPromos();
    var head = '<div class="flights-results-head">Hiển thị <strong>' + list.length + '</strong>/' + promos.length + ' khuyến mãi' +
      (filters.activeOnly ? ' · còn hiệu lực' : '') +
      (filters.bank !== 'all' ? ' · ' + esc(filters.bank) : '') +
      (filters.cat !== 'all' ? ' · ' + esc(filters.cat) : '') +
      (filters.tier !== 'all' ? ' · ' + esc(filters.tier) : '') +
      '</div>';
    if (count) count.textContent = '🎯 ' + list.length + ' khuyến mãi';
    if (!promos.length) {
      box.innerHTML = head + '<div class="flights-empty">Chưa có khuyến mãi nào. Vào mục <b>➕ Nhập Promo Mới</b> để thêm thẻ của bạn.</div>';
      return;
    }
    if (!list.length) {
      box.innerHTML = head + '<div class="flights-empty">Không có khuyến mãi khớp bộ lọc hiện tại — thử đổi lọc hoặc tắt "còn hiệu lực".</div>';
      return;
    }
    var html = head;
    list.forEach(function (p) {
      var st = promoStatus(p);
      var dl = daysLeft(p);
      var dayChip = '';
      if (dl != null) {
        dayChip = dl > 0 ? '<span class="bk-chip bk-chip--days">còn ' + dl + ' ngày</span>' :
          (dl === 0 ? '<span class="bk-chip">kết thúc hôm nay</span>' : '<span class="bk-chip">đã kết thúc</span>');
      }
      var brands = (p.brands || []).map(function (b) {
        return '<span class="bk-brand">' + esc(b) + '</span>';
      }).join('');
      html +=
        '<article class="bk-card' + (st.key === 'expired' ? ' bk-card--expired' : '') + '">' +
          '<div class="bk-card-top">' +
            '<div class="bk-id">' +
              '<span class="bk-bank">' + esc(p.bank) + '</span>' +
              '<span class="bk-tier">' + esc(p.cardTier) + ' · ' + esc(p.cardType) + '</span>' +
            '</div>' +
            '<span class="bk-status bk-status--' + st.key + '"><i aria-hidden="true"></i>' + st.label + '</span>' +
          '</div>' +
          '<div class="bk-discount">' + esc(p.discount) + '</div>' +
          '<div class="bk-meta">' +
            '<span class="bk-chip bk-chip--cat">' + esc(p.category) + '</span>' +
            (p.mcc ? '<span class="bk-chip">MCC ' + esc(p.mcc) + '</span>' : '') +
            '<span class="bk-chip bk-chip--ch">' + esc(p.channel) + '</span>' +
            dayChip +
          '</div>' +
          (brands ? '<div class="bk-brands">' + brands + '</div>' : '') +
          '<div class="bk-validity">🗓️ ' + fmtDate(p.start) + ' → ' + fmtDate(p.end) + '</div>' +
          (p.notes ? '<p class="bk-notes">' + esc(p.notes) + '</p>' : '') +
          '<div class="bk-actions">' +
            '<button class="bk-act" type="button" data-bk-copy="' + esc(p.id) + '">📋 Sao chép</button>' +
            '<button class="bk-act" type="button" data-bk-edit="' + esc(p.id) + '">✏️ Sửa</button>' +
            '<button class="bk-act bk-act--del" type="button" data-bk-del="' + esc(p.id) + '">🗑️ Xoá</button>' +
          '</div>' +
        '</article>';
    });
    box.innerHTML = html;
  }

  /* ---------------- Actions: copy / edit / delete ---------------- */
  function copyText(text) {
    var done = function () { showToast('✅ Đã sao chép thông tin khuyến mãi.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        showToast('⚠️ Không sao chép được — hãy tự bôi đen nội dung.');
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { showToast('⚠️ Không sao chép được.'); }
      document.body.removeChild(ta);
    }
  }

  function copyPromo(id) {
    var p = promos.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var lines = [
      '🏦 ' + p.bank + ' · ' + p.cardTier + ' (' + p.cardType + ')',
      '🎯 ' + p.discount + ' — ' + p.category,
      '🗓️ Hiệu lực: ' + fmtDate(p.start) + ' → ' + fmtDate(p.end),
      (p.brands && p.brands.length ? '🏷️ Thương hiệu: ' + p.brands.join(', ') : ''),
      '📡 Kênh: ' + p.channel + (p.mcc ? ' · MCC ' + p.mcc : ''),
      (p.notes ? '📝 ' + p.notes : '')
    ].filter(Boolean).join('\n');
    copyText(lines);
  }

  function startEdit(id) {
    var hit = promos.filter(function (x) { return x.id === id; })[0];
    if (!hit) return;
    editingId = id;
    $('#promo-bank').value = hit.bank || '';
    $('#promo-card-type').value = hit.cardType || 'Credit';
    $('#promo-card-tier').value = hit.cardTier || '';
    $('#promo-discount').value = hit.discount || '';
    $('#promo-category').value = hit.category || '';
    $('#promo-mcc').value = hit.mcc || '';
    $('#promo-start').value = hit.start || '';
    $('#promo-end').value = hit.end || '';
    $('#promo-brands').value = (hit.brands || []).join(', ');
    $('#promo-channel').value = hit.channel || 'Online';
    $('#promo-note').value = hit.notes || '';
    var t = document.getElementById('promo-form-title');
    if (t) t.textContent = '✏️ Chỉnh sửa khuyến mãi thẻ';
    var s = document.getElementById('promo-submit-label');
    if (s) s.textContent = '💾 Cập nhật khuyến mãi';
    var c = document.getElementById('promo-cancel-edit');
    if (c) c.hidden = false;
    setTab('promo-input', true);
    var f = document.getElementById('promo-bank');
    if (f) f.focus();
  }

  function deletePromo(id) {
    var hit = promos.filter(function (x) { return x.id === id; })[0];
    if (!hit) return;
    if (!window.confirm('Xoá khuyến mãi "' + hit.bank + ' · ' + hit.discount + '"?')) return;
    promos = promos.filter(function (x) { return x.id !== id; });
    storage.set(KEY, promos);
    if (editingId === id) cancelEdit();
    rebuildFilterOptions();
    renderPromos();
    showToast('🗑️ Đã xoá khuyến mãi.');
  }

  /* ---------------- Bộ lọc ---------------- */
  function buildInit() {
    var dl = document.getElementById('promo-bank-list');
    if (dl) dl.innerHTML = BANKS.map(function (b) { return '<option value="' + esc(b) + '">'; }).join('');
  }

  function unique(arr) {
    return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }).sort(function (a, b) { return a.localeCompare(b, 'vi'); });
  }

  function rebuildFilterOptions() {
    var bankSel = $('#f-bank'), catSel = $('#f-cat'), tierSel = $('#f-tier');
    if (!bankSel || !catSel || !tierSel) return;
    var curBank = bankSel.value, curCat = catSel.value, curTier = tierSel.value;
    var banks = unique(promos.map(function (p) { return p.bank; }));
    var cats = unique(promos.map(function (p) { return p.category; }));
    var tiers = unique(promos.map(function (p) { return p.cardTier; }));
    bankSel.innerHTML = '<option value="all">🏦 Tất cả ngân hàng</option>' +
      banks.map(function (b) { return '<option value="' + esc(b) + '">' + esc(b) + '</option>'; }).join('');
    catSel.innerHTML = '<option value="all">🗂️ Tất cả lĩnh vực</option>' +
      cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    tierSel.innerHTML = '<option value="all">💳 Tất cả dạng thẻ</option>' +
      tiers.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
    if (banks.indexOf(curBank) !== -1) bankSel.value = curBank; else { bankSel.value = 'all'; filters.bank = 'all'; }
    if (cats.indexOf(curCat) !== -1) catSel.value = curCat; else { catSel.value = 'all'; filters.cat = 'all'; }
    if (tiers.indexOf(curTier) !== -1) tierSel.value = curTier; else { tierSel.value = 'all'; filters.tier = 'all'; }
  }

  /* ---------------- Tabs ---------------- */
  function setTab(name, updateHash) {
    if (TAB_PANELS.indexOf(name) === -1) name = 'promo-input';
    TAB_PANELS.forEach(function (n) {
      var tab = document.getElementById('tab-' + n);
      var panel = document.getElementById('panel-' + n);
      if (tab) {
        tab.classList.toggle('is-active', n === name);
        tab.setAttribute('aria-selected', n === name ? 'true' : 'false');
      }
      if (panel) {
        panel.classList.toggle('is-active', n === name);
        panel.setAttribute('aria-hidden', n === name ? 'false' : 'true');
      }
    });
    if (updateHash !== false && history.replaceState) {
      history.replaceState(null, '', '#' + name);
    }
    try { sessionStorage.setItem('banking.tab', name); } catch (e) {}
  }

  function currentTab() {
    var h = (location.hash || '').replace('#', '');
    if (TAB_PANELS.indexOf(h) !== -1) return h;
    try { var s = sessionStorage.getItem('banking.tab'); if (TAB_PANELS.indexOf(s) !== -1) return s; } catch (e) {}
    return 'promo-input';
  }

  /* ---------------- Khởi động ---------------- */
  function init() {
    if (!document.getElementById('promo-form')) return;

    $$('[data-banking-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { setTab(btn.getAttribute('data-banking-tab')); });
    });
    window.addEventListener('hashchange', function () { setTab(currentTab(), false); });
    setTab(currentTab(), false);

    buildInit();
    wireLiveValidation();
    clearForm();

    $('#promo-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!validPromo()) return;
      var p = {
        bank: $('#promo-bank').value.trim(),
        cardType: $('#promo-card-type').value,
        cardTier: $('#promo-card-tier').value,
        discount: $('#promo-discount').value.trim(),
        category: $('#promo-category').value,
        mcc: $('#promo-mcc').value.trim(),
        start: $('#promo-start').value,
        end: $('#promo-end').value,
        channel: $('#promo-channel').value,
        brands: parseBrands($('#promo-brands').value),
        notes: $('#promo-note').value.trim()
      };
      if (editingId) {
        promos.forEach(function (x) {
          if (x.id === editingId) { for (var k in p) x[k] = p[k]; }
        });
        storage.set(KEY, promos);
        showToast('✏️ Đã cập nhật khuyến mãi "' + p.bank + ' · ' + p.discount + '"');
        cancelEdit();
      } else {
        p.id = genId('bk');
        p.savedAt = Date.now();
        promos.unshift(p);
        storage.set(KEY, promos);
        clearForm();
        showToast('✅ Đã lưu khuyến mãi "' + p.bank + ' · ' + p.discount + '"');
      }
      rebuildFilterOptions();
      renderPromos();
    });

    $('#promo-clear').addEventListener('click', function () {
      cancelEdit();
      showToast('Đã xoá nội dung form.');
    });

    $('#promo-cancel-edit').addEventListener('click', function () {
      cancelEdit();
      showToast('Đã huỷ chỉnh sửa.');
    });

    $('#promo-search').addEventListener('input', function () {
      filters.q = this.value;
      renderPromos();
    });
    $('#f-bank').addEventListener('change', function () { filters.bank = this.value; renderPromos(); });
    $('#f-cat').addEventListener('change', function () { filters.cat = this.value; renderPromos(); });
    $('#f-tier').addEventListener('change', function () { filters.tier = this.value; renderPromos(); });
    $('#f-active').addEventListener('change', function () { filters.activeOnly = this.checked; renderPromos(); });

    $('#promo-results').addEventListener('click', function (ev) {
      var copy = ev.target.closest ? ev.target.closest('[data-bk-copy]') : null;
      if (copy) { copyPromo(copy.getAttribute('data-bk-copy')); return; }
      var ed = ev.target.closest ? ev.target.closest('[data-bk-edit]') : null;
      if (ed) { startEdit(ed.getAttribute('data-bk-edit')); return; }
      var del = ev.target.closest ? ev.target.closest('[data-bk-del]') : null;
      if (del) { deletePromo(del.getAttribute('data-bk-del')); }
    });

    $('#banking-reset').addEventListener('click', function () {
      if (!window.confirm('Khôi phục dữ liệu mẫu sẽ ghi đè toàn bộ khuyến mãi hiện có. Tiếp tục?')) return;
      promos = seedPromos();
      storage.set(KEY, promos);
      cancelEdit();
      rebuildFilterOptions();
      renderPromos();
      showToast('Đã khôi phục dữ liệu mẫu (2 khuyến mãi).');
    });

    rebuildFilterOptions();
    renderPromos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();