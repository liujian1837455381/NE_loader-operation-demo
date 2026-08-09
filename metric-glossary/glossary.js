/* ============================================================================
 * metric-glossary · 弹窗渲染与开关逻辑（自包含）
 * 依赖：GLOSSARY（glossary-data.js，需在本文件之前加载）、
 *       closeOv()（主项目全局函数，移除 .show 关闭弹窗）
 * 自动：注入 glossary.css、动态创建 #ovGlossary 弹窗 DOM。
 * index.html 只需：① 一个调用 openGlossary() 的按钮；
 *                  ② 先后引入 glossary-data.js、glossary.js 两个脚本。
 * ========================================================================== */

// 注入样式（避免 index.html 再写 <link>）
(function () {
  if (document.getElementById('gl-style-link')) return;
  var link = document.createElement('link');
  link.id = 'gl-style-link';
  link.rel = 'stylesheet';
  link.href = '/metric-glossary/glossary.css';
  document.head.appendChild(link);
})();

function _glEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

// 单个名词解释块（仿小卡片）；有 calc 才显示「计算方法」行
function _glTermCard(it) {
  var s = '<div class="gl-term">'
    + '<div class="gl-term-name">' + _glEsc(it.term) + '</div>'
    + '<div class="gl-row"><b>名词解释：</b>' + _glEsc(it.def) + '</div>';
  if (it.calc) s += '<div class="gl-row"><b>计算方法：</b>' + _glEsc(it.calc) + '</div>';
  s += '</div>';
  return s;
}

// 一个分组（标题 + 名词网格），与卡片分组一一对应
function _glSection(sec) {
  return '<div class="gl-sec">'
    + '<div class="gl-sec-title">' + _glEsc(sec.title) + '</div>'
    + '<div class="gl-grid">' + sec.items.map(_glTermCard).join('') + '</div>'
    + '</div>';
}

// 首次打开时动态创建弹窗外壳（复用主项目 .overlay/.modal 样式）
function _glEnsureOverlay() {
  var ov = document.getElementById('ovGlossary');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.className = 'overlay';
  ov.id = 'ovGlossary';
  ov.innerHTML = '<div class="modal modal-lg">'
    + '<div class="modal-head">'
    + '<div class="modal-head-title"><span>📖</span><span>指标说明 · 各站点明细</span></div>'
    + '<button class="modal-x" onclick="closeOv(\'ovGlossary\')">×</button>'
    + '</div>'
    + '<div class="modal-body" id="glossaryBody"></div>'
    + '</div>';
  document.body.appendChild(ov);
  return ov;
}

function openGlossary() {
  var g = GLOSSARY;
  var ov = _glEnsureOverlay();
  var html = g.sections.map(_glSection).join('');
  if (g.issue) {
    html += '<div class="gl-sec">'
      + '<div class="gl-sec-title">' + _glEsc(g.issue.title) + '</div>'
      + '<div class="gl-grid">' + _glTermCard(g.issue) + '</div>'
      + '</div>';
  }
  document.getElementById('glossaryBody').innerHTML = html;
  ov.classList.add('show');
}
