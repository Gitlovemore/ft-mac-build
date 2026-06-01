# FloatingTodo Changelog

---

## v0.5.2 — 2026-04-07

### 🎨 优化：灵感库标签区域布局

**问题现象：**
标签区域背景框随内容撑大，标签位置偏下。

**优化内容：**
1. `.inspo-search-wrap` 改为垂直堆叠布局（搜索框在上，标签在下）
2. `.inspo-filter-tags` 标签改为等分宽度（`flex: 1`），不换行
3. 标签字体稍大（13px），padding 调整更紧凑
4. `#inspo-wrap` 整体尺寸缩小（360×520），位置微调（top: 68px）
5. 动画时间缩短，更轻快

**变更文件：** `resources/app_extracted/src/index.html`

---

## v0.5.1 — 2026-04-07

### 🐛 Bug Fix: 拖拽时 FAB 图标突然变小且无法恢复

**问题现象：**
桌面拖拽 FAB 时，图标会突然缩小（约缩小 ~7%），之后无法恢复到原始大小。

**根本原因：**
`#fab` 的 CSS 同时设置了 `transform` 过渡和 hover 缩放：
```css
transition: transform .15s;    /* ← 罪魁祸首 */
#fab:hover { transform: scale(1.07); }
```
拖拽过程中鼠标频繁离开/进入 FAB 区域，触发 hover 状态切换，导致 `transform` 在 `scale(1)` 和 `scale(1.07)` 之间反复过渡动画。快速拖拽时过渡被中断，`transform` 卡在中间值，图标永久变小。

**修复方案：**
1. 移除 `#fab` 的 `transform` transition，hover 不再使用 `scale()` 放大
2. 新增 `.dragging` class，拖拽时强制 `transform: none !important; transition: none !important`
3. 用 CSS class 替代 JS 直接修改 `style.cursor`

**变更文件：** `resources/app_extracted/src/index.html`

---

## v0.5 — 2026-04-07

### 🎨 重新设计：灵感库固定从右上角 FAB 向左下展开

**问题现象（v0.4）：**
灵感库仍显示为全屏居中覆盖（黑色背景遮罩），`fab-left/fab-right` 自适应逻辑复杂且不稳定。

**解决方案：**
彻底简化，去掉所有自适应方向检测逻辑：
- **固定定位**：`#inspo-wrap` 始终 `top: 62px; right: 12px`（FAB 正下方偏左）
- **移除**：`fab-left/fab-right` class、`fabSide` 变量、拖拽时的侧检测、箭头 `::before`
- **动画**：面板从右上角缩放弹出（`transform-origin: top right; scale(.9) → scale(1)`）
- **无全屏遮罩**：overlay 无背景色，只做点击穿透拦截

**变更文件：** `resources/app_extracted/src/index.html`

---

## v0.4.1 — 2026-04-07

### 🐛 Bug Fix: 窗口拖拽到屏幕顶部后消失

**问题现象：**
窗口拖到屏幕最顶部（Y ≤ 0）后，整个窗口跑到屏幕外不可见，按快捷键仍能唤出面板。

**根本原因：**
`main.js` 的 `win-move` IPC handler 直接设置窗口坐标，无任何边界限制：
```javascript
// 原代码
win.setPosition(Math.round(x), Math.round(y));
```

**修复方案（`main.js`）：**
添加边界限制，确保窗口始终在屏幕工作区内：
```javascript
const display = screen.getPrimaryDisplay();
const { width: screenW, height: screenH } = display.workAreaSize;
const [winW, winH] = win.getSize();
win.setPosition(
  Math.round(Math.max(0, Math.min(maxX, x))),
  Math.round(Math.max(0, Math.min(maxY, y)))
);
```

**变更文件：** `resources/app_extracted/main.js`

---

## v0.4 — 2026-04-07

### 🎨 重新设计：灵感库改为从 FAB 位置展开

**问题现象（v0.3.1 修复后仍存在）：**
灵感库 overlay 全屏覆盖居中，在窗口拖拽到屏幕边缘后，面板会随窗口位置偏移，背景遮罩越来越大。

**解决方案：**
将灵感库从「全屏居中 overlay」改为「从 FAB 位置展开的浮动面板」，与主面板行为一致：

1. **移除全屏遮罩背景** — `#inspo-overlay` 不再有 `rgba(0,0,0,.6)` 背景色
2. **新增 `#inspo-wrap` 包装器** — 实际的浮动面板容器，通过 `::before` 伪元素显示指向 FAB 的箭头
3. **FAB 侧检测** — 拖拽结束时记录 FAB 在屏幕左侧还是右侧（以 `screen.width/2` 为界）
4. **自适应展开方向**：
   - FAB 在左侧 → 面板展开到 FAB **右侧**（`fab-left` class）
   - FAB 在右侧 → 面板展开到 FAB **左侧**（`fab-right` class）
5. **展开动画** — 面板从 FAB 位置缩放弹出（`scale(.88) → scale(1)`），箭头指向 FAB

**变更文件：** `resources/app_extracted/src/index.html`
- CSS：新增 `#inspo-wrap` 样式、`::before` 箭头、`fab-left`/`fab-right` 方向class
- JS：添加 `fabSide` 变量，拖拽结束时检测，open 时设置对应 class
- 浅色主题：为 `#inspo-wrap` 和 `::before` 添加 `body.light` 样式

---

## v0.3.1 — 2026-04-07

### 🐛 Bug Fix: 左上角展开后灵感库下移 / 界面变宽（第2轮）

**问题现象：**
v0.3 的 `overflow: hidden` + `min(460px, 96vw)` 修复后问题仍存在。

**根本原因（深入分析）：**
三个 overlay 使用 `position: fixed; inset: 0`。
在 Electron 窗口拖拽到屏幕左上角（坐标贴近 0,0）时，
Chromium 对 `fixed` 元素的视口（viewport）计算产生偏差，
导致 `inset: 0` 的 overlay 覆盖范围异常，flex 居中的面板随之偏移。

**修复方案（`src/index.html`）：**
将所有三个 overlay 从 `position: fixed` 改为 `position: absolute`，
相对于 `#app`（400×680，固定尺寸）定位。
`absolute` 在此场景下与 `fixed` 行为等价，但不受窗口屏幕位置影响：
- `#inspo-overlay / #cal-overlay / #settings-overlay`：`position: absolute; inset: 0`
- `#inspo-panel / #cal-panel` 宽度改为 `min(460/520px, 100%)`

**变更文件：** `resources/app_extracted/src/index.html`

---

## v0.3 — 2026-04-07

### 🐛 Bug Fix: 左上角展开后灵感库下移 / 界面变宽

**问题现象：**
悬浮图标拖拽到左上角后，展开面板并打开灵感库，关闭灵感库后，再次打开灵感库会出现：
- 灵感库面板整体下移
- 主界面宽度被撑宽

**根本原因：**
三个 overlay（`#inspo-overlay` / `#cal-overlay` / `#settings-overlay`）使用 `position: fixed; inset: 0`，
其内部面板宽度（460px / 520px）超出了 Electron 窗口宽度（400px）。
Chromium 在渲染时，`fixed` 元素的超宽子内容会触发视口布局重算，导致 `body` 的滚动区域扩展，
进而影响 `position: absolute` 的 `#panel` 的 `right` 定位参考点发生偏移，表现为界面变宽、overlay 位置错位。

**修复方案（`src/index.html`）：**
1. 给所有三个 overlay 添加 `overflow: hidden`，阻断超宽内容撑开 body
2. 将 `#inspo-panel` 宽度从固定 `460px` 改为 `min(460px, 96vw)`
3. 将 `#cal-panel` 宽度从固定 `520px` 改为 `min(520px, 96vw)`

**变更文件：** `resources/app_extracted/src/index.html`

---

## v0.2 — 2026-04-04

### ✨ 浅色主题设计 — 「纸与墨」(Paper & Ink)

- 完整浅色主题 CSS，紫色 `#7c6ef7` 为主色调
- 空数据时显示示例任务（5 条）
- 修复进度圆圈在浅色主题下的重复样式问题

---

## v0.1 — 2026-04-04

### ✨ 功能移植：日历 + 任务迁移逻辑

- 将根目录 `index.html` 的日历功能和每日迁移逻辑移植到 `app_extracted/src/index.html`
- `runMigration()`：每日启动时将昨日未完成任务标记完成并创建迁移副本
- 日历视图（月/周/日）支持 migrated 任务红色标识
- 移除快捷键自定义功能（固定为 Enter）
