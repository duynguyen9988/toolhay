/* ============================================================
   Sổ Chi Tiêu — Link Hay: nhập liệu link + tự đọc meta description
   Lưu trữ: localStorage (linkhay.user) — riêng tư trên thiết bị.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'linkhay.user';

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

  var links = storage.get(KEY, []);

  function pad(n) { return String(n).padStart(2, '0'); }
  function todayStr() {
    var d = new Date();
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function genId() { return 'lh_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function domainOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function normalizeUrl(raw) {
    var u = String(raw || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try {
      var p = new URL(u);
      if (p.hostname.indexOf('.') === -1) return '';
      return p.href;
    } catch (e) { return ''; }
  }

  function decodeEntities(s) {
    var map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#160': ' ' };
    return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);?/gi, function (m, body) {
      var key = body.toLowerCase();
      if (map[key] !== undefined) return map[key];
      if (/^#x[0-9a-f]+$/i.test(body)) { var n = parseInt(body.slice(2), 16); return isFinite(n) ? String.fromCodePoint(n) : m; }
      if (/^#[0-9]+$/.test(body)) { var n2 = parseInt(body.slice(1), 10); return isFinite(n2) ? String.fromCodePoint(n2) : m; }
      return m;
    });
  }

  /* Trích xuất title + meta description từ HTML (regex — chạy được mọi nơi) */
  function extractMeta(html) {
    var desc = '';
    var title = '';
    var ogTitle = '';
    var re = /<meta[^>]*>/gi;
    var m;
    while ((m = re.exec(html))) {
      var tag = m[0];
      var nameM = /(?:name|property|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag);
      var contentM = /content\s*=\s*["']([^"']*)["']/i.exec(tag);
      if (!nameM || !contentM) continue;
      var key = nameM[1].toLowerCase();
      var content = decodeEntities(contentM[1]).trim();
      if (!content) continue;
      if (key === 'description' || key === 'og:description' || key === 'twitter:description') {
        if (!desc) desc = content;
      }
      if (key === 'og:title' || key === 'twitter:title') {
        if (!ogTitle) ogTitle = content;
      }
    }
    var t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (t) title = decodeEntities(t[1]).trim();
    return { title: title || ogTitle, description: desc };
  }

  /* Fetch qua CORS proxy rồi đọc meta — thử trực tiếp trước, song song proxy */
  var PROXIES = [
    'https://api.allorigins.win/get?url=',
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  function unwrap(text) {
    var html = text;
    try { var parsed = JSON.parse(text); if (parsed && typeof parsed.contents === 'string') html = parsed.contents; }
    catch (e) { /* đã là HTML thô */ }
    if (!html || html.length < 100) throw new Error('too-short');
    return html;
  }

  function fetchMeta(rawUrl) {
    var url = normalizeUrl(rawUrl);
    if (!url) return Promise.reject(new Error('bad-url'));
    var attempts = [];
    attempts.push(fetch(url, { signal: AbortSignal.timeout(8000) })
      .then(function (res) { if (!res.ok) throw new Error('http-' + res.status); return res.text(); })
      .then(unwrap));
    PROXIES.forEach(function (proxy) {
      attempts.push(fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(12000) })
        .then(function (res) { if (!res.ok) throw new Error('http-' + res.status); return res.text(); })
        .then(unwrap));
    });
    return Promise.any(attempts).then(function (html) {
      var meta = extractMeta(html);
      if (!meta.title && !meta.description) throw new Error('no-meta');
      return meta;
    });
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
    showToast._t = setTimeout(function () { toastEl.classList.remove('is-show'); }, 3000);
  }

  /* ---------------- Tabs ---------------- */
  function switchTab(name) {
    $$('[data-linktab]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-linktab') === name);
    });
    $$('[data-linkpanel]').forEach(function (p) {
      var on = p.getAttribute('data-linkpanel') === name;
      p.classList.toggle('is-active', on);
      if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
    });
  }

  /* ---------------- Nhập liệu ---------------- */
  function setFetching(on) {
    var b = $('#lk-fetch');
    if (!b) return;
    b.textContent = on ? '⏳ Đang đọc…' : '🔎 Đọc lại thông tin';
    b.disabled = on;
  }

  function autoFetch(force) {
    var urlInput = $('#lk-url');
    var raw = urlInput ? urlInput.value : '';
    var url = normalizeUrl(raw);
    if (!url) { showToast('⚠️ Hãy dán URL hợp lệ trước.'); return; }
    if ($('#lk-domain')) $('#lk-domain').value = domainOf(url);
    setFetching(true);
    fetchMeta(raw).then(function (meta) {
      var t = $('#lk-title'), d = $('#lk-desc');
      if ((force || !t.value.trim()) && meta.title && t) t.value = meta.title;
      if ((force || !d.value.trim()) && meta.description && d) d.value = meta.description;
      showToast('✓ Đã đọc tiêu đề & mô tả từ ' + domainOf(url));
    }).catch(function () {
      showToast('⚠️ Không đọc được meta của link này (trang có thể chặn proxy) — vui lòng nhập tay.');
    }).then(function () { setFetching(false); });
  }

  function clearForm() {
    var form = $('#link-form');
    if (form) form.reset();
    if ($('#lk-domain')) $('#lk-domain').value = '';
    setFetching(false);
  }

  /* ---------------- Render link của người dùng ---------------- */
  function renderUserLinks() {
    var box = $('#user-links');
    if (!box) return;
    if (!links.length) { box.innerHTML = ''; return; }
    var html = '<div class="user-links-head"><span><strong>' + links.length + '</strong> link tự thêm</span>' +
      '<button class="button button-text" type="button" id="user-links-clear">Xoá toàn bộ</button></div>';
    links.forEach(function (l) {
      html += '<article class="link-card link-card--user">' +
        '<a class="link-card-inner" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="link-card-domain">🔗 ' + esc(l.domain) + '</span>' +
          '<h2>' + esc(l.title) + '</h2>' +
          '<p class="link-card-note">' + esc(l.note || '') + '</p>' +
          '<div class="link-card-meta">' +
            '<span class="meta-item"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><time>' + esc(l.date) + '</time></span>' +
            (l.tags && l.tags.length ? l.tags.map(function (t) { return '<span class="link-card-tag">#' + esc(t) + '</span>'; }).join('') : '') +
            '<span class="link-card-arrow" aria-hidden="true"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></span>' +
          '</div>' +
        '</a>' +
        '<button class="link-card-del" type="button" data-del="' + esc(l.id) + '" aria-label="Xoá link này">✕</button>' +
      '</article>';
    });
    box.innerHTML = html;
  }

  /* ---------------- Khởi động ---------------- */
  function init() {
    if (!document.getElementById('link-form')) return;

    $$('[data-linktab]').forEach(function (b) {
      b.addEventListener('click', function () {
        switchTab(b.getAttribute('data-linktab'));
        if (b.getAttribute('data-linktab') === 'input') $('#lk-url') && $('#lk-url').focus();
      });
    });

    var urlInput = $('#lk-url');
    urlInput.addEventListener('paste', function () {
      setTimeout(function () { autoFetch(false); }, 80);
    });
    urlInput.addEventListener('change', function () {
      if (normalizeUrl(urlInput.value)) autoFetch(false);
    });
    $('#lk-fetch').addEventListener('click', function () { autoFetch(true); });

    $('#link-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var url = normalizeUrl($('#lk-url').value);
      if (!url) { showToast('⚠️ URL không hợp lệ.'); return; }
      var title = $('#lk-title').value.trim() || domainOf(url);
      var note = $('#lk-desc').value.trim();
      if (!note) { showToast('⚠️ Nhập mô tả / ghi chú cho link.'); return; }
      var tags = $('#lk-tags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 8);
      links.unshift({
        id: genId(),
        url: url,
        title: title,
        note: note,
        domain: domainOf(url),
        tags: tags,
        date: todayStr()
      });
      storage.set(KEY, links);
      clearForm();
      renderUserLinks();
      switchTab('list');
      showToast('✅ Đã lưu "' + title + '" vào Link Hay');
    });

    var box = $('#user-links');
    box.addEventListener('click', function (ev) {
      var target = ev.target;
      if (target.id === 'user-links-clear') {
        if (!window.confirm('Xoá toàn bộ link tự thêm của bạn?')) return;
        links = [];
        storage.set(KEY, links);
        renderUserLinks();
        showToast('Đã xoá toàn bộ link tự thêm.');
        return;
      }
      var btn = target.closest ? target.closest('[data-del]') : null;
      if (!btn) return;
      var id = btn.getAttribute('data-del');
      if (!window.confirm('Xoá link này khỏi Link Hay?')) return;
      var title = (btn.parentElement && btn.parentElement.querySelector('h2')) ? btn.parentElement.querySelector('h2').textContent : '';
      links = links.filter(function (l) { return l.id !== id; });
      storage.set(KEY, links);
      renderUserLinks();
      showToast('Đã xoá "' + (title || 'link') + '"');
    });

    renderUserLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();