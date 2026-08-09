/* ============================================================================
 * metric-glossary · 指标字段悬浮说明（轻量组件）
 * 依赖：GLOSSARY（glossary-data.js，需在本文件之前加载）
 * 自动：注入 metric-tooltip.css，事件委托绑定所有 [data-metric-help-key]。
 * ========================================================================== */
(function () {
  var SHOW_DELAY = 150;
  var GAP = 8;
  var VIEWPORT_PADDING = 12;
  var showTimer = null;
  var activeTrigger = null;
  var popover = null;
  var arrow = null;

  function injectStyle() {
    if (document.getElementById('metric-help-style-link')) return;
    var link = document.createElement('link');
    link.id = 'metric-help-style-link';
    link.rel = 'stylesheet';
    link.href = '/metric-glossary/metric-tooltip.css';
    document.head.appendChild(link);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function findGlossaryTerm(term, sectionsKey) {
    sectionsKey = sectionsKey || 'sections';
    var sections = window.GLOSSARY && window.GLOSSARY[sectionsKey];
    if (Array.isArray(sections)) {
      for (var i = 0; i < sections.length; i++) {
        var items = sections[i].items || [];
        for (var j = 0; j < items.length; j++) {
          if (items[j].term === term) return items[j];
        }
      }
    }
    if (sectionsKey === 'sections' && window.GLOSSARY && window.GLOSSARY.issue && window.GLOSSARY.issue.term === term) {
      return window.GLOSSARY.issue;
    }
    return null;
  }

  function fromGlossaryTerm(term, fallback, sectionsKey) {
    var item = findGlossaryTerm(term, sectionsKey) || {};
    fallback = fallback || {};
    return {
      title: item.term || fallback.title || term,
      definition: item.def || fallback.definition || '',
      formula: item.calc || fallback.formula || '',
      referenceRange: fallback.referenceRange || '',
      source: item.src || fallback.source || ''
    };
  }

  var metricTermKeyMap = {
    totalOpTime: '总运营时长',
    autoFeedTotal: '自动上料总数',
    autoProdFeed: '自动生产上料',
    manualFeed: '手动上料数',
    operationDays: '运营天数',
    aiRate: 'AI接管率',
    prodRate: '生产接管率',
    succRate: '任务成功率',
    abnRec: '异常恢复率',
    faultFreq: '故障频次',
    efficiencyRatio: '人效比',
    prodDuration: '生产时长',
    takeoverDuration: '接管时长',
    prodCov: '时长覆盖率',
    hasProductionRecord: '有生产记录',
    autoVol: '自动生产方量',
    totalVol: '总生产方量'
  };

  var metricHelpFallbackMap = {
    totalOpTime: {
      title: '总运营时长',
      definition: '统计期内该站投入运营的总时长（小时）。'
    },
    autoFeedTotal: {
      title: '自动上料总数',
      definition: '系统自动完成的上料任务总数。'
    },
    autoProdFeed: {
      title: '自动生产上料',
      definition: '真实生产场景下由系统自动完成的上料任务数。'
    },
    manualFeed: {
      title: '手动上料数',
      definition: '由人工手动完成的上料次数。'
    },
    operationDays: {
      title: '运营天数',
      definition: '统计期内该站有运营记录的天数。'
    },
    aiRate: {
      title: 'AI接管率',
      definition: '总运营时间里由系统自动作业（无需人工本地接管）的时长占比。',
      formula: 'Σ 自动化作业时长（分钟） ÷ Σ 总运营时间（分钟）。'
    },
    prodRate: {
      title: '生产接管率',
      definition: '从上料任务条数看，自动完成的生产上料占比（按任务数口径）。',
      formula: '自动生产上料数 ÷ (自动生产上料数 + 手动上料数)。'
    },
    succRate: {
      title: '任务成功率',
      definition: '自动上料任务中未发生异常的比例。',
      formula: '自动上料总数 ÷ (自动上料总数 + 异常任务数)。'
    },
    abnRec: {
      title: '异常恢复率',
      definition: '发生异常的任务中，无需本地人工接管即恢复的比例。',
      formula: '(异常任务数 − 异常任务本地接管次数) ÷ 异常任务数。'
    },
    faultFreq: {
      title: '故障频次',
      definition: '平均每运营小时发生的系统故障次数（次/h）。',
      formula: '系统故障次数 ÷ (总运营时间 ÷ 60)。'
    },
    efficiencyRatio: {
      title: '人效比',
      definition: '人工单次上料基准时长相对系统平均上料时长的比值，衡量自动化相对人工的效率。',
      formula: '各日人效比的平均；每日 = 人工平均上料时长 ÷ 系统平均上料时长。'
    },
    prodDuration: {
      title: '生产时长',
      definition: '现场实际生产作业的总时长（小时）。',
      formula: 'Σ 现场实际生产时长(分钟) ÷ 60。'
    },
    takeoverDuration: {
      title: '接管时长',
      definition: '系统运营时段与实际生产时段相重叠（运营覆盖到的生产）的总时长。',
      formula: 'Σ 运营接管时长(分钟) ÷ 60。'
    },
    prodCov: {
      title: '时长覆盖率',
      definition: '生产时段被运营覆盖的比例。',
      formula: '系统接管时长 ÷ 实际生产时长。'
    },
    hasProductionRecord: {
      title: '有生产记录',
      definition: '该站在统计期内是否有生产。',
      formula: '生产时长 > 0 显示"是"，否则"否"。'
    },
    autoVol: {
      title: '自动生产方量',
      definition: '由自动化方式完成的生产方量（m³，按任务数折算的估算值）。',
      formula: '(自动生产上料 + 手动上料数) × 2.8 × 生产接管率。'
    },
    totalVol: {
      title: '总生产方量',
      definition: '现场总生产方量（m³，按任务数折算的估算值）。',
      formula: '(自动生产上料 + 手动上料数) × 2.8 ÷ 时长覆盖率。'
    }
  };

  // 综合指标（全站汇总）· 数据汇总卡片 → summarySections（全站口径），key 用 sum 前缀避免与单站冲突
  var summaryMetricTermKeyMap = {
    sumStationCount: '运营站点总数',
    sumOpHours: '总运营时长',
    sumAutoFeedTotal: '自动上料总数',
    sumAutoProdFeed: '自动生产上料数',
    sumManualFeed: '手动上料数',
    sumAiRate: '按时长AI接管率',
    sumProdRate: '生产接管率',
    sumSuccRate: '任务成功率',
    sumAbnRec: '异常恢复率',
    sumFaultFreq: '故障频次',
    sumEfficiencyRatio: '人效比',
    sumProdStationCount: '有生产站点数',
    sumProdHours: '生产时长',
    sumTakeoverHours: '接管生产时长',
    sumProdCov: '生产时长覆盖率',
    sumAutoVol: '自动生产方量',
    sumTotalVol: '总生产方量'
  };

  function getMetricHelpMap() {
    var map = {};
    Object.keys(metricTermKeyMap).forEach(function (key) {
      map[key] = fromGlossaryTerm(metricTermKeyMap[key], metricHelpFallbackMap[key], 'sections');
    });
    Object.keys(summaryMetricTermKeyMap).forEach(function (key) {
      map[key] = fromGlossaryTerm(summaryMetricTermKeyMap[key], null, 'summarySections');
    });
    return map;
  }

  function getHelp(key) {
    return getMetricHelpMap()[key] || null;
  }

  function ensurePopover() {
    if (popover && arrow) return;

    popover = document.createElement('div');
    popover.className = 'metric-help-popover';
    popover.id = 'metricHelpPopover';
    popover.setAttribute('role', 'tooltip');
    popover.hidden = true;

    arrow = document.createElement('div');
    arrow.className = 'metric-help-arrow';
    arrow.hidden = true;

    document.body.appendChild(popover);
    document.body.appendChild(arrow);
  }

  function renderContent(help, live) {
    var html = '<div class="metric-help-title">' + esc(help.title) + '</div>';
    if (help.definition) html += '<div class="metric-help-row"><b>名词解释：</b>' + esc(help.definition) + '</div>';
    if (help.formula) html += '<div class="metric-help-row"><b>计算公式：</b>' + esc(help.formula) + '</div>';
    if (live) html += '<div class="metric-help-row"><b>实时数据：</b>' + esc(live) + '</div>';
    if (help.referenceRange) html += '<div class="metric-help-row"><b>参考范围：</b>' + esc(help.referenceRange) + '</div>';
    // 数据来源不在悬浮框展示（保持简洁）；完整来源见「指标说明」弹窗。
    return html;
  }

  function positionPopover(trigger) {
    var tr = trigger.getBoundingClientRect();
    var pr = popover.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var topSpace = tr.top - VIEWPORT_PADDING;
    var bottomSpace = vh - tr.bottom - VIEWPORT_PADDING;
    var placeTop = topSpace >= pr.height + GAP || topSpace >= bottomSpace;

    var top = placeTop ? tr.top - pr.height - GAP : tr.bottom + GAP;
    var left = tr.left + tr.width / 2 - pr.width / 2;

    left = Math.max(VIEWPORT_PADDING, Math.min(left, vw - pr.width - VIEWPORT_PADDING));
    top = Math.max(VIEWPORT_PADDING, Math.min(top, vh - pr.height - VIEWPORT_PADDING));

    popover.style.left = Math.round(left) + 'px';
    popover.style.top = Math.round(top) + 'px';

    var arrowLeft = tr.left + tr.width / 2 - 4;
    arrowLeft = Math.max(VIEWPORT_PADDING, Math.min(arrowLeft, vw - VIEWPORT_PADDING - 8));
    var arrowTop = placeTop ? top + pr.height - 4 : top - 4;

    arrow.style.left = Math.round(arrowLeft) + 'px';
    arrow.style.top = Math.round(arrowTop) + 'px';
    arrow.style.transform = placeTop ? 'rotate(45deg)' : 'rotate(225deg)';
  }

  function show(trigger) {
    var key = trigger.getAttribute('data-metric-help-key');
    var help = getHelp(key);
    if (!help) return;

    ensurePopover();
    activeTrigger = trigger;
    popover.innerHTML = renderContent(help, trigger.getAttribute('data-metric-live'));
    popover.hidden = false;
    arrow.hidden = false;
    trigger.setAttribute('aria-describedby', popover.id);
    positionPopover(trigger);
  }

  function hide() {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    if (activeTrigger) activeTrigger.removeAttribute('aria-describedby');
    activeTrigger = null;
    if (popover) popover.hidden = true;
    if (arrow) arrow.hidden = true;
  }

  function scheduleShow(trigger) {
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(function () {
      showTimer = null;
      show(trigger);
    }, SHOW_DELAY);
  }

  function isTouchMode() {
    return window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
  }

  function closestTrigger(target) {
    return target && target.closest ? target.closest('[data-metric-help-key]') : null;
  }

  function renderLabel(label, key, live) {
    var help = getHelp(key);
    if (!help) return esc(label);
    var liveAttr = live ? ' data-metric-live="' + esc(live) + '"' : '';
    return '<button type="button" class="metric-help-trigger" data-metric-help-key="' + esc(key) + '"' + liveAttr + '>' + esc(label) + '</button>';
  }

  function init() {
    injectStyle();
    ensurePopover();

    document.addEventListener('pointerover', function (event) {
      var trigger = closestTrigger(event.target);
      if (!trigger || isTouchMode()) return;
      scheduleShow(trigger);
    });

    document.addEventListener('pointerout', function (event) {
      var trigger = closestTrigger(event.target);
      if (!trigger || isTouchMode()) return;
      if (event.relatedTarget && trigger.contains(event.relatedTarget)) return;
      hide();
    });

    document.addEventListener('focusin', function (event) {
      var trigger = closestTrigger(event.target);
      if (!trigger) return;
      scheduleShow(trigger);
    });

    document.addEventListener('focusout', function (event) {
      var trigger = closestTrigger(event.target);
      if (!trigger) return;
      hide();
    });

    document.addEventListener('click', function (event) {
      var trigger = closestTrigger(event.target);
      if (trigger && isTouchMode()) {
        event.preventDefault();
        if (activeTrigger === trigger && popover && !popover.hidden) {
          hide();
        } else {
          if (showTimer) clearTimeout(showTimer);
          show(trigger);
        }
        return;
      }

      if (!trigger && popover && !popover.hidden && !popover.contains(event.target)) {
        hide();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') hide();
    });

    window.addEventListener('resize', function () {
      if (activeTrigger && popover && !popover.hidden) positionPopover(activeTrigger);
    });

    window.addEventListener('scroll', function () {
      if (activeTrigger && popover && !popover.hidden) positionPopover(activeTrigger);
    }, true);
  }

  window.MetricTooltip = {
    renderLabel: renderLabel,
    init: init,
    getHelp: getHelp
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
