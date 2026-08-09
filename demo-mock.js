(() => {
  const STORAGE_KEY = 'loader-ops-static-demo-state-v1';
  const DEMO_VERSION = 'demo-monitor-v3';
  const REFRESH_MS = 90_000;
  const SITE_DEFS = [
    { id: 1, name: '演示站A', stage: 2, manualEfficiency: 98, monitor_production: true, monitor_loader_state: true },
    { id: 2, name: '演示站B', stage: 4, manualEfficiency: 96, monitor_production: true, monitor_loader_state: true },
    { id: 3, name: '演示站E', stage: 2, manualEfficiency: 30, monitor_production: true, monitor_loader_state: true },
    { id: 4, name: '演示站C', stage: 5, manualEfficiency: 90, monitor_production: false, monitor_loader_state: false },
    { id: 5, name: '演示站D', stage: 5, manualEfficiency: 100, monitor_production: false, monitor_loader_state: false }
  ].map(site => ({
    ...site,
    api: '',
    demo_site_id: site.id,
    accessNote: '',
    sheet_mode: 'simple'
  }));

  const FAULT_TYPES = ['本体故障', '传感器故障', '算法故障', '平台故障', '网络故障', '其他'];
  const MONITOR_STATES = ['ai_takeover', 'manual_work', 'device_fault', 'shutdown'];

  let state = null;
  let refreshTimer = null;
  let refreshSeq = 0;

  const clone = value => JSON.parse(JSON.stringify(value));
  const pad2 = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const addDays = (d, n) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };
  const weekDates = (anchor = new Date()) => {
    const monday = new Date(anchor);
    const dow = monday.getDay();
    monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => ymd(addDays(monday, i)));
  };
  const num = (n, d = 2) => Number(Number(n).toFixed(d));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const sum = (arr, key) => arr.reduce((acc, item) => acc + (+item[key] || 0), 0);
  const avg = (arr, key) => (arr.length ? sum(arr, key) / arr.length : 0);
  const tick = () => Math.floor(Date.now() / REFRESH_MS);
  const seed = (siteIndex, dayIndex, salt = 0, bucket = 0) => (((siteIndex + 3 + bucket) * 97) + ((dayIndex + 5) * 53) + ((salt + 7) * 31)) % 1000 / 1000;

  const originalFetch = window.fetch.bind(window);

  function randChoice(items, idx) {
    return items[Math.abs(idx) % items.length];
  }

  function buildPeriods(dateStr, siteIndex, bucket) {
    const dayBase = new Date(`${dateStr}T00:00:00`);
    const segments = [];
    const blockCount = 2 + ((siteIndex + bucket) % 2);
    const dayEnd = new Date(`${dateStr}T20:30:00`).getTime();
    let cursor = new Date(dayBase);
    cursor.setHours(7 + (siteIndex % 3), 0, 0, 0);

    for (let block = 0; block < blockCount; block++) {
      const blockStart = new Date(cursor);
      blockStart.setMinutes(blockStart.getMinutes() + Math.round(seed(siteIndex, block, 1, bucket) * 28));
      blockStart.setSeconds(Math.round(seed(siteIndex, block, 2, bucket) * 50));

      const pieceCount = 2 + Math.round(seed(siteIndex, block, 3, bucket) * 3);
      let pieceCursor = new Date(blockStart);
      for (let piece = 0; piece < pieceCount; piece++) {
        const pieceStart = new Date(pieceCursor);
        pieceStart.setSeconds(pieceStart.getSeconds() + Math.round(seed(siteIndex, block + piece, 4, bucket) * 40));

        const durationMin = 22 + Math.round(seed(siteIndex, block, 5 + piece, bucket) * 78);
        const durationSec = Math.round(seed(siteIndex, block, 9 + piece, bucket) * 50);
        const pieceEnd = new Date(pieceStart);
        pieceEnd.setMinutes(pieceEnd.getMinutes() + durationMin);
        pieceEnd.setSeconds(pieceEnd.getSeconds() + durationSec);

        const clippedEndMs = Math.min(pieceEnd.getTime(), dayEnd);
        if (clippedEndMs > pieceStart.getTime()) {
          segments.push({
            start_time: pieceStart.toISOString(),
            end_time: new Date(clippedEndMs).toISOString(),
            state: 'production'
          });
        }

        pieceCursor = new Date(clippedEndMs);
        pieceCursor.setMinutes(pieceCursor.getMinutes() + 3 + Math.round(seed(siteIndex, block, 13 + piece, bucket) * 24));
        pieceCursor.setSeconds(Math.round(seed(siteIndex, block, 17 + piece, bucket) * 60));
      }

      cursor = new Date(pieceCursor);
      cursor.setMinutes(cursor.getMinutes() + 26 + Math.round(seed(siteIndex, block, 21, bucket) * 54));
      cursor.setSeconds(Math.round(seed(siteIndex, block, 22, bucket) * 60));
      if (cursor.getTime() >= dayEnd) break;
    }

    return segments;
  }

  function buildLoaderPeriods(dateStr, siteIndex, bucket) {
    const states = [];
    const dayStart = new Date(`${dateStr}T00:00:00`);
    const dayEnd = new Date(`${dateStr}T23:59:59`).getTime();
    const totalSegments = 6 + ((siteIndex + bucket) % 3);

    let cursor = new Date(dayStart);
    cursor.setHours(5 + (siteIndex % 3), 0, 0, 0);
    cursor.setMinutes(Math.round(seed(siteIndex, 0, 31, bucket) * 20));
    cursor.setSeconds(Math.round(seed(siteIndex, 0, 32, bucket) * 60));

    for (let i = 0; i < totalSegments; i++) {
      const stateRoll = seed(siteIndex, i, 4, bucket);
      const durationMin = 28 + Math.round(seed(siteIndex, i, 5, bucket) * 88);
      const durationSec = Math.round(seed(siteIndex, i, 6, bucket) * 59);
      const gapMin = 4 + Math.round(seed(siteIndex, i, 7, bucket) * 26);
      const gapSec = Math.round(seed(siteIndex, i, 8, bucket) * 59);

      const start = new Date(cursor);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + durationMin);
      end.setSeconds(end.getSeconds() + durationSec);

      const state = stateRoll < 0.26 ? 'device_fault'
        : stateRoll < 0.54 ? 'ai_takeover'
        : stateRoll < 0.86 ? 'manual_work'
        : 'shutdown';

      const endMs = Math.min(end.getTime(), dayEnd);
      if (endMs > start.getTime()) {
        states.push({
          start_time: start.toISOString(),
          end_time: new Date(endMs).toISOString(),
          state
        });
      }

      cursor = new Date(endMs);
      cursor.setMinutes(cursor.getMinutes() + gapMin);
      cursor.setSeconds(gapSec);
      if (cursor.getTime() >= dayEnd) break;
    }

    return states;
  }

  function buildIssues(dateStr, siteIndex, dayIndex, bucket) {
    const r = seed(siteIndex, dayIndex, 24, bucket);
    const issueCount = r < 0.2 ? 0 : r < 0.58 ? 1 : r < 0.84 ? 2 : 3;
    if (!issueCount) return [];

    const issues = [];
    const baseHour = 8 + ((siteIndex + dayIndex + bucket) % 7);
    const faultTypePool = issueCount > 1
      ? [randChoice(FAULT_TYPES, siteIndex + bucket), randChoice(FAULT_TYPES, siteIndex + dayIndex + 2 + bucket), randChoice(FAULT_TYPES, siteIndex + dayIndex + 5 + bucket)]
      : [randChoice(FAULT_TYPES, siteIndex + dayIndex + bucket)];

    for (let i = 0; i < issueCount; i++) {
      const faultType = faultTypePool[i % faultTypePool.length];
      const occurMinute = Math.round(seed(siteIndex, dayIndex, 26 + i, bucket) * 59);
      const occurSecond = Math.round(seed(siteIndex, dayIndex, 29 + i, bucket) * 59);
      const opMin = 6 + Math.round(seed(siteIndex, dayIndex, 31 + i, bucket) * 28);
      const takeoverMin = 2 + Math.round(seed(siteIndex, dayIndex, 34 + i, bucket) * 16);
      issues.push({
        faultType,
        category: faultType,
        reason: `${faultType}演示事件`,
        occurTime: `${dateStr}T${pad2(baseHour + i)}:${pad2(occurMinute)}:${pad2(occurSecond)}`,
        operationTime: opMin,
        takeoverDuration: takeoverMin,
        count: 1
      });
    }
    return issues;
  }

  function buildRecord(site, siteIndex, dateStr, dayIndex, bucket, weekTag) {
    const r0 = seed(siteIndex, dayIndex, 1, bucket);
    const r1 = seed(siteIndex, dayIndex, 2, bucket);
    const r2 = seed(siteIndex, dayIndex, 3, bucket);

    const opHours = num(28 + siteIndex * 6.4 + dayIndex * 1.1 + r0 * 8.8, 1);
    const prodHours = num(opHours * clamp(0.58 + siteIndex * 0.07 + r1 * 0.16, 0.42, 0.97), 1);
    const takeoverHours = num(prodHours * clamp(0.62 + siteIndex * 0.08 + r2 * 0.14, 0.4, 0.98), 1);
    const autoFeedTotal = Math.round(88 + siteIndex * 75 + dayIndex * 16 + r1 * 68);
    const manualFeed = Math.max(0, Math.round(3 + siteIndex * 2 + (dayIndex % 4 === 0 ? 2 : 0) + Math.round(r2 * 4) - (siteIndex === 1 ? 1 : 0)));
    const autoProdFeed = Math.max(0, Math.round(autoFeedTotal - manualFeed * (0.82 - siteIndex * 0.04)));
    const abnormalTask = Math.max(0, Math.round((siteIndex === 0 ? 1 : 0) + (dayIndex % 3 === 0 ? 1 : 0) + r2 * 4));
    const aiRate = num(clamp(0.76 + siteIndex * 0.035 + dayIndex * 0.006 + r0 * 0.09, 0.52, 0.985), 4);
    const prodRate = num(clamp(0.52 + siteIndex * 0.075 + dayIndex * 0.018 + r1 * 0.11, 0.3, 0.995), 4);
    const succRate = num(clamp(0.9 + siteIndex * 0.012 - dayIndex * 0.003 + r2 * 0.05, 0.72, 0.995), 4);
    const abnRec = num(clamp(0.28 + siteIndex * 0.07 + (siteIndex === 1 ? 0.1 : 0) - dayIndex * 0.008 + r0 * 0.05, 0.12, 0.98), 4);
    const prodCov = num(clamp(takeoverHours / Math.max(prodHours, 0.1), 0.58, 1), 4);
    const autoVol = num(180 + siteIndex * 126 + dayIndex * 24 + r2 * 96, 1);
    const totalVol = num(autoVol / clamp(0.66 + siteIndex * 0.04 + r1 * 0.08, 0.38, 0.99), 1);
    const efficiencyRatio = num(clamp(0.42 + siteIndex * 0.13 + dayIndex * 0.014 + r0 * 0.12, 0.22, 1.12), 4);
    const avgFeedDuration = Math.max(38, Math.round(124 - siteIndex * 9 - dayIndex * 2 + r0 * 28));
    const sysFaultCount = Math.max(0, Math.round(r1 * 3 + (siteIndex === 0 && dayIndex % 3 === 0 ? 1 : 0)));
    const fault1 = Math.max(0, Math.round(sysFaultCount * 0.3));
    const fault2 = Math.max(0, Math.round(sysFaultCount * 0.45));
    const fault3 = Math.max(0, sysFaultCount - fault1 - fault2);
    const issues = buildIssues(dateStr, siteIndex, dayIndex, bucket);
    const productionPeriods = site.monitor_production !== false ? buildPeriods(dateStr, siteIndex, bucket) : [];
    const loaderStatePeriods = site.monitor_loader_state !== false ? buildLoaderPeriods(dateStr, siteIndex, bucket) : [];

    return {
      id: Number(`${dateStr.replace(/-/g, '')}${pad2(site.id)}`),
      station: site.name,
      date: dateStr,
      totalOpTime: String(Math.round(opHours * 10)),
      autoFeedTotal: String(autoFeedTotal),
      testTaskCount: String(siteIndex % 2),
      autoProdFeed: String(autoProdFeed),
      manualFeed: String(manualFeed),
      abnormalTask: String(abnormalTask),
      autoWorkDuration: String(Math.round(opHours * 10)),
      localCtrlDuration: String(Math.max(0, Math.round(opHours * 10 - takeoverHours * 10))),
      prodDuration: String(Math.round(prodHours * 10)),
      takeoverDuration: String(Math.round(takeoverHours * 10)),
      avgFeedDuration: String(avgFeedDuration),
      abnLocalTakeover: String(Math.max(0, Math.round(abnormalTask * abnRec))),
      sysFaultCount: String(sysFaultCount),
      fault1: String(fault1),
      fault2: String(fault2),
      fault3: String(fault3),
      remark: dayIndex === 0 ? '演示数据：本地生成。' : '',
      issues,
      efficiencyRatio,
      aiRate,
      prodRate,
      succRate,
      abnRec,
      prodCov,
      autoVolCov: prodRate,
      autoVol,
      totalVol,
      productionBatchCount: productionPeriods.length,
      productionPeriods,
      loaderStatePeriods,
      weekTag
    };
  }

  function aggregateSite(rows, siteName) {
    const opTime = sum(rows, 'totalOpTime') / 10;
    const prodHours = sum(rows, 'prodDuration') / 10;
    const takeoverHours = sum(rows, 'takeoverDuration') / 10;
    const autoFeedTotal = sum(rows, 'autoFeedTotal');
    const autoProdFeed = sum(rows, 'autoProdFeed');
    const manualFeed = sum(rows, 'manualFeed');
    const abnormalTask = sum(rows, 'abnormalTask');
    const autoVol = sum(rows, 'autoVol');
    const totalVol = sum(rows, 'totalVol');
    const aiRate = avg(rows, 'aiRate');
    const prodRate = avg(rows, 'prodRate');
    const succRate = avg(rows, 'succRate');
    const abnRec = avg(rows, 'abnRec');
    const prodCov = prodHours ? clamp(takeoverHours / Math.max(prodHours, 0.1), 0, 1) : 0;
    const efficiencyRatio = avg(rows, 'efficiencyRatio');
    const faultFreq = rows.length ? sum(rows, 'sysFaultCount') / rows.length : 0;

    return {
      station: siteName,
      opTime: num(opTime, 1),
      autoFeed: autoFeedTotal,
      autoProdFeed,
      manualFeed,
      aiRate: num(aiRate, 4),
      prodRate: num(prodRate, 4),
      succRate: num(succRate, 4),
      abnRec: num(abnRec, 4),
      faultFreq: num(faultFreq, 4),
      prodHours: num(prodHours, 1),
      takeoverHours: num(takeoverHours, 1),
      prodCov: num(prodCov, 4),
      autoVol: num(autoVol, 1),
      totalVol: num(totalVol, 1),
      efficiencyRatio: num(efficiencyRatio, 4),
      autoVolCov: num(autoProdFeed / Math.max(autoFeedTotal, 1), 4),
      abnormalTask,
      _f1: sum(rows, 'fault1'),
      _f2: sum(rows, 'fault2'),
      _f3: sum(rows, 'fault3')
    };
  }

  const REPORT_STATIONS = ['演示站A', '演示站B', '演示站F', '演示站I'];
  const REPORT_TEMPLATE_TEXT = {
    analysis: `1.运营概况：本周共运营4个站点，分别为演示站A、演示站B、演示站F、演示站I。上周生产任务接管率、异常任务远程恢复率、自动化生产方量覆盖率均达标且提升明显；任务成功率和生产时长覆盖率保持在高位稳定；但是由于演示站A站电控箱改造升级停运，导致整体运营时长有所下降。演示站H站上周调试遗留故障问题，并无实际生产，故不计入运营。
2.总运营时间：177.5h，同比增加1.1h，本周演示站A站由于电控箱改造停止运营，但演示站F站和演示站B站生产规模均有所上升。
3.总上料数：累计2018次（自动化1870次，含自动生产1494次、测试376次；另外手动上料148次），自动化上料同比增加522次，主要由于演示站B和演示站F生产回升带来的任务数增加。
4.总AI时长接管率：84.42%，同比提升5.81%。整体接近目标（85%），演示站B站AI时长接管率上升明显。避让进料车仍为手动接管时长高的主要原因，此外演示站I站还存在网络和本体示例液压组件阀故障，演示站B站更换了后毫米波支架。
5.总生产任务接管率：90.99%，同比提升14.83%。整体未达到目标（83.5%），各站生产任务接管率均有所上升，演示站B站毫米波支架更换后上升尤为明显。
6.总任务成功率：97.55%，同比下降0.13%。整体达到目标（95.5%），各站点均保持较高水平。
7.总异常任务远程恢复率：65.96%，同比提升12.83%。整体达到目标（56.5%），演示站B站异常任务远程恢复率接近90%。
8.总生产时长覆盖率：100%，同比持平，整体达到目标（90%）。各生产站点整体覆盖较好。
9.自动化生产方量覆盖率：90.99%，同比提升14.83%，整体达到目标（79.5%）。本周自动化生产方量为4183.2方，同比增加2242.8方。
10.故障及分布：故障频次0.08次/h，同比改善0.01次/h，一级故障占比为0.00%。二级故障共计17次，占比100.00%，其中算法故障13次（轨迹规划失败8次，主程序故障、设备姿态不正确、误避障等共5次）；传感器故障1次（前向激光1次）；本体故障2次（PDU故障1次，示例液压组件阀异常1次）；网络波动导致故障1次。`,
    other: '无人16+23版本测试，远控2.3.5.1开发提测'
  };

  function makeSvgDataUrl(title, subtitle, rows, theme = '#2563eb') {
    const bars = rows.map((r, i) => {
      const x = 36 + i * 46;
      const h = 26 + (r % 6) * 12;
      const y = 238 - h;
      const fill = i % 2 === 0 ? theme : '#22c55e';
      return `<rect x="${x}" y="${y}" width="28" height="${h}" rx="6" fill="${fill}" opacity="0.88"/>`;
    }).join('');
    const wave = rows.map((r, i) => `${36 + i * 46},${180 - (r % 5) * 12}`).join(' ');
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="840" height="520" viewBox="0 0 840 520">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#eff6ff"/>
            <stop offset="100%" stop-color="#ffffff"/>
          </linearGradient>
          <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#0f172a" stop-opacity="0.12"/>
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0.18"/>
          </linearGradient>
        </defs>
        <rect width="840" height="520" rx="28" fill="url(#bg)"/>
        <rect x="30" y="30" width="780" height="460" rx="22" fill="#fff" stroke="#e2e8f0"/>
        <text x="58" y="84" font-size="30" font-weight="700" fill="#0f172a">${title}</text>
        <text x="58" y="118" font-size="18" fill="#64748b">${subtitle}</text>
        <rect x="58" y="148" width="724" height="240" rx="18" fill="#f8fafc" stroke="#e2e8f0"/>
        ${bars}
        <polyline fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" points="${wave}" opacity="0.9"/>
        <line x1="72" y1="404" x2="768" y2="404" stroke="${'url(#line)'}" stroke-width="2"/>
        <text x="58" y="440" font-size="16" fill="#475569">静态展示模板 · 本地固定图片</text>
        <text x="58" y="468" font-size="13" fill="#94a3b8">数据来源：demo-mock.js</text>
      </svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  function buildStationTemplate(station, idx, reportRows) {
    const themes = ['#2563eb', '#0ea5e9', '#16a34a', '#f59e0b'];
    const subtitles = {
      '演示站A': '电控箱改造升级后，当前用于展示停运与恢复过程。',
      '演示站B': '毫米波支架调整后，生产与接管表现更稳定。',
      '演示站F': '生产规模回升，自动化与人工协同展示良好。',
      '演示站I': '网络与本体故障可视化展示，突出告警与恢复。'
    };
    const analysisMap = {
      '演示站A': '上周电控箱改造升级导致该站停运，当前处于恢复展示阶段；本周重点仍为改造后的稳定性验证与远程接管测试。',
      '演示站B': '演示站B站生产回升明显，毫米波支架更换后各项接管指标更稳定；本周重点关注进料避让与异常恢复。',
      '演示站F': '演示站F站生产规模较上周提升，自动化运行与人工接管切换保持平稳；本周重点关注轨迹规划与料点协同。',
      '演示站I': '演示站I站受网络波动与本体阀异常影响，故障展示较为明显；本周重点关注网络稳定性与故障收敛。'
    };
    const focusMap = {
      '演示站A': '本周重点：继续进行电控箱升级后的验证与标定。',
      '演示站B': '本周重点：保持高位稳定，继续优化毫米波支架后的接管效果。',
      '演示站F': '本周重点：继续车上监管生产，推进料斗摄像头加装。',
      '演示站I': '本周重点：持续监控网络波动和本体阀状态。'
    };
    return {
      analysis: analysisMap[station] || `${station} 站周报内容已固化为展示模板。`,
      focus: focusMap[station] || '本周重点：保持展示模板稳定输出。',
      image: makeSvgDataUrl(`${station} 站数据看板`, subtitles[station] || '静态演示看板。', reportRows, themes[idx % themes.length]),
      status: '展示模板'
    };
  }

  function buildWeeklyReport(records, week, tag) {
    const rows = records.filter(record => week.includes(record.date) && REPORT_STATIONS.includes(record.station));
    const siteDetails = REPORT_STATIONS.map(siteName => {
      const siteRows = rows.filter(row => row.station === siteName);
      return aggregateSite(siteRows, siteName);
    });

    const summary = siteDetails.reduce((acc, item) => {
      acc.stationCount += 1;
      acc.opHours += item.opTime;
      acc.autoFeedTotal += item.autoFeed;
      acc.autoProdFeed += item.autoProdFeed;
      acc.manualFeed += item.manualFeed;
      acc.aiRate += item.aiRate;
      acc.prodRate += item.prodRate;
      acc.succRate += item.succRate;
      acc.abnRec += item.abnRec;
      acc.faultFreq += item.faultFreq;
      acc.prodHours += item.prodHours;
      acc.takeoverHours += item.takeoverHours;
      acc.prodCov += item.prodCov;
      acc.autoVol += item.autoVol;
      acc.totalVol += item.totalVol;
      acc.efficiencyRatio += item.efficiencyRatio;
      return acc;
    }, {
      stationCount: 0,
      opHours: 0,
      autoFeedTotal: 0,
      autoProdFeed: 0,
      manualFeed: 0,
      aiRate: 0,
      prodRate: 0,
      succRate: 0,
      abnRec: 0,
      faultFreq: 0,
      prodHours: 0,
      takeoverHours: 0,
      prodCov: 0,
      autoVol: 0,
      totalVol: 0,
      efficiencyRatio: 0
    });

    summary.aiRate = num(summary.aiRate / siteDetails.length, 4);
    summary.prodRate = num(summary.prodRate / siteDetails.length, 4);
    summary.succRate = num(summary.succRate / siteDetails.length, 4);
    summary.abnRec = num(summary.abnRec / siteDetails.length, 4);
    summary.faultFreq = num(summary.faultFreq / siteDetails.length, 4);
    summary.prodCov = num(summary.prodCov / siteDetails.length, 4);
    summary.efficiencyRatio = num(summary.efficiencyRatio / siteDetails.length, 4);

    const siteTargets = Object.fromEntries(REPORT_STATIONS.map((site, idx) => [site, {
      opHours: [35, 42, 28, 18][idx],
      autoFeed: [540, 470, 310, 250][idx],
      aiRate: [0.85, 0.86, 0.8, 0.76][idx],
      prodRate: [0.82, 0.88, 0.76, 0.75][idx],
      succRate: [0.95, 0.96, 0.95, 0.96][idx],
      abnRec: [0.6, 0.75, 0.5, 0.45][idx],
      prodCov: [0.95, 0.98, 0.92, 0.9][idx],
      autoVolCov: [0.82, 0.88, 0.82, 0.78][idx],
      efficiencyRatio: [0.88, 0.85, 0.75, 0.68][idx]
    } ]));

    const siteCards = Object.fromEntries(REPORT_STATIONS.map((site, idx) => [site, buildStationTemplate(site, idx, rows)]));

    return {
      id: tag === 'current' ? Number(week[6].replace(/-/g, '')) : Number(week[6].replace(/-/g, '')) - 100,
      reportName: tag === 'current' ? '本周运营周报' : '对照周报',
      dateRange: { start: week[0], end: week[6] },
      summary,
      siteDetails,
      siteTargets,
      siteCards,
      records: rows,
      analysis: REPORT_TEMPLATE_TEXT.analysis,
      otherMatters: REPORT_TEMPLATE_TEXT.other,
      createdAt: `${week[6]} 00:00:00`
    };
  }

  function buildState() {
    const now = new Date();
    const bucket = tick();
    const currentWeek = weekDates(now);
    const previousWeek = weekDates(addDays(now, -7));
    const allRecords = [];

    [
      { week: previousWeek, tag: 'prev', scale: 0.93 },
      { week: currentWeek, tag: 'current', scale: 1 }
    ].forEach(({ week, tag, scale }, weekOffset) => {
      week.forEach((date, dayIndex) => {
        SITE_DEFS.forEach((site, siteIndex) => {
          const record = buildRecord(site, siteIndex, date, dayIndex, bucket + weekOffset, tag);
          const timeJitter = 0.92 + seed(siteIndex, dayIndex, 40, bucket) * 0.18;
          const volumeJitter = 0.88 + seed(siteIndex, dayIndex, 41, bucket) * 0.26;
          record.totalOpTime = String(Math.round((+record.totalOpTime || 0) * scale * timeJitter));
          record.autoFeedTotal = String(Math.round((+record.autoFeedTotal || 0) * scale * volumeJitter));
          record.autoProdFeed = String(Math.round((+record.autoProdFeed || 0) * scale * volumeJitter));
          record.manualFeed = String(Math.max(0, Math.round((+record.manualFeed || 0) * scale * (0.9 + seed(siteIndex, dayIndex, 42, bucket) * 0.2))));
          record.abnormalTask = String(Math.max(0, Math.round((+record.abnormalTask || 0) * (0.8 + seed(siteIndex, dayIndex, 43, bucket) * 0.5))));
          record.autoWorkDuration = String(Math.round((+record.autoWorkDuration || 0) * scale * timeJitter));
          record.localCtrlDuration = String(Math.round((+record.localCtrlDuration || 0) * scale * timeJitter));
          record.prodDuration = String(Math.round((+record.prodDuration || 0) * scale * timeJitter));
          record.takeoverDuration = String(Math.round((+record.takeoverDuration || 0) * scale * timeJitter));
          record.autoVol = num((+record.autoVol || 0) * scale * volumeJitter, 1);
          record.totalVol = num((+record.totalVol || 0) * scale * volumeJitter, 1);
          record.efficiencyRatio = num(clamp((+record.efficiencyRatio || 0) * (0.96 + seed(siteIndex, dayIndex, 44, bucket) * 0.1), 0.2, 1.2), 4);
          allRecords.push(record);
        });
      });
    });

    const reports = [
      buildWeeklyReport(allRecords, previousWeek, 'prev'),
      buildWeeklyReport(allRecords, currentWeek, 'current')
    ];

    return {
      stations: clone(SITE_DEFS),
      records: allRecords,
      weeklyReports: reports,
      calendar: {
        [currentWeek[0]]: '本周演示数据已自动生成。',
        [currentWeek[2]]: '生产监测页完全使用本地模拟数据。',
        [currentWeek[4]]: '90 秒后会自动刷新一次数据。'
      },
      tiers: { updatedAt: ymd(now), rows: [] },
      generatedAt: now.toISOString(),
      generatedFor: currentWeek.join('|'),
      buildTick: bucket,
      version: DEMO_VERSION
    };
  }

  function persist() {
    try {
      if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // ignore persistence failures in file:// mode
    }
  }

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (parsed.version !== DEMO_VERSION) return null;
      if (parsed.buildTick !== tick()) return null;
      if (!Array.isArray(parsed.weeklyReports) || !parsed.weeklyReports.length) return null;
      if (!Array.isArray(parsed.records) || !parsed.records.length) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function rebuildState(reason = 'refresh') {
    state = buildState();
    state.refreshReason = reason;
    persist();
    return state;
  }

  function ensureState() {
    if (!state) {
      state = loadPersistedState() || rebuildState('boot');
    }
    if (state.buildTick !== tick()) {
      rebuildState('tick');
    }
    if (state && state.records && state.records.length) {
      state.records.forEach(record => {
        if (Array.isArray(record.productionPeriods)) {
          record.productionPeriods = record.productionPeriods.map((period, idx) => {
            const start = new Date(period.start_time);
            const end = new Date(period.end_time);
            const drift = idx % 2 === 0 ? 0 : Math.round(seed(record.id, idx, 51, state.buildTick) * 30);
            end.setSeconds(end.getSeconds() + drift);
            return {
              ...period,
              start_time: start.toISOString(),
              end_time: end.toISOString()
            };
          });
        }
        if (Array.isArray(record.loaderStatePeriods)) {
          record.loaderStatePeriods = record.loaderStatePeriods.map((period, idx) => {
            const start = new Date(period.start_time);
            const end = new Date(period.end_time);
            const drift = Math.round(seed(record.id, idx, 52, state.buildTick) * 45);
            end.setSeconds(end.getSeconds() + drift);
            return {
              ...period,
              start_time: start.toISOString(),
              end_time: end.toISOString()
            };
          });
        }
        if (Array.isArray(record.issues)) {
          record.issues = record.issues.map((issue, idx) => {
            const raw = String(issue.occurTime || '').replace(' ', 'T');
            const dt = new Date(raw);
            if (Number.isNaN(dt.getTime())) return issue;
            dt.setSeconds(dt.getSeconds() + Math.round(seed(record.id, idx, 53, state.buildTick) * 20));
            return { ...issue, occurTime: dt.toISOString().replace('T', ' ').slice(0, 19) };
          });
        }
      });
    }
    return state;
  }

  function monitorSites() {
    const s = ensureState();
    return s.stations.map(site => ({
      id: site.id,
      name: site.name,
      stage: site.stage,
      manualEfficiency: site.manualEfficiency,
      monitor_production: site.monitor_production,
      monitor_loader_state: site.monitor_loader_state,
      online: true
    }));
  }

  function monitorStatus() {
    const s = ensureState();
    return {
      success: true,
      demo_mode: true,
      event_source_connected: false,
      message: '静态演示模式：数据会自动轮转',
      stations: s.stations.length,
      generatedAt: s.generatedAt,
      data: monitorSites()
    };
  }

  function monitorDashboard(startDate, endDate) {
    const s = ensureState();
    const rows = s.records.filter(row => (!startDate || row.date >= startDate) && (!endDate || row.date <= endDate));
    const prodSites = s.stations.filter(site => site.monitor_production !== false);
    const days = [...new Set(rows.map(row => row.date))];
    const prodRows = rows.filter(row => prodSites.some(site => site.name === row.station));
    const totalProductionHours = num(sum(prodRows, 'prodDuration') / 10, 1);
    const totalAIHours = num(sum(prodRows, 'takeoverDuration') / 10, 1);
    const productionBatches = prodRows.reduce((acc, row) => acc + Math.max(1, +row.productionBatchCount || 1), 0);
    const siteMetrics = prodSites.map(site => {
      const siteRows = rows.filter(row => row.station === site.name);
      return {
        station: site.name,
        totalOpTime: num(sum(siteRows, 'totalOpTime') / 10, 1),
        autoFeedTotal: sum(siteRows, 'autoFeedTotal'),
        autoProdFeed: sum(siteRows, 'autoProdFeed'),
        manualFeed: sum(siteRows, 'manualFeed'),
        abnormalTask: sum(siteRows, 'abnormalTask'),
        efficiencyRatio: num(avg(siteRows, 'efficiencyRatio'), 4),
        aiRate: num(avg(siteRows, 'aiRate'), 4),
        prodRate: num(avg(siteRows, 'prodRate'), 4),
        succRate: num(avg(siteRows, 'succRate'), 4)
      };
    });

    return {
      success: true,
      data: {
        automation_coverage_rate: num(prodRows.length ? totalAIHours / Math.max(totalProductionHours, 0.1) * 100 : 0, 1),
        total_production_hours: totalProductionHours,
        total_ai_takeover_hours: totalAIHours,
        avg_daily_production_hours: num(days.length ? totalProductionHours / days.length : 0, 1),
        avg_daily_production_batches: num(days.length ? productionBatches / days.length : 0, 1),
        sites: siteMetrics
      }
    };
  }

  function mergePeriods(records, key) {
    const periods = [];
    records.forEach(row => {
      const list = row[key] || [];
      list.forEach(item => periods.push({ ...item, station: row.station, date: row.date }));
    });
    return periods;
  }

  function monitorTimeline(startDate, endDate) {
    const s = ensureState();
    const rows = s.records.filter(row => (!startDate || row.date >= startDate) && (!endDate || row.date <= endDate));
    const sites = s.stations.map(site => ({
      demo_site_id: site.id,
      demo_site_name: site.name,
      monitor_production: site.monitor_production,
      production_periods: mergePeriods(rows.filter(row => row.station === site.name), 'productionPeriods'),
      loader_state_periods: mergePeriods(rows.filter(row => row.station === site.name), 'loaderStatePeriods')
    }));

    return {
      success: true,
      data: { sites }
    };
  }

  function productionMonitor(station, date) {
    const s = ensureState();
    const row = s.records.find(item => item.station === station && item.date === date) || s.records.find(item => item.station === station) || null;
    return {
      success: true,
      station,
      date,
      record: row
    };
  }

  function statsRows(station, date) {
    const s = ensureState();
    const row = s.records.find(item => item.station === station && item.date === date) || s.records.find(item => item.station === station);
    if (!row) return [];
    return [
      ['站点', row.station],
      ['日期', row.date],
      ['总运营时间（分钟）', row.totalOpTime],
      ['自动化作业时长（分钟）', row.autoWorkDuration],
      ['自动上料总数', row.autoFeedTotal],
      ['自动生产上料数', row.autoProdFeed],
      ['手动上料数', row.manualFeed],
      ['异常任务数', row.abnormalTask],
      ['异常任务本地接管次数', row.abnLocalTakeover],
      ['本地操控时长（分钟）', row.localCtrlDuration],
      ['生产时长（分钟）', row.prodDuration],
      ['接管生产时长（分钟）', row.takeoverDuration],
      ['平均上料时长（秒）', row.avgFeedDuration],
      ['系统故障次数', row.sysFaultCount],
      ['一级故障数', row.fault1],
      ['二级故障数', row.fault2],
      ['三级故障数', row.fault3],
      ['AI时长接管率', `${Math.round((row.aiRate || 0) * 100)}%`],
      ['生产任务接管率', `${Math.round((row.prodRate || 0) * 100)}%`],
      ['任务成功率', `${Math.round((row.succRate || 0) * 100)}%`]
    ];
  }

  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  const getBody = async opts => {
    if (!opts || !opts.body) return {};
    if (typeof opts.body === 'string') {
      try {
        return JSON.parse(opts.body);
      } catch (_) {
        return {};
      }
    }
    return {};
  };

  const parseUrl = input => {
    if (typeof input === 'string') return new URL(input, location.origin);
    if (input && typeof input === 'object' && input.url) return new URL(input.url, location.origin);
    return new URL(String(input), location.origin);
  };

  async function apiResponse(url, opts) {
    const currentState = ensureState();
    const path = url.pathname;
    const method = (opts && opts.method ? String(opts.method) : 'GET').toUpperCase();

    if (path === '/api/records' && method === 'GET') return jsonResponse(currentState.records);
    if (path === '/api/stations' && method === 'GET') return jsonResponse(currentState.stations);
    if (path === '/api/weekly-reports' && method === 'GET') return jsonResponse(currentState.weeklyReports);
    if (path === '/api/calendar/notes' && method === 'GET') return jsonResponse(currentState.calendar);
    if (path === '/api/tiers' && method === 'GET') return jsonResponse(currentState.tiers);
    if (path === '/api/mock/issues' && method === 'GET') return jsonResponse({ success: true, records: [] });
    if (path === '/api/production-monitor' && method === 'GET') {
      return jsonResponse(productionMonitor(url.searchParams.get('station'), url.searchParams.get('date')));
    }
    if (path === '/api/monitor/sites' && method === 'GET') {
      return jsonResponse({ success: true, data: monitorSites() });
    }
    if (path === '/api/monitor/status' && method === 'GET') {
      return jsonResponse(monitorStatus());
    }
    if (path === '/api/monitor/dashboard' && method === 'GET') {
      return jsonResponse(monitorDashboard(url.searchParams.get('start_date'), url.searchParams.get('end_date')));
    }
    if (path === '/api/monitor/timeline' && method === 'GET') {
      return jsonResponse(monitorTimeline(url.searchParams.get('start_date'), url.searchParams.get('end_date')));
    }
    if (path === '/api/stats' && method === 'POST') {
      const body = await getBody(opts);
      return jsonResponse({ success: true, rows: statsRows(body.site_name, body.date || ymd(new Date())) });
    }
    if (path === '/api/ai-analysis' && method === 'POST') {
      const body = await getBody(opts);
      const station = body.station || body.site || '演示站';
      return jsonResponse({
        success: true,
        text: `${station} 的 AI 分析已生成（Demo）。`,
        bullets: ['自动化表现稳定', '异常恢复可持续提升', '建议继续跟踪目标达成率']
      });
    }
    if (path === '/api/report-image' && method === 'POST') {
      const body = await getBody(opts);
      return jsonResponse({ success: true, url: body.data || '' });
    }

    if (path === '/api/records' && method === 'POST') {
      const rec = await getBody(opts);
      rec.id = rec.id || Date.now();
      currentState.records.push(rec);
      persist();
      return jsonResponse(rec, 201);
    }
    if (path.match(/^\/api\/records\/\d+$/) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const rec = await getBody(opts);
      const idx = currentState.records.findIndex(item => item.id === id);
      if (idx >= 0) currentState.records[idx] = rec;
      persist();
      return jsonResponse(rec);
    }
    if (path.match(/^\/api\/records\/\d+$/) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      currentState.records = currentState.records.filter(item => item.id !== id);
      persist();
      return jsonResponse({ success: true });
    }
    if (path === '/api/stations' && method === 'POST') {
      const station = await getBody(opts);
      station.id = station.id || Date.now();
      currentState.stations.push(station);
      persist();
      return jsonResponse(station, 201);
    }
    if (path.match(/^\/api\/stations\/\d+$/) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const station = await getBody(opts);
      const idx = currentState.stations.findIndex(item => item.id === id);
      if (idx >= 0) currentState.stations[idx] = station;
      persist();
      return jsonResponse(station);
    }
    if (path.match(/^\/api\/stations\/\d+$/) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      currentState.stations = currentState.stations.filter(item => item.id !== id);
      persist();
      return jsonResponse({ success: true });
    }
    if (path === '/api/weekly-reports' && method === 'POST') {
      const report = await getBody(opts);
      report.id = report.id || Date.now();
      currentState.weeklyReports.unshift(report);
      persist();
      return jsonResponse(report, 201);
    }
    if (path.match(/^\/api\/weekly-reports\/\d+$/) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const report = await getBody(opts);
      const idx = currentState.weeklyReports.findIndex(item => item.id === id);
      if (idx >= 0) currentState.weeklyReports[idx] = report;
      persist();
      return jsonResponse(report);
    }
    if (path.match(/^\/api\/weekly-reports\/\d+$/) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      currentState.weeklyReports = currentState.weeklyReports.filter(item => item.id !== id);
      persist();
      return jsonResponse({ success: true });
    }
    if (path === '/api/calendar/notes' && method !== 'GET') {
      currentState.calendar = await getBody(opts);
      persist();
      return jsonResponse({ success: true });
    }
    if (path === '/api/tiers' && method !== 'GET') {
      currentState.tiers = await getBody(opts);
      persist();
      return jsonResponse({ success: true });
    }
    if (path.startsWith('/api/')) {
      return jsonResponse({ success: true, demo: true });
    }
    return originalFetch(url.href, opts);
  }

  function installFetchProxy() {
    window.fetch = function (input, opts) {
      const url = parseUrl(input);
      if (url.pathname.startsWith('/api/')) return apiResponse(url, opts || {});
      return originalFetch(input, opts);
    };
  }

  function scheduleRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      const nextTick = tick();
      if (!state || state.buildTick !== nextTick) {
        rebuildState('interval');
        window.dispatchEvent(new CustomEvent('loader-ops-demo-refresh', {
          detail: { reason: 'interval', buildTick: state.buildTick }
        }));
      }
    }, REFRESH_MS);
  }

  window.__LOADER_OPS_DEMO__ = {
    get state() {
      return ensureState();
    },
    persist,
    rebuild: reason => rebuildState(reason || 'manual'),
    refreshNow: () => {
      const rebuilt = rebuildState('manual');
      window.dispatchEvent(new CustomEvent('loader-ops-demo-refresh', {
        detail: { reason: 'manual', buildTick: rebuilt.buildTick }
      }));
      return rebuilt;
    }
  };

  state = buildState();
  persist();
  installFetchProxy();
  scheduleRefresh();

  window.addEventListener('beforeunload', () => {
    try {
      if (refreshTimer) clearInterval(refreshTimer);
    } catch (_) {
      // ignore
    }
  });
})();
