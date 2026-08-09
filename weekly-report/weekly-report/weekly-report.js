/* weekly-report.js — 运营周报功能（从 index.html 外移，纯机械搬移，不改逻辑）
   依赖 index.html 的全局: store/stationsStore/weeklyReports/ReportsAPI/computeKPIs/
   pct/fnum/escHtml/escJs/switchPage/closeOv/STAGE_LABELS/getWeekNumber/pgRange/html2canvas 等 */


// ── 梯度指标 ──
// ── 梯度指标（数据梯度目标档位）──
// 默认档位写在代码里（随工作空间上传）；用户可在弹窗手动编辑，编辑结果暂存 localStorage（不入 PVC，后续再优化持久化）。
const TIER_MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const TIER_ROWS_DEFAULT = [
  { group:'规模指标', name:'站点运营时长目标(h)', unit:'',  values:[500,100,640,680,780,880,772.2,850,2500,1080,1180,1280] },
  { group:'规模指标', name:'站点上料任务数目标',   unit:'',  values:[5000,500,6600,7000,8000,9000,7531,7990,25000,11000,12000,13000] },
  { group:'效果指标', name:'AI时长接管率(上料)',   unit:'%', values:[80,82,84,86,88,90,85,85,85,94,95,95] },
  { group:'效果指标', name:'任务成功率(上料)',     unit:'%', values:[90,91,92,93,94,95,97.5,95,95,96,96,96] },
  { group:'效果指标', name:'异常任务远程恢复率',   unit:'%', values:[50,55,60,65,70,75,55,58,82,85,85,85] },
  { group:'效果指标', name:'人效比',               unit:'%', values:[45,50,55,60,65,70,66.5,67.5,80,90,95,100] },
  { group:'生产指标', name:'生产任务接管率(上料)', unit:'%', values:[80,82,84,86,88,90,83.5,84.5,92,94,95,95] },
  { group:'生产指标', name:'生产时长覆盖率',       unit:'%', values:[90,90,90,90,90,90,96.5,92.5,90,90,90,90] },
  { group:'生产指标', name:'自动化生产方量覆盖率', unit:'%', values:[70,72,74,76,78,80,81,82,83,84,85,85] },
];

// ── 分站点默认目标（2026-08-03 用户提供，随代码上传）──
// 每站每指标 [7月(基线), 8月, 9月]；其余月份列沿用全站默认表同列。
// 7月列为爬坡起点（基线），8月从7月列起爬，9月起纯目标链（上月列→本月列）。
const STATION_TGT = {
  '104':     { '站点运营时长目标(h)':[150.5,150,160], '站点上料任务数目标':[2042,2050,2100], 'AI时长接管率(上料)':[90.48,91,92], '生产任务接管率(上料)':[79.90,81,82], '任务成功率(上料)':[96.78,96,96], '异常任务远程恢复率':[64.62,66,67], '生产时长覆盖率':[85.20,90,90], '自动化生产方量覆盖率':[68.07,70,72], '人效比':[94.96,95,96] },
  '嘉兴':    { '站点运营时长目标(h)':[213.4,170,180], '站点上料任务数目标':[1774,1800,1850], 'AI时长接管率(上料)':[78.80,82,84], '生产任务接管率(上料)':[84.01,85,86], '任务成功率(上料)':[98.45,96,96], '异常任务远程恢复率':[73.08,75,76], '生产时长覆盖率':[99.89,93,95], '自动化生产方量覆盖率':[83.92,85,86], '人效比':[77.02,78,79] },
  '兴发':    { '站点运营时长目标(h)':[257.8,260,265], '站点上料任务数目标':[2183,2100,2150], 'AI时长接管率(上料)':[87.42,88,89], '生产任务接管率(上料)':[90.77,91,92], '任务成功率(上料)':[97.23,96,96], '异常任务远程恢复率':[42.11,46,50], '生产时长覆盖率':[99.58,93,95], '自动化生产方量覆盖率':[90.40,90,90], '人效比':[42.33,44,46] },
  '甘肃路桥': { '站点运营时长目标(h)':[10.7,130,140], '站点上料任务数目标':[6,540,600], 'AI时长接管率(上料)':[88.50,90,91], '生产任务接管率(上料)':[69.38,71,73], '任务成功率(上料)':[79.65,82,84], '异常任务远程恢复率':[87.68,88,88], '生产时长覆盖率':[50.73,90,90], '自动化生产方量覆盖率':[35.20,40,45], '人效比':[66.93,68,69] },
  '波然':    { '站点运营时长目标(h)':[139.8,140,150], '站点上料任务数目标':[1526,1500,1550], 'AI时长接管率(上料)':[84.29,85,86], '生产任务接管率(上料)':[77.93,79,80], '任务成功率(上料)':[97.87,96,96], '异常任务远程恢复率':[40.00,45,50], '生产时长覆盖率':[100.00,93,95], '自动化生产方量覆盖率':[77.93,79,80], '人效比':[64.28,66,68] },
};
// 展开为 12 个月完整表（7/8/9 月列用上表，其余月份取全站默认）
const STATION_TIER_DEFAULTS = {};
for (const [st, tgt] of Object.entries(STATION_TGT)) {
  const m = {};
  for (const row of TIER_ROWS_DEFAULT) {
    const arr = row.values.slice();
    const t = tgt[row.name];
    if (t) { arr[6] = t[0]; arr[7] = t[1]; arr[8] = t[2]; }
    m[row.name] = arr;
  }
  STATION_TIER_DEFAULTS[st] = m;
}

// ── 梯度表持久化：服务器 PVC（tiers.json）──
// 读取优先级：服务器 →（一次性迁移）localStorage → 代码默认。保存写服务器，失败回退 localStorage。
let serverTiers = null;   // { global: {...}, byStation: {...} }，null = 未加载

function getLsGlobalTierMap() {
  try { return JSON.parse(localStorage.getItem('metricTiers') || 'null') || {}; }
  catch (e) { return {}; }
}

function getGlobalTierMap() {
  if (serverTiers && serverTiers.global) return serverTiers.global;
  return getLsGlobalTierMap();   // 服务器未加载/无数据时回退
}

// ── 分站点梯度：各站首次保存前沿用全站表（默认填充全站） ──
const TIER_STATION_LS_KEY = 'metricTiersByStation';
let tierCurrentStation = '';   // '' = 全站（默认表）
let tierDirty = false;         // 当前表格有未保存修改

function getLsStationTierStore() {
  try { return JSON.parse(localStorage.getItem(TIER_STATION_LS_KEY) || 'null') || {}; }
  catch (e) { return {}; }
}

function getStationTierStore() {
  if (serverTiers && serverTiers.byStation) return serverTiers.byStation;
  return getLsStationTierStore();
}

// 启动即加载服务器梯度表；localStorage 有值且服务器为空时一次性迁移上去
const tiersReady = (async () => {
  try {
    const r = await fetch('/api/tiers');
    if (r.ok) serverTiers = await r.json();
  } catch (e) { serverTiers = null; }
  if (!serverTiers || typeof serverTiers !== 'object' || Array.isArray(serverTiers)) serverTiers = {};
  const lsG = getLsGlobalTierMap(), lsS = getLsStationTierStore();
  const serverEmpty = !serverTiers.global && !serverTiers.byStation;
  if (serverEmpty && (Object.keys(lsG).length || Object.keys(lsS).length)) {
    if (Object.keys(lsG).length) serverTiers.global = lsG;
    if (Object.keys(lsS).length) serverTiers.byStation = lsS;
    try {
      const pr = await fetch('/api/tiers', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(serverTiers),
      });
      if (pr.ok) {
        localStorage.removeItem('metricTiers');
        localStorage.removeItem(TIER_STATION_LS_KEY);
        console.log('梯度指标已从 localStorage 迁移到服务器 tiers.json');
      }
    } catch (e) { console.warn('梯度指标迁移失败，暂用本地值', e); }
  }
})();

// 当前选中站点的档位 map：localStorage 独立表 → 代码预置默认表 → 全站表
function getCurrentTierMap() {
  if (!tierCurrentStation) return getGlobalTierMap();
  const store = getStationTierStore();
  return store[tierCurrentStation] || STATION_TIER_DEFAULTS[tierCurrentStation] || getGlobalTierMap();
}

function getTierRows() {
  const saved = getCurrentTierMap();
  return TIER_ROWS_DEFAULT.map(r => ({
    group: r.group, name: r.name, unit: r.unit,
    values: (saved && Array.isArray(saved[r.name]) && saved[r.name].length === TIER_MONTHS.length)
      ? saved[r.name].slice() : r.values.slice()
  }));
}

function switchTierStation(st) {
  if (tierDirty && !confirm('当前修改尚未保存，切换站点后将丢失。继续切换？')) {
    const sel = document.getElementById('tierStationSel');
    if (sel) sel.value = tierCurrentStation;
    return;
  }
  tierCurrentStation = st;
  tierDirty = false;
  renderTierTable();
}

async function openTiers() {
  await tiersReady;
  const sel = document.getElementById('tierStationSel');
  if (sel) {
    const names = (stationsStore || []).map(s => s.name);
    sel.innerHTML = '<option value="">全站（默认）</option>' +
      names.map(n => `<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');
    sel.value = tierCurrentStation;
  }
  renderTierTable();
  document.getElementById('ovTiers').classList.add('show');
}

function renderTierTable() {
  const rows = getTierRows();
  const groups = {};
  rows.forEach((r,i) => { (groups[r.group] = groups[r.group] || []).push(i); });
  let html = '<thead><tr><th>类型</th><th>指标分类</th><th>指标</th>' +
    TIER_MONTHS.map(m => `<th>${m}</th>`).join('') + '</tr></thead><tbody>';
  let firstRow = true;
  Object.keys(groups).forEach(g => {
    const idxs = groups[g];
    idxs.forEach((ri, gi) => {
      const r = rows[ri];
      html += '<tr>';
      if (firstRow) { html += `<td class="tier-type" rowspan="${rows.length}">目标</td>`; firstRow = false; }
      if (gi === 0) html += `<td class="tier-group" rowspan="${idxs.length}">${g}</td>`;
      html += `<td class="tier-name">${escHtml(r.name)}</td>`;
      r.values.forEach((v,ci) => {
        html += `<td><input type="number" class="tier-in" data-row="${ri}" data-col="${ci}" value="${v}">${r.unit==='%'?'<span class="tier-u">%</span>':''}</td>`;
      });
      html += '</tr>';
    });
  });
  html += '</tbody>';
  document.getElementById('tierTable').innerHTML = html;
  // 站点状态提示
  const hint = document.getElementById('tierStationHint');
  if (hint) {
    if (!tierCurrentStation) {
      hint.textContent = '全站默认表：未单独设置的站点沿用此表';
    } else {
      const hasCustom = !!getStationTierStore()[tierCurrentStation];
      const hasDefault = !!STATION_TIER_DEFAULTS[tierCurrentStation];
      hint.textContent = hasCustom
        ? `「${tierCurrentStation}」已有独立档位`
        : hasDefault
          ? `「${tierCurrentStation}」使用预置默认目标（编辑保存后成为独立档位）`
          : `「${tierCurrentStation}」未单独设置，当前显示全站表，保存后成为该站独立档位`;
    }
  }
  // 未保存修改标记（切换站点时提示）
  tierDirty = false;
  document.querySelectorAll('#tierTable .tier-in').forEach(inp => {
    inp.addEventListener('input', () => { tierDirty = true; });
  });
}

async function saveTiers() {
  await tiersReady;
  const rows = getTierRows();
  const map = {};
  rows.forEach(r => { map[r.name] = r.values.slice(); });
  document.querySelectorAll('#tierTable .tier-in').forEach(inp => {
    const ri = +inp.dataset.row, ci = +inp.dataset.col;
    map[rows[ri].name][ci] = inp.value === '' ? 0 : +inp.value;
  });
  if (!serverTiers || typeof serverTiers !== 'object') serverTiers = {};
  const label = tierCurrentStation ? `「${tierCurrentStation}」` : '全站';
  if (!tierCurrentStation) {
    serverTiers.global = map;
  } else {
    if (!serverTiers.byStation) serverTiers.byStation = {};
    serverTiers.byStation[tierCurrentStation] = map;
  }
  try {
    const r = await fetch('/api/tiers', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(serverTiers),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    alert(`✅ ${label}梯度指标已保存到服务器`);
  } catch (e) {
    // 服务器不可用时回退 localStorage（离线/异常兜底）
    if (!tierCurrentStation) {
      localStorage.setItem('metricTiers', JSON.stringify(map));
    } else {
      const s = getLsStationTierStore();
      s[tierCurrentStation] = map;
      localStorage.setItem(TIER_STATION_LS_KEY, JSON.stringify(s));
    }
    alert(`⚠️ 服务器保存失败，${label}梯度指标已暂存本地`);
  }
  tierDirty = false;
  closeOv('ovTiers');
}

// 取某指标的 12 个月档位值；st 优先 localStorage 独立表，其次代码预置默认表
function getTierValues(tierName, st) {
  let saved = getGlobalTierMap();
  if (st) {
    const store = getStationTierStore();
    if (store[st]) saved = store[st];
    else if (STATION_TIER_DEFAULTS[st]) saved = STATION_TIER_DEFAULTS[st];
  }
  const def = TIER_ROWS_DEFAULT.find(r => r.name === tierName);
  if (!def) return [];
  if (saved && Array.isArray(saved[tierName]) && saved[tierName].length === TIER_MONTHS.length)
    return saved[tierName].slice();
  return def.values.slice();
}


// ── 回滚算目标 ──
// ── 自动设定本周目标（回滚上一周数据，应用档位规则）──
const TARGET_FIELDS = [
  { key:'opHours',  isRate:false, tierName:'站点运营时长目标(h)' },
  { key:'autoFeed', isRate:false, tierName:'站点上料任务数目标' },
  { key:'aiRate',   isRate:true,  tierName:'AI时长接管率(上料)' },
  { key:'prodRate', isRate:true,  tierName:'生产任务接管率(上料)' },
  { key:'succRate', isRate:true,  tierName:'任务成功率(上料)' },
  { key:'abnRec',   isRate:true,  tierName:'异常任务远程恢复率' },
  { key:'prodCov',  isRate:true,  tierName:'生产时长覆盖率' },
  { key:'autoVolCov',isRate:true, tierName:'自动化生产方量覆盖率' },
  { key:'effRatio', isRate:true,  tierName:'人效比' },
];

function shiftDate(d, days) {
  const dt = new Date(d + 'T12:00:00');
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

function isWeekRange(s, e) {
  if (!s || !e) return false;
  const sd = new Date(s + 'T12:00:00');
  const ed = new Date(e + 'T12:00:00');
  if (ed < sd) return false;
  const diff = Math.round((ed - sd) / 86400000);
  return diff === 6 && sd.getDay() === 1;  // 周一~周日，跨7天
}

// ── 通用回滚计算：给定一周的日期范围和站点列表，返回各站目标 { st: { key: displayValue } } ──
// displayValue: 比率已是 %（如 84），规模为原始数值（如 45）
// ── 线性递进算目标（v3 定稿，2026-08-03 与用户确认）──
// 规则：月目标 > 上月终点 → 按周线性爬坡（月底精确达标）；月目标 ≤ 上月终点 → 平铺月目标。
// 8月的"上月终点" = 7月实际（从 store 自动算）；9月起 = 上月目标（纯目标链）。
// 取整：质量 0.5pp / opHours 0.5h / autoFeed 5次；取整函数单调，天然不降。
// 仅对已在梯度指标弹窗单独保存过档位的站点生成目标，其余站点不参与（显示 /）。

function roundToStep(v, step) {
  return +(Math.round(v / step) * step).toFixed(2);
}

// 周归属月 = 该周周四所在月（一周多数天所在月，ISO 惯例）。
// 如 2026-08-31 周：周一在8月但周四在9月 → 归9月，8月正好 4 周（8/3~8/30）。
function mondaysOfMonth(year, month) {
  const keys = [];
  const d = new Date(year, month - 1, 1, 12);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // 当月1日所在周的周一
  for (let i = 0; i < 6; i++) {
    const thu = new Date(d); thu.setDate(thu.getDate() + 3);
    if (thu.getFullYear() === year && thu.getMonth() === month - 1) {
      keys.push(d.toISOString().slice(0, 10));
    } else if (keys.length) break;
    d.setDate(d.getDate() + 7);
  }
  return keys;
}

// week = 该周在归属月的序号（1起），total = 归属月周数（4 或 5）
// 归属规则（2026-08-04 与用户确认）：含当月 1 号的那周 = 该月第 1 周。
// 例：7/27-8/2 含 8/1 → 8月W1；8/31-9/6 含 9/1 → 9月W1。
function monthWeekInfo(weekStart) {
  const mon = new Date(weekStart + 'T12:00:00');
  if (isNaN(mon.getTime())) return { year: NaN, month: NaN, week: -1, total: 0 };
  const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
  // 本周内含某月 1 号 → 归该月；不含 → 归本周一所在月
  let firstDay = null;
  for (const d = new Date(sun); d >= mon; d.setDate(d.getDate() - 1)) {
    if (d.getDate() === 1) { firstDay = new Date(d); break; }
  }
  if (!firstDay) firstDay = new Date(mon.getFullYear(), mon.getMonth(), 1, 12);
  const y = firstDay.getFullYear(), m = firstDay.getMonth() + 1;
  // 当月第 1 周的周一 = 1 号所在周的周一
  const dow = (firstDay.getDay() + 6) % 7;          // 1 号是周几（周一=0）
  const firstMonday = new Date(firstDay); firstMonday.setDate(firstMonday.getDate() - dow);
  // 下月 1 号所在周的周一 → 两周一差即当月周数
  const nextFirst = new Date(y, m, 1, 12);          // m 为 1-based，Date 月份传 m 即下月
  const ndow = (nextFirst.getDay() + 6) % 7;
  const nextMonday = new Date(nextFirst); nextMonday.setDate(nextFirst.getDate() - ndow);
  const WEEK_MS = 7 * 86400000;
  const total = Math.round((nextMonday - firstMonday) / WEEK_MS);
  const week = Math.round((mon - firstMonday) / WEEK_MS) + 1;
  return { year: y, month: m, week, total };
}


// 核心规则：cur > prev 线性爬坡（第 total 周精确落 cur）；否则平铺 cur
function weeklyRampTarget(prev, cur, w, total, step) {
  const v = cur > prev ? prev + (cur - prev) * w / total : cur;
  return roundToStep(v, step);
}

// 共用：按梯度表（12列）计算某周目标。tiersOf: tierName -> 12个月值数组
function rampWeekTargets(tiersOf, month, week, total) {
  const targets = {};
  for (const f of TARGET_FIELDS) {
    const tiers = tiersOf(f.tierName);
    const curM = tiers[month - 1];
    if (curM == null) continue;
    const prevM = month >= 2 ? tiers[month - 2] : null;
    const step = f.key === 'autoFeed' ? 5 : 0.5;
    if (!f.isRate) {
      const curW = curM / 4;
      const prevW = prevM != null ? prevM / 4 : null;
      targets[f.key] = (prevW == null) ? roundToStep(curW, step) : weeklyRampTarget(prevW, curW, week, total, step);
    } else {
      targets[f.key] = (prevM == null) ? curM : weeklyRampTarget(prevM, curM, week, total, step);
    }
  }
  return targets;
}

// 返回 { st: { key: displayValue } }：比率为 %（如 84 / 90.5），规模为周口径数值
// 上月终点 = 梯度表上月列（7月列即基线）；规模月值统一 ÷4 转周口径
function computeTargetsForWeek(weekStart, weekEnd, stationNames) {
  const { year, month, week, total } = monthWeekInfo(weekStart);
  if (week < 1) return {};
  const result = {};
  const stationStore = getStationTierStore();
  for (const st of stationNames) {
    if (!stationStore[st] && !STATION_TIER_DEFAULTS[st]) continue;   // 未配置档位的站点不参与自动计算
    const targets = rampWeekTargets(tn => getTierValues(tn, st), month, week, total);
    if (Object.keys(targets).length > 0) result[st] = targets;
  }
  return result;
}

// 合计（全站）目标：取全站（默认）梯度表，走与各站完全相同的爬坡+取整规则
function computeAggTargetsForWeek(weekStart) {
  const { month, week, total } = monthWeekInfo(weekStart);
  if (week < 1) return {};
  return rampWeekTargets(tn => getTierValues(tn), month, week, total);
}

async function autoSetTargets() {
  const s = document.getElementById('reportStartDate').value;
  const e = document.getElementById('reportEndDate').value;
  if (!s || !e) { alert('请先选择开始和结束日期'); return; }
  if (!isWeekRange(s, e)) { alert('请选择一个完整的自然周（周一至周日）'); return; }
  await tiersReady;

  const btn = document.querySelector('#siteTargetsContainer').parentElement.querySelector('.btn-outline');
  if (!btn) return;
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '计算中...';

  try {
    const thisData = store.filter(r => r.date >= s && r.date <= e);
    const thisSites = Array.from(new Set(thisData.map(r => r.station)));
    // 本周目标 = 基于所选周期（本周）数据回滚 → 实际是给下一周用的目标
    const targets = computeTargetsForWeek(s, e, thisSites);
    for (const [st, vals] of Object.entries(targets)) {
      for (const f of TARGET_FIELDS) {
        if (vals[f.key] != null) {
          const elem = document.getElementById(`rStgt_${st}_${f.key}`);
          if (elem) elem.value = vals[f.key];
        }
      }
    }
    alert('✅ 本周目标已按梯度表自动设定');
  } catch (err) {
    console.error('自动设定目标失败:', err);
    alert('自动设定目标失败: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

// 取上周目标：优先直接复制上周最新一份周报的"本周目标"（siteTargets）；
// 上周周报未生成时，才用上周数据跑 computeTargetsForWeek 回滚生成。
// 返回格式与 computeTargetsForWeek 一致：比率类为 %（如 84），规模类为数值（如 64）。
function getPrevWeekTargets(prevStart, prevEnd, stationNames) {
  const candidates = weeklyReports.filter(r => r.dateRange
    && r.dateRange.start === prevStart && r.dateRange.end === prevEnd);
  let prevReport = null;
  if (candidates.length > 0) {
    // 取最新一份（createdAt 降序，无 createdAt 取数组最后）
    candidates.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    prevReport = candidates[0];
  }
  if (prevReport && prevReport.siteTargets) {
    const result = {};
    for (const st of stationNames) {
      const raw = prevReport.siteTargets[st];
      if (!raw) { result[st] = null; continue; }
      const t = {};
      for (const f of TARGET_FIELDS) {
        if (raw[f.key] == null || raw[f.key] === '') { t[f.key] = null; continue; }
        let v = parseFloat(raw[f.key]);
        if (isNaN(v)) { t[f.key] = null; continue; }
        if (f.isRate && v < 10) v = v * 100;  // 小数 → %
        t[f.key] = v;
      }
      result[st] = t;
    }
    return result;
  }
  // 上周周报未生成 → 用上周数据跑目标生成代码
  return computeTargetsForWeek(prevStart, prevEnd, stationNames);
}


// 取上周周报（dateRange 匹配上周，取 createdAt 最新一份）
function getPrevReport(prevStart, prevEnd) {
  const cands = weeklyReports.filter(r => r.dateRange
    && r.dateRange.start === prevStart && r.dateRange.end === prevEnd);
  if (!cands.length) return null;
  cands.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return cands[0];
}

// 合计上周目标：直接从上周周报 tableData 的合计"本周目标"列读取复制
// 返回格式：比率类为 %（如 82），规模类为数值
function getPrevAggTargets(prevReport) {
  const result = {};
  if (!prevReport || !prevReport.tableData) return result;
  const prevSites = (prevReport.siteDetails || []).map(s => s.station);
  if (!prevSites.length) return result;
  const cpr = prevSites.length * 3 + 5;
  const nst = prevSites.length;
  // RPT_ROWS 中有 tgtKey 的行：(行序, key, unit)
  const ROW_TGT = [
    [0,'aiRate','%'],[1,'prodRate','%'],[2,'succRate','%'],[3,'abnRec','%'],
    [4,'prodCov','%'],[5,'autoVolCov','%'],[6,'effRatio','%'],
    [10,'opHours','h'],[11,'autoFeed','次']
  ];
  for (const [ri, key, unit] of ROW_TGT) {
    const ci = ri * cpr + nst * 3 + 2;  // 合计"本周目标"列
    const cell = prevReport.tableData[String(ci)];
    if (!cell) continue;
    const txt = (cell.t || '').trim();
    if (!txt || txt === '/' || txt === '—') continue;
    let num = parseFloat(txt.replace(/[^\d.\-]/g, ''));
    if (isNaN(num)) continue;
    // tableData 文本已是显示值（82.00% → 82），直接用，与 aggNextTargets 格式一致
    result[key] = num;
  }
  return result;
}


// 根据周一日期生成"YYYY年M月第N周"标签
// 规则：某月1号所在周=该月第1周；跨月周归属含1号的月份
function getMonthWeekLabel(mondayStr) {
  const monday = new Date(mondayStr + 'T12:00:00');
  // 该周（周一~周日）内找某月1号，含1号则归属该月
  let belong = monday;
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    if (dd.getDate() === 1) { belong = dd; break; }
  }
  const year = belong.getFullYear();
  const month = belong.getMonth() + 1;
  // 该月1号所在周的周一
  const first = new Date(year, belong.getMonth(), 1);
  const firstDow = first.getDay();
  const firstMonOffset = firstDow === 0 ? 6 : firstDow - 1;
  const firstMonday = new Date(first);
  firstMonday.setDate(first.getDate() - firstMonOffset);
  // belong 所在周的周一
  const belongDow = belong.getDay();
  const belongMonday = new Date(belong);
  belongMonday.setDate(belong.getDate() - (belongDow === 0 ? 6 : belongDow - 1));
  const diffDays = Math.round((belongMonday - firstMonday) / 86400000);
  const weekInMonth = Math.floor(diffDays / 7) + 1;
  return `${year}年${month}月第${weekInMonth}周`;
}


// ── 生成周报 ──
function openGenerateReport() {
  // 获取今天的日期
  const today = new Date();

  // 计算最近的周一
  const dayOfWeek = today.getDay(); // 0 = 周日, 1 = 周一, ..., 6 = 周六
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 如果是周日，需要回退6天
  const recentMonday = new Date(today);
  recentMonday.setDate(today.getDate() - daysToMonday);

  const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // 设置默认日期范围（最近一周）
  const startDate = ymd(recentMonday);
  const endDate = ymd(today);
  document.getElementById('reportStartDate').value = startDate;
  document.getElementById('reportEndDate').value = endDate;

  // 设置默认周报名称（基于所选开始日期的年月+月内周数 + 版本标注）
  const baseName = getMonthWeekLabel(startDate);
  // 统计同周期已有周报数（原名 + 原名(N) + 原名(N)-M 副本）
  const existing = weeklyReports.filter(r => {
    const n = r.reportName || '';
    return n === baseName || n.startsWith(baseName + '(') || n.startsWith(baseName + '-');
  });
  const versionNum = existing.length + 1;
  document.getElementById('reportName').value = versionNum > 1 ? `${baseName}(${versionNum})` : baseName;

  // 更新站点列表
  updateReportStationList();

  document.getElementById('ovGenerateReport').classList.add('show');
}

// 更新周报站点列表
function updateReportStationList() {
  const startDate = document.getElementById('reportStartDate').value;
  const endDate = document.getElementById('reportEndDate').value;

  if (!startDate || !endDate) return;

  // 获取日期范围内的数据
  const data = store.filter(r => {
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;
    return true;
  });

  // 生成站点目标输入框
  const sites = Array.from(new Set(data.map(r => r.station)));
  const container = document.getElementById('siteTargetsContainer');

  if (sites.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--t3);padding:20px">选择的日期区间内没有数据</div>';
    return;
  }

  container.innerHTML = sites.map(st => `
    <div style="margin-bottom:12px;padding:12px;background:var(--card-bg2);border-radius:6px">
      <div style="font-weight:600;margin-bottom:8px;color:var(--accent)">${st}</div>
      <div class="fg3" style="gap:8px">
        <div class="fi"><label>运营时长目标(h)</label><input type="number" id="rStgt_${st}_opHours" min="0" step="0.1"></div>
        <div class="fi"><label>自动上料总数目标</label><input type="number" id="rStgt_${st}_autoFeed" min="0"></div>
        <div class="fi"><label>AI接管率(%)</label><input type="number" id="rStgt_${st}_aiRate" min="0" max="100" step="0.1"></div>
        <div class="fi"><label>生产接管率(%)</label><input type="number" id="rStgt_${st}_prodRate" min="0" max="100" step="0.1"></div>
        <div class="fi"><label>任务成功率(%)</label><input type="number" id="rStgt_${st}_succRate" min="0" max="100" step="0.1"></div>
        <div class="fi"><label>异常恢复率(%)</label><input type="number" id="rStgt_${st}_abnRec" min="0" max="100" step="0.1"></div>
        <div class="fi"><label>生产时长覆盖率(%)</label><input type="number" id="rStgt_${st}_prodCov" min="0" max="100" step="0.1"></div>
        <div class="fi"><label>自动化生产方量覆盖率(%)</label><input type="number" id="rStgt_${st}_autoVolCov" min="0" max="100" step="0.1"></div>
        <div class="fi"><label>人效比(%)</label><input type="number" id="rStgt_${st}_effRatio" min="0" max="500" step="0.1"></div>
      </div>
    </div>
  `).join('');
}

// 各站点分析自动填充：BI 作业总时长 + 上料/手动/异常 + 表格达标判定（7 效果指标 vs 上周目标，数值上色不加粗）
function buildStationAutoAnalysis(sd, prevTarget, opDays, workHours) {
  if (!sd) return '';
  const wh = (workHours != null && workHours !== '') ? workHours : (sd.opTime || 0);  // 有效运营=BI作业总时长，回退总运营时间
  const autoFeed = sd.autoFeed || 0;
  const manual = sd.manualFeed || 0;
  const abnormal = sd.abnormalTask || 0;
  const total = autoFeed + manual;
  const metrics = [
    ['AI时长接管率', 'aiRate', sd.aiRate],
    ['生产任务接管率', 'prodRate', sd.prodRate],
    ['任务成功率', 'succRate', sd.succRate],
    ['异常任务远程恢复率', 'abnRec', sd.abnRec],
    ['生产时长覆盖率', 'prodCov', sd.prodCov],
    ['自动化生产方量覆盖率', 'autoVolCov', sd.autoVolCov],
    ['人效比', 'effRatio', sd.efficiencyRatio],
  ];
  const hit = [], miss = [];
  metrics.forEach(function(m) {
    const name = m[0], key = m[1], val = m[2];
    if (val == null || val === '') return;
    let tgt = prevTarget ? prevTarget[key] : null;
    if (tgt == null || tgt === '') return;  // 无上周目标，跳过
    const tgtRatio = tgt > 1 ? tgt / 100 : tgt;  // prevWeekTargets 存显示%，归一化
    const valTxt = (val * 100).toFixed(2) + '%';
    // 颜色同表格：绝对 2pp 判定（≥目标绿，目标-2 以内橙，更低红）
    const a = val * 100, t = tgt;  // tgt 已是 % 数值
    let color = (a >= t) ? '#16a34a' : (a >= t - 2 ? '#f59e0b' : '#dc2626');
    const txt = '<span style="color:' + color + '">' + name + '（' + valTxt + '）</span>';
    if (a >= t) hit.push(txt); else miss.push(txt);
  });
  const lines = [];
  // 有效运营时长 颜色（vs 上周目标 opHours）
  const opTgt = prevTarget ? prevTarget.opHours : null;
  const opColor = (opTgt != null && opTgt !== '' && wh != null) ? (wh >= opTgt ? '#16a34a' : '#dc2626') : '';
  const opHtml = opColor ? '<span style="color:' + opColor + '">有效运营' + wh.toFixed(1) + '小时</span>' : '有效运营' + wh.toFixed(1) + '小时';
  // 累计上料 颜色（vs 上周目标 autoFeed）
  const feedTgt = prevTarget ? prevTarget.autoFeed : null;
  const feedColor = (feedTgt != null && feedTgt !== '' && total != null) ? (total >= feedTgt ? '#16a34a' : '#dc2626') : '';
  const feedHtml = feedColor ? '<span style="color:' + feedColor + '">累计上料' + total + '次</span>' : '累计上料' + total + '次';
  lines.push('共运营' + opDays + '天，' + opHtml + '，' + feedHtml + '（自动化' + autoFeed + '次；另外手动上料' + manual + '次，自动化异常' + abnormal + '次）；');
  if (hit.length || miss.length) {
    if (hit.length) lines.push('达标指标：' + hit.join('、'));
    if (miss.length) lines.push('未达标指标：' + miss.join('、'));
  } else {
    lines.push('达标/未达标指标：无');
  }
  lines.push('手动接管及异常原因：暂未提供。');
  lines.push('本周重点：暂未提供。');
  return lines.join('\n');
}

// 从旧 analysis 提取某段（如"手动接管及异常原因"）的手动内容，"暂未提供"视为无内容返回 null
function extractManualPart(analysis, label) {
  if (!analysis) return null;
  // 段尾截断：\n 或块级换行标签（兼容旧版 contenteditable 存下的 <br>/<div>/<p> 格式）
  const m = analysis.match(new RegExp(label + '：([^\\n]*?)(?=<\\/?(?:br|div|p)[\\s>/]|\\n|$)'));
  if (!m) return null;
  const content = m[1].trim();
  if (!content || content === '暂未提供。' || content === '暂未提供') return null;
  return content;
}

async function generateReport() {
  const name = document.getElementById('reportName').value.trim();
  const s = document.getElementById('reportStartDate').value;
  const e = document.getElementById('reportEndDate').value;

  if (!name) {
    alert('请输入周报名称');
    return;
  }

  if (!s || !e) {
    alert('请选择日期区间');
    return;
  }

  if (s > e) {
    alert('开始日期不能大于结束日期');
    return;
  }

  const btn = document.getElementById('btnGenReport');
  btn.disabled = true;
  btn.textContent = '生成中...';

  try {
    // 根据选择的日期获取数据
    const data = store.filter(r => {
      if (s && r.date < s) return false;
      if (e && r.date > e) return false;
      return true;
    });

    if (data.length === 0) {
      alert('选择的日期区间内没有数据');
      btn.disabled = false;
      btn.textContent = '生成周报';
      return;
    }

    const kpis = computeKPIs(data);
    const sites = Array.from(new Set(data.map(r => r.station)));

    // 收集综合目标（已移除 UI，留空兼容旧报告查看）
    const globalTargets = {};

    // 收集站点目标（9 个字段）
    const siteTargets = {};
    const TGT_KEYS = ['opHours','autoFeed','aiRate','prodRate','succRate','abnRec','prodCov','autoVolCov','effRatio'];
    sites.forEach(st => {
      const vals = {};
      TGT_KEYS.forEach(k => { vals[k] = document.getElementById(`rStgt_${st}_${k}`)?.value || ''; });
      if (TGT_KEYS.some(k => vals[k])) {
        siteTargets[st] = {
          opHours: vals.opHours,
          autoFeed: vals.autoFeed,
          aiRate: vals.aiRate ? vals.aiRate / 100 : '',
          prodRate: vals.prodRate ? vals.prodRate / 100 : '',
          succRate: vals.succRate ? vals.succRate / 100 : '',
          abnRec: vals.abnRec ? vals.abnRec / 100 : '',
          prodCov: vals.prodCov ? vals.prodCov / 100 : '',
          autoVolCov: vals.autoVolCov ? vals.autoVolCov / 100 : '',
          effRatio: vals.effRatio ? vals.effRatio / 100 : '',
        };
      }
    });

    // 生成站点明细
    const siteDetails = sites.map(st => {
      const siteData = data.filter(r => r.station === st);
      const siteKpi = computeKPIs(siteData);
      return {
        station: st,
        opTime: siteKpi.opHours,
        autoFeed: siteKpi.autoFeedTotal,
        autoProdFeed: siteKpi.autoProdFeed,
        manualFeed: siteKpi.manualFeed,
        aiRate: siteKpi.aiRate,
        prodRate: siteKpi.prodRate,
        succRate: siteKpi.succRate,
        abnRec: siteKpi.abnRec,
        faultFreq: siteKpi.faultFreq,
        prodHours: siteKpi.prodHours,
        takeoverHours: siteKpi.takeoverHours,
        prodCov: siteKpi.prodCov,
        autoVol: siteKpi.autoVol,
        totalVol: siteKpi.totalVol,
        efficiencyRatio: siteKpi.efficiencyRatio,
        autoVolCov: (siteKpi.prodRate != null && siteKpi.prodCov != null) ? siteKpi.prodRate * siteKpi.prodCov : null,
        abnormalTask: siteKpi.abnormalTask,
      };
    });

    // 各站点分析自动填充：BI 作业总时长 + 表格达标判定，生成即固化
    const prevStart = shiftDate(s, -7), prevEnd = shiftDate(s, -1);
    // 与表格"上周目标"对齐：直接复制上周周报 siteTargets（无上周周报才回滚）
    const prevWeekTargets = getPrevWeekTargets(prevStart, prevEnd, sites);
    // 按站取 BI 作业总时长（有效运营时间）
    const biWorkHours = {};
    await Promise.all(sites.map(async function(st) {
      try {
        const r = await fetch('/api/bi-export', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ site_name: st, start_date: s, end_date: e }) });
        const d = await r.json();
        if (d.success && d.map && d.map['作业总时长'] != null) biWorkHours[st] = d.map['作业总时长'];
      } catch(e) {}
    }));
    const siteCards = {};
    // 继承同周期旧周报的站点图片（重新生成不丢图）
    const prevSameWeek = weeklyReports.filter(r => r.dateRange
      && r.dateRange.start === s && r.dateRange.end === e)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
    const prevSiteCards = prevSameWeek ? (prevSameWeek.siteCards || {}) : {};
    siteDetails.forEach(sd => {
      const stRecs = data.filter(r => r.station === sd.station);
      const opDays = new Set(stRecs.map(r => r.date)).size;
      const prevCard = prevSiteCards[sd.station] || {};
      const prevImg = prevCard.image || '';
      let analysis = buildStationAutoAnalysis(sd, prevWeekTargets[sd.station], opDays, biWorkHours[sd.station]);
      // 继承旧周报手动填写的"手动接管及异常原因"和"本周重点"（自动部分重新算，手动部分保留）
      const prevAnalysis = prevCard.analysis || '';
      const manualPart = extractManualPart(prevAnalysis, '手动接管及异常原因');
      const focusPart = extractManualPart(prevAnalysis, '本周重点');
      if (manualPart) analysis = analysis.replace('手动接管及异常原因：暂未提供。', '手动接管及异常原因：' + manualPart);
      if (focusPart) analysis = analysis.replace('本周重点：暂未提供。', '本周重点：' + focusPart);
      siteCards[sd.station] = { analysis: analysis, image: prevImg };
    });

    const report = {
      id: Date.now(),
      reportName: name,
      dateRange: { start: s, end: e },
      summary: {
        stationCount: kpis.stationCount,
        opHours: kpis.opHours,
        autoFeedTotal: kpis.autoFeedTotal,
        autoProdFeed: kpis.autoProdFeed,
        manualFeed: kpis.manualFeed,
        aiRate: kpis.aiRate,
        prodRate: kpis.prodRate,
        succRate: kpis.succRate,
        abnRec: kpis.abnRec,
        faultFreq: kpis.faultFreq,
        prodStationCount: kpis.prodStationCount,
        prodHours: kpis.prodHours,
        takeoverHours: kpis.takeoverHours,
        prodCov: kpis.prodCov,
        autoVol: kpis.autoVol,
        totalVol: kpis.totalVol,
        efficiencyRatio: kpis.efficiencyRatio,
      },
      siteDetails,
      globalTargets,
      siteTargets,
      records: data,  // 添加原始记录数据供AI分析使用
      aiAnalysis: null,  // 初始化AI分析字段，用于保存AI分析结果
      siteCards,  // 各站点子模块：{站名:{analysis(自动填充), image}}
      otherMatters: '',  // 其他事项文字
      createdAt: (() => { const d = new Date(); d.setHours(d.getHours() + 8); return d.toISOString().replace('T', ' ').slice(0, 19); })(),
    };

    await ReportsAPI.add(report);
    // 冻结表格数据（轻量快照：文字+颜色，格式留在前端模板）
    try {
      const tmpDiv = document.createElement('div');
      tmpDiv.innerHTML = buildReportTable(report);
      const t = tmpDiv.querySelector('table');
      if (t) report.tableData = captureTableData(t);
      await ReportsAPI.update(report.id, report);
    } catch (freezeErr) { console.warn('冻结表格失败（周报已生成）:', freezeErr); }
    closeOv('ovGenerateReport');
    alert('周报生成成功！');
    switchPage('reports');

  } catch (err) {
    console.error('生成周报失败:', err);
    alert('生成周报失败: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '生成周报';
  }
}


// ── 详情表格 ──
// ── 周报详情表格 ──
const RPT_ROWS = [
  // [group, label, kpiKey, tgtKey (null=no target), unit]
  ['效果','AI时长接管率','aiRate','aiRate','%'],
  ['效果','生产任务接管率','prodRate','prodRate','%'],
  ['效果','任务成功率','succRate','succRate','%'],
  ['效果','异常任务远程恢复率','abnRec','abnRec','%'],
  ['效果','生产时长覆盖率','prodCov','prodCov','%'],
  ['效果','自动化生产方量覆盖率','autoVolCov','autoVolCov','%'],
  ['效果','人效比','efficiencyRatio','effRatio','%'],
  ['效果','故障频次（次/h）','faultFreq',null,'次/h'],
  ['效果','一级故障占比','fault1Ratio',null,'%'],
  ['时长','运营天数','opDays',null,'天'],
  ['时长','总运营时长（h）','opHours','opHours','h'],
  ['上料数','自动上料总数','autoFeedTotal','autoFeed','次'],
  ['上料数','测试上料数','testTaskCount',null,'次'],
  ['上料数','自动生产上料数','autoProdFeed',null,'次'],
  ['上料数','手动上料数','manualFeed',null,'次'],
  ['上料数','总生产方量','totalVol',null,'m³'],
  ['上料数','师傅接管生产方量','ourVol',null,'m³'],
  ['上料数','自动化生产方量','autoVol',null,'m³'],
];

function getKpiVal(kpi, key) {
  if (key === 'opDays') return kpi._days || 0;
  if (key === 'opHours') return kpi.opTime != null ? kpi.opTime : (kpi.opHours != null ? kpi.opHours : null);
  if (key === 'autoFeedTotal') return kpi.autoFeed != null ? kpi.autoFeed : (kpi.autoFeedTotal != null ? kpi.autoFeedTotal : null);
  if (key === 'testTaskCount') { const af = getKpiVal(kpi,'autoFeedTotal')||0; const ap = getKpiVal(kpi,'autoProdFeed')||0; return af - ap; }
  if (key === 'ourVol') { const ap = getKpiVal(kpi,'autoProdFeed')||0; const mf = getKpiVal(kpi,'manualFeed')||0; const v = (ap+mf)*2.8; return v > 0 ? v : null; }
  if (key === 'autoVolCov') return (kpi.autoVolCov != null) ? kpi.autoVolCov : ((kpi.prodRate!=null&&kpi.prodCov!=null) ? kpi.prodRate*kpi.prodCov : null);
  if (key === 'fault1Ratio') {
    const tot = (kpi._f1||0)+(kpi._f2||0)+(kpi._f3||0);
    return tot > 0 ? ((kpi._f1||0) / tot) : null;
  }
  return kpi[key] != null ? kpi[key] : null;
}

function fmtKpiVal(v, unit, tgtVal, kpiKey) {
  if (v == null) return '<span class="rpt-na">—</span>';
  let cls = '';
  const val = v;
  let txt;
  if (unit === '%') {
    txt = (val*100).toFixed(2) + '%';
    if (tgtVal != null && tgtVal > 0) {
      const a = val*100; const t = tgtVal;  // 上游统一传 % 数值（如 82），无需启发式转换
      if (kpiKey === 'fault1Ratio') {
        // 一级故障占比：越低越好（≤目标绿，目标+2 以内橙，更高红）
        cls = a <= t ? 'rpt-hit' : (a <= t + 2 ? 'rpt-warn' : 'rpt-miss');
      } else {
        // 其余 7 个百分比指标：绝对 2pp 判定（≥目标绿，目标-2 以内橙，更低红）
        cls = a >= t ? 'rpt-hit' : (a >= t - 2 ? 'rpt-warn' : 'rpt-miss');
      }
    }
  } else if (unit === 'h') {
    txt = val.toFixed(1);
    if (tgtVal != null && tgtVal > 0) { cls = val >= tgtVal ? 'rpt-hit' : 'rpt-miss'; }
  } else if (unit === '次/h') {
    txt = val.toFixed(2);
    if (tgtVal != null && tgtVal > 0) { cls = val >= tgtVal ? 'rpt-hit' : 'rpt-miss'; }
  } else if (unit === '次') {
    txt = val.toFixed(0);
    if (tgtVal != null && tgtVal > 0) { cls = val >= tgtVal ? 'rpt-hit' : 'rpt-miss'; }
  } else if (unit === 'm³') {
    txt = val.toFixed(1);
    if (tgtVal != null && tgtVal > 0) { cls = val >= tgtVal ? 'rpt-hit' : 'rpt-miss'; }
  } else {
    txt = val.toFixed(0);
    if (tgtVal != null && tgtVal > 0) { cls = val >= tgtVal ? 'rpt-hit' : 'rpt-miss'; }
  }
  return `<span class="rpt-v ${cls}">${txt}</span>`;
}

function fmtTgt(v, unit) {
  if (v == null) return '<span class="rpt-na">/</span>';
  let txt;
  if (unit === '%') txt = v.toFixed(2) + '%';
  else if (unit === 'h') txt = v.toFixed(1);
  else if (unit === '次/h') txt = v.toFixed(2);
  else if (unit === '次') txt = v.toFixed(0);
  else if (unit === 'm³') txt = v.toFixed(1);
  else txt = String(v);
  return `<span class="rpt-na">${txt}</span>`;
}

function fmtDelta(cur, prev, unit, kpiKey) {
  if (cur == null || prev == null) return '<span class="rpt-na">—</span>';
  const lowerBetter = (kpiKey === 'faultFreq' || kpiKey === 'fault1Ratio');
  const d = cur - prev;
  const sign = d >= 0 ? '+' : '';
  // 全部用绝对差值（不计算比例），格式按单位
  let txt;
  if (unit === '%') txt = sign + (d*100).toFixed(2) + '%';
  else if (unit === 'h') txt = sign + d.toFixed(1) + 'h';
  else if (unit === '次/h') txt = sign + d.toFixed(2) + '次/h';
  else if (unit === '次') txt = sign + d.toFixed(0) + '次';
  else if (unit === 'm³') txt = sign + d.toFixed(1) + 'm³';
  else if (unit === '天') txt = sign + d.toFixed(0) + '天';
  else txt = sign + d.toFixed(0);
  // 颜色：越低越好 → 下降绿上升红；越高越好 → 上升绿下降红
  let cls = '';
  if (d !== 0) cls = lowerBetter ? (d < 0 ? 'rpt-hit' : 'rpt-miss') : (d > 0 ? 'rpt-hit' : 'rpt-miss');
  return `<span class="rpt-v ${cls}">${txt}</span>`;
}

function buildReportTable(report) {
  if (report.tableHTML) return report.tableHTML;
  // 实时计算（仅生成报告时使用）
  const sites = (report.siteDetails || []).map(sd => {
    const stCfg = stationsStore.find(s => s.name === sd.station) || {};
    const stRecs = store.filter(r => r.station === sd.station && r.date >= report.dateRange.start && r.date <= report.dateRange.end);
    // 将运营天数、各级故障数直接注入 kpi 对象，供 getKpiVal 读取
    sd._days = new Set(stRecs.map(r => r.date)).size;
    sd._f1 = stRecs.reduce((s,r) => s + (+r.fault1||0), 0);
    sd._f2 = stRecs.reduce((s,r) => s + (+r.fault2||0), 0);
    sd._f3 = stRecs.reduce((s,r) => s + (+r.fault3||0), 0);
    return { name: sd.station, stage: stCfg.stage, kpi: sd };
  });
  if (!sites.length) return '<div class="empty">暂无站点数据</div>';

  // 上周目标：优先直接复制上周最新一份周报的"本周目标"；上周周报未生成时才用上周数据回滚
  const prevStart = shiftDate(report.dateRange.start, -7);
  const prevEnd = shiftDate(report.dateRange.start, -1);
  const prevWeekTargets = getPrevWeekTargets(prevStart, prevEnd, sites.map(s => s.name));
  // 前一周期 records（合计上周目标回退、前一周期对比共用）
  const prevRecs = store.filter(r => r.date >= prevStart && r.date <= prevEnd);
  // 合计上周目标：优先从上周周报合计"本周目标"列复制；无上周周报时按全站梯度表回滚
  const prevReport = getPrevReport(prevStart, prevEnd);
  let aggPrevTargets = getPrevAggTargets(prevReport);
  if (!Object.keys(aggPrevTargets).length) {
    aggPrevTargets = computeAggTargetsForWeek(prevStart);
  }

  // 本周合计：全站 records 跑 computeKPIs
  const allRecs = store.filter(r => r.date >= report.dateRange.start && r.date <= report.dateRange.end);
  const aggKpi = computeKPIs(allRecs);
  if (aggKpi) {
    aggKpi._days = sites.reduce((s, st) => s + (st.kpi._days || 0), 0); // 各站天数加和
    aggKpi._f1 = allRecs.reduce((s,r)=>s+(+r.fault1||0),0);
    aggKpi._f2 = allRecs.reduce((s,r)=>s+(+r.fault2||0),0);
    aggKpi._f3 = allRecs.reduce((s,r)=>s+(+r.fault3||0),0);
  }
  // 合计本周目标：取全站（默认）梯度表，走与各站相同的爬坡+取整规则
  const aggNextTargets = computeAggTargetsForWeek(report.dateRange.start);

  // 前一周期：前 7 天 records 跑 computeKPIs（复用上方 prevRecs）
  const prevKpi = computeKPIs(prevRecs);
  if (prevKpi) {
    // 前一周期天数 = 上周 records 按站去重日期数相加（不能用本周 sites，否则取到本周天数）
    const prevDaysMap = {};
    for (const r of prevRecs) {
      if (!r.station || !r.date) continue;
      (prevDaysMap[r.station] = prevDaysMap[r.station] || new Set()).add(r.date);
    }
    prevKpi._days = Object.keys(prevDaysMap).reduce((s, st) => s + prevDaysMap[st].size, 0);
    prevKpi._f1 = prevRecs.reduce((s,r)=>s+(+r.fault1||0),0);
    prevKpi._f2 = prevRecs.reduce((s,r)=>s+(+r.fault2||0),0);
    prevKpi._f3 = prevRecs.reduce((s,r)=>s+(+r.fault3||0),0);
  }

  // 表头（3 行：R1 站点名 / R2 阶段 / R3 目标子列）
  const title = `本周运营数据一览`;
  let html = `<div style="margin:18px 0 14px 0;padding:0 4px">
    <div style="display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:10px">
      <span style="display:inline-block;width:4px;height:18px;border-radius:2px;background:var(--accent)"></span>
      <span style="font-weight:700;font-size:14px;color:var(--accent)">${title}</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <div style="position:relative;display:none" id="rptToolWrap">
        <button class="btn btn-outline" id="rptToolBtn" onclick="toggleRptTool()" style="font-size:12px;padding:4px 12px">🛠 工具</button>
        <div id="rptToolMenu" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;background:#fff;border:1px solid #d0d5dd;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:100;min-width:120px;padding:4px 0">
          <div class="rpt-export-item" onclick="setRptBrush('green')">🟢 绿色</div>
          <div class="rpt-export-item" onclick="setRptBrush('red')">🔴 红色</div>
          <div class="rpt-export-item" onclick="setRptBrush('orange')">🟠 橘色</div>
          <div class="rpt-export-item" onclick="setRptBrush('bold')">🔤 加粗</div>
          <div class="rpt-export-item" onclick="setRptBrush('reset')">⬜ 复原</div>
          <div class="rpt-export-item" onclick="setRptBrush('gray')">⚪ 目标</div>
        </div>
      </div>
      <button class="btn btn-outline" onclick="toggleReportAnalysis()" style="font-size:12px;padding:4px 12px">📝 生成全站周报</button>
      <button class="btn btn-outline" id="rptEditBtn" onclick="toggleRptEdit()" style="font-size:12px;padding:4px 12px">✏️ 编辑</button>
      <div style="position:relative" id="rptExportWrap">
        <button class="btn btn-outline" onclick="toggleRptExport()" style="font-size:12px;padding:4px 12px">📋 导出</button>
      <div id="rptExportMenu" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;background:#fff;border:1px solid #d0d5dd;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:100;min-width:140px;padding:4px 0">
        <div class="rpt-export-item" onclick="copyRptTable()">📋 复制到剪切板</div>
        <div class="rpt-export-item" onclick="exportRptExcel()">📥 导出 Excel</div>
        <div class="rpt-export-item" onclick="exportRptPng()">🖼️ 导出 PNG 格式</div>
      </div>
    </div>
  </div>
</div>
</div>`;
  html += '<div style="overflow:auto"><table class="rpt-table"><thead>';

  // Row 1: 分类 | 指标 | 站点名 | 本周合计 | 前一周期 | 同比
  html += '<tr><th rowspan="3" class="rpt-sep">分类</th><th rowspan="3" class="rpt-sep">指标</th>';
  for (const st of sites) { html += `<th colspan="3" class="rpt-sep">${st.name}</th>`; }
  html += '<th colspan="3" rowspan="2" class="rpt-sep">本周合计</th><th rowspan="3" class="rpt-sep">前一周期</th><th rowspan="3">同比<br>前一周变化</th></tr>';
  // Row 2: 阶段标签（同字号，深灰色）
  html += '\n<tr>';
  for (const st of sites) {
    const stageLabel = STAGE_LABELS[st.stage] || '';
    html += `<th colspan="3" class="rpt-sep" style="color:var(--t2)">${stageLabel}</th>`;
  }
  html += '</tr>';
  // Row 3: 上周目标 / 上周完成 / 本周目标 × each
  html += '\n<tr>';
  for (let i = 0; i < sites.length; i++) {
    html += '<th>上周目标</th><th>上周完成</th><th class="rpt-sep">本周目标</th>';
  }
  html += '<th>上周目标</th><th>上周完成</th><th>本周目标</th>';
  html += '</tr>\n</thead><tbody>';

  // 按 group 分组
  const groups = {};
  RPT_ROWS.forEach((r, i) => { (groups[r[0]] = groups[r[0]] || []).push(i); });

  const GRP_CLASS = { '效果': 'rpt-g-effect', '时长': 'rpt-g-duration', '上料数': 'rpt-g-feed' };
  let ci = 0;  // 全局计数，保证 data-ci 跨行唯一
  for (const [grp, idxs] of Object.entries(groups)) {
    const first = idxs[0];
    const trCls = GRP_CLASS[grp] || '';
    let ri = 0;
    idxs.forEach((riRel, gi) => {
      ri = riRel;
      const row = RPT_ROWS[riRel];
      const [, label, kpiKey, tgtKey, unit] = row;
      html += `<tr class="${trCls}">`;
      if (gi === 0) html += `<td class="rpt-grp" rowspan="${idxs.length}">${grp}</td>`;
      html += `<td class="rpt-lbl">${label}</td>`;
      // Each station
      for (const st of sites) {
        // 上周目标：优先取该站上周回滚目标，无上周数据时退到全站聚合
        const tgtPrev = (prevWeekTargets[st.name] && prevWeekTargets[st.name][tgtKey] != null)
          ? prevWeekTargets[st.name][tgtKey]
          : (aggPrevTargets[tgtKey] != null ? aggPrevTargets[tgtKey] : null);
        const actual = getKpiVal(st.kpi, kpiKey);
        const tgtNext = (report.siteTargets && report.siteTargets[st.name])
          ? (() => { let v = parseFloat(report.siteTargets[st.name][tgtKey]); if (isNaN(v)) return null; if (unit === '%' && v < 10) v = v * 100; return v; })() : null;
        html += `<td data-ci="${ci++}" data-st="${escHtml(st.name)}" data-col="prevTgt" data-key="${escHtml(kpiKey)}" data-unit="${escHtml(unit)}">${fmtTgt(tgtPrev, unit)}</td>`;
        html += `<td data-ci="${ci++}" data-st="${escHtml(st.name)}" data-col="actual" data-key="${escHtml(kpiKey)}" data-unit="${escHtml(unit)}">${fmtKpiVal(actual, unit, tgtPrev, kpiKey)}</td>`;
        html += tgtKey
          ? `<td data-ci="${ci++}" data-st="${escHtml(st.name)}" data-col="nextTgt" data-key="${escHtml(tgtKey)}" data-unit="${escHtml(unit)}" class="rpt-sep">${fmtTgt(tgtNext, unit)}</td>`
          : `<td data-ci="${ci++}" class="rpt-sep">${fmtTgt(tgtNext, unit)}</td>`;
      }
      // Aggregate cells
      const isEff = kpiKey === 'efficiencyRatio';
      const aggPrevTgt = (aggPrevTargets[tgtKey] != null) ? aggPrevTargets[tgtKey] : null;
      const aggActual = aggKpi ? getKpiVal(aggKpi, kpiKey) : null;
      const aggNextTgt = (aggNextTargets[tgtKey] != null) ? aggNextTargets[tgtKey] : null;
      html += `<td data-ci="${ci++}">${isEff ? '<span class="rpt-na">/</span>' : fmtTgt(aggPrevTgt, unit)}</td>`;
      html += `<td data-ci="${ci++}" data-metric="${kpiKey}">${isEff ? '<span class="rpt-na">/</span>' : fmtKpiVal(aggActual, unit, aggPrevTgt, kpiKey)}</td>`;
      html += `<td data-ci="${ci++}" class="rpt-sep">${isEff ? '<span class="rpt-na">/</span>' : fmtTgt(aggNextTgt, unit)}</td>`;
      // 前一周期 & 同比
      const prevVal = prevKpi ? getKpiVal(prevKpi, kpiKey) : null;
      html += `<td data-ci="${ci++}" class="rpt-sep">${fmtKpiVal(prevVal, unit, null, kpiKey)}</td>`;
      html += `<td data-ci="${ci++}" data-col="delta">${isEff ? '<span class="rpt-na">/</span>' : fmtDelta(aggActual, prevVal, unit, kpiKey)}</td>`;
      html += '</tr>';
    });
  }
  html += '</tbody></table></div>';
  return html;
}


// ── 查看/编辑 ──
// ── 周报导出 & 编辑 ──
let _rptEditing = false, _rptEditBackup = null, _rptCellState = {};

function toggleRptEdit() {
  const table = getRptTableEl();
  if (!table) return;
  const btn = document.getElementById('rptEditBtn');
  const toolWrap = document.getElementById('rptToolWrap');
  _rptEditing = !_rptEditing;
  if (_rptEditing) {
    // 进入编辑：捕获每个单元格的类名+内联样式（防止 contentEditable 破坏 span 后丢失）
    _rptCellState = {};
    table.querySelectorAll('td[data-ci]').forEach(td => {
      const ci = td.getAttribute('data-ci');
      const span = td.querySelector('span');
      _rptCellState[ci] = { c: span ? span.className : '', s: span ? span.style.cssText : '' };
    });
    table.querySelectorAll('td').forEach(td => {
      td.contentEditable = 'true';
      td.style.backgroundColor = '#fffbe6';
      td.style.outline = '1px dashed var(--accent)';
    });
    if (toolWrap) toolWrap.style.display = 'block';
    btn.textContent = '💾 保存';
  } else {
    const report = window.currentReport;
    if (!report) { _rptEditing = false; btn.textContent = '✏️ 编辑'; return; }
    exitBrush();
    table.querySelectorAll('td').forEach(td => { td.contentEditable = 'false'; td.style.backgroundColor = ''; td.style.outline = ''; });
    if (toolWrap) toolWrap.style.display = 'none';
    _rptEditing = false;
    btn.textContent = '✏️ 编辑';
    // 轻量快照：文字(当前编辑值) + 类名/样式(进入编辑时捕获 + 刷子改动)
    report.tableData = captureTableData(table, _rptCellState);
    // 同步：从表格"本周目标"列回写 siteTargets，保证二者一致
    syncSiteTargetsFromTable(table, report);
    delete report.tableHTML;
    ReportsAPI.update(report.id, report).then(async () => { await loadAndRenderReports(); viewReport(report.id); }).catch(e => { console.warn('保存失败', e); alert('保存失败: ' + (e.message||String(e))); });
  }
}

// 从表格"本周目标"列回写 siteTargets，使结构化目标与表格快照保持一致
function syncSiteTargetsFromTable(table, report) {
  if (!report.siteTargets) report.siteTargets = {};
  table.querySelectorAll('td[data-col="nextTgt"]').forEach(td => {
    const st = td.getAttribute('data-st');
    const key = td.getAttribute('data-key');
    const unit = td.getAttribute('data-unit') || '';
    if (!st || !key) return;
    if (!report.siteTargets[st]) report.siteTargets[st] = {};
    const txt = (td.textContent || '').trim();
    // 无目标（/、空、—）显式置空，清理残留旧值，避免下次渲染"复活"
    if (!txt || txt === '/' || txt === '—') {
      report.siteTargets[st][key] = '';
      return;
    }
    let num = parseFloat(txt.replace(/[^\d.\-]/g, ''));
    if (isNaN(num)) { report.siteTargets[st][key] = ''; return; }
    if (unit === '%') num = num / 100;  // 比率类存小数
    report.siteTargets[st][key] = num;
  });
}

// ── 刷子工具 ──
let _rptBrushTool = null, _painting = false;
const BRUSH_LABELS = {green:'绿色',red:'红色',orange:'橘色',bold:'加粗',reset:'复原',gray:'目标'};

function toggleRptTool() {
  // 刷子激活中则先退出；再切换下拉
  if (_rptBrushTool) exitBrush();
  const menu = document.getElementById('rptToolMenu');
  if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}
function setRptBrush(tool) {
  const menu = document.getElementById('rptToolMenu');
  if (menu) menu.style.display = 'none';
  _rptBrushTool = tool;
  const table = getRptTableEl();
  if (table) table.classList.add('brush-mode');
  const btn = document.getElementById('rptToolBtn');
  if (btn) btn.textContent = '🖌 ' + (BRUSH_LABELS[tool]||'') + ' ·点击退出';
}
function exitBrush() {
  _rptBrushTool = null;
  _painting = false;
  const table = getRptTableEl();
  if (table) table.classList.remove('brush-mode');
  const btn = document.getElementById('rptToolBtn');
  if (btn) btn.textContent = '🛠 工具';
  const menu = document.getElementById('rptToolMenu');
  if (menu) menu.style.display = 'none';
}
function ensureSpan(td) {
  let span = td.querySelector('span');
  if (!span) {
    span = document.createElement('span');
    span.className = 'rpt-v';
    span.textContent = td.textContent;
    td.innerHTML = '';
    td.appendChild(span);
  }
  return span;
}
function applyBrush(td) {
  if (!_rptBrushTool) return;
  const span = ensureSpan(td);
  const ci = td.getAttribute('data-ci');
  const tool = _rptBrushTool;
  if (tool === 'green') span.style.color = '#16a34a';
  else if (tool === 'red') span.style.color = '#dc2626';
  else if (tool === 'orange') span.style.color = '#f59e0b';
  else if (tool === 'gray') { span.style.color = 'var(--t3)'; span.style.fontWeight = '400'; }
  else if (tool === 'bold') span.style.fontWeight = (span.style.fontWeight === '700') ? '' : '700';
  else if (tool === 'reset') {
    // 复原：移除颜色/加粗类，强制黑色不加粗
    span.classList.remove('rpt-hit','rpt-miss','rpt-warn','rpt-na');
    span.style.color = '';
    span.style.fontWeight = '400';
  }
  // 同步状态快照，保证保存时捕获到刷子改动（含 className）
  if (ci != null) {
    if (!_rptCellState[ci]) _rptCellState[ci] = { c: span.className, s: '' };
    _rptCellState[ci].c = span.className;
    _rptCellState[ci].s = span.style.cssText;
  }
}
// 拖拽涂抹监听（常驻，仅在刷子激活时生效）
document.addEventListener('mousedown', function(e) {
  if (!_rptBrushTool) return;
  const td = e.target.closest && e.target.closest('td');
  const table = getRptTableEl();
  if (td && table && table.contains(td)) { _painting = true; e.preventDefault(); applyBrush(td); }
});
document.addEventListener('mouseover', function(e) {
  if (!_painting || !_rptBrushTool) return;
  const td = e.target.closest && e.target.closest('td');
  const table = getRptTableEl();
  if (td && table && table.contains(td)) applyBrush(td);
});
document.addEventListener('mouseup', function() { _painting = false; });


// ── 快照 ──
function getRptTableEl() {
  return document.querySelector('#reportTableWrap table');
}

// 轻量快照：每个 td[data-ci] 存 {文字, span 类名}，格式留在模板里
function captureTableData(table, stateMap) {
  const data = {};
  table.querySelectorAll('td[data-ci]').forEach(td => {
    const ci = td.getAttribute('data-ci');
    const span = td.querySelector('span');
    const c = (stateMap && stateMap[ci]) ? stateMap[ci].c : (span ? span.className : '');
    const s = (stateMap && stateMap[ci]) ? stateMap[ci].s : (span ? span.style.cssText : '');
    data[ci] = { t: td.textContent.trim(), c, s };
  });
  return data;
}

function applyTableData(table, data) {
  if (!data) return;
  table.querySelectorAll('td[data-ci]').forEach(td => {
    // 同比列始终实时计算，不应用旧快照（避免旧周报相对差与新绝对差口径混存）
    if (td.getAttribute('data-col') === 'delta') return;
    const ci = td.getAttribute('data-ci');
    const cell = data[ci];
    if (cell) {
      const styleAttr = cell.s ? ` style="${cell.s}"` : '';
      td.innerHTML = `<span class="${cell.c||''}"${styleAttr}>${cell.t}</span>`;
    }
  });
}


// ── 导出 ──
function toggleRptExport() {
  const menu = document.getElementById('rptExportMenu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function copyRptTable() {
  const table = getRptTableEl();
  if (!table) return alert('表格未找到');
  let tsv = '';
  table.querySelectorAll('tr').forEach(tr => {
    let row = [];
    tr.querySelectorAll('th,td').forEach(cell => {
      let txt = cell.textContent.replace(/\s+/g, ' ').trim();
      if (txt.includes(',') || txt.includes('\t')) txt = '"' + txt + '"';
      row.push(txt);
    });
    tsv += row.join('\t') + '\n';
  });
  navigator.clipboard.writeText(tsv).then(() => alert('✅ 已复制，可在 Excel 中粘贴')).catch(() => alert('复制失败，请重试'));
  toggleRptExport();
}

function exportRptExcel() {
  const table = getRptTableEl();
  if (!table) return alert('表格未找到');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>周报</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${table.outerHTML}</body></html>`;
  const blob = new Blob([html], {type:'application/vnd.ms-excel'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '运营周报.xls'; a.click();
  toggleRptExport();
}

async function exportRptPng() {
  const wrap = document.getElementById('reportTableWrap');
  if (!wrap) return alert('表格未找到');
  toggleRptExport(); // 先关闭下拉菜单，避免截到弹出层
  try {
    const canvas = await html2canvas(wrap, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    try {
      await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
      alert('✅ PNG 已复制到剪切板');
    } catch (_) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '运营周报.png'; a.click();
      alert('✅ PNG 已下载');
    }
  } catch (e) {
    console.error(e);
    alert('PNG 导出失败: ' + (e.message || String(e)));
  }
  toggleRptExport();
}


// ── 全站分析 ──
// ── 分析模块（编辑 & 导出）──
// 自动给分析 2~10 条的数字染色加粗：颜色取自表格"本周合计·上周完成"单元格的同指标颜色
const SECTION_METRIC = {2:'opHours',3:'autoFeed',4:'aiRate',5:'prodRate',6:'succRate',7:'abnRec',8:'prodCov',9:'autoVolCov',10:'faultFreq'};
function getTableMetricColor(kpiKey) {
  const cell = document.querySelector(`#reportTableWrap td[data-metric="${kpiKey}"]`);
  if (!cell) return null;
  const span = cell.querySelector('span');
  if (!span) return null;
  const cls = span.className || '';
  if (cls.indexOf('rpt-hit') >= 0) return '#16a34a';
  if (cls.indexOf('rpt-miss') >= 0) return '#dc2626';
  if (cls.indexOf('rpt-warn') >= 0) return '#f59e0b';
  return null; // 黑色（无目标/未达标逻辑不适用）
}
function autoColorAnalysis() {
  const ta = document.getElementById('reportAnalysisText');
  if (!ta) return;
  const parts = ta.innerHTML.split(/<br\s*\/?>/i);
  const out = parts.map(line => {
    const m = line.match(/^\s*(\d+)\./);
    if (!m) return line;
    const kpiKey = SECTION_METRIC[+m[1]];
    if (!kpiKey) return line;
    const color = getTableMetricColor(kpiKey);
    // 每条只格式化前 N 个"数字+单位"：第3条1个，其余2个
    const limit = (+m[1] === 3) ? 1 : 2;
    let count = 0;
    return line.replace(/(\d{1,3}(?:,\d{3})+|\d+\.?\d*)\s*(次\/h|h|次|%)/g, (match) => {
      count++;
      if (count > limit) return match;  // 超出限制，原样不格式化
      const style = 'font-weight:700' + (color ? ';color:' + color : '');
      return `<span style="${style}">${match}</span>`;
    });
  });
  ta.innerHTML = out.join('<br>');
}

// ── 站点卡导出：离线样板模板（蓝渐变首栏 + 三模块 + 无交互按钮）──
// 不用页面 DOM 截图：页面样式含 color-mix/Grid，html2canvas 不支持；模板用 table 布局 + 静态色，保证导出稳定
const SC_EXPORT_CSS = `
.x-page{width:1400px;background:#f2f5f9;padding:24px;box-sizing:border-box;color:#17243a;font-family:"Microsoft YaHei","Segoe UI",sans-serif}
.x-station{background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 8px 26px rgba(32,51,79,.05)}
.x-head{display:flex;align-items:center;background:#17669a;background:linear-gradient(110deg,#123c70,#17669a);color:#fff;padding:16px 22px}
.x-name{font-size:21px;font-weight:800}
.x-stage{margin-left:10px;padding:4px 9px;border:1px solid rgba(255,255,255,.25);border-radius:20px;background:rgba(255,255,255,.08);font-size:11px;font-weight:600}
.x-week{margin-left:10px;padding-left:12px;border-left:1px solid rgba(255,255,255,.19);font-size:12px;opacity:.85}
.x-score{margin-left:auto;text-align:right;padding-left:20px;border-left:1px solid rgba(255,255,255,.2)}
.x-score b{font-size:24px}.x-score small{font-size:13px;opacity:.7}.x-score span{display:block;font-size:11px;opacity:.7}
.x-body{padding:16px 18px 18px}
.x-row{padding:12px;border:1px solid #dce5f0;border-radius:14px;background:#fbfcfe;margin-bottom:12px}
.x-cls{display:flex}
.x-cl{min-width:0}
.x-cl+.x-cl{margin-left:12px}
.x-cl-head{font-size:13px;font-weight:800;margin:0 0 8px;color:#334155}
.x-cl-head i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:8px;vertical-align:1px}
.x-cards{display:flex}
.x-c{flex:1 1 0;min-width:0;display:flex}
.x-c+.x-c{margin-left:8px}
.dcard{flex:1;display:flex;flex-direction:column;border:1px solid #e2e8f0;border-left:4px solid #a0aec0;border-radius:11px;background:#fff;padding:12px 12px 10px;box-sizing:border-box}
.dcard.hit{border-left-color:#16a34a}.dcard.near{border-left-color:#d97706}.dcard.miss{border-left-color:#dc2626}.dcard.na{border-left-color:#a0aec0}
.dcard-name{font-size:13px;font-weight:700;line-height:1.3}
.dcard-chip{display:inline-block;vertical-align:1px;margin-right:6px;padding:2px 7px;border-radius:9px;background:#2563eb;color:#fff;font-size:9.5px;font-weight:800}
.dcard-tag{float:right;padding:2px 7px;border-radius:9px;font-size:9.5px;font-weight:800;white-space:nowrap}
.dcard.hit .dcard-tag{color:#16a34a;background:rgba(22,163,74,.09)}
.dcard.near .dcard-tag{color:#d97706;background:rgba(217,119,6,.09)}
.dcard.miss .dcard-tag{color:#dc2626;background:rgba(220,38,38,.09)}
.dcard.na .dcard-tag{color:#a0aec0;background:rgba(160,174,192,.12)}
.x-val{display:flex;align-items:flex-end;flex:1;min-height:66px;margin:8px 0 10px;font-family:"Bahnschrift","DIN Alternate","Arial Narrow","Segoe UI",sans-serif}
.x-vcol{min-width:0}
.x-vnum{font-size:34px;font-weight:900;line-height:1;letter-spacing:-.5px}
.x-vunit{font-size:13px;font-weight:700;color:#718096;margin-left:5px}
.x-vsub{font-size:9.5px;color:#718096;margin-top:5px;white-space:nowrap}
.x-rate{margin-left:auto;flex:none;text-align:right;padding:4px 10px 5px;border-radius:8px;border:1px solid rgba(160,174,192,.4);background:rgba(160,174,192,.05)}
.dcard.hit .x-rate{border-color:rgba(22,163,74,.38);background:rgba(22,163,74,.05)}
.dcard.near .x-rate{border-color:rgba(217,119,6,.38);background:rgba(217,119,6,.05)}
.dcard.miss .x-rate{border-color:rgba(220,38,38,.38);background:rgba(220,38,38,.05)}
.x-rate .rl{font-size:9.5px;color:#718096}
.x-rate b{display:block;font-size:19px;font-weight:900;line-height:1.05}
.dcard.hit .x-rate b{color:#16a34a}.dcard.near .x-rate b{color:#d97706}.dcard.miss .x-rate b{color:#dc2626}.dcard.na .x-rate b{color:#a0aec0}
.x-rate .rt{margin-top:2px;padding-top:2px;border-top:1px dashed rgba(0,0,0,.12);font-size:10px;color:#718096;white-space:nowrap}
.x-meta{display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #edf1f5;padding-top:8px;min-height:32px}
.x-prev{font-size:9.5px;color:#718096}
.x-prev b{display:block;margin-top:2px;font-size:13px;font-weight:800;color:#3b4a63}
.x-delta{flex:none;padding:3px 9px;border-radius:9px;font-size:11px;font-weight:800;white-space:nowrap}
.x-delta.up{color:#16a34a;background:rgba(22,163,74,.1)}
.x-delta.down{color:#dc2626;background:rgba(220,38,38,.1)}
.x-delta.flat{color:#718096;background:#f1f5f9}
.dcard.primary{border:2px solid #2563eb;border-left-width:5px;background:#f5f9ff;background:linear-gradient(180deg,#eef5ff,#ffffff 55%);box-shadow:0 10px 24px rgba(37,99,235,.14)}
.dcard.primary .dcard-name{color:#174ea6;font-size:14px}
.dcard.primary .x-vnum{font-size:46px;color:#174ea6}
.dcard.primary .x-rate b{font-size:23px}
.x-mods{display:flex;align-items:stretch;margin-top:4px}
.x-mod-l{display:flex;flex-direction:column;min-width:0}
.x-mod-bi{display:flex;min-width:0;margin-left:12px}
.x-mod-box{display:flex;flex-direction:column;flex:1;border:1px solid #e2e8f0;border-radius:12px;background:#fbfcfe;padding:14px;box-sizing:border-box}
.x-mod-l .x-mod-box+.x-mod-box{margin-top:12px}
.x-mod-box h3{margin:0 0 10px;font-size:13px}
.x-text{flex:1;border:1px dashed #cbd5e1;border-radius:8px;background:#fff;color:#526177;font-size:12px;line-height:1.7;padding:10px;min-height:96px;white-space:pre-wrap;word-break:break-word;box-sizing:border-box}
.x-bi{flex:1;border:1px dashed #aebbd0;border-radius:9px;background:#fff;padding:8px;min-height:250px;text-align:center;box-sizing:border-box}
.x-bi img{max-width:100%;border-radius:6px}
.x-bi .none{color:#718096;font-size:12px;padding:60px 0}
`;
function _scExportMetricHtml(key, mk, subText, grow) {
  const def = mk.def;
  const vTxt = mk.v != null ? _scFmt(mk.v, def.unit) : '—';
  const rateHtml = mk.t != null
    ? `<span class="rl">达成率</span><b>${mk.rate != null ? mk.rate.toFixed(1) : '—'}%</b><div class="rt">÷ 目标 ${_scFmt(mk.t, def.unit)}${_scUnit(def.unit)}</div>`
    : `<span class="rl">达成率</span><b>—</b><div class="rt">目标未设</div>`;
  const growAttr = grow ? ' style="flex:' + grow + '"' : '';
  return `<div class="x-c"${growAttr}><div class="dcard ${mk.state}${def.primary ? ' primary' : ''}">
    <div><span class="dcard-tag">${mk.label}</span>${def.primary ? '<span class="dcard-chip">核心指标</span>' : ''}<span class="dcard-name">${def.name}</span></div>
    <div class="x-val">
      <div class="x-vcol"><div><span class="x-vnum">${vTxt}</span><span class="x-vunit">${_scUnit(def.unit)}</span></div>${subText ? `<div class="x-vsub">${escHtml(subText)}</div>` : (SC_EMPTY_SUB.includes(key) ? '<div class="x-vsub" style="visibility:hidden">&nbsp;</div>' : '')}</div>
      <div class="x-rate">${rateHtml}</div>
    </div>
    <div class="x-meta">
      <div class="x-prev">上周<b>${mk.p != null ? _scFmt(mk.p, def.unit) + _scUnit(def.unit) : '—'}</b></div>
      <span class="x-delta ${mk.dc}">环比 ${mk.d != null ? mk.dt : '—'}</span>
    </div>
  </div></div>`;
}
function _scExportHtml(m) {
  const G = {};
  SC_GROUPS.forEach(g => { G[g.title] = g; });
  const cluster = (g, flex) => {
    const cards = g.keys.map((k, i) => _scExportMetricHtml(k, m.metrics[k], m.subs[k], g.cls === 'level' && i === 0 ? '1.3' : null)).join('');
    const flexAttr = ' style="flex:' + (flex || '1') + '"';
    return `<div class="x-cl"${flexAttr}>
      <div class="x-cl-head"><i style="background:${g.tone}"></i>${g.title}</div>
      <div class="x-cards">${cards}</div>
    </div>`;
  };
  const text = t => escHtml(t || '暂未提供。');
  return `<div class="x-page"><section class="x-station">
    <header class="x-head">
      <span class="x-name">${escHtml(m.st)}站周报</span>${m.stage ? `<span class="x-stage">${escHtml(m.stage)}</span>` : ''}<span class="x-week">${escHtml(m.weekRange)}</span>
      <div class="x-score"><b>${m.hit}<small> / 8</small></b><span>目标指标达标</span></div>
    </header>
    <div class="x-body">
      <div class="x-row"><div class="x-cls">${cluster(G['自动化水平'], '1.1')}${cluster(G['稳定性'], '1')}</div></div>
      <div class="x-row"><div class="x-cls">${cluster(G['运营量级'], '2')}${cluster(G['生产覆盖'], '1')}${cluster(G['自动化效率'], '1')}</div></div>
      <div class="x-mods">
        <div class="x-mod-l" style="flex:.68">
          <div class="x-mod-box"><h3>手动接管及异常原因</h3><div class="x-text">${text(m.manualText)}</div></div>
          <div class="x-mod-box"><h3>本周重点</h3><div class="x-text">${text(m.focusText)}</div></div>
        </div>
        <div class="x-mod-bi" style="flex:1.32"><div class="x-mod-box"><h3>数据看板</h3>
          <div class="x-bi">${m.image ? `<img src="${m.image}" alt="">` : '<div class="none">暂无截图</div>'}</div>
        </div></div>
      </div>
    </div>
  </section></div>`;
}
// 整卡截图：用离线样板模板渲染后 html2canvas（自动填充三模块，无交互按钮）
async function _captureStationCard(report, station) {
  const m = _scBuildModel(report, station);
  const clone = document.createElement('div');
  clone.style.cssText = 'position:fixed;left:-9999px;top:0;';
  clone.innerHTML = '<style>' + SC_EXPORT_CSS + '</style>' + _scExportHtml(m);
  document.body.appendChild(clone);
  const ci = clone.querySelector('.x-bi img');
  if (ci) { try { await new Promise(r => { ci.onload = r; ci.onerror = r; }); } catch(e) {} await new Promise(r => setTimeout(r, 300)); }
  try {
    return await html2canvas(clone.querySelector('.x-page'), { backgroundColor: '#f2f5f9', scale: 2, logging: false, useCORS: true });
  } finally { clone.remove(); }
}
// 一键导出：站点数据卡（样板版式）导出为 PNG（复制到剪切板，失败则下载）
async function exportStationCard(btn, station) {
  const report = window.currentReport;
  if (!report) return;
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = '导出中...';
  try {
    const canvas = await _captureStationCard(report, station);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); alert('✅ PNG 已复制到剪切板'); }
    catch (_) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = station + '-站点周报.png'; a.click(); alert('✅ PNG 已下载'); }
  } catch (e) { console.error(e); alert('导出失败: ' + (e.message || String(e))); }
  finally { btn.disabled = false; btn.textContent = orig; }
}

async function generateAnalysis() {
  const ta = document.getElementById('reportAnalysisText');
  const btn = document.getElementById('analysisGenBtn');
  if (!ta || !btn) return;
  // 只传表格 TSV；分析框架/输出格式由后端 overview-skill.md 作为 system prompt 提供
  const table = getRptTableEl();
  if (!table) return alert('表格未生成');
  const rows = [];
  table.querySelectorAll('tr').forEach(tr => {
    const cells = [];
    tr.querySelectorAll('th,td').forEach(cell => cells.push(cell.textContent.trim()));
    rows.push(cells.join('\t'));
  });
  const prompt = `以下是本周运营数据一览表格（TSV 格式，含各站上周目标/上周完成/本周目标、本周合计、前一周期、同比前一周变化）：\n\n${rows.join('\n')}\n\n请按 skill 要求一次性输出全站总览分析的10条内容。`;
  btn.disabled = true; btn.textContent = '分析中...';
  try {
    const r = await fetch('/api/analyze-table', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({prompt}) });
    const data = await r.json();
    if (data.success) {
      ta.innerHTML = data.text.replace(/\n/g,'<br>');
      autoColorAnalysis();  // 自动给 2~10 条的数字染色加粗（颜色取自表格同指标）
      ta.contentEditable = 'true';
      document.getElementById('analysisEditBtn').textContent = '💾 保存';
      const tw = document.getElementById('analysisToolWrap'); if (tw) tw.style.display = 'block';
      // 自动保存（存 HTML，含染色 span）
      const report = window.currentReport;
      if (report) { report.analysis = ta.innerHTML; ReportsAPI.update(report.id, report).catch(function(){}); }
    } else {
      alert('分析失败: ' + (data.error || '未知错误'));
    }
  } catch(e) { alert('请求失败: ' + (e.message||String(e))); }
  finally { btn.disabled = false; btn.textContent = '🤖 生成全站分析'; }
}

function toggleAnalysisEdit() {
  const ta = document.getElementById('reportAnalysisText');
  const btn = document.getElementById('analysisEditBtn');
  const tw = document.getElementById('analysisToolWrap');
  if (!ta || !btn) return;
  if (ta.contentEditable !== 'true') {
    // 进入编辑
    ta.contentEditable = 'true';
    btn.textContent = '💾 保存';
    if (tw) tw.style.display = 'block';
    return;
  }
  // 保存：退出刷子，锁定，存 HTML
  exitAnalysisBrush();
  ta.contentEditable = 'false';
  btn.textContent = '✏️ 编辑';
  if (tw) tw.style.display = 'none';
  const r = window.currentReport;
  if (r) { r.analysis = ta.innerHTML; ReportsAPI.update(r.id, r).catch(function(){}); }
}

function copyAnalysisText() {
  const ta = document.getElementById('reportAnalysisText');
  navigator.clipboard.writeText(ta ? ta.innerText : '').then(() => alert('✅ 已复制')).catch(() => alert('复制失败'));
}

// ── 其他事项模块（编辑 + 导出 + 工具，逻辑同全站分析）──
function toggleOmEdit() {
  const ta = document.getElementById('reportOtherMattersText');
  const btn = document.getElementById('omEditBtn');
  const tw = document.getElementById('omToolWrap');
  if (!ta || !btn) return;
  if (ta.contentEditable !== 'true') {
    ta.contentEditable = 'true';
    btn.textContent = '💾 保存';
    if (tw) tw.style.display = 'block';
    ta.focus();
  } else {
    if (_brushTool && _brushTarget === ta) exitBrushTool();
    ta.contentEditable = 'false';
    btn.textContent = '✏️ 编辑';
    if (tw) tw.style.display = 'none';
    const r = window.currentReport;
    if (r) { r.otherMatters = ta.innerHTML; ReportsAPI.update(r.id, r).catch(function(){}); }
  }
}
function toggleOmTool() {
  if (_brushTool) exitBrushTool();
  const menu = document.getElementById('omToolMenu');
  if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}
function setOmBrush(tool) {
  const menu = document.getElementById('omToolMenu');
  if (menu) menu.style.display = 'none';
  setBrushTool(tool, document.getElementById('reportOtherMattersText'), document.getElementById('omToolBtn'));
}
function copyOmText() {
  const ta = document.getElementById('reportOtherMattersText');
  navigator.clipboard.writeText(ta ? ta.innerText : '').then(() => alert('✅ 已复制')).catch(() => alert('复制失败'));
  document.getElementById('omExportMenu').style.display = 'none';
}
async function exportOmPng() {
  const div = document.getElementById('reportOtherMatters');
  const ta = document.getElementById('reportOtherMattersText');
  if (!div || !ta) return alert('其他事项模块未展开');
  document.getElementById('omExportMenu').style.display = 'none';
  const clone = document.createElement('div');
  clone.style.cssText = 'position:fixed;left:-9999px;top:0;width:948px;padding:24px 22px;background:#ffffff;color:#222;font-family:"Microsoft YaHei","PingFang SC",sans-serif;font-size:16px;line-height:1.85;box-sizing:border-box;';
  clone.innerHTML =
    '<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:6px;">其他事项</div>' +
    '<div style="color:#222;white-space:pre-wrap;word-break:break-word;">' + ta.innerHTML + '</div>';
  document.body.appendChild(clone);
  try {
    const canvas = await html2canvas(clone, { backgroundColor: '#ffffff', scale: 2, logging: false, useCORS: true });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); alert('✅ PNG 已复制到剪切板'); }
    catch (_) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '其他事项.png'; a.click(); alert('✅ PNG 已下载'); }
  } catch(e) { console.error(e); alert('PNG 导出失败: ' + (e.message||String(e))); }
  finally { clone.remove(); }
}

// ── 分析模块刷子（作用于 contentEditable div 内的文本选区）──
// 统一文本刷子（目标感知）：报告分析 + 各站点卡分析共用
let _brushTool = null, _brushTarget = null, _brushBtn = null;
const BRUSH_COLORS = {green:'#16a34a', red:'#dc2626', orange:'#f59e0b', gray:null};
function _grayColor() {
  try { return getComputedStyle(document.documentElement).getPropertyValue('--t3').trim() || '#888'; }
  catch(e) { return '#888'; }
}
function setBrushTool(tool, target, btn) {
  _brushTool = tool; _brushTarget = target; _brushBtn = btn;
  if (target) { target.style.cursor = 'crosshair'; target.style.userSelect = 'text'; }
  if (btn) btn.textContent = '🖌 ' + (BRUSH_LABELS[tool]||'') + ' ·点击退出';
}
function exitBrushTool() {
  if (_brushTarget) _brushTarget.style.cursor = '';
  if (_brushBtn) _brushBtn.textContent = '🛠 工具';
  _brushTool = null; _brushTarget = null; _brushBtn = null;
}
// 报告级分析（兼容旧接口）
function toggleAnalysisTool() {
  if (_brushTool) exitBrushTool();
  const menu = document.getElementById('analysisToolMenu');
  if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}
function setAnalysisBrush(tool) {
  const menu = document.getElementById('analysisToolMenu');
  if (menu) menu.style.display = 'none';
  setBrushTool(tool, document.getElementById('reportAnalysisText'), document.getElementById('analysisToolBtn'));
}
function exitAnalysisBrush() {
  exitBrushTool();
  const menu = document.getElementById('analysisToolMenu');
  if (menu) menu.style.display = 'none';
}
// 拖选文本后松开 → 对选区应用格式（统一作用于当前 _brushTarget）
document.addEventListener('mouseup', function() {
  if (!_brushTool || !_brushTarget) return;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!_brushTarget.contains(range.commonAncestorContainer)) return;
  if (_brushTarget.contentEditable !== 'true') return;
  _brushTarget.focus();
  const tool = _brushTool;
  if (tool === 'bold') document.execCommand('bold');
  else if (tool === 'reset') document.execCommand('removeFormat');
  else if (tool === 'gray') document.execCommand('foreColor', false, _grayColor());
  else if (BRUSH_COLORS[tool]) document.execCommand('foreColor', false, BRUSH_COLORS[tool]);
});
// 从表格 DOM 读取某站编辑后的指标值（actual=上周完成, target=上周目标）
function readStationFromTable(station) {
  const table = getRptTableEl();
  if (!table) return null;
  const parse = (text) => {
    if (!text) return null;
    const t = text.replace(/[^\d.\-]/g, '').trim();
    if (!t) return null;
    const n = parseFloat(t);
    return isNaN(n) ? null : n;
  };
  const q = (col, key) => {
    const cell = table.querySelector('td[data-st="' + station + '"][data-col="' + col + '"][data-key="' + key + '"]');
    return cell ? parse(cell.textContent) : null;
  };
  const ratio = (v) => v != null ? v / 100 : null;  // 显示% → 比率
  return {
    actual: {
      aiRate: ratio(q('actual','aiRate')), prodRate: ratio(q('actual','prodRate')),
      succRate: ratio(q('actual','succRate')), abnRec: ratio(q('actual','abnRec')),
      prodCov: ratio(q('actual','prodCov')), autoVolCov: ratio(q('actual','autoVolCov')),
      effRatio: ratio(q('actual','efficiencyRatio')),
      opHours: q('actual','opHours'), autoFeedTotal: q('actual','autoFeedTotal'),
      manualFeed: q('actual','manualFeed'), opDays: q('actual','opDays'),
    },
    target: {
      aiRate: q('prevTgt','aiRate'), prodRate: q('prevTgt','prodRate'),
      succRate: q('prevTgt','succRate'), abnRec: q('prevTgt','abnRec'),
      prodCov: q('prevTgt','prodCov'), autoVolCov: q('prevTgt','autoVolCov'),
      effRatio: q('prevTgt','efficiencyRatio'),
      opHours: q('prevTgt','opHours'), autoFeed: q('prevTgt','autoFeedTotal'),
    }
  };
}
// 一键生成：按 BI + 表格数据重新生成该站分析（覆盖当前内容）
async function regenStationAnalysis(btn, station) {
  const report = window.currentReport;
  if (!report) return;
  const sdOrig = (report.siteDetails || []).find(s => s.station === station);
  if (!sdOrig) { alert('站点数据未找到'); return; }
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = '生成中...';
  try {
    // 从表格读取编辑后的值（7 效果指标 + 运营天数 + 上料数 + 上周目标）
    const tv = readStationFromTable(station);
    const sd = Object.assign({}, sdOrig);  // 克隆，不污染冻结数据
    let prevTarget = null;
    if (tv) {
      ['aiRate','prodRate','succRate','abnRec','prodCov','autoVolCov'].forEach(k => { if (tv.actual[k] != null) sd[k] = tv.actual[k]; });
      if (tv.actual.effRatio != null) sd.efficiencyRatio = tv.actual.effRatio;
      if (tv.actual.opHours != null) sd.opTime = tv.actual.opHours;
      if (tv.actual.autoFeedTotal != null) sd.autoFeed = tv.actual.autoFeedTotal;
      if (tv.actual.manualFeed != null) sd.manualFeed = tv.actual.manualFeed;
      prevTarget = tv.target;  // 用表格编辑后的上周目标
    }
    // 取 BI 作业总时长
    let workHours = null;
    try {
      const r = await fetch('/api/bi-export', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ site_name: station, start_date: report.dateRange.start, end_date: report.dateRange.end }) });
      const d = await r.json();
      if (d.success && d.map && d.map['作业总时长'] != null) workHours = d.map['作业总时长'];
    } catch(e) {}
    // 运营天数（表格优先，回退 records）
    const opDays = (tv && tv.actual.opDays != null) ? tv.actual.opDays
      : new Set(store.filter(r => r.station === station && r.date >= report.dateRange.start && r.date <= report.dateRange.end).map(r => r.date)).size;
    // 生成并更新（继承手动填写的两段，避免覆盖文本模块内容）
    let text = buildStationAutoAnalysis(sd, prevTarget, opDays, workHours);
    const prevAnalysis = (report.siteCards && report.siteCards[station] && report.siteCards[station].analysis) || '';
    const manualPart = extractManualPart(prevAnalysis, '手动接管及异常原因');
    const focusPart = extractManualPart(prevAnalysis, '本周重点');
    if (manualPart) text = text.replace('手动接管及异常原因：暂未提供。', '手动接管及异常原因：' + manualPart);
    if (focusPart) text = text.replace('本周重点：暂未提供。', '本周重点：' + focusPart);
    if (!report.siteCards) report.siteCards = {};
    if (!report.siteCards[station]) report.siteCards[station] = {};
    report.siteCards[station].analysis = text;
    // 表格编辑值同步回 siteDetails 快照，让站点数据卡随"一键生成"刷新
    ['aiRate','prodRate','succRate','abnRec','prodCov','autoVolCov','efficiencyRatio','opTime','autoFeed','manualFeed'].forEach(k => {
      if (sd[k] != null) sdOrig[k] = sd[k];
    });
    await ReportsAPI.update(report.id, report);
    renderStationCards(report);
  } catch(e) { alert('生成失败: ' + (e.message || e)); }
  finally { btn.disabled = false; btn.textContent = orig; }
}
document.addEventListener('click', function(e) {
  const tw = document.getElementById('analysisToolWrap');
  if (tw && !tw.contains(e.target)) {
    const m = document.getElementById('analysisToolMenu');
    if (m) m.style.display = 'none';
  }
  // 关闭所有站点卡工具菜单（点在 wrap 外的）
  document.querySelectorAll('.sc-tool-wrap').forEach(w => {
    if (!w.contains(e.target)) { const m = w.querySelector('.sc-tool-menu'); if (m) m.style.display = 'none'; }
  });
  // 关闭其他事项导出菜单
  const omw = document.getElementById('omExportWrap');
  if (omw && !omw.contains(e.target)) { const m = document.getElementById('omExportMenu'); if (m) m.style.display = 'none'; }
});

async function exportAnalysisPng() {
  const div = document.getElementById('reportAnalysis');
  const ta = document.getElementById('reportAnalysisText');
  if (!div || !ta) return alert('分析模块未展开');
  document.getElementById('rptExportMenu2').style.display = 'none';
  // 预排版：离屏窄容器 + 放大字号(微信阅读档~16px)，生成纵向图，前端 UI 不变
  const report = window.currentReport;
  const dateRange = report && report.dateRange ? `${report.dateRange.start} ~ ${report.dateRange.end}` : '';
  const clone = document.createElement('div');
  clone.style.cssText = 'position:fixed;left:-9999px;top:0;width:948px;padding:24px 22px;background:#ffffff;color:#222;font-family:"Microsoft YaHei","PingFang SC",sans-serif;font-size:16px;line-height:1.85;box-sizing:border-box;';
  clone.innerHTML =
    '<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:6px;">本周全站分析一览</div>' +
    '<div style="font-size:13px;color:#888;margin-bottom:16px;">' + dateRange + '</div>' +
    '<div style="color:#222;white-space:pre-wrap;word-break:break-word;">' + ta.innerHTML + '</div>';
  document.body.appendChild(clone);
  try {
    const canvas = await html2canvas(clone, { backgroundColor: '#ffffff', scale: 2, logging: false, useCORS: true });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    try { await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]); alert('✅ PNG 已复制到剪切板'); }
    catch (_) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '全站分析.png'; a.click(); alert('✅ PNG 已下载'); }
  } catch(e) { console.error(e); alert('PNG 导出失败: ' + (e.message||String(e))); }
  finally { clone.remove(); }
}

function toggleReportAnalysis() {
  const div = document.getElementById('reportAnalysis');
  div.style.display = div.style.display === 'none' ? 'block' : 'none';
}


// ── 查看/列表 ──
// ── 周报预览（自动截图各板块嵌入，可编辑 + 复制到剪切板）──
const STATION_DISPLAY = {
  '104': '#104站', '宜涪': '#宜涪站', '嘉兴': '#嘉兴站', '知行良知': '#知行良知',
  '舟山电厂': '#舟山电厂', '兴发': '#兴发盐库', '长赣': '#江西长赣',
  '甘肃路桥': '#甘肃路桥', '波然': '#中铁20局-波然'
};
// 通用：克隆 → html2canvas → dataURL
async function _capture(clone) {
  document.body.appendChild(clone);
  const ci = clone.querySelector('img');
  if (ci) { await new Promise(r => { ci.onload = r; ci.onerror = r; }); await new Promise(r => setTimeout(r, 300)); }
  try { const canvas = await html2canvas(clone, { backgroundColor: '#ffffff', scale: 2, logging: false, useCORS: true }); return canvas.toDataURL('image/png'); }
  finally { clone.remove(); }
}
function _makeClone(title, bodyHTML, dateRange) {
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;left:-9999px;top:0;width:948px;padding:24px 22px;background:#ffffff;color:#222;font-family:"Microsoft YaHei","PingFang SC",sans-serif;font-size:16px;line-height:1.85;box-sizing:border-box;';
  let h = '<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:6px;">' + title + '</div>';
  if (dateRange) h += '<div style="font-size:13px;color:#888;margin-bottom:16px;">' + dateRange + '</div>';
  h += bodyHTML;
  c.innerHTML = h;
  return c;
}
async function openReportPreview() {
  const report = window.currentReport;
  if (!report) return alert('请先打开一份周报');
  const el = document.getElementById('reportPreviewContent');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;color:#888;padding:60px 0;">正在生成预览图片，请稍候…</div>';
  document.getElementById('ovReportPreview').classList.add('show');
  const dateRange = report.dateRange ? report.dateRange.start + ' ~ ' + report.dateRange.end : '';
  let html = '@日报<br>装载机运营周报：<br>';
  try {
    // 1. 全站分析一览
    const ta = document.getElementById('reportAnalysisText');
    if (ta && ta.innerHTML.trim()) {
      const url = await _capture(_makeClone('本周全站分析一览', '<div style="color:#222;white-space:pre-wrap;word-break:break-word;">' + ta.innerHTML + '</div>', dateRange));
      if (url) html += '<img src="' + url + '" style="max-width:100%;border-radius:6px;"><br>';
    }

    // 2. 本周运营数据一览表格（先按自然宽度截图，再等比缩到 948px）
    html += '各站点运营明细数据请见下表：<br>';
    const tw = document.getElementById('reportTableWrap');
    if (tw) {
      const origCanvas = await html2canvas(tw, { backgroundColor: '#ffffff', scale: 2, logging: false, useCORS: true });
      const ow = origCanvas.width, oh = origCanvas.height;
      const tw2 = 948 * 2, th2 = Math.round(oh * (tw2 / ow));
      const sc = document.createElement('canvas');
      sc.width = tw2; sc.height = th2;
      const sctx = sc.getContext('2d');
      sctx.fillStyle = '#ffffff'; sctx.fillRect(0, 0, tw2, th2);
      sctx.drawImage(origCanvas, 0, 0, tw2, th2);
      html += '<img src="' + sc.toDataURL('image/png') + '" style="max-width:100%;border-radius:6px;"><br>';
    }
    // 3. 各站点（样板模板整卡截图）
    const sites = (report.siteDetails || []).map(sd => sd.station);
    for (const st of sites) {
      const dn = STATION_DISPLAY[st] || '#' + st + '站';
      html += '<div style="font-size:15px;margin-top:8px;">' + dn + '</div><br>';
      const canvas = await _captureStationCard(report, st);
      html += '<img src="' + canvas.toDataURL('image/png') + '" style="max-width:100%;border-radius:6px;"><br>';
    }

    // 4. 其他事项（直接导出文字，不截图）
    const om = document.getElementById('reportOtherMattersText');
    if (om && om.innerText.trim()) {
      html += '<div>其他事项：<br>' + om.innerText + '</div>';
    }
  } catch(e) { console.error('预览生成失败', e); html += '<div style="color:red;">部分图片生成失败: ' + (e.message||e) + '</div>'; }
  el.innerHTML = html;
}
function copyReportPreview() {
  const el = document.getElementById('reportPreviewContent');
  if (!el) return;
  // 选中全部内容，用 execCommand 复制（图文混合走剪贴板）
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  try {
    document.execCommand('copy');
    sel.removeAllRanges();
    alert('✅ 已复制到剪切板（含图片）');
  } catch(e) {
    sel.removeAllRanges();
    // 降级：仅复制文字
    navigator.clipboard.writeText(el.innerText).then(() => alert('✅ 已复制文字（图片需手动粘贴）')).catch(() => alert('复制失败'));
  }
}

function viewReport(reportId) {
  const report = weeklyReports.find(r => r.id === reportId);
  if (!report) { alert('周报不存在'); return; }

  document.getElementById('reportViewPageTitle').textContent = report.reportName;
  document.getElementById('reportViewPageInfo').innerHTML = `
    <div style="color:var(--t2);font-size:13px">
      <strong>日期区间：</strong>${report.dateRange.start} 至 ${report.dateRange.end} &nbsp;&nbsp;
      <strong>生成时间：</strong>${report.createdAt}
    </div>`;
  // 恢复分析（contentEditable div）
  const analysisDiv = document.getElementById('reportAnalysis');
  const analysisText = document.getElementById('reportAnalysisText');
  const analysisToolWrap = document.getElementById('analysisToolWrap');
  if (report.analysis) {
    analysisDiv.style.display = 'block';
    // 旧数据是纯文本（无标签）则把换行转 <br>
    const html = report.analysis.includes('<br') || report.analysis.includes('<span') ? report.analysis : report.analysis.replace(/\n/g,'<br>');
    analysisText.innerHTML = html;
    analysisText.contentEditable = 'false';
    document.getElementById('analysisEditBtn').textContent = '✏️ 编辑';
    if (analysisToolWrap) analysisToolWrap.style.display = 'none';
  } else {
    analysisDiv.style.display = 'none';
    analysisText.innerHTML = '';
    analysisText.contentEditable = 'false';
    document.getElementById('analysisEditBtn').textContent = '💾 保存';
    if (analysisToolWrap) analysisToolWrap.style.display = 'none';
  }
  document.getElementById('reportTableWrap').innerHTML = buildReportTable(report);
  // 应用轻量快照：覆盖单元格文字 + 颜色
  if (report.tableData) {
    const t = getRptTableEl();
    if (t) applyTableData(t, report.tableData);
  }
  renderStationCards(report);
  // 恢复其他事项
  const omDiv = document.getElementById('reportOtherMatters');
  const omText = document.getElementById('reportOtherMattersText');
  if (omDiv && omText) {
    if (report.otherMatters) {
      omDiv.style.display = 'block';
      const omHtml = report.otherMatters.includes('<br') || report.otherMatters.includes('<span') ? report.otherMatters : report.otherMatters.replace(/\n/g,'<br>');
      omText.innerHTML = omHtml;
    } else {
      omDiv.style.display = 'block';
      omText.innerHTML = '';
    }
    omText.contentEditable = 'false';
  }
  window.currentReport = report;
  switchPage('reportView');
}

// ── 各站点子模块（纯数据卡片版：两行指标卡 + 双文本模块 + 数据看板）──
// 指标定义：value 取自 siteDetails（比率类为 0-1 小数），target 取自上周周报 siteTargets（getPrevWeekTargets 返回显示%）
const SC_METRIC_DEF = {
  aiRate:   { name:'AI时长接管率',       unit:'%', get:sd=>sd.aiRate,          tgt:'aiRate',   rate:true, primary:true },
  prodRate: { name:'生产任务接管率',     unit:'%', get:sd=>sd.prodRate,        tgt:'prodRate', rate:true },
  succRate: { name:'任务成功率',         unit:'%', get:sd=>sd.succRate,        tgt:'succRate', rate:true },
  abnRec:   { name:'异常任务远程恢复率', unit:'%', get:sd=>sd.abnRec,          tgt:'abnRec',   rate:true },
  opHours:  { name:'有效运营时间',       unit:'h', get:sd=>sd.opTime,          tgt:'opHours',  rate:false },
  autoFeed: { name:'累计上料数',         unit:'次', get:sd=>(sd.autoFeed!=null||sd.manualFeed!=null)?(sd.autoFeed||0)+(sd.manualFeed||0):null, tgt:'autoFeed', rate:false },
  prodCov:  { name:'生产时长覆盖率',     unit:'%', get:sd=>sd.prodCov,         tgt:'prodCov',  rate:true },
  effRatio: { name:'人效比',             unit:'%', get:sd=>sd.efficiencyRatio, tgt:'effRatio', rate:true },
};
const SC_GROUPS = [
  { row:1, title:'自动化水平', tone:'#0ea5e9', keys:['aiRate','prodRate'], cls:'level' },
  { row:1, title:'稳定性',     tone:'#16a34a', keys:['succRate','abnRec'] },
  { row:2, title:'运营量级',   tone:'#2563eb', keys:['opHours','autoFeed'] },
  { row:2, title:'生产覆盖',   tone:'#d97706', keys:['prodCov'] },
  { row:2, title:'自动化效率', tone:'#7c3aed', keys:['effRatio'] },
];
// 无小字但需与带小字卡片数值底部对齐的指标（渲染隐藏占位行）
const SC_EMPTY_SUB = ['prodRate','succRate','prodCov','effRatio'];
// 站点数据模型：指标实际值/目标/上周/判定/附加小字/文本/图片，页面渲染与导出模板共用（保证口径一致）
function _scBuildModel(report, st) {
  const sd = (report.siteDetails || []).find(x => x.station === st) || {};
  let prevT = null, prevSd = null;
  if (report.dateRange) {
    const ps = shiftDate(report.dateRange.start, -7), pe = shiftDate(report.dateRange.start, -1);
    try { prevT = (getPrevWeekTargets(ps, pe, [st]) || {})[st] || null; } catch(e) { prevT = null; }
    const pr = getPrevReport(ps, pe);
    prevSd = pr ? ((pr.siteDetails || []).find(x => x.station === st) || null) : null;
  }
  const recs = (report.records || []).filter(r => r.station === st);
  const opDays = recs.length ? new Set(recs.map(r => r.date)).size : null;
  const subs = {
    opHours: opDays != null ? `运营天数：${opDays}天` : null,
    autoFeed: `自动上料：${sd.autoFeed != null ? sd.autoFeed : '—'}次｜手动上料：${sd.manualFeed != null ? sd.manualFeed : '—'}次`,
    abnRec: `自动化异常：${sd.abnormalTask != null ? sd.abnormalTask : '—'}次`,
  };
  const metrics = {};
  let hit = 0;
  Object.keys(SC_METRIC_DEF).forEach(k => {
    const def = SC_METRIC_DEF[k];
    let v = def.get(sd), p = prevSd ? def.get(prevSd) : null;
    let t = prevT ? prevT[def.tgt] : null;
    if (t === '' || t == null || isNaN(parseFloat(t))) t = null; else t = parseFloat(t);
    if (def.rate) { v = v != null ? v * 100 : null; p = p != null ? p * 100 : null; }
    // 判定：比率类 ≥目标 达标 / 目标-2pp 内 接近 / 其余未达；规模类仅达标/未达（与站点分析口径一致）
    let state = 'na', label = '未设目标';
    if (t != null && v != null) {
      if (v >= t) { state = 'hit'; label = '已达标'; }
      else if (def.rate && v >= t - 2) { state = 'near'; label = '接近目标'; }
      else { state = 'miss'; label = '未达标'; }
    }
    if (state === 'hit') hit++;
    const rate = (t != null && t !== 0 && v != null) ? v / t * 100 : null;
    const d = (v != null && p != null) ? v - p : null;
    metrics[k] = { def, v, t, p, state, label, rate, d,
      dc: d == null ? 'flat' : d > 0 ? 'up' : d < 0 ? 'down' : 'flat',
      dt: d == null ? '' : (d > 0 ? '▲ +' : d < 0 ? '▼ -' : '— ')
        + (def.unit === '%' ? Math.abs(d).toFixed(2) + '%' : def.unit === 'h' ? Math.abs(d).toFixed(1) + 'h' : Math.round(Math.abs(d)) + '次') };
  });
  const sc = (report.siteCards || {})[st] || {};
  return {
    st, metrics, hit, subs,
    stage: STAGE_LABELS[(stationsStore.find(s => s.name === st) || {}).stage] || '',
    weekRange: report.dateRange ? `${report.dateRange.start} ~ ${report.dateRange.end}` : '',
    manualText: _scSectionText(sc.analysis, '手动接管及异常原因'),
    focusText: _scSectionText(sc.analysis, '本周重点'),
    image: sc.image || '',
  };
}
const _scFmt = (v,u) => u==='%' ? v.toFixed(2) : u==='h' ? v.toFixed(1) : String(Math.round(v));
const _scUnit = u => u==='%' ? '%' : u==='h' ? ' h' : ' 次';
function _scMetricHtml(key, mk, subText) {
  const def = mk.def;
  const vTxt = mk.v != null ? _scFmt(mk.v, def.unit) : '—';
  const rateHtml = mk.t != null
    ? `<b>${mk.rate != null ? mk.rate.toFixed(1) : '—'}%</b><span class="rl">达成率</span><span class="rt">÷ 目标 ${_scFmt(mk.t, def.unit)}${_scUnit(def.unit)}</span>`
    : `<b>—</b><span class="rl">达成率</span><span class="rt">目标未设</span>`;
  const subHtml = subText ? `<div class="sc-v-sub">${escHtml(subText)}</div>`
    : (SC_EMPTY_SUB.includes(key) ? '<div class="sc-v-sub ph">&nbsp;</div>' : '');
  return `<div class="sc-m ${mk.state}${def.primary ? ' primary' : ''}">
    <div class="sc-m-head">${def.primary ? '<span class="sc-chip">核心指标</span>' : ''}<span class="sc-m-name">${def.name}</span><span class="sc-m-tag">${mk.label}</span></div>
    <div class="sc-m-value"><div class="sc-v-col"><div class="sc-v-main"><b>${vTxt}</b><span class="u">${_scUnit(def.unit)}</span></div>${subHtml}</div>
      <div class="sc-rate">${rateHtml}</div></div>
    <div class="sc-m-meta">
      <div class="sc-prev">上周<b>${mk.p != null ? _scFmt(mk.p, def.unit)+_scUnit(def.unit) : '—'}</b></div>
      ${mk.d != null ? `<span class="sc-delta ${mk.dc}">环比 ${mk.dt}</span>` : '<span class="sc-delta flat">环比 —</span>'}
    </div></div>`;
}
// 从 analysis 提取某段纯文本（"暂未提供"视为空）
function _scSectionText(analysis, label) {
  if (!analysis) return '';
  // 段尾截断：\n 或块级换行标签（兼容旧版 contenteditable 存下的 <br>/<div>/<p> 格式）
  const m = analysis.match(new RegExp(label + '：([^\\n]*?)(?=<\\/?(?:br|div|p)[\\s>/]|\\n|$)'));
  if (!m) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = m[1];
  const t = tmp.textContent.trim();
  return (!t || t === '暂未提供。' || t === '暂未提供') ? '' : t;
}
// 把某段内容写回 analysis 对应行（无该行则追加）
function _scReplaceSection(analysis, label, content) {
  // 段尾截断同 _scSectionText：避免旧格式（<br> 换行）下替换时吞掉后续段
  const re = new RegExp(label + '：[^\\n]*?(?=<\\/?(?:br|div|p)[\\s>/]|\\n|$)');
  const line = label + '：' + content;
  if (re.test(analysis)) return analysis.replace(re, () => line);  // 函数形式替换，避免用户文本中的 $ 被当作替换模式
  return analysis ? analysis.replace(/\s*$/, '') + '\n' + line : line;
}
function renderStationCards(report) {
  const wrap = document.getElementById('reportStationCards');
  if (!wrap) return;
  const sites = (report.siteDetails || []).map(sd => sd.station);
  // 记录当前展开的站点，重渲染后恢复（一键生成刷新卡片时不收起）；
  // 仅同一份周报的重渲染才恢复，切换查看其他周报仍默认全部收起
  const sameReport = wrap.dataset.reportId === String(report.id);
  const openSts = sameReport ? new Set([...wrap.querySelectorAll('.sc-card.open')].map(c => c.dataset.st)) : new Set();
  wrap.innerHTML = sites.map(st => {
    const m = _scBuildModel(report, st);
    const metricHtml = k => _scMetricHtml(k, m.metrics[k], m.subs[k]);
    const cluster = g => `<div class="sc-cluster" style="--ct:${g.tone}">
      <div class="sc-cluster-head"><i></i>${g.title}</div>
      <div class="sc-metrics ${g.cls || ''}" style="--cols:${g.keys.length}">${g.keys.map(metricHtml).join('')}</div>
    </div>`;
    const row1 = SC_GROUPS.filter(g => g.row === 1).map(cluster).join('');
    const row2 = SC_GROUPS.filter(g => g.row === 2).map(cluster).join('');
    const textMod = (label, content) => `<div class="sc-mod">
        <div class="sc-mod-head"><span class="sc-mod-t">${label}</span>
          <button class="btn btn-outline" style="font-size:11px;padding:2px 10px" onmousedown="event.preventDefault()" onclick="toggleScSection(this,'${escJs(st)}','${label}')">✏️ 编辑</button></div>
        <div class="sc-text" contenteditable="false" data-ph="暂未提供，点击右上角「编辑」填写">${escHtml(content)}</div>
      </div>`;
    const img = m.image ? `<img src="${m.image}" alt="">` : '';
    return `<div class="sc-card" data-st="${escHtml(st)}">
      <div class="sc-head" onclick="toggleScCard(this,event)" title="点击展开/收起该站点卡片">
        <span class="sc-name">${escHtml(st)}站周报</span>
        ${m.stage ? `<span class="sc-stage">${escHtml(m.stage)}</span>` : ''}
        <span class="sc-week">${escHtml(m.weekRange)}</span>
        <div class="sc-score"><b>${m.hit}</b> / 8 指标达标</div>
        <div class="sc-actions">
          <button class="btn btn-outline" style="font-size:11px;padding:2px 10px" onclick="regenStationAnalysis(this,'${escJs(st)}')">⚡ 一键生成</button>
          <button class="btn btn-outline" style="font-size:11px;padding:2px 10px" onclick="exportStationCard(this,'${escJs(st)}')">📷 一键导出</button>
        </div>
        <span class="sc-caret">▾</span>
      </div>
      <div class="sc-body-wrap"><div class="sc-body">
        <div class="sc-rows">
          <div class="sc-row r1">${row1}</div>
          <div class="sc-row r2">${row2}</div>
        </div>
        <div class="sc-mods">
          ${textMod('手动接管及异常原因', m.manualText)}
          ${textMod('本周重点', m.focusText)}
          <div class="sc-mod sc-mod-bi"><div class="sc-mod-head"><span class="sc-mod-t">数据看板</span></div>
            <div class="sc-image" contenteditable="true" data-st="${escHtml(st)}">${img}</div>
          </div>
        </div>
      </div></div>
    </div>`;
  }).join('');
  // 恢复重渲染前的展开状态
  wrap.querySelectorAll('.sc-card').forEach(c => { if (openSts.has(c.dataset.st)) c.classList.add('open'); });
  wrap.dataset.reportId = String(report.id);
  // 文本模块失焦自动保存（与编辑按钮并存：失焦时也写回，防止忘记点保存；
  // 注意：焦点移到本模块的保存按钮上时不触发，让按钮自身的点击完成保存，否则会重复切换）
  wrap.querySelectorAll('.sc-text').forEach(div => {
    div.addEventListener('blur', (e) => {
      if (div.contentEditable === 'true') {
        const btn = div.closest('.sc-mod').querySelector('button');
        if (btn && e.relatedTarget !== btn) btn.click();
      }
    });
  });
  // 图片：可聚焦接收粘贴，但禁止打字；支持 Backspace 删除、Ctrl+Z 撤销
  wrap.querySelectorAll('.sc-image').forEach(div => {
    div.addEventListener('paste', (e) => handleStationImagePaste(e, report, div));
    div.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      const isPaste = (e.ctrlKey || e.metaKey) && k === 'v';
      const isUndo = (e.ctrlKey || e.metaKey) && k === 'z';
      const isDel = k === 'backspace' || k === 'delete';
      if (isPaste) return;  // 交给 paste 处理
      if (isUndo) { e.preventDefault(); undoStationImage(report, div); return; }
      if (isDel) {
        e.preventDefault();
        if (div.querySelector('img')) { pushImgHist(div); div.innerHTML = ''; saveSiteCard(report, div.dataset.st, 'image', ''); }
        return;
      }
      if (k === 'tab') return;
      e.preventDefault();  // 其余按键禁止
    });
    div.title = '点击聚焦后 Ctrl+V 粘贴数据看板截图';
  });
}
// 站点卡折叠/展开：点击头部切换（点在按钮上不触发），默认收起
function toggleScCard(head, e) {
  if (e && e.target && e.target.closest('button')) return;
  head.closest('.sc-card').classList.toggle('open');
}
// 文本模块编辑/保存：编辑态再点击即保存，内容写回 siteCards[站].analysis 对应行（存储结构不变）
function toggleScSection(btn, station, label) {
  const box = btn.closest('.sc-mod').querySelector('.sc-text');
  const editing = box.contentEditable === 'true';
  if (!editing) {
    box.contentEditable = 'true';
    btn.textContent = '💾 保存';
    box.focus();
    return;
  }
  box.contentEditable = 'false';
  btn.textContent = '✏️ 编辑';
  const r = window.currentReport;
  if (!r) return;
  // 换行替换为中文分号，保持 analysis 行式结构（提取/继承逻辑不受影响）
  const content = box.innerText.replace(/\n+/g, '；').trim();
  if (!r.siteCards) r.siteCards = {};
  if (!r.siteCards[station]) r.siteCards[station] = {};
  const cur = r.siteCards[station].analysis || '';
  r.siteCards[station].analysis = _scReplaceSection(cur, label, content || '暂未提供。');
  ReportsAPI.update(r.id, r).catch(function(){});
  box.innerText = content;  // 归一化显示（空 → 展示占位提示）
}
function saveSiteCard(report, station, field, value) {
  if (!report.siteCards) report.siteCards = {};
  if (!report.siteCards[station]) report.siteCards[station] = {};
  report.siteCards[station][field] = value;
  ReportsAPI.update(report.id, report).catch(function(){});
}
// 图片撤销历史（单级 toggle：撤销/重做来回切）
const _imgHist = new WeakMap();
function pushImgHist(div) {
  if (!_imgHist.has(div)) _imgHist.set(div, []);
  _imgHist.get(div).push(div.innerHTML);
}
function undoStationImage(report, div) {
  const h = _imgHist.get(div);
  if (!h || !h.length) return;
  const prev = h.pop();
  const cur = div.innerHTML;
  div.innerHTML = prev;
  h.push(cur);  // 推回当前态，支持再次 Ctrl+Z 重做
  const img = div.querySelector('img');
  saveSiteCard(report, div.dataset.st, 'image', img ? img.getAttribute('src') : '');
}

async function handleStationImagePaste(e, report, div) {
  const items = e.clipboardData && e.clipboardData.items;
  e.preventDefault();  // 一律阻止默认粘贴，只接受图片
  if (!items) return;
  for (const it of items) {
    if (it.type && it.type.indexOf('image/') === 0) {
      pushImgHist(div);  // 撤销历史：记录粘贴前状态
      const file = it.getAsFile();
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const r = await fetch('/api/report-image', { method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ reportId: report.id, station: div.dataset.st, data: reader.result }) });
          const res = await r.json();
          if (res.url) {
            div.innerHTML = `<img src="${res.url}" alt="">`;
            saveSiteCard(report, div.dataset.st, 'image', res.url);
          } else { alert('图片上传失败: ' + (res.error||'')); }
        } catch(err) { alert('图片上传失败: ' + (err.message||err)); }
      };
      reader.readAsDataURL(file);
      return;
    }
  }
}

function renderReportsList() {
  const rev = [...weeklyReports].reverse();
  const total = rev.length;
  const pages = Math.max(1, Math.ceil(total / REPORTS_PAGE));
  if (reportsCurPage > pages) reportsCurPage = pages;
  const items = rev.slice((reportsCurPage-1)*REPORTS_PAGE, reportsCurPage*REPORTS_PAGE);
  const tbody = document.getElementById('reportsBody');

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty">暂无周报，前往数据看板生成周报</div></td></tr>`;
  } else {
    tbody.innerHTML = items.map(rpt => {
      const idx = weeklyReports.findIndex(r => r.id === rpt.id);
      return `<tr>
        <td>${rpt.reportName}</td>
        <td>${rpt.dateRange.start} 至 ${rpt.dateRange.end}</td>
        <td>${rpt.summary.stationCount}</td>
        <td>${fnum(rpt.summary.opHours, 1)}</td>
        <td>${rpt.summary.autoFeedTotal}</td>
        <td>${pct(rpt.summary.aiRate)}</td>
        <td>${pct(rpt.summary.prodRate)}</td>
        <td>${pct(rpt.summary.succRate)}</td>
        <td style="font-size:11px;color:var(--t3)">${rpt.createdAt}</td>
        <td>
          <button class="btn btn-text" onclick="viewReport(${rpt.id})">查看</button>
          <button class="btn btn-text" onclick="duplicateReport(${rpt.id})">生成副本</button>
          <button class="btn btn-text red" onclick="deleteReport(${idx})">删除</button>
        </td>
      </tr>`;
    }).join('');
  }

  document.getElementById('reportsPagerInfo').textContent = `共 ${total} 条，第 ${reportsCurPage}/${pages} 页`;
  renderReportsPager(reportsCurPage, pages);
}

function renderReportsPager(c, t) {
  const el = document.getElementById('reportsPagerBtns');
  const rng = pgRange(c, t);
  let h = `<button class="pg-btn" ${c===1?'disabled':''} onclick="goReportsPage(${c-1})">‹</button>`;
  rng.forEach(p => {
    h += p===c
      ? `<button class="pg-btn active">${p}</button>`
      : `<button class="pg-btn" onclick="goReportsPage(${p})">${p}</button>`;
  });
  h += `<button class="pg-btn" ${c===t?'disabled':''} onclick="goReportsPage(${c+1})">›</button>`;
  el.innerHTML = h;
}

function goReportsPage(p) {
  reportsCurPage = p;
  renderReportsList();
}

async function deleteReport(idx) {
  const rpt = weeklyReports[idx];
  if (!confirm(`确定删除周报「${rpt.reportName}」吗？`)) return;

  try {
    await ReportsAPI.del(rpt.id);
    await loadAndRenderReports();
    alert('删除成功');
  } catch (err) {
    console.error('删除失败:', err);
    alert('删除失败: ' + err.message);
  }
}

// 生成副本：复制一份周报，名称在原始名后加 -N 后缀
async function duplicateReport(reportId) {
  const report = weeklyReports.find(r => r.id === reportId);
  if (!report) { alert('周报不存在'); return; }
  // 剥离已有的 -N 后缀，还原到原始名
  const fullName = report.reportName;
  const dashIdx = fullName.lastIndexOf('-');
  const baseName = (dashIdx > 0 && /^\d+$/.test(fullName.slice(dashIdx + 1))) ? fullName.slice(0, dashIdx) : fullName;
  // 在 baseName 上找最大的 -N 序号
  let n = 1;
  while (weeklyReports.some(r => r.reportName === `${baseName}-${n}`)) n++;
  const newName = `${baseName}-${n}`;
  // 深拷贝报告，改 id 和名称
  const copy = JSON.parse(JSON.stringify(report));
  copy.id = Date.now();
  copy.reportName = newName;
  copy.createdAt = (() => { const d = new Date(); d.setHours(d.getHours() + 8); return d.toISOString().replace('T', ' ').slice(0, 19); })();
  try {
    await ReportsAPI.add(copy);
    await loadAndRenderReports();
    alert(`已生成副本：${newName}`);
  } catch (err) {
    console.error('生成副本失败:', err);
    alert('生成副本失败: ' + err.message);
  }
}

async function loadAndRenderReports() {
  try {
    weeklyReports = await ReportsAPI.getAll();
    renderReportsList();
  } catch (err) {
    console.error('加载周报失败:', err);
    alert('加载周报失败: ' + err.message);
  }
}


// ── 旧 tab 死代码 ──
// 切换周报主tab
function switchReportMainTab(tab) {
  // 找到综合指标下的第一个tabs-header
  const mainContainer = document.querySelector('#pageReportView > .card > div:nth-child(3)');
  if (!mainContainer) return;

  const tabButtons = mainContainer.querySelector('.tabs-header').querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    const isActive = (tab === 'summary' && btn.textContent === '汇总数据') ||
                    (tab === 'trend' && btn.textContent === '趋势对比');
    btn.classList.toggle('active', isActive);
  });

  // 切换内容显示
  document.getElementById('reportTabSummary').style.display = tab === 'summary' ? 'block' : 'none';
  document.getElementById('reportTabTrend').style.display = tab === 'trend' ? 'block' : 'none';

  // 如果切换到趋势对比，初始化图表
  if (tab === 'trend' && window.currentReport) {
    drawReportTrendCharts(window.currentReport);
  }
}

// 切换周报趋势图表tab
function switchReportTrendTab(tab) {
  // 找到tab按钮的父容器
  const container = document.getElementById('reportTrendCharts');
  if (!container) return;

  const tabButtons = container.previousElementSibling.querySelectorAll('.tab-btn');

  // 更新tab按钮状态
  tabButtons.forEach(btn => {
    const isActive = (tab === 'feeding' && btn.textContent === '上料数') ||
                    (tab === 'operation' && btn.textContent === '运营效果') ||
                    (tab === 'production' && btn.textContent === '生产情况');
    btn.classList.toggle('active', isActive);
  });

  // 切换内容显示
  document.getElementById('reportTrendFeeding').style.display = tab === 'feeding' ? 'block' : 'none';
  document.getElementById('reportTrendOperation').style.display = tab === 'operation' ? 'block' : 'none';
  document.getElementById('reportTrendProduction').style.display = tab === 'production' ? 'block' : 'none';
}

// 绘制周报趋势图表
function drawReportTrendCharts(currentReport) {
  // 获取近四周的数据
  const endDate = new Date(currentReport.dateRange.end + 'T00:00:00');
  const fourWeeksAgo = new Date(endDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  // 按周聚合数据
  const weeklyData = [];
  for (let i = 0; i < 4; i++) {
    const weekEnd = new Date(endDate);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const weekData = store.filter(r => {
      const d = new Date(r.date + 'T00:00:00');
      return d >= weekStart && d <= weekEnd;
    });

    if (weekData.length > 0) {
      const kpi = computeKPIs(weekData);
      // 格式化日期为MM/DD
      const formatDate = (d) => {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${month}/${day}`;
      };
      const dateRange = `${formatDate(weekStart)}-${formatDate(weekEnd)}`;
      weeklyData.push({
        week: dateRange,
        kpi: kpi
      });
    }
  }

  // 反转数组，让最早的周在前面
  weeklyData.reverse();

  // 销毁旧图表
  if (reportFeedingChart) reportFeedingChart.destroy();
  if (reportOperationChart) reportOperationChart.destroy();
  if (reportProductionChart) reportProductionChart.destroy();

  // 配置图表默认选项
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  Chart.defaults.font.family = '"Microsoft YaHei", sans-serif';
  Chart.defaults.font.size = 11;
  Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--t2');

  // 绘制上料数图表
  const ctx1 = document.getElementById('reportChartFeeding').getContext('2d');
  reportFeedingChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: weeklyData.map(d => d.week),
      datasets: [
        {
          label: '运营时长(h)',
          data: weeklyData.map(d => d.kpi.opHours),
          borderColor: '#ff9500',
          backgroundColor: 'rgba(255, 149, 0, 0.1)',
          tension: 0,
          yAxisID: 'y1'
        },
        {
          label: '自动上料总数',
          data: weeklyData.map(d => d.kpi.autoFeedTotal),
          borderColor: '#3182ce',
          backgroundColor: 'rgba(49, 130, 206, 0.1)',
          tension: 0,
          yAxisID: 'y2'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            padding: 10,
            usePointStyle: true
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: '运营时长(h)'
          },
          grid: {
            color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }
        },
        y2: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: '上料总数'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });

  // 绘制运营效果图表
  const ctx2 = document.getElementById('reportChartOperation').getContext('2d');
  reportOperationChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: weeklyData.map(d => d.week),
      datasets: [
        {
          label: 'AI接管率',
          data: weeklyData.map(d => (d.kpi.aiRate || 0) * 100),
          borderColor: '#ff9500',
          backgroundColor: 'rgba(255, 149, 0, 0.1)',
          tension: 0
        },
        {
          label: '生产接管率',
          data: weeklyData.map(d => (d.kpi.prodRate || 0) * 100),
          borderColor: '#3182ce',
          backgroundColor: 'rgba(49, 130, 206, 0.1)',
          tension: 0
        },
        {
          label: '任务成功率',
          data: weeklyData.map(d => (d.kpi.succRate || 0) * 100),
          borderColor: '#48bb78',
          backgroundColor: 'rgba(72, 187, 120, 0.1)',
          tension: 0
        },
        {
          label: '异常恢复率',
          data: weeklyData.map(d => (d.kpi.abnRec || 0) * 100),
          borderColor: '#805ad5',
          backgroundColor: 'rgba(128, 90, 213, 0.1)',
          tension: 0
        },
        {
          label: '人效比',
          data: weeklyData.map(d => (d.kpi.efficiencyRatio || 0) * 100),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            padding: 10,
            usePointStyle: true
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: '百分比(%)'
          },
          grid: {
            color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }
        }
      }
    }
  });

  // 绘制生产情况图表
  const ctx3 = document.getElementById('reportChartProduction').getContext('2d');
  reportProductionChart = new Chart(ctx3, {
    type: 'line',
    data: {
      labels: weeklyData.map(d => d.week),
      datasets: [
        {
          label: '生产时长(h)',
          data: weeklyData.map(d => d.kpi.prodHours || 0),
          borderColor: '#ff9500',
          backgroundColor: 'rgba(255, 149, 0, 0.1)',
          tension: 0,
          yAxisID: 'y1'
        },
        {
          label: '生产时长覆盖率(%)',
          data: weeklyData.map(d => (d.kpi.prodCov || 0) * 100),
          borderColor: '#3182ce',
          backgroundColor: 'rgba(49, 130, 206, 0.1)',
          tension: 0,
          yAxisID: 'y2'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            padding: 10,
            usePointStyle: true
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: '生产时长(h)'
          },
          grid: {
            color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }
        },
        y2: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: '覆盖率(%)'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}


// ── 顶层事件注册 ──
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('rptExportWrap');
  if (wrap && !wrap.contains(e.target)) document.getElementById('rptExportMenu').style.display = 'none';
  const wrap2 = document.getElementById('rptExportWrap2');
  if (wrap2 && !wrap2.contains(e.target)) document.getElementById('rptExportMenu2').style.display = 'none';
  const toolWrap = document.getElementById('rptToolWrap');
  if (toolWrap && !toolWrap.contains(e.target)) {
    const m = document.getElementById('rptToolMenu');
    if (m) m.style.display = 'none';
  }
});

document.addEventListener('DOMContentLoaded', function() {
  // 分析 div 失焦时自动保存（HTML）
  document.addEventListener('blur', function(e) {
    if (e.target.id === 'reportAnalysisText' && window.currentReport && e.target.contentEditable === 'true') {
      window.currentReport.analysis = e.target.innerHTML;
      ReportsAPI.update(window.currentReport.id, window.currentReport).catch(function(){});
    }
  }, true);
  // 其他事项 div 失焦时自动保存（HTML）
  document.addEventListener('blur', function(e) {
    if (e.target.id === 'reportOtherMattersText' && window.currentReport && e.target.contentEditable === 'true') {
      window.currentReport.otherMatters = e.target.innerHTML;
      ReportsAPI.update(window.currentReport.id, window.currentReport).catch(function(){});
    }
  }, true);
});
