/* ═══════════════════════════════════════════════════════════
   运营日历 —— 周视图（站点 × 日期矩阵）

   横轴：当前周的 7 天（周一起）
   纵轴：站点（可筛选，选择持久化到 localStorage）

   每个单元格展示该站点当天的：
     · 是否运营 / 未运营原因
     · 是否有生产
     · 运营时长（h）与自动上料总数

   数据源与「运营记录列表」完全一致：
     store     —— 运营记录（index.html 加载时按 !noOp 过滤）
     noOpStore —— 未运营记录（noOp === true）
   两者同存 data.json。本文件只读不写；增删改一律复用列表页的弹窗。
   ═══════════════════════════════════════════════════════════ */

// ── 站点色（行首圆点） ──
var SITE_COLOR_MAP = {
  '104': '#4A90D9',
  '嘉兴': '#F5A623',
  '宜涪': '#7ED321',
  '长赣': '#BD10E0',
  '舟山电厂': '#50E3C2',
  '兴发': '#E94B3C',
  '兴发盐库': '#E94B3C',
  '知行良知': '#F8E71C',
  '甘肃路桥': '#9013FE',
  '波然': '#00BCD4'
};
var SITE_FALLBACK_COLORS = ['#4A90D9','#F5A623','#7ED321','#BD10E0','#50E3C2','#E94B3C','#F8E71C','#9013FE','#00BCD4','#FF6B9D'];

function getSiteColor(name) {
  if (SITE_COLOR_MAP[name]) return SITE_COLOR_MAP[name];
  var s = String(name), hash = 0;
  for (var i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return SITE_FALLBACK_COLORS[Math.abs(hash) % SITE_FALLBACK_COLORS.length];
}

// ── 状态 ──
var WK_FILTER_LS_KEY = 'wkHiddenStations_v1';
var WK_WEEKDAY_NAMES = ['周一','周二','周三','周四','周五','周六','周日'];

// monday：当前显示周的周一
var wkState = { monday: null };
// 被隐藏的站点名（存「隐藏」而非「显示」，这样后续新增的站点默认可见）
var wkHidden = wkLoadHidden();

// ── 日期工具 ──
function wkYmd(d) {
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

// 取 d 所在周的周一（周一起算，周日归到上一周）
function wkMondayOf(d) {
  var m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var dow = m.getDay();               // 0=周日 … 6=周六
  m.setDate(m.getDate() - (dow === 0 ? 6 : dow - 1));
  return m;
}

function wkAddDays(d, n) {
  var r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

// 当前周的 7 天
function wkDays() {
  var out = [];
  for (var i = 0; i < 7; i++) out.push(wkAddDays(wkState.monday, i));
  return out;
}

// ISO 周序号（周一起），用于标题「第 N 周」
function wkIsoWeekNo(d) {
  var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 4 - (t.getDay() || 7));
  var yearStart = new Date(t.getFullYear(), 0, 1);
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}

// ── 站点筛选持久化 ──
function wkLoadHidden() {
  try {
    var arr = JSON.parse(localStorage.getItem(WK_FILTER_LS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function wkSaveHidden() {
  try { localStorage.setItem(WK_FILTER_LS_KEY, JSON.stringify(wkHidden)); } catch (e) {}
}

// 全部站点 = 站点管理中的站点 ∪ 数据中出现过的站点
// 取并集：站点管理里删掉的站点，其历史数据仍然要能看到
function wkAllStations() {
  var out = [], seen = {};
  function push(n) {
    if (!n || seen[n]) return;
    seen[n] = 1;
    out.push(n);
  }
  if (typeof stationsStore !== 'undefined' && stationsStore) {
    stationsStore.forEach(function (s) { push(s.name); });
  }
  var extra = [];
  function collect(list) {
    if (!list) return;
    list.forEach(function (r) { if (r.station && !seen[r.station] && extra.indexOf(r.station) === -1) extra.push(r.station); });
  }
  collect(typeof store !== 'undefined' ? store : null);
  collect(typeof noOpStore !== 'undefined' ? noOpStore : null);
  extra.sort(function (a, b) { return String(a).localeCompare(String(b), 'zh'); });
  extra.forEach(push);
  return out;
}

function wkVisibleStations() {
  return wkAllStations().filter(function (n) { return wkHidden.indexOf(n) === -1; });
}

// ── 单元格数据 ──
// 返回 { type: 'prod' | 'noprod' | 'noop' | 'empty', ... }
// 运营时长复用 index.html 的 calc()，不在这里重复实现分钟→小时换算
function wkCellData(station, dateStr) {
  if (typeof store !== 'undefined' && store) {
    for (var i = 0; i < store.length; i++) {
      var op = store[i];
      if (op.station === station && op.date === dateStr) {
        var hasProd = (+op.autoProdFeed || 0) + (+op.manualFeed || 0) > 0;
        var m = (typeof calc === 'function') ? calc(op) : { opHours: null };
        return {
          type: hasProd ? 'prod' : 'noprod',
          hours: m.opHours,
          feed: +op.autoFeedTotal || 0,
          id: op.id
        };
      }
    }
  }
  if (typeof noOpStore !== 'undefined' && noOpStore) {
    for (var j = 0; j < noOpStore.length; j++) {
      var no = noOpStore[j];
      if (no.station === station && no.date === dateStr) {
        return { type: 'noop', reason: no.noOpReason || '', id: no.id };
      }
    }
  }
  return { type: 'empty' };
}

// ── 渲染 ──
function wkEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 供 onclick 内联属性使用（先转义 HTML，再转义单引号）
function wkEscJs(s) {
  return wkEsc(s).replace(/'/g, '&#39;');
}

function wkRender() {
  var wrap = document.getElementById('wkGridWrap');
  if (!wrap) return;
  if (!wkState.monday) wkState.monday = wkMondayOf(new Date());

  var days = wkDays();
  var todayStr = wkYmd(new Date());
  var stations = wkVisibleStations();

  wkRenderToolbar(days);

  if (!stations.length) {
    wrap.innerHTML = '<div class="wk-empty">没有可显示的站点 —— 请在上方「站点」中勾选</div>';
    return;
  }

  var h = '<table class="wk-table"><thead><tr><th class="wk-th-station">站点</th>';
  days.forEach(function (d) {
    var isToday = wkYmd(d) === todayStr;
    h += '<th class="wk-th-day' + (isToday ? ' wk-today' : '') + '">' +
           '<span class="wk-th-dow">' + WK_WEEKDAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1] + '</span>' +
           '<span class="wk-th-date">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span>' +
         '</th>';
  });
  h += '</tr></thead><tbody>';

  stations.forEach(function (st) {
    h += '<tr><th class="wk-td-station" title="' + wkEsc(st) + '">' +
           '<span class="wk-dot" style="background:' + getSiteColor(st) + '"></span>' +
           '<span class="wk-station-name">' + wkEsc(st) + '</span>' +
         '</th>';
    days.forEach(function (d) {
      var ds = wkYmd(d);
      var c = wkCellData(st, ds);
      var todayCls = ds === todayStr ? ' wk-today' : '';
      if (c.type === 'noop') {
        h += '<td class="wk-cell wk-noop' + todayCls + '" title="未运营：' + wkEsc(c.reason || '未填写原因') +
               '" onclick="wkOpenRecord(' + c.id + ')">' +
               '<div class="wk-cell-inner">' +
                 '<span class="wk-st-badge wk-badge-noop">未运营</span>' +
                 '<div class="wk-data"><div class="wk-reason">' + wkEsc(c.reason || '未运营') + '</div></div>' +
               '</div>' +
             '</td>';
      } else if (c.type === 'empty') {
        h += '<td class="wk-cell wk-blank' + todayCls + '" title="无记录，点击新增" ' +
               'onclick="wkAddRecord(\'' + wkEscJs(st) + '\',\'' + ds + '\')">' +
               '<div class="wk-dash">—</div>' +
             '</td>';
      } else {
        var hours = (c.hours !== null && c.hours !== undefined) ? c.hours.toFixed(1) + 'h' : '—';
        var cls = c.type === 'prod' ? 'wk-prod' : 'wk-noprod';
        var label = c.type === 'prod' ? '有生产' : '无生产';
        var badge = c.type === 'prod' ? 'wk-badge-prod' : 'wk-badge-noprod';
        var tip = label + ' · 运营时长 ' + hours + ' · 自动上料 ' + c.feed;
        h += '<td class="wk-cell ' + cls + todayCls + '" title="' + wkEsc(tip) +
               '" onclick="wkOpenRecord(' + c.id + ')">' +
               '<div class="wk-cell-inner">' +
                 '<span class="wk-st-badge ' + badge + '">' + label + '</span>' +
                 '<div class="wk-data">' +
                   '<div class="wk-hours">' + hours + '</div>' +
                   '<div class="wk-feed">' + c.feed + '</div>' +
                 '</div>' +
               '</div>' +
             '</td>';
      }
    });
    h += '</tr>';
  });

  wrap.innerHTML = h + '</tbody></table>';
}

function wkRenderToolbar(days) {
  var first = days[0], last = days[6];
  var pad = function (n) { return String(n).padStart(2, '0'); };

  var titleEl = document.getElementById('wkTitle');
  if (titleEl) {
    var t = first.getFullYear() + '年' + (first.getMonth() + 1) + '月';
    // 跨月 / 跨年时把两头都标出来
    if (first.getFullYear() !== last.getFullYear()) {
      t += ' - ' + last.getFullYear() + '年' + (last.getMonth() + 1) + '月';
    } else if (first.getMonth() !== last.getMonth()) {
      t += '-' + (last.getMonth() + 1) + '月';
    }
    titleEl.textContent = t + ' · 第' + wkIsoWeekNo(first) + '周';
  }

  var rangeEl = document.getElementById('wkRange');
  if (rangeEl) {
    rangeEl.textContent = pad(first.getMonth() + 1) + '/' + pad(first.getDate()) + ' - ' +
                          pad(last.getMonth() + 1) + '/' + pad(last.getDate());
  }

  var cntEl = document.getElementById('wkFilterCount');
  if (cntEl) cntEl.textContent = wkVisibleStations().length + '/' + wkAllStations().length;
}

// ── 站点筛选下拉 ──
function wkToggleFilter() {
  var panel = document.getElementById('wkFilterPanel');
  if (!panel) return;
  if (panel.style.display === 'none' || !panel.style.display) {
    wkRenderFilterList();
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

function wkRenderFilterList() {
  var list = document.getElementById('wkFilterList');
  if (!list) return;
  var all = wkAllStations();
  if (!all.length) {
    list.innerHTML = '<div class="wk-filter-empty">暂无站点</div>';
    return;
  }
  list.innerHTML = all.map(function (n) {
    var checked = wkHidden.indexOf(n) === -1 ? ' checked' : '';
    return '<label class="wk-filter-item">' +
             '<input type="checkbox"' + checked +
               ' onchange="wkToggleStation(\'' + wkEscJs(n) + '\', this.checked)">' +
             '<span class="wk-dot" style="background:' + getSiteColor(n) + '"></span>' +
             '<span class="wk-filter-name">' + wkEsc(n) + '</span>' +
           '</label>';
  }).join('');
}

function wkToggleStation(name, visible) {
  var i = wkHidden.indexOf(name);
  if (visible && i !== -1) wkHidden.splice(i, 1);
  if (!visible && i === -1) wkHidden.push(name);
  wkSaveHidden();
  wkRender();
}

function wkFilterAll(visible) {
  wkHidden = visible ? [] : wkAllStations().slice();
  wkSaveHidden();
  wkRenderFilterList();
  wkRender();
}

// ── 周切换 ──
function wkPrevWeek() { wkState.monday = wkAddDays(wkState.monday, -7); wkRender(); }
function wkNextWeek() { wkState.monday = wkAddDays(wkState.monday,  7); wkRender(); }
function wkGoToday()  { wkState.monday = wkMondayOf(new Date());        wkRender(); }

// ── 单元格交互（复用列表页的详情 / 新增弹窗） ──
function wkOpenRecord(id) {
  if (typeof showDetailById === 'function') showDetailById(id);
}

function wkAddRecord(station, dateStr) {
  if (typeof openAdd === 'function') openAdd({ station: station, date: dateStr });
}

// ── 可见性：只有日历视图在前台时才响应键盘 / 滚轮 ──
function wkIsVisible() {
  var v = document.getElementById('entryCalendarView');
  if (!v || v.style.display === 'none') return false;
  var page = document.getElementById('pageEntry');
  if (page && page.style.display === 'none') return false;
  return true;
}

// 键盘 ← → 切换周
document.addEventListener('keydown', function (e) {
  if (!wkIsVisible()) return;
  var t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  if (e.key === 'ArrowLeft')  { wkPrevWeek(); e.preventDefault(); }
  if (e.key === 'ArrowRight') { wkNextWeek(); e.preventDefault(); }
});

// 滚轮切换周（节流，避免触控板一次滑动跳好几周）
var wkWheelLock = 0;
document.addEventListener('wheel', function (e) {
  if (!wkIsVisible()) return;
  var wrap = document.getElementById('wkGridWrap');
  if (!wrap || !wrap.contains(e.target)) return;
  // 表格自身还能纵向滚动时，先让它滚，滚到边界才翻周
  if (wrap.scrollHeight > wrap.clientHeight + 1) {
    var atTop = wrap.scrollTop <= 0;
    var atBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 1;
    if (!(e.deltaY < 0 && atTop) && !(e.deltaY > 0 && atBottom)) return;
  }
  var now = new Date().getTime();
  if (now - wkWheelLock < 220) { e.preventDefault(); return; }
  wkWheelLock = now;
  if (e.deltaY < 0) wkPrevWeek(); else wkNextWeek();
  e.preventDefault();
}, { passive: false });

// 点击空白处收起站点筛选面板
document.addEventListener('click', function (e) {
  var panel = document.getElementById('wkFilterPanel');
  if (!panel || panel.style.display === 'none') return;
  if (!(e.target.closest && e.target.closest('.wk-filter'))) panel.style.display = 'none';
});

// ── 初始化：由 index.html 的 switchEntryView 首次切到日历视图时调用 ──
function initWeekCalendar() {
  wkState.monday = wkMondayOf(new Date());
  wkRender();
}
