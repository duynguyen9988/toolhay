/* ============================================================
   Sổ Chi Tiêu — Converter: Chuyển đổi tiền Hàn Quốc cho kế toán
   ----------------- Parsing engine + UI (chạy trên thiết bị) ----
   Định dạng hỗ trợ:
     1) Trộn chữ-số:     168백만 · 1억 6800만 · 1.58억 · 3천500 · 백만
     2) Số thuần:        168000000 · 168,000,000
     3) Đọc Hàn đầy đủ:  일억 육천팔백만원 · 육천팔백만
   ============================================================ */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  /* ---------------- Bảng tra ---------------- */
  var HAN_DIGITS = { 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9, 영: 0 };
  var HAN_SMALL = { 십: 10, 백: 100, 천: 1000 };
  var HAN_BIG = { 만: 10000, 억: 100000000, 조: 1000000000000 };
  var ROM = {
    일: 'il', 이: 'i', 삼: 'sam', 사: 'sa', 오: 'o', 육: 'yuk', 칠: 'chil',
    팔: 'pal', 구: 'gu', 영: 'yeong', 십: 'sip', 백: 'baek', 천: 'cheon',
    만: 'man', 억: 'eok', 조: 'jo'
  };
  var UNIT_NAMES = ['', '만', '억', '조'];
  var LIMIT = Number.MAX_SAFE_INTEGER;

  /* ---------------- Cú pháp: chữ Hàn + số lẻ -> số ---------------- */
  function numberTokenValue(t) {
    if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
    if (HAN_DIGITS[t] !== undefined) return HAN_DIGITS[t];
    return null;
  }

  function tokenize(s) {
    var tokens = [];
    var i = 0, digits = '';
    while (i < s.length) {
      var ch = s[i];
      if (/[0-9]/.test(ch)) { digits += ch; i++; continue; }
      if (digits) { tokens.push(digits); digits = ''; }
      tokens.push(ch); i++;
    }
    if (digits) tokens.push(digits);
    return tokens;
  }

  /* Khối số dưới 만/억/조: hợp của các term {số}×{십백천} + số trần */
  function smallBlock(s) {
    var tokens = tokenize(s);
    var sum = 0;
    var pending = 0;
    var i = 0;
    while (i < tokens.length) {
      var t = tokens[i];
      var v = numberTokenValue(t);
      if (v !== null) { pending = v; i++; continue; }
      if (t === '.' && /^\d+$/.test(tokens[i + 1] || '')) {
        pending = Number(String(pending || 0) + '.' + tokens[i + 1]);
        i += 2;
        continue;
      }
      var u = HAN_SMALL[t];
      if (u) { sum += (pending === 0 ? 1 : pending) * u; pending = 0; i++; continue; }
      i++; /* ký tự lạ — bỏ qua */
    }
    return sum + pending;
  }

  /* Đệ quy theo đơn vị lớn: "1억 6800만" = 1×1e8 + 6800×1e4 */
  function parseBig(s) {
    var units = ['조', '억', '만'];
    for (var k = 0; k < units.length; k++) {
      var idx = s.indexOf(units[k]);
      if (idx !== -1) {
        var m = HAN_BIG[units[k]];
        var before = s.slice(0, idx);
        var after = s.slice(idx + 1);
        var bv = before === '' ? 1 : parseBig(before);
        var av = after === '' ? 0 : parseBig(after);
        return bv * m + av;
      }
    }
    return smallBlock(s);
  }

  /* ---------------- API chuyển đổi ---------------- */
  function convert(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return { ok: false, reason: 'empty' };
    var value;
    if (/[가-힣]/.test(s)) {
      var clean = s.replace(/[원,\s]/g, '');
      if (!/^[\d.일이삼사오육칠팔구영십백천만억조]+$/.test(clean)) return { ok: false, reason: 'invalid' };
      value = parseBig(clean);
    } else {
      var t = s.replace(/[,\s]/g, '');
      if (!/^\d+(\.\d+)?$/.test(t)) return { ok: false, reason: 'invalid' };
      value = Math.round(parseFloat(t));
      if (!isFinite(value)) return { ok: false, reason: 'invalid' };
    }
    value = Math.round(value);
    if (!isFinite(value)) return { ok: false, reason: 'invalid' };
    if (value < 0) return { ok: false, reason: 'negative' };
    if (value > LIMIT) return { ok: false, reason: 'limit' };
    return { ok: true, value: value };
  }

  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

  /* Đọc 1 khối 4 chữ số -> Hàn (1000 -> "천", 168 -> "백육십팔") */
  function readBlock(str) {
    str = String(str).padStart(4, '0');
    var d = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    var out = '';
    for (var i = 0; i < 4; i++) {
      var digit = str.charCodeAt(i) - 48;
      if (digit === 0) continue;
      if (i === 3) { out += d[digit]; }
      else if (i === 0) { out += (digit === 1 ? '' : d[digit]) + '천'; }
      else if (i === 1) { out += (digit === 1 ? '' : d[digit]) + '백'; }
      else { out += (digit === 1 ? '' : d[digit]) + '십'; }
    }
    return out;
  }

  /* Nhóm 4 số kèm đơn vị lớn: 168000000 -> [{일,억},{육천팔백,만}] */
  function koreanGroups(n) {
    n = Math.round(Math.abs(n));
    if (n === 0) return [{ digits: '영', unit: '' }];
    var s = String(n);
    var groups = [];
    while (s.length > 0) { groups.push(s.slice(-4)); s = s.slice(0, -4); }
    var parts = [];
    for (var g = groups.length - 1; g >= 0; g--) {
      var b = readBlock(groups[g]);
      if (b) parts.push({ digits: b, unit: UNIT_NAMES[g] });
    }
    return parts;
  }

  /* 2 · Đọc Hàn đầy đủ + phiên âm */
  function hangulText(n) {
    return koreanGroups(n).map(function (p) { return p.digits + p.unit; }).join(' ');
  }
  function hangulHighlight(n) {
    return koreanGroups(n).map(function (p) {
      return '<span class="conv-k-digits">' + p.digits + '</span>' +
        (p.unit ? '<span class="conv-k-unit">' + p.unit + '</span>' : '');
    }).join(' ');
  }
  function romanText(n) {
    return koreanGroups(n).map(function (p) {
      var seg = '';
      for (var i = 0; i < p.digits.length; i++) {
        var r = ROM[p.digits[i]];
        if (r) seg += (i === 0 ? r : '-' + r);
      }
      return seg + (p.unit && ROM[p.unit] ? '-' + ROM[p.unit] : '');
    }).join(' ');
  }

  /* 3 · Kế toán nhanh: "1억 6,800만" */
  function mixedText(n) {
    n = Math.round(n);
    if (n === 0) return '0';
    var out = [];
    var jo = Math.trunc(n / 1e12);
    var eok = Math.trunc((n % 1e12) / 1e8);
    var man = Math.trunc((n % 1e8) / 1e4);
    var rest = n % 1e4;
    if (jo) out.push(fmt(jo) + '조');
    if (eok) out.push(fmt(eok) + '억');
    if (man) out.push(fmt(man) + '만');
    if (rest) out.push(fmt(rest));
    return out.join(' ');
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
    showToast._t = setTimeout(function () { toastEl.classList.remove('is-show'); }, 3200);
  }

  /* ---------------- Render kết quả ---------------- */
  var copyInfo = { digits: null, hangul: null, mixed: null, roman: null };

  function resultCard(title, body, hint, copyKey) {
    return '<article class="conv-result">' +
      '<div class="conv-result-head">' +
        '<h3>' + title + '</h3>' +
        '<button class="conv-copy" type="button" data-copy="' + copyKey + '">📋 Copy</button>' +
      '</div>' +
      body +
      '<p class="conv-hint">' + hint + '</p>' +
    '</article>';
  }

  function renderEmpty() {
    $('#conv-results').innerHTML =
      '<article class="conv-result conv-state">' +
        '<div class="conv-result-head"><h3>Chờ nhập liệu</h3></div>' +
        '<p class="conv-big">Nhập số tiền để xem cả 3 cách biểu diễn…</p>' +
        '<p class="conv-hint">Thử: <b>168백만</b> · <b>2.5억</b> · <b>일억 육천팔백만</b> · <b>3천500</b></p>' +
      '</article>';
  }

  function renderError(msg) {
    $('#conv-results').innerHTML =
      '<article class="conv-result conv-state">' +
        '<div class="conv-result-head"><h3>⚠️ Không nhận dạng được</h3></div>' +
        '<p class="conv-big">' + msg + '</p>' +
        '<p class="conv-hint">Chấp nhận: chữ-số Hàn (<b>1억 6800만</b>), số thuần (<b>168,000,000</b>), đọc Hàn (<b>일억 육천팔백만</b>).</p>' +
      '</article>';
  }

  function render(n) {
    copyInfo.digits = fmt(n) + ' 원';
    copyInfo.hangul = hangulText(n) + ' 원';
    copyInfo.mixed = mixedText(n) + ' 원';
    copyInfo.roman = romanText(n) + ' won';

    $('#conv-results').innerHTML =
      resultCard('1 · Số chuẩn <span lang="ko">(숫자)</span>',
        '<p class="conv-big">' + fmt(n) + ' <span class="conv-cur">원</span></p>',
        'Dấu phẩy ngăn cách hàng nghìn — chuẩn sổ sách.', 'digits') +
      resultCard('2 · Đọc Hàn đầy đủ <span lang="ko">(한글)</span>',
        '<p class="conv-big">' + hangulHighlight(n) + ' <span class="conv-cur">원</span></p>',
        'Đơn vị lớn (만 · 억 · 조) được tô màu để dễ ghi nhớ nhóm 4 số.', 'hangul') +
      resultCard('3 · Kế toán nhanh',
        '<p class="conv-big">' + mixedText(n) + ' <span class="conv-cur">원</span></p>',
        'Cách ghi nhanh trong bảng tính / chứng từ tiếng Hàn.', 'mixed') +
      resultCard('4 · Phiên âm <span lang="en">(reading)</span>',
        '<p class="conv-big conv-roman">' + romanText(n) + ' <span class="conv-cur">won</span></p>',
        'Đọc theo La-tinh — luyện phát âm khi báo cáo doanh thu.', 'roman');
  }

  var debounceT = null;
  function onInput() {
    clearTimeout(debounceT);
    debounceT = setTimeout(update, 150);
  }
  function update() {
    var raw = $('#conv-input').value;
    if (!raw.trim()) { renderEmpty(); return; }
    var res = convert(raw);
    if (!res.ok) {
      var msg = res.reason === 'limit'
        ? 'Số quá lớn — tối đa ' + fmt(LIMIT) + ' (<b>999조</b>).'
        : 'Không thể đọc "' + raw.replace(/</g, '&lt;') + '" như một số tiền.';
      renderError(msg);
      return;
    }
    render(res.value);
  }

  /* ---------------- Copy ---------------- */
  function copyText(text, btn) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); flash(); } catch (e) {}
      document.body.removeChild(ta);
    }
    function flash() {
      btn.classList.add('is-done');
      btn.textContent = '✓ Đã copy';
      setTimeout(function () {
        btn.classList.remove('is-done');
        btn.textContent = '📋 Copy';
      }, 1400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(flash).catch(fallback);
    } else { fallback(); }
  }

  /* ---------------- Khởi động ---------------- */
  function init() {
    if (!document.getElementById('conv-input')) return;
    $('#conv-input').addEventListener('input', onInput);
    $('#conv-input').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); update(); }
    });
    $('#conv-clear').addEventListener('click', function () {
      $('#conv-input').value = '';
      $('#conv-input').focus();
      renderEmpty();
    });
    var quickBtns = document.querySelectorAll('[data-add]');
    Array.prototype.forEach.call(quickBtns, function (b) {
      b.addEventListener('click', function () {
        var add = parseFloat(b.getAttribute('data-add')) || 0;
        var cur = convert($('#conv-input').value);
        var base = cur.ok ? cur.value : 0;
        var next = base + add;
        if (next > LIMIT) { showToast('⚠️ Vượt quá giới hạn ' + fmt(LIMIT)); return; }
        $('#conv-input').value = String(next);
        update();
      });
    });
    $('#conv-results').addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-copy]') : null;
      if (!btn) return;
      var key = btn.getAttribute('data-copy');
      if (copyInfo[key] != null) copyText(copyInfo[key], btn);
    });
    renderEmpty();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expose để test / debug */
  window.Converter = {
    convert: convert,
    hangulText: hangulText,
    mixedText: mixedText,
    romanText: romanText,
    koreanGroups: koreanGroups,
    readBlock: readBlock
  };
})();