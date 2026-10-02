# Living PRD Skill 迭代记录

> 本仓库 fork 自 [comeonzhj/interaction-prd](https://github.com/comeonzhj/interaction-prd)（MIT）。v0.1.0–v0.8.0 为上游版本的决策记录，原样保留以追溯设计来源；v0.9.0 起为本仓库独立迭代。

## v0.9.0 — 2026-10-02（fork 起点版本）

### 目标

- 从上游 v0.8.0 fork，建立本仓库的独立迭代线，品牌更名为 Living PRD。
- 规划本版本后续增量：数据与北极星指标模块、竞品分析模块、飞书/Notion 导出能力（随迭代逐个交付）。

### 关键决策

- 保留上游 ITERATION_LOG 全部历史决策记录（v0.1.0–v0.8.0），本仓库条目追加在同一文件，保证决策可追溯。
- 数据契约索引文件由 `interaction-prd.json` 更名为 `living-prd.json`，与品牌一致；`schemaVersion` 保持 `1`，字段结构不变，降低理解成本。
- 初始化脚本更名为 `scripts/init_living_prd.py`，行为不变：仅补齐缺失文件，不覆盖既有用户内容。
- 底座跨页导航 postMessage 类型由 `interaction-prd:navigate` 更名为 `living-prd:navigate`，iframe 收发两端（`prototypes/shared/components.js` 与 `runtime/public/app.js`）同步更新。
- 新增 LICENSE 文件，MIT 许可下同时列明上游原作者版权与本 fork 版权。

### 涉及范围

- SKILL.md、README.md、references/content-contract.md、agents/openai.yaml。
- scripts/init_living_prd.py、assets/runtime/package.json。
- runtime：server/lib.mjs（manifest 路径与可编辑集合）、server/server.mjs（启动横幅）、public/index.html（页面标题与品牌字样）、public/app.js（manifest 保存路径与导航消息类型）、prototypes/shared/components.js（导航消息类型）。

### 验证

- Skill quick validation：SKILL.md frontmatter 与 5 份 references 引用完整。
- JavaScript（node --check）与 Python（py_compile）语法检查全部通过。
- 临时初始化工作区执行 `npm run validate`：13 模块、2 页面、1 关系校验通过。
- 底座冒烟回归：首页、manifest API、文件 API 与 vendor 资源全部 200。

### 兼容性

- 上游旧工作区（含 `interaction-prd.json`）不会自动迁移：工作区发现与初始化器现在只识别 `living-prd.json`。迁移方式为将文件重命名为 `living-prd.json`，字段无变化。
- 初始化器"不覆盖既有文件"策略不变。
- docs/images 中的示例截图仍为上游 UI 录制，待后续在真实产品作业时重新截取。

## v0.10.0 — 2026-10-02

### 目标

- 让"成功指标"在功能模块启动前被确认：新增正式 PRD 基础板块"数据与北极星指标"。
- 让竞争环境进入定型依据：新增竞品分析 shaping 文档（S0）。

### 关键决策

- "数据与北极星指标"作为第 4 个必交基础板块（`prd/04-metrics-and-north-star.md`），在 G2 交付、G4 前确认：指标先于功能，避免功能交付与价值脱钩；`validate` 将其列入 requiredModules 强制存在。
- 指标板块要求区分北极星、输入指标树、护栏指标与虚荣指标反例，并落数据来源与埋点需求；无数据时写测量计划，不得虚构基线。
- "竞品分析"定为 shaping 类、`navNumber: "S0"`、`shaping/00-competitive-analysis.md`：它是定型依据而非面向最终读者的正式交付，编号置于 S1 之前体现"先研究、后定型"；结论必须回写 `01-product-shaping.md` 与 `03-scope.md`。
- 竞品模板以对比矩阵 + 差异化机会 + 可借鉴/应避免为主，不追求大而全的竞品百科。

### 涉及范围

- scripts/init_living_prd.py（shaping 模板与 manifest）、runtime/server/validate.mjs（requiredModules）、SKILL.md（G2）、references/authoring-workflow.md（G2/G5）、references/content-contract.md（目录树与不变条件）、references/product-shaping.md（推进方法/必问维度/通过标准）、README.md（工作区结构）、assets/runtime/prd/04-metrics-and-north-star.md（新增模板）。

### 验证

- Python/JavaScript 语法检查通过。
- 临时初始化工作区（idea 入口）执行 `npm run validate`：15 模块、2 页面、1 关系校验通过。
- 检查 demo 入口 manifest 中 C1、S0、S1–S7 的顺序与"产品研究与参考"分组展示预期。

### 兼容性

- 新增必交模块与 shaping 文件只影响新初始化的工作区；既有工作区按需自行补充 `prd/04-metrics-and-north-star.md` 与 `shaping/00-competitive-analysis.md`，否则 `validate` 报缺失。初始化器"不覆盖既有文件"策略不变。

## v0.11.0 — 2026-10-02

### 目标

- 新增飞书 / Notion 友好 Markdown 导出，让 PRD 可以直接进入协作文档平台流转。

### 关键决策

- 不做 API 集成：飞书文档与 Notion 都原生粘贴/导入 Markdown，本地转换 + 复制/下载即可覆盖主流程，避免账号授权与凭证管理负担。
- 转换规则：Mermaid 代码块折叠为"节点流"说明（两个平台都不渲染 Mermaid，且保留可读的边列表）；页面标注与原型清单转为表格（气泡在协作文档中不可见）；导出头注明来源工作区与日期；表格内管道符转义、多行内容压平。
- 转换逻辑独立为 `runtime/public/export-markdown.mjs` 纯函数模块，不依赖浏览器 API，可用 Node 直接做 fixture 断言。
- 底座"导出"改为对话框，提供三个动作：资料包导出（原有）、复制飞书/Notion Markdown、下载 .md；剪贴板写入带 `execCommand` 降级。
- 该导出不替代截图资料包；SKILL.md 与 G5 检查单明确两者并存并分别抽查。

### 涉及范围

- runtime/public/export-markdown.mjs（新增）、public/index.html（导出对话框）、public/app.js（导出数据收集、复制/下载与对话框接线）、public/styles.css（对话框样式）、SKILL.md（运行与验证）、references/authoring-workflow.md（G5）、README.md（特性与版本）。

### 验证

- `node --check` 与 fixture 断言 9 项全部通过（Mermaid 折叠、无残留 mermaid 围栏、标注表格、坐标回退、管道转义、多行压平、原型附表、导出头、空标注分支）。
- 临时工作区 `npm run validate`：15 模块、2 页面、1 关系通过。
- 浏览器回归（IAB）：导出对话框正常打开并展示三个动作；"复制飞书 / Notion Markdown"点击后 toast 反馈正确；拦截 `clipboard.writeText` 验证复制内容为完整转换结果（导出头 + PRD 正文 + 标注附录，890 字符）。注：Playwright 高层定位点击在该环境下超时，回归通过 DOM click 事件完成，与真实点击走同一处理器。

### 兼容性

- 纯增量能力，不改数据契约；`/api/export` 资料包行为不变，旧工作区无需迁移。

## v0.8.0 — 2026-08-21

### 目标

- 增加从 Coding Agent 产出的产品 Demo 代码启动交互 PRD 的入口。
- 从关键代码恢复功能模块、业务规则、状态和边界，并让用户确认产品意图。
- 在没有独立设计规范时，从 Demo 样式还原 `DESIGN.md`。

### 关键决策

- 初始化器增加 `--source-mode demo`、`--source-path` 和 `--design-source`。
- Demo 模式生成 `C1 Demo 代码事实与规则`，所有重要结论区分“已实现事实 / 有证据推断 / 待确认 / 疑似技术偶然或缺陷”，并引用 `path:line`。
- 代码只作为实现证据，不直接等同于产品意图；代码还原审核通过后才进入正式 PRD。
- `R1 DESIGN` 成为两种入口共有的设计参考，组件与状态顺延为 `R2`。
- 用户提供独立设计规范时跳过代码样式反向提取；否则提取 tokens、布局、字体、资源和组件视觉，并区分观察事实与建议修订。
- 默认只读分析 Demo，不读取密钥/用户数据，不擅自安装依赖、运行未知脚本或修改产品代码。

### 涉及范围

- Skill 入口描述、Demo 代码审阅流程、产品定型门禁、视觉决策和设计参考门禁。
- 初始化 manifest、代码证据与 DESIGN 模板、数据契约、验证器和 UI 元数据。

### 验证

- 分别初始化 idea 与 demo 两种工作区并运行 `npm run validate`。
- 检查 `--design-source` 会登记用户规范并跳过反向提取模板。
- 浏览器检查 Demo 目录中的 `C1`、`S1–S7`、`R1`、`R2` 和 `00` 分组阅读行为。

### 兼容性

- 旧工作区缺少 `product.source`、`DESIGN.md` 和新版参考编号，需显式迁移；初始化器仍不覆盖既有内容。

## v0.7.0 — 2026-08-21

### 目标

- 将 shaping 全量展示在底座中。
- 将组件与状态从正式 PRD 移至产品研究与参考资料。
- 建立可持续的仓库版本管理。

### 关键决策

- 左侧目录分为“正式 PRD”“产品研究与参考”“作业过程”三组。
- 7 份 shaping 文件以 `S1–S7` 展示；组件与状态以 `R1` 展示，并继续支持原型、标注和导出资料包。
- 只有 `kind: prd` 的模块占用正式 PRD 的 `01...` 序号；`process` 不导出。
- 默认打开第一个正式 PRD，研究资料可直接编辑但不与正式交付混编。

### 涉及范围

- 初始化 manifest、运行时目录导航、导出状态、数据契约、验证器和作业门禁。
- 组件与状态文档迁移到 `reference/components-and-states.md`。

### 验证

- Skill quick validation。
- JavaScript/Python 语法检查。
- 临时工作区初始化与 `npm run validate`。
- 浏览器检查分组目录、默认模块、资料原型、过程产物隐藏与刷新持久化。

### 兼容性

- 初始化器坚持“不覆盖既有文件”；旧工作区不会自动获得新导航和 manifest 分组，需要显式迁移或新建工作区。

## v0.6.0 — 2026-08-21

- 将 PRD 板块计划固定为 `00` 过程产物，增加可隐藏/恢复及状态持久化。
- 强制正式交付产品定义、用户与需求分析、用户故事与旅程，避免 shaping 结论未转写进最终 PRD。

## v0.5.0 — 2026-08-21

- 修复导出截图缺少样式的问题：在原型 iframe 上下文内联样式并等待字体、图片和脚本稳定后截图。

## v0.4.0 — 2026-08-21

- 将 PRD/原型顶级 Tag 切换改为同页审阅模式。
- 支持约 2:1 原型/文档布局，以及展开原型后的悬浮审阅栏。

## v0.3.0 — 2026-08-21

- 为全局画布增加基于页面关系的自动分层布局、重叠检查和拖拽微调。
- 页面关系箭头随布局计算并保持可见。

## v0.2.0 — 2026-08-21

- 标注默认不常驻显示。
- 优先使用稳定元素选择器和实际落点，避免猜测坐标。
- 点击气泡改为页面内标注定位与闪烁提醒，禁止使用浏览器 alert 展示内容。

## v0.1.0 — 2026-08-21

- 建立自包含的产品定型、板块计划、逐模块审核工作流。
- 提供可本地编辑的 Markdown、原型、标注、全局画布和导出底座。
- 整合原 PM-Make 产品澄清流程与视觉规范。

## 后续记录格式

每次迭代新增一节，至少包含：目标、关键决策、涉及范围、验证结果、兼容性/迁移说明。
