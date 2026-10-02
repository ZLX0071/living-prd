---
name: living-prd
description: 通过澄清产品或从已有 Demo 代码还原产品事实，再按模块计划和审核逐步撰写 PRD，生成包含可交互网页原型、气泡标注、目录导航和页面跳转画布、可本地编辑与持续迭代的活文档 PRD 工作区（Living PRD）。适用于从粗糙想法、shaping 文档或 Coding Agent 产出的产品 Demo 代码新建/继续 Living PRD；纯静态文档不需要使用。
---

# Living PRD

把产品想法逐步交付为可编辑、可演示、可导出的活文档 PRD 工作区——可交互、可迭代、可追溯。

## 开始前

1. 查找当前目录或父目录中的 `living-prd.json`。
2. 判断入口：

   - **想法 / shaping 入口**：用户提供粗糙需求、产品材料或已有 shaping 文档。
   - **Demo 代码入口**：用户提供可访问的产品 Demo 代码目录，希望从实现还原产品功能、规则、边界与设计。

3. 若不存在工作区，按入口运行：

   ```bash
   # 想法 / shaping 入口
   python3 <skill-root>/scripts/init_living_prd.py --name "<产品名>" --type "<Web/App/小程序/其他>"

   # Demo 代码入口
   python3 <skill-root>/scripts/init_living_prd.py --name "<产品名>" --type "<类型>" \
     --source-mode demo --source-path "<Demo 代码目录>"
   ```

   用 `--root <目录>` 指定位置。用户已提供独立设计规范时追加 `--design-source "<规范位置>"`，跳过 Demo 样式反向提取。脚本仅补齐缺失文件，不覆盖用户内容。
4. 读取 `living-prd.json` 与 `shaping/`。shaping 文件从初始化起就在底座“产品研究与参考”分组中展示和编辑；在定型通过前，不撰写正式功能模块或高保真原型。想法入口遵循 [product-shaping.md](references/product-shaping.md)；Demo 入口还必须遵循 [code-demo-intake.md](references/code-demo-intake.md)。
5. 首次运行底座前，在工作区执行 `npm install` 和 `npm run dev`。后续只改外部内容文件，不重写 `runtime/`。

## Demo 代码入口边界

- 默认只读分析 Demo，不修改其代码。排除依赖、构建产物、压缩文件、缓存、生成代码和密钥；不得读取 `.env`、凭据、私钥或用户数据。
- 代码表达的是“当前实现事实”，不自动等于产品意图。每个重要结论必须标为“已实现事实 / 有证据推断 / 待确认 / 疑似技术偶然或缺陷”，并给出 `path:line` 证据。
- 先完成 `shaping/00-code-evidence.md`，再把结论回写到常规 shaping 文件。向用户提交“功能与规则还原摘要 + 意图差异问题”并获得确认后，才能通过 G0。
- 若需要运行 Demo、安装依赖、执行迁移或调用外部服务，先说明命令和影响并取得用户许可；静态阅读足以判断时不运行代码。
- 未提供独立设计规范时，从代码的 tokens、共享样式、布局、字体、资源和组件变体中还原 `reference/DESIGN.md`；观察值与建议规范分开。用户提供了独立规范时，以其为权威来源，跳过反向提取，只记录实现差异。

## 作业门禁

严格按下列门禁推进，每个门禁都要等待用户明确通过：

1. **G0 产品定型**：用户确认 `shaping/06-shaped-brief.md` 中的定型摘要。Demo 入口还要求用户确认 `shaping/00-code-evidence.md` 中的实现事实、推断和意图差异。
2. **G1 板块计划**：起草 `prd/00-plan.md` 和 manifest 模块顺序；该模块固定为过程产物、目录序号 `00`，说明每个板块的目标、边界、依赖、原型页和审核标准。
3. **G2 PRD 基础分析**：把已确认的 shaping 结论转写为正式的 `prd/01-product-definition.md`、`prd/02-users-and-needs.md`、`prd/03-user-stories-and-journey.md`、`prd/04-metrics-and-north-star.md`（数据与北极星指标）。这些是面向最终读者的必交 PRD，不得以 shaping 文件已存在为由省略。
4. **G3 设计参考基线**：先确认 `reference/DESIGN.md`，再完成 `reference/components-and-states.md`、组件展示页和状态展示页。它们和 shaping 同属“产品研究与参考”，不是正式 PRD 模块。
5. **G4 逐模块交付**：一次只提交一个已计划模块的 PRD、原型、标注和关系变更，然后请用户审核。
6. **G5 全局收口**：全量检查模块、页面、状态、注释、跳转与导出，并在最终交付前隐藏 `00` 计划模块。保留其文件和历史，需要时可随时重新显示。

具体的模块编写、回归检查和审核包见 [authoring-workflow.md](references/authoring-workflow.md)。

## 内容与数据规则

- PRD 用 Markdown 独立保存；可使用 Mermaid。
- 每个原型页是独立 HTML，共享 `prototypes/shared/` 中的样式、数据和组件；不复制公共页框。
- 标注按页面独立保存为 JSON。优先通过稳定的 `target` 选择器锚定原型元素；无稳定元素时才使用底座点击生成的全文档归一化坐标。
- 页面、模块、设备尺寸和关系以 `living-prd.json` 为唯一索引；修改旧关系是正常作业，不得只追加新页。
- `00` 计划模块必须使用 `kind: "process"`、`navNumber: "00"` 和布尔值 `hidden`。作业期可见供审核，最终交付前设为 `hidden: true`；不得把它当成正式 PRD 板块导出。
- 模块使用 `kind` 区分信息层级：`prd` 是正式交付，`shaping` 是产品定型依据，`reference` 是设计/实现参考，`process` 是可隐藏过程产物。底座必须分组呈现，不能用一条无差别目录混排。
- 用页面 ID、模块 ID 和标注 ID 建立稳定引用，不以显示标题作关键字。
- 只通过底座编辑器或文件写入修改外部内容。数据契约见 [content-contract.md](references/content-contract.md)。

## 原型与 PRD 规范

- 功能要求尽可能原子化、解耦；每条写明角色/前置、触发、规则、结果、异常/空/加载状态和验收方式。
- 原型中的可点击跳转与 manifest 关系必须同步；画布应反映最新全局关系。
- 先维护正确的页面 `relations`，再由底座“自动排列”计算画布坐标；不要凭感觉批量手写 `canvas.x/y`。打开全局画布确认页面不重叠、箭头可见，必要时拖拽页面标题微调并让底座保存坐标。
- 多状态页除了可操作主页，还要提供专门的状态展示页，并在 manifest 中以 `kind: state-gallery` 标记。
- 禁止凭空猜写标注 `x/y`。必须先在固定视口中渲染页面，再通过底座“添加标注”落点，或为目标元素添加稳定 ID 并使用 `target`；交付前逐条点击列表回归位置。
- 每次出现新的公共组件或跨模块状态，先回写 G3 组件与状态参考资料和展示页，再完成当前模块。
- PC 和手机端分别设定固定视口宽高，不把一个自适应页当作两端原型。

## 视觉决策

在制作原型前询问用户是否有品牌、设计系统或参考图，并把确认结果维护在 `reference/DESIGN.md`。Demo 入口中，已确认的代码提取设计也属于视觉输入；不得用默认规范覆盖它。只有用户无规范、无可复用 Demo 设计或明确交由 Agent 决定时，才使用 [visual-system.md](references/visual-system.md) 的简洁单色规范。此默认方案不得使用 Tailwind 默认蓝/紫色、大面积渐变、大圆角或重阴影。

## 运行与验证

- `npm run validate`：检查 manifest、文件引用、ID、视口、关系和标注坐标。
- `npm run dev`：打开可实时保存的本地底座。
- 底座目录依次分为“正式 PRD”“产品研究与参考”“作业过程”。默认打开第一个正式 PRD；Demo 代码证据、shaping、`DESIGN.md` 和组件/状态可直接阅读、编辑和对照原型，但不计入正式 PRD 序号。
- 底座的主阅读入口是“文档与原型”：默认连续阅读当前文档，点击“对照原型”进入左侧约 2/3 原型、右侧约 1/3 审阅栏；右栏以紧凑 Tag 切换文档和页面标注。展开原型时审阅栏应收起为可随时打开的覆盖式悬浮窗，不再让用户在文档与原型顶级 Tag 之间反复切换。
- 每次模块交付前至少运行验证，并在浏览器中手动检查该模块的文档、原型、标注和画布。
- 正式模块导出“当前模块 PRD + 对应原型截图”；shaping/reference 可作为资料包导出；process 不提供导出。另有“飞书 / Notion Markdown”导出：Mermaid 折叠为节点说明、页面标注转为表格，可一键复制或下载 .md 直接粘贴到协作文档；该导出不替代截图资料包。截图必须在原型 iframe 自身上下文中等待样式、字体、图片和脚本内容稳定后生成。若截图失败或截图与原型视觉明显不一致，不将文档标记为完整导出。
