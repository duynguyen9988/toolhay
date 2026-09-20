/* ============================================================
   Sổ Chi Tiêu — Trung tâm Chuyến bay (4 module tương tác)
   Lưu trữ: localStorage — riêng tư, không tài khoản.
   ============================================================ */
(function () {
  'use strict';

  var KEY_FLIGHTS = 'flights.data';
  var KEY_HISTORY = 'flights.history';
  var KEY_TERMS = 'flights.terms';

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
  function parseHHMM(s) {
    var parts = String(s || '').split(':');
    var h = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
    return isFinite(h) && isFinite(m) ? h * 60 + m : null;
  }
  function fmtDuration(min) {
    var h = Math.floor(min / 60), m = min % 60;
    if (h && m) return h + ' giờ ' + m + ' phút';
    if (h) return h + ' giờ';
    if (m) return m + ' phút';
    return min + ' phút';
  }
  function genId(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------------- Dữ liệu mẫu ---------------- */
  function seedFlights() {
    var today = toISODate(new Date());
    var mk = function (dept, airline, flight, terminal, deptTime, arr, arrTime) {
      return { id: genId('fl'), date: today, dept: dept, airline: airline, flight: flight, terminal: terminal, deptTime: deptTime, arr: arr, arrTime: arrTime };
    };
    return [
      mk('SGN', 'VN', '408', '1', '06:40', 'ICN', '13:10'),
      mk('ICN', 'KE', '467', '2', '09:20', 'SGN', '14:35'),
      mk('SGN', 'VJ', '182', '1', '11:10', 'DAD', '12:35'),
      mk('HAN', 'QH', '104', '2', '15:40', 'SGN', '17:35')
    ];
  }

  function seedTerms() {
    return [
      { term: 'ETA', cat: 'Flight Ops', def: 'Estimated Time of Arrival — Thời gian dự kiến hạ cánh/đến.', note: 'Ví dụ: "ETA 13:10 giờ địa phương". Được bộ phận vận hành và ATC cập nhật liên tục.' },
      { term: 'ETD', cat: 'Flight Ops', def: 'Estimated Time of Departure — Thời gian dự kiến khởi hành.', note: 'Bị trễ thường do thời tiết, slot hoặc chờ hành khách nối chuyến.' },
      { term: 'IATA', cat: 'General', def: 'International Air Transport Association — Hiệp hội Vận tải Hàng không Quốc tế.', note: 'Đơn vị phát hành mã sân bay 3 chữ cái (SGN, ICN) và mã hãng 2 chữ cái (VN, KE).' },
      { term: 'ICAO', cat: 'General', def: 'International Civil Aviation Organization — Tổ chức Hàng không Dân dụng Quốc tế.', note: 'Điều hành bay dùng mã 4 chữ cái: VVTS = Tân Sơn Nhất, VHHH = Hong Kong.' },
      { term: 'Slot', cat: 'Flight Ops', def: 'Khung giờ cất/hạ cánh được phân bổ tại sân bay bị giới hạn năng lực.', note: 'Thiếu slot có thể khiến chuyến bay bị hủy hoặc dời giờ.' },
      { term: 'Code Share', cat: 'Commercial', def: 'Thỏa thuận để nhiều hãng cùng bán vé trên một chuyến bay thực tế.', note: 'VN có thể bán chuyến do KE điều hành: cùng máy bay nhưng khác mã hãng và số hiệu.' },
      { term: 'BSP', cat: 'Ticketing', def: 'Billing and Settlement Plan — Hệ thống thanh toán & quyết toán vé do IATA vận hành.', note: 'Xem bài "BSP và ARC" trên blog.' },
      { term: 'ARC', cat: 'Ticketing', def: 'Airline Reporting Corporation — Hệ thống thanh toán vé tại thị trường Bắc Mỹ.', note: 'Chức năng tương đương BSP nhưng do nhóm hãng bay Mỹ vận hành.' },
      { term: 'ADM', cat: 'Ticketing', def: 'Agency Debit Memo — Hãng trừ tiền đại lý khi phát hiện sai sót khi phát hành vé.', note: 'Xem bài "ADM/ACM" trên blog.' },
      { term: 'ACM', cat: 'Ticketing', def: 'Agency Credit Memo — Hãng hoàn tiền cho đại lý khi điều chỉnh có lợi cho đại lý.', note: 'Ngược chiều với ADM.' },
      { term: 'NDC', cat: 'Ticketing', def: 'New Distribution Capability — Chuẩn trao đổi dữ liệu vé thế hệ mới của IATA.', note: 'Xem bài "NDC — cách mạng phân phối vé máy bay" trên blog.' },
      { term: 'ATC', cat: 'Flight Ops', def: 'Air Traffic Control — Kiểm soát không lưu, điều phối máy bay trong vùng trời.', note: 'Có thể yêu cầu hoãn/đổi lộ trình khi thời tiết xấu.' },
      { term: 'Boarding', cat: 'Ground Handling', def: 'Quy trình đưa hành khách lên máy bay theo cổng, theo nhóm.', note: 'Thông báo thường gặp: "Boarding at gate 12, Zone 3".' },
      { term: 'Gate', cat: 'Ground Handling', def: 'Cổng lên máy bay tại nhà ga.', note: 'Gate có thể đổi sát giờ — luôn theo dõi bảng thông báo.' },
      { term: 'Tarmac', cat: 'Ground Handling', def: 'Khu vực sân đỗ máy bay trên đường lăn/gần nhà ga.', note: 'Xe buýt đưa khách ra máy bay được gọi là tarmac coach.' },
      { term: 'MCT', cat: 'Flight Ops', def: 'Minimum Connection Time — Thời gian nối chuyến tối thiểu tại một sân bay.', note: 'Vé nối chuyến ngắn hơn MCT có rủi ro cao.' },
      { term: 'ETOPS', cat: 'Flight Ops', def: 'Extended-range Twin-engine Operations — Cho phép máy bay 2 động cơ bay đường dài.', note: 'Giới hạn thời gian bay tới sân bay thay thế gần nhất.' },
      { term: 'Mayday', cat: 'General', def: 'Tín hiệu khẩn cấp quốc tế trong liên lạc vô tuyến.', note: 'Lặp ba lần "Mayday, Mayday, Mayday" khi gặp nguy hiểm nghiêm trọng.' }
    ];
  }

  /* ---------------- Trạng thái ---------------- */
  var flights = storage.get(KEY_FLIGHTS, null) || seedFlights();
  if (!storage.get(KEY_FLIGHTS, null)) storage.set(KEY_FLIGHTS, flights);
  var history = storage.get(KEY_HISTORY, []);
  var terms = storage.get(KEY_TERMS, null) || seedTerms();
  if (!storage.get(KEY_TERMS, null)) storage.set(KEY_TERMS, terms);

  var TAB_PANELS = ['fs-input', 'fs-inquiry', 'term-input', 'term-lookup'];
  var statusFilter = 'all';
  var termText = '';
  var termCat = 'all';
  var termAlpha = '';

  /* ---------------- Tiện ích chuyến bay ---------------- */
  function combinatorOf(f) {
    return ((f.dept || '') + (f.airline || '') + (f.flight || '')).toUpperCase().trim();
  }

  function durationMinutesOf(f) {
    var t0 = parseHHMM(f.deptTime), t1 = parseHHMM(f.arrTime);
    if (t0 == null || t1 == null) return null;
    return t1 > t0 ? t1 - t0 : t1 + 1440 - t0;
  }

  function flightStatus(f) {
    var today = toISODate(new Date());
    var t0 = parseHHMM(f.deptTime), t1 = parseHHMM(f.arrTime);
    if (t0 == null || t1 == null) return { key: 'unknown', label: 'Chưa rõ' };
    if (f.date > today) return { key: 'scheduled', label: 'Chưa khởi hành' };
    if (f.date < today) return { key: 'landed', label: 'Đã hạ cánh' };
    var now = new Date().getHours() * 60 + new Date().getMinutes();
    var arr = t1 > t0 ? t1 : t1 + 1440;
    if (now < t0) return { key: 'scheduled', label: 'Chưa khởi hành' };
    if (now < arr) return { key: 'inflight', label: 'Đang bay' };
    return { key: 'landed', label: 'Đã hạ cánh' };
  }

  var STATUS_LABELS = { scheduled: 'Chưa khởi hành', inflight: 'Đang bay', landed: 'Đã hạ cánh' };

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

  /* ---------------- Panels 1: Flight Input ---------------- */
  function refreshMath() {
    var dept = ($('#fl-dept') || {}).value || '';
    var airline = ($('#fl-airline') || {}).value || '';
    var flight = ($('#fl-flight') || {}).value || '';
    var d0 = ($('#fl-dept-time') || {}).value || '';
    var d1 = ($('#fl-arr-time') || {}).value || '';
    var comb = $('#fl-combinator'), dur = $('#fl-duration');
    if (comb) comb.value = ((dept + airline + flight).toUpperCase().trim());
    if (dur) {
      var t0 = parseHHMM(d0), t1 = parseHHMM(d1);
      dur.value = t0 != null && t1 != null ? fmtDuration(t1 > t0 ? t1 - t0 : t1 + 1440 - t0) : '';
    }
  }

  var UPPER_FIELDS = ['fl-dept', 'fl-airline', 'fl-arr'];

  function clearFlightForm() {
    ['fl-dept', 'fl-airline', 'fl-flight', 'fl-terminal', 'fl-dept-time', 'fl-arr', 'fl-arr-time'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    var d = document.getElementById('fl-date');
    if (d) d.value = toISODate(new Date());
    refreshMath();
  }

  function validFlight() {
    var dept = $('#fl-dept').value.trim().toUpperCase();
    var airline = $('#fl-airline').value.trim().toUpperCase();
    var flight = $('#fl-flight').value.trim();
    var arr = $('#fl-arr').value.trim().toUpperCase();
    var msg = null;
    if (!/^[A-Z]{3}$/.test(dept)) msg = 'Sân bay đi phải là 3 chữ cái IATA (VD: SGN).';
    else if (!/^[A-Z]{2}$/.test(airline)) msg = 'Mã hãng phải là 2 chữ cái IATA (VD: VN).';
    else if (!/^\d{1,4}$/.test(flight)) msg = 'Số hiệu chuyến bay chỉ gồm chữ số (VD: 408).';
    else if (!/^[A-Z]{3}$/.test(arr)) msg = 'Sân bay đến phải là 3 chữ cái IATA (VD: ICN).';
    else if (!parseHHMM($('#fl-dept-time').value)) msg = 'Vui lòng chọn giờ khởi hành.';
    else if (!parseHHMM($('#fl-arr-time').value)) msg = 'Vui lòng chọn giờ hạ cánh.';
    else if (!$('#fl-date').value) msg = 'Vui lòng chọn ngày bay.';
    return msg;
  }

  /* ---------------- Panels 2: Flight Inquiry ---------------- */
  function filterFlights() {
    var q = ($('#flight-search').value || '').trim().toLowerCase();
    var list = flights.filter(function (f) {
      var hay = (combinatorOf(f) + ' ' + [f.dept, f.arr, f.airline, f.flight, f.terminal].join(' ')).toLowerCase();
      var okQ = !q || hay.indexOf(q) !== -1;
      var st = flightStatus(f).key;
      var okS = statusFilter === 'all' || st === statusFilter;
      return okQ && okS;
    });
    renderFlights(list);
  }

  function renderFlights(list) {
    var box = $('#flight-results');
    if (!box) return;
    if (!flights.length) {
      box.innerHTML = '<div class="flights-empty">Chưa có chuyến bay nào. Vào mục <b>Flight Status Input</b> để thêm.</div>';
      return;
    }
    if (!list.length) {
      box.innerHTML = '<div class="flights-empty">Không có chuyến bay khớp bộ lọc hiện tại.</div>';
      return;
    }
    var html = '<div class="flights-results-head"><strong>' + list.length + '</strong> chuyến bay' +
      (statusFilter !== 'all' ? ' · ' + STATUS_LABELS[statusFilter] : '') + '</div>';
    list.forEach(function (f) {
      var st = flightStatus(f);
      var dur = durationMinutesOf(f);
      html +=
        '<article class="flight-card">' +
          '<div class="flight-card-top">' +
            '<div class="flight-route">' +
              '<span class="flight-code">' + esc(f.airline + f.flight) + '</span>' +
              '<span class="flight-airports">' + esc(f.dept) + ' <span class="flight-plane" aria-hidden="true">✈️</span> ' + esc(f.arr) + '</span>' +
            '</div>' +
            '<span class="flight-status flight-status--' + st.key + '">' + st.label + '</span>' +
          '</div>' +
          '<div class="flight-grid">' +
            '<div class="flight-t"><small>Khởi hành</small><strong>' + esc(f.deptTime) + '</strong><span>' + esc(f.date) + '</span></div>' +
            '<div class="flight-mid"><span class="flight-dur">' + (dur != null ? fmtDuration(dur) : '—') + '</span></div>' +
            '<div class="flight-t"><small>Hạ cánh</small><strong>' + esc(f.arrTime) + '</strong><span>Ga ' + esc(f.terminal || '—') + '</span></div>' +
          '</div>' +
          '<div class="flight-foot"><span>Combinator: <b>' + esc(combinatorOf(f)) + '</b></span></div>' +
        '</article>';
    });
    box.innerHTML = html;
  }

  function pushHistory(q) {
    q = (q || '').trim();
    if (!q) return;
    history = history.filter(function (h) { return h.toLowerCase() !== q.toLowerCase(); });
    history.unshift(q);
    if (history.length > 8) history = history.slice(0, 8);
    storage.set(KEY_HISTORY, history);
    renderHistory();
  }

  function renderHistory() {
    var box = $('#search-history');
    if (!box) return;
    if (!history.length) {
      box.innerHTML = '<p class="fl-history-empty">Chưa có lượt tra cứu nào.</p>';
      return;
    }
    box.innerHTML = history.map(function (q) {
      return '<span class="fl-history-chip"><button type="button" data-history-q="' + esc(q) + '">' + esc(q) + '</button>' +
        '<button class="fl-history-x" type="button" data-history-del="' + esc(q) + '" aria-label="Xoá khỏi lịch sử">×</button></span>';
    }).join('');
  }

  /* ---------------- Panels 3 + 4: Thuật ngữ ---------------- */
  function clearTermForm() {
    ['term-name', 'term-def', 'term-note'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    var c = document.getElementById('term-cat');
    if (c) c.value = 'Flight Ops';
  }

  function sortTerms(list) {
    return list.slice().sort(function (a, b) {
      return String(a.term).toLowerCase() < String(b.term).toLowerCase() ? -1 : 1;
    });
  }

  function currentTerms() {
    return sortTerms(terms).filter(function (t) {
      var hay = (t.term + ' ' + t.def + ' ' + t.cat + ' ' + (t.note || '')).toLowerCase();
      var okText = !termText || hay.indexOf(termText) !== -1;
      var okCat = termCat === 'all' || t.cat === termCat;
      var okAlpha = !termAlpha || String(t.term || '').charAt(0).toUpperCase() === termAlpha;
      return okText && okCat && okAlpha;
    });
  }

  function renderTerms() {
    var box = $('#term-results'), count = $('#term-count');
    if (!box) return;
    var list = currentTerms();
    if (count) count.textContent = '📚 ' + list.length + ' thuật ngữ';
    if (!list.length) {
      box.innerHTML = '<div class="flights-empty">Không có thuật ngữ khớp. Thử từ khoá khác, hoặc tự thêm vào mục <b>Thuật ngữ · Nhập</b>.</div>';
      return;
    }
    box.innerHTML = list.map(function (t) {
      return '<article class="term-card">' +
        '<div class="term-card-head"><h3>' + esc(t.term) + '</h3><span class="term-cat">' + esc(t.cat) + '</span></div>' +
        '<p class="term-def">' + esc(t.def) + '</p>' +
        (t.note ? '<p class="term-note"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>' + esc(t.note) + '</p>' : '') +
      '</article>';
    }).join('');
  }

  function buildFilterUI() {
    var alpha = $('#term-alpha'), cats = $('#term-cats');
    if (alpha) {
      alpha.innerHTML = '<button class="fl-pill is-active" type="button" data-alpha="all">A–Z</button>' +
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(function (letter) {
          return '<button class="fl-pill" type="button" data-alpha="' + letter + '">' + letter + '</button>';
        }).join('');
    }
    if (cats) {
      cats.innerHTML = [
        { k: 'all', l: 'Tất cả' },
        { k: 'Flight Ops', l: 'Flight Ops' },
        { k: 'Ground Handling', l: 'Ground Handling' },
        { k: 'Ticketing', l: 'Ticketing' },
        { k: 'Commercial', l: 'Commercial' },
        { k: 'General', l: 'General' }
      ].map(function (c) {
        return '<button class="fl-pill' + (termCat === c.k ? ' is-active' : '') + '" type="button" data-termcat="' + esc(c.k) + '">' + esc(c.l) + '</button>';
      }).join('');
    }
  }

  function markPills(container, attr, value) {
    var root = document.getElementById(container);
    if (!root) return;
    $$('.fl-pill', root).forEach(function (p) {
      p.classList.toggle('is-active', p.getAttribute(attr) === value);
    });
  }

  /* ---------------- Tabs ---------------- */
  function setTab(name, updateHash) {
    if (TAB_PANELS.indexOf(name) === -1) name = 'fs-input';
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
    try { sessionStorage.setItem('flights.tab', name); } catch (e) {}
  }

  function currentTab() {
    var h = (location.hash || '').replace('#', '');
    if (TAB_PANELS.indexOf(h) !== -1) return h;
    try { var s = sessionStorage.getItem('flights.tab'); if (TAB_PANELS.indexOf(s) !== -1) return s; } catch (e) {}
    return 'fs-input';
  }

  /* ---------------- Debounce ---------------- */
  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  /* ---------------- Khởi động ---------------- */
  function init() {
    if (!document.getElementById('flight-form')) return;

    $$('[data-flights-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { setTab(btn.getAttribute('data-flights-tab')); });
    });
    window.addEventListener('hashchange', function () { setTab(currentTab(), false); });
    setTab(currentTab(), false);

    /* Panel 1 */
    var d = document.getElementById('fl-date');
    if (d) d.value = toISODate(new Date());
    ['fl-dept', 'fl-airline', 'fl-flight', 'fl-terminal', 'fl-dept-time', 'fl-arr', 'fl-arr-time'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () {
        if (UPPER_FIELDS.indexOf(id) !== -1) { el.value = el.value.toUpperCase(); }
        refreshMath();
      });
    });
    $('#flight-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var msg = validFlight();
      if (msg) { showToast('⚠️ ' + msg); return; }
      var f = {
        id: genId('fl'),
        date: $('#fl-date').value,
        dept: $('#fl-dept').value.trim().toUpperCase(),
        airline: $('#fl-airline').value.trim().toUpperCase(),
        flight: $('#fl-flight').value.trim(),
        terminal: ($('#fl-terminal').value || '').trim().toUpperCase(),
        deptTime: $('#fl-dept-time').value,
        arr: $('#fl-arr').value.trim().toUpperCase(),
        arrTime: $('#fl-arr-time').value
      };
      flights.unshift(f);
      storage.set(KEY_FLIGHTS, flights);
      clearFlightForm();
      showToast('✅ Đã lưu chuyến bay ' + combinatorOf(f));
      filterFlights();
    });
    $('#flight-clear').addEventListener('click', function () {
      clearFlightForm();
      showToast('Đã xoá nội dung form.');
    });

    /* Panel 2 */
    var flightSearch = $('#flight-search');
    flightSearch.addEventListener('input', function () {
      filterFlights();
    });
    var recordHistory = debounce(function () {
      pushHistory(flightSearch.value);
    }, 700);
    flightSearch.addEventListener('change', function () { pushHistory(flightSearch.value); });
    flightSearch.addEventListener('input', recordHistory);
    flightSearch.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') pushHistory(flightSearch.value);
    });

    $$('.fl-status-filters [data-status]').forEach(function (p) {
      p.addEventListener('click', function () {
        statusFilter = p.getAttribute('data-status');
        $$('.fl-status-filters [data-status]').forEach(function (x) {
          x.classList.toggle('is-active', x === p);
        });
        filterFlights();
      });
    });

    $('#history-clear').addEventListener('click', function () {
      history = [];
      storage.set(KEY_HISTORY, history);
      renderHistory();
      showToast('Đã xoá lịch sử tra cứu.');
    });

    $('#search-history').addEventListener('click', function (ev) {
      var q = ev.target.getAttribute('data-history-q');
      if (q) {
        flightSearch.value = q;
        filterFlights();
        pushHistory(q);
        flightSearch.focus();
        return;
      }
      var del = ev.target.getAttribute('data-history-del');
      if (del) {
        history = history.filter(function (h) { return h !== del; });
        storage.set(KEY_HISTORY, history);
        renderHistory();
      }
    });

    $('#flights-reset').addEventListener('click', function () {
      if (!window.confirm('Khôi phục dữ liệu mẫu sẽ ghi đè toàn bộ chuyến bay và thuật ngữ hiện có. Tiếp tục?')) return;
      flights = seedFlights();
      terms = seedTerms();
      storage.set(KEY_FLIGHTS, flights);
      storage.set(KEY_TERMS, terms);
      filterFlights();
      renderTerms();
      showToast('Đã khôi phục dữ liệu mẫu.');
    });

    /* Panel 3 */
    $('#term-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = $('#term-name').value.trim();
      var def = $('#term-def').value.trim();
      if (!name) { showToast('⚠️ Nhập thuật ngữ / viết tắt.'); return; }
      if (!def) { showToast('⚠️ Nhập nghĩa tiếng Việt / định nghĩa.'); return; }
      terms.unshift({
        term: name, cat: $('#term-cat').value,
        def: def, note: $('#term-note').value.trim()
      });
      storage.set(KEY_TERMS, terms);
      clearTermForm();
      showToast('✅ Đã lưu thuật ngữ "' + name + '"');
      renderTerms();
    });
    $('#term-clear').addEventListener('click', function () {
      clearTermForm();
      showToast('Đã xoá nội dung form.');
    });

    /* Panel 4 */
    var termSearch = $('#term-search');
    termSearch.addEventListener('input', function () {
      termText = termSearch.value.trim().toLowerCase();
      renderTerms();
    });

    $('#term-alpha').addEventListener('click', function (ev) {
      var a = ev.target.getAttribute && ev.target.getAttribute('data-alpha');
      if (!a) return;
      termAlpha = a === 'all' ? '' : a;
      markPills('term-alpha', 'data-alpha', a);
      renderTerms();
    });

    $('#term-cats').addEventListener('click', function (ev) {
      var c = ev.target.getAttribute && ev.target.getAttribute('data-termcat');
      if (!c) return;
      termCat = c;
      markPills('term-cats', 'data-termcat', c);
      renderTerms();
    });

    buildFilterUI();
    refreshMath();
    renderFlights(flights);
    renderHistory();
    renderTerms();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();