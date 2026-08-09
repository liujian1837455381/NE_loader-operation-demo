# weekly-report 子工作空间

运营周报功能的前端代码（从 `index.html` 外移，纯机械搬移，不改逻辑）。

## 文件

- `weekly-report.js` — 周报全部 JS：梯度指标、生成周报、回滚算目标、详情表格、查看/编辑、导出、全站分析、周报列表
- `weekly-report.css` — 周报专属样式：`.tier-*`（梯度表）、`.rpt-*`（详情表）、`.rpt-export-item`（导出菜单）

## 加载方式

`index.html` body 末尾（metric-glossary 脚本之后）：

```html
<link rel="stylesheet" href="/weekly-report/weekly-report.css">
<script src="/weekly-report/weekly-report.js"></script>
```

由 `static_routes.py` 的 `/weekly-report/` 路由提供静态服务（仿 `/metric-glossary/`）。

## 依赖 index.html 的全局

`store` `stationsStore` `weeklyReports` `reportsCurPage` `REPORTS_PAGE` `ReportsAPI` `StationsAPI` `pct` `fnum` `escHtml` `escJs` `switchPage` `closeOv` `computeKPIs` `STAGE_LABELS` `getWeekNumber` `pgRange` `html2canvas` `window.currentReport`

外部脚本在 body 末尾加载，晚于 index.html 内联脚本定义上述全局；周报函数仅在用户点击时调用，届时已就绪。HTML（页面/弹窗/onclick）留在 index.html 不动。
