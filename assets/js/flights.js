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
    var mk = function (dept, airline, flight, terminal, deptTime, arr, arrTime, gate) {
      return { id: genId('fl'), date: today, dept: dept, airline: airline, flight: flight, terminal: terminal, gate: gate || '', deptTime: deptTime, arr: arr, arrTime: arrTime };
    };
    return [
      mk('SGN', 'VN', '408', '1', '06:40', 'ICN', '13:10', '3'),
      mk('ICN', 'KE', '467', '2', '09:20', 'SGN', '14:35', '28'),
      mk('SGN', 'VJ', '182', '1', '11:10', 'DAD', '12:35', '4'),
      mk('HAN', 'QH', '104', '2', '15:40', 'SGN', '17:35', '7')
    ];
  }

  function seedTerms() {
    return [
      { id: 'tm_s1', term: 'ETA', vn: 'Thời gian dự kiến đến', cat: 'Flight Ops', def: 'Estimated Time of Arrival — Thời gian dự kiến hạ cánh/đến.', note: 'Ví dụ: "ETA 13:10 giờ địa phương". Được bộ phận vận hành và ATC cập nhật liên tục.' },
      { id: 'tm_s2', term: 'ETD', vn: 'Thời gian dự kiến khởi hành', cat: 'Flight Ops', def: 'Estimated Time of Departure — Thời gian dự kiến khởi hành.', note: 'Bị trễ thường do thời tiết, slot hoặc chờ hành khách nối chuyến.' },
      { id: 'tm_s3', term: 'IATA', vn: 'Hiệp hội Vận tải Hàng không Quốc tế', cat: 'General', def: 'International Air Transport Association — Hiệp hội Vận tải Hàng không Quốc tế.', note: 'Đơn vị phát hành mã sân bay 3 chữ cái (SGN, ICN) và mã hãng 2 chữ cái (VN, KE).' },
      { id: 'tm_s4', term: 'ICAO', vn: 'Tổ chức Hàng không Dân dụng Quốc tế', cat: 'General', def: 'International Civil Aviation Organization — Tổ chức Hàng không Dân dụng Quốc tế.', note: 'Điều hành bay dùng mã 4 chữ cái: VVTS = Tân Sơn Nhất, VHHH = Hong Kong.' },
      { id: 'tm_s5', term: 'Slot', vn: 'Khung giờ cất/hạ cánh', cat: 'Flight Ops', def: 'Khung giờ cất/hạ cánh được phân bổ tại sân bay bị giới hạn năng lực.', note: 'Thiếu slot có thể khiến chuyến bay bị hủy hoặc dời giờ.' },
      { id: 'tm_s6', term: 'Code Share', vn: 'Liên danh vé (nhiều hãng chung chuyến bay)', cat: 'Commercial', def: 'Thỏa thuận để nhiều hãng cùng bán vé trên một chuyến bay thực tế.', note: 'VN có thể bán chuyến do KE điều hành: cùng máy bay nhưng khác mã hãng và số hiệu.' },
      { id: 'tm_s7', term: 'BSP', vn: 'Hệ thống thanh toán & quyết toán vé IATA', cat: 'Ticketing', def: 'Billing and Settlement Plan — Hệ thống thanh toán & quyết toán vé do IATA vận hành.', note: 'Xem bài "BSP và ARC" trên blog.' },
      { id: 'tm_s8', term: 'ARC', vn: 'Hệ thống thanh toán vé Bắc Mỹ', cat: 'Ticketing', def: 'Airline Reporting Corporation — Hệ thống thanh toán vé tại thị trường Bắc Mỹ.', note: 'Chức năng tương đương BSP nhưng do nhóm hãng bay Mỹ vận hành.' },
      { id: 'tm_s9', term: 'ADM', vn: 'Hãng trừ tiền đại lý', cat: 'Ticketing', def: 'Agency Debit Memo — Hãng trừ tiền đại lý khi phát hiện sai sót khi phát hành vé.', note: 'Xem bài "ADM/ACM" trên blog.' },
      { id: 'tm_s10', term: 'ACM', vn: 'Hãng hoàn tiền cho đại lý', cat: 'Ticketing', def: 'Agency Credit Memo — Hãng hoàn tiền cho đại lý khi điều chỉnh có lợi cho đại lý.', note: 'Ngược chiều với ADM.' },
      { id: 'tm_s11', term: 'NDC', vn: 'Chuẩn phân phối vé thế hệ mới', cat: 'Ticketing', def: 'New Distribution Capability — Chuẩn trao đổi dữ liệu vé thế hệ mới của IATA.', note: 'Xem bài "NDC — cách mạng phân phối vé máy bay" trên blog.' },
      { id: 'tm_s12', term: 'ATC', vn: 'Kiểm soát không lưu', cat: 'Flight Ops', def: 'Air Traffic Control — Kiểm soát không lưu, điều phối máy bay trong vùng trời.', note: 'Có thể yêu cầu hoãn/đổi lộ trình khi thời tiết xấu.' },
      { id: 'tm_s13', term: 'Boarding', vn: 'Lên máy bay', cat: 'Ground Handling', def: 'Quy trình đưa hành khách lên máy bay theo cổng, theo nhóm.', note: 'Thông báo thường gặp: "Boarding at gate 12, Zone 3".' },
      { id: 'tm_s14', term: 'Gate', vn: 'Cổng lên máy bay', cat: 'Ground Handling', def: 'Cổng lên máy bay tại nhà ga.', note: 'Gate có thể đổi sát giờ — luôn theo dõi bảng thông báo.' },
      { id: 'tm_s15', term: 'Tarmac', vn: 'Khu vực sân đỗ máy bay', cat: 'Ground Handling', def: 'Khu vực sân đỗ máy bay trên đường lăn/gần nhà ga.', note: 'Xe buýt đưa khách ra máy bay được gọi là tarmac coach.' },
      { id: 'tm_s16', term: 'MCT', vn: 'Thời gian nối chuyến tối thiểu', cat: 'Flight Ops', def: 'Minimum Connection Time — Thời gian nối chuyến tối thiểu tại một sân bay.', note: 'Vé nối chuyến ngắn hơn MCT có rủi ro cao.' },
      { id: 'tm_s17', term: 'ETOPS', vn: 'Bay đường dài với máy bay 2 động cơ', cat: 'Flight Ops', def: 'Extended-range Twin-engine Operations — Cho phép máy bay 2 động cơ bay đường dài.', note: 'Giới hạn thời gian bay tới sân bay thay thế gần nhất.' },
      { id: 'tm_s18', term: 'Mayday', vn: 'Tín hiệu khẩn cấp quốc tế', cat: 'General', def: 'Tín hiệu khẩn cấp quốc tế trong liên lạc vô tuyến.', note: 'Lặp ba lần "Mayday, Mayday, Mayday" khi gặp nguy hiểm nghiêm trọng.' },
      { id: 'tm_s19', term: 'Interline', vn: 'Thỏa thuận liên danh truyền thống', cat: 'Commercial', def: 'Interline — Thỏa thuận liên danh truyền thống: các hãng chấp nhận vé của nhau để hành khách nối chuyến trọn hành trình qua nhiều hãng.', note: 'Nền tảng của xuất vé nối chuyến liên danh, quyết toán qua hệ thống IATA như BSP.' },
      { id: 'tm_s20', term: 'Virtual Interline', vn: 'Liên danh ảo', cat: 'Commercial', def: 'Virtual Interline — Liên danh ảo: ghép hai chặng của các hãng không có thỏa thuận liên danh truyền thống thành một hành trình, nối lịch trình qua công nghệ.', note: 'Triển khai qua nền tảng NDC/aggregator — mở rộng mạng bay không cần hợp đồng interline.' }
    ];
  }

  /* ---------------- Trạng thái ---------------- */
  var flights = storage.get(KEY_FLIGHTS, null) || seedFlights();
  if (!storage.get(KEY_FLIGHTS, null)) storage.set(KEY_FLIGHTS, flights);
  var history = storage.get(KEY_HISTORY, []);
  var terms = storage.get(KEY_TERMS, null) || seedTerms();
  if (!storage.get(KEY_TERMS, null)) storage.set(KEY_TERMS, terms);
  terms = normalizeTerms(terms);

  var TAB_PANELS = ['fs-input', 'fs-inquiry', 'term-input', 'term-lookup'];
  var statusFilter = 'all';
  var termText = '';
  var termCat = 'all';
  var termAlpha = '';

  /* ---------------- Thuật ngữ: chuẩn hoá + liên quan ---------------- */
  function normalizeTerms(list) {
    var changed = false;
    (list || []).forEach(function (t, i) {
      if (!t.id) { t.id = 'tm_u' + Date.now().toString(36) + '_' + i; changed = true; }
    });
    if (changed) storage.set(KEY_TERMS, list);
    return list;
  }

  /* Nhãn Việt ngắn cho chip liên quan: ưu tiên trường vn, rồi ngoặc đơn trong tên */
  function vnOf(t) {
    if (t && t.vn) return t.vn;
    var m = String(t && t.term || '').match(/\(([^)]+)\)/);
    if (m) return m[1].trim();
    var seg = String(t && t.def || '').split('—').map(function (s) { return s.trim(); });
    if (seg.length > 1) return seg[1];
    return seg[0] || '';
  }

  var TERM_STOP = new Set('a an the of to for and or in on with by from as at is are was were be been has have had this that these those per'.split(' '));

  /* Cặp liên quan ghi chú sẵn — đảm bảo chất lượng, kèm phát hiện tự động */
  var CURATED_REL = {
    'ETA': ['ETD'], 'ETD': ['ETA'],
    'BSP': ['ARC'], 'ARC': ['BSP'],
    'ADM': ['ACM'], 'ACM': ['ADM'],
    'IATA': ['ICAO'], 'ICAO': ['IATA'],
    'Boarding': ['Gate'], 'Gate': ['Boarding', 'Tarmac'],
    'Tarmac': ['Gate'],
    'Slot': ['MCT'], 'MCT': ['Slot'],
    'Code Share': ['Interline', 'Virtual Interline', 'NDC'],
    'Interline': ['Virtual Interline', 'Code Share'],
    'Virtual Interline': ['Interline', 'Code Share'],
    'NDC': ['Code Share']
  };

  function termNameTokens(t) {
    var name = String(t.term || '').replace(/\([^)]*\)/g, ' ');
    return name.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) {
      return w.length >= 4 && !TERM_STOP.has(w);
    });
  }

  function termDefTokens(t) {
    var en = (String(t.def || '').split('—')[0] || '');
    return en.toLowerCase().split(/[^a-z]+/).filter(function (w) {
      return /^[a-z]{5,}$/.test(w) && !TERM_STOP.has(w);
    });
  }

  function relatedScore(t, o) {
    var nameT = termNameTokens(t), nameO = termNameTokens(o);
    var defT = termDefTokens(t), defO = termDefTokens(o);
    var sharedName = nameT.filter(function (w) { return nameO.indexOf(w) !== -1; });
    var sharedDef = defT.filter(function (w) { return defO.indexOf(w) !== -1; });
    var score = sharedName.length * 3 + sharedDef.length * 2 + (t.cat === o.cat ? 1 : 0);
    return { score: score, sharedName: sharedName, sharedDef: sharedDef };
  }

  function relatedOf(t, all) {
    var raw = [];
    var names = {};
    all.forEach(function (o) {
      if (o === t || names[o.term]) return;
      names[o.term] = true;
      raw.push({ term: o, auto: relatedScore(t, o) });
    });
    var curated = (CURATED_REL[t.term] || [])
      .map(function (nm) {
        var hit = null;
        all.forEach(function (o) { if (!hit && o.term === nm) hit = o; });
        return hit ? { term: hit, auto: null } : null;
      })
      .filter(Boolean);
    var merged = [];
    var seen = {};
    curated.forEach(function (r) {
      if (!seen[r.term.id]) { seen[r.term.id] = true; merged.push(r); }
    });
    raw.sort(function (a, b) { return b.auto.score - a.auto.score; }).forEach(function (r) {
      if (seen[r.term.id] || merged.length >= 3 || r.auto.score < 3) return;
      seen[r.term.id] = true;
      merged.push(r);
    });
    return merged;
  }

  /* Ghi chú giải thích vì sao "hệ thống" gợi ý liên quan */
  function relatedEvidence(t, rels) {
    var names = [], defs = [], cats = false;
    rels.forEach(function (r) {
      if (!r.auto) return;
      r.auto.sharedName.forEach(function (w) { if (names.indexOf(w) === -1) names.push(w); });
      r.auto.sharedDef.forEach(function (w) { if (defs.indexOf(w) === -1) defs.push(w); });
      if (r.term.cat === t.cat) cats = true;
    });
    var bits = [];
    if (names.length) bits.push('từ khoá chung: "' + names.join('", "') + '"');
    if (defs.length) bits.push('khái niệm chung: "' + defs.join('", "') + '"');
    if (cats) bits.push('cùng nhóm ' + t.cat);
    if (!bits.length) bits.push('nhóm chủ đề liên quan');
    return 'Hệ thống ghi chú: gợi ý dựa trên ' + bits.join(' · ');
  }

  /* ---------------- Thuật ngữ đã lưu gần đây ---------------- */
  function timeAgo(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    if (diff < 60e3) return 'vừa lưu';
    if (diff < 3600e3) return Math.floor(diff / 60e3) + ' phút trước';
    if (diff < 86400e3) return Math.floor(diff / 3600e3) + ' giờ trước';
    var d = new Date(ts);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function renderRecentTerms() {
    var box = $('#term-recent');
    if (!box) return;
    var recent = terms.slice().sort(function (a, b) {
      return (b.savedAt || 0) - (a.savedAt || 0);
    }).filter(function (t) { return t.savedAt; }).slice(0, 5);
    if (!recent.length) {
      box.innerHTML = '<p class="term-recent-empty">Chưa có thuật ngữ nào do bạn lưu. Thêm thuật ngữ ở mục <b>Thuật ngữ · Nhập</b> — các thuật ngữ lưu gần đây sẽ hiện ở đây.</p>';
      return;
    }
    box.innerHTML = recent.map(function (t) {
      return '<button class="term-recent-chip" type="button" data-term-recent="' + esc(t.term) + '">' +
        esc(t.term) + '<small>' + timeAgo(t.savedAt) + '</small></button>';
    }).join('');
  }

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

  /* ---------------- Panel 2: Thông báo khởi hành ---------------- */
  function nextBoarding() {
    var today = toISODate(new Date());
    var now = new Date().getHours() * 60 + new Date().getMinutes();
    var cand = flights.filter(function (f) {
      if (f.date !== today) return false;
      var dm = parseHHMM(f.deptTime);
      return dm != null && flightStatus(f).key !== 'landed' && dm > now;
    });
    if (!cand.length) return null;
    cand.sort(function (a, b) { return parseHHMM(a.deptTime) - parseHHMM(b.deptTime); });
    return cand[0];
  }

  function renderAnnouncement() {
    var txt = $('#fl-announce-text');
    if (!txt) return;
    var next = nextBoarding();
    if (!next) {
      txt.textContent = 'Hiện chưa có chuyến bay nào sắp khởi hành. Thêm chuyến bay ở mục Nhập liệu để nhận thông báo tại đây.';
      return;
    }
    var spots = [];
    if (next.gate && next.terminal) spots.push('cửa số ' + next.gate + ', nhà ga ' + next.terminal);
    else if (next.gate) spots.push('cửa số ' + next.gate);
    else if (next.terminal) spots.push('nhà ga ' + next.terminal);
    var where = spots.length ? ' — ra máy bay tại ' + spots.join(', ') + '.' : '.';
    txt.textContent = 'Chuyến bay ' + combinatorOf(next) + ' sắp khởi hành lúc ' + next.deptTime + where + ' Mời quý khách chuẩn bị ra máy bay.';
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

  var UPPER_FIELDS = ['fl-dept', 'fl-airline', 'fl-arr', 'fl-gate'];

  function clearFlightForm() {
    ['fl-dept', 'fl-airline', 'fl-flight', 'fl-terminal', 'fl-gate', 'fl-dept-time', 'fl-arr', 'fl-arr-time'].forEach(function (id) {
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
          '<div class="flight-foot"><span>Combinator: <b>' + esc(combinatorOf(f)) + '</b>' + (f.terminal ? ' · Ga ' + esc(f.terminal) : '') + (f.gate ? ' · Cửa ' + esc(f.gate) : '') + '</span></div>' +
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
      var rels = relatedOf(t, terms);
      var relHtml = '';
      if (rels.length) {
        relHtml = '<div class="term-related">' +
          '<p class="term-related-title"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> Có liên quan</p>' +
          '<div class="term-related-list">' +
            rels.map(function (r) {
              return '<button class="term-rel" type="button" data-term-rel="' + esc(r.term.term) + '" title="Mở thuật ngữ ' + esc(r.term.term) + '">' +
                esc(r.term.term) + '<small>' + esc(vnOf(r.term) || r.term.cat) + '</small></button>';
            }).join('') +
          '</div>' +
          '<p class="term-rel-note">' + relatedEvidence(t, rels) + '</p>' +
        '</div>';
      }
      return '<article class="term-card">' +
        '<button class="term-del" type="button" data-term-del="' + esc(t.id) + '" aria-label="Xoá thuật ngữ ' + esc(t.term) + '" title="Xoá thuật ngữ (dùng khi trùng lặp)">✕</button>' +
        '<div class="term-card-head"><h3>' + esc(t.term) + '</h3><span class="term-cat">' + esc(t.cat) + '</span></div>' +
        '<p class="term-def">' + esc(t.def) + '</p>' +
        (t.note ? '<p class="term-note"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>' + esc(t.note) + '</p>' : '') +
        relHtml +
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
    ['fl-dept', 'fl-airline', 'fl-flight', 'fl-terminal', 'fl-gate', 'fl-dept-time', 'fl-arr', 'fl-arr-time'].forEach(function (id) {
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
        gate: ($('#fl-gate').value || '').trim().toUpperCase(),
        deptTime: $('#fl-dept-time').value,
        arr: $('#fl-arr').value.trim().toUpperCase(),
        arrTime: $('#fl-arr-time').value
      };
      flights.unshift(f);
      storage.set(KEY_FLIGHTS, flights);
      clearFlightForm();
      showToast('✅ Đã lưu chuyến bay ' + combinatorOf(f));
      filterFlights();
      renderAnnouncement();
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
      renderRecentTerms();
      renderAnnouncement();
      showToast('Đã khôi phục dữ liệu mẫu.');
    });

    /* Panel 3 */
    $('#term-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = $('#term-name').value.trim();
      var def = $('#term-def').value.trim();
      if (!name) { showToast('⚠️ Nhập thuật ngữ / viết tắt.'); return; }
      if (!def) { showToast('⚠️ Nhập nghĩa tiếng Việt / định nghĩa.'); return; }
      var nv = {
        id: genId('tm'),
        term: name,
        cat: $('#term-cat').value,
        def: def,
        note: $('#term-note').value.trim(),
        savedAt: Date.now()
      };
      var m = name.match(/\(([^)]+)\)/);
      if (m) nv.vn = m[1].trim();
      terms.unshift(nv);
      storage.set(KEY_TERMS, terms);
      clearTermForm();
      showToast('✅ Đã lưu thuật ngữ "' + name + '"');
      renderTerms();
      renderRecentTerms();
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

    /* Nhấn chip liên quan -> mở thuật ngữ đó */
    $('#term-results').addEventListener('click', function (ev) {
      var rel = ev.target.closest ? ev.target.closest('[data-term-rel]') : null;
      if (rel) {
        var rt = rel.getAttribute('data-term-rel');
        if (rt) {
          termSearch.value = rt;
          termText = rt.toLowerCase();
          termCat = 'all';
          termAlpha = '';
          markPills('term-alpha', 'data-alpha', 'all');
          markPills('term-cats', 'data-termcat', 'all');
          renderTerms();
          var results = document.getElementById('term-results');
          if (results) results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
      var del = ev.target.closest ? ev.target.closest('[data-term-del]') : null;
      if (del) {
        var id = del.getAttribute('data-term-del');
        var hit = null;
        terms.forEach(function (t) { if (!hit && t.id === id) hit = t; });
        if (!hit) return;
        if (!window.confirm('Xoá thuật ngữ "' + hit.term + '" khỏi từ điển? (Dùng khi phát hiện trùng lặp/không cần nữa.)')) return;
        terms = terms.filter(function (t) { return t.id !== id; });
        storage.set(KEY_TERMS, terms);
        renderTerms();
        renderRecentTerms();
        showToast('🗑️ Đã xoá thuật ngữ "' + hit.term + '"');
      }
    });

    /* Thuật ngữ lưu gần đây -> mở ngay */
    $('#term-recent').addEventListener('click', function (ev) {
      var chip = ev.target.closest ? ev.target.closest('[data-term-recent]') : null;
      if (!chip) return;
      var nm = chip.getAttribute('data-term-recent');
      if (!nm) return;
      termSearch.value = nm;
      termText = nm.toLowerCase();
      termCat = 'all';
      termAlpha = '';
      markPills('term-alpha', 'data-alpha', 'all');
      markPills('term-cats', 'data-termcat', 'all');
      renderTerms();
      var results = document.getElementById('term-results');
      if (results) results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    buildFilterUI();
    refreshMath();
    renderFlights(flights);
    renderHistory();
    renderTerms();
    renderRecentTerms();
    renderAnnouncement();
    setInterval(renderAnnouncement, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();