# metric-glossary — 各站点明细 · 指标说明模块

> 本子工作空间用于实现"数据看板 → 各站点明细"卡片配套的**名词解释弹窗**。
> 与主项目（operation2.0）共享同一套 UI 风格，模块代码集中在此目录，避免污染 `index.html`。

## 目的

为"各站点明细"卡片上的每个指标提供**对照式名词解释**：弹窗布局完全仿照卡片，
分 `上料数 / 运营效果 / 生产情况 / 问题记录汇总` 四组，逐条与卡片字段一一对应，
方便读者边看卡片边查含义。

解释文案的事实来源：项目根目录的 [`../站点明细数据来源说明.md`](../站点明细数据来源说明.md)。

## 交互设计

- **触发按钮**：名称暂定 `📖 指标说明`，位置在"各站点明细"标题右侧
  （`index.html` 的 `card-head` 右侧 flex 容器内）。
- **弹窗机制**：复用现有 overlay 模态框（`.overlay` + `.show` 打开、`closeOv()` 关闭），
  与"新增数据 / 导入 Excel"按钮完全一致的交互。
- **样式**：复用现有 CSS 类（`.modal` / `.st-sec` / `.st-sec-title` / `.st-metrics` 等），
  不新造风格。

## 文件

| 文件 | 作用 | 状态 |
|---|---|---|
| `glossary-data.js` | 指标解释数据（3 组 + 问题记录汇总，共 17 条 名词解释/计算方法/数据来源 + 5 行来源代号） | ✅ |
| `glossary.js` | 构建弹窗 DOM、`openGlossary()` 打开（复用主项目 `closeOv()` 关闭） | ✅ |
| `glossary.css` | 仅 `.gl-*` / `#ovGlossary` 作用域样式，颜色全部复用主项目 CSS 变量 | ✅ |

## 集成方式（已采用：方案A · 单文件加载）

- **server.py**：`do_GET` 加了一条 `/metric-glossary/*` 静态路由（带目录穿越防护，
  按后缀给 `.js`/`.css` 的 content-type）。这是唯一的 server.py 改动。
- **index.html**：仅保留「📖 指标说明」按钮（标题右侧），并在 `</body>` 前引入
  `glossary-data.js`、`glossary.js` 两个脚本。**不再有任何内联模块代码**。
- **glossary.js**：自包含——自动注入 `glossary.css`、首次打开时动态创建 `#ovGlossary`
  弹窗（复用主项目 `.overlay`/`.modal` 样式，关闭走主项目 `closeOv()`）。

> ✅ 单一事实来源：以后改文字/样式只改本目录文件，刷新页面即生效，**不再有双副本、不会被 IDE 保存覆盖**。

## 改文字导航

- 名词解释 / 分组：`glossary-data.js` 的 `GLOSSARY.sections[].items[]`（`term`/`def`/`calc`）。
  - 某个名词**不想显示「计算方法」**：删掉它的 `calc` 字段即可（渲染端按"有才显示"处理）。
  - `src` 字段当前不展示（保留作备注，无害）。
- 底部「原始数据来源代号」表格：`GLOSSARY.legend[]`（`code`/`source`/`note`）。

## 改动边界（实际）

仅改动了：① `server.py` 一条静态路由；② `index.html` 按钮 + 两行 `<script src>`；③ 本子工作空间文件。

## 当前状态

- [x] 建立子工作空间
- [x] 指标解释数据 `glossary-data.js`（上料数已去掉「计算方法」）
- [x] 弹窗逻辑 `glossary.js`（自包含）+ 样式 `glossary.css`
- [x] 单文件加载集成（server.py 路由 + index.html `<script src>`）
