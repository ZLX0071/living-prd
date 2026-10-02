# Living PRD 数据契约

## 目录

```text
<workspace>/
├── living-prd.json
├── shaping/
│   ├── 00-code-evidence.md        # 仅 Demo 代码入口
│   ├── 00-competitive-analysis.md # 竞品分析（S0）
│   ├── 00-intake.md
│   ├── 01-product-shaping.md
│   ├── 02-jtbd.md
│   ├── 03-scope.md
│   ├── 04-pages-and-flows.md
│   ├── 05-open-questions.md
│   └── 06-shaped-brief.md
├── prd/
│   ├── 00-plan.md
│   ├── 01-product-definition.md
│   ├── 02-users-and-needs.md
│   ├── 03-user-stories-and-journey.md
│   └── 04-metrics-and-north-star.md
├── reference/
│   ├── DESIGN.md
│   └── components-and-states.md
├── annotations/
│   └── <page-id>.json
├── prototypes/
│   ├── shared/
│   │   ├── tokens.css
│   │   └── components.js
│   └── pages/
│       ├── components.html
│       └── states.html
├── runtime/              # 底座实现，通常不修改
├── exports/
└── package.json
```

## `living-prd.json`

```json
{
  "schemaVersion": 1,
  "product": {
    "name": "Example",
    "type": "Web",
    "status": "shaping",
    "source": { "mode": "demo", "path": "../example-demo" }
  },
  "modules": [
    {
      "id": "plan",
      "title": "PRD 板块计划",
      "prd": "prd/00-plan.md",
      "kind": "process",
      "navNumber": "00",
      "hidden": true,
      "status": "approved",
      "pages": []
    },
    {
      "id": "code-evidence",
      "title": "Demo 代码事实与规则",
      "prd": "shaping/00-code-evidence.md",
      "kind": "shaping",
      "navNumber": "C1",
      "status": "draft",
      "pages": []
    },
    {
      "id": "shaping-product",
      "title": "产品定型",
      "prd": "shaping/01-product-shaping.md",
      "kind": "shaping",
      "navNumber": "S2",
      "status": "draft",
      "pages": []
    },
    {
      "id": "design-system",
      "title": "视觉设计规范",
      "prd": "reference/DESIGN.md",
      "kind": "reference",
      "navNumber": "R1",
      "status": "draft",
      "pages": []
    },
    {
      "id": "foundation",
      "title": "组件与状态",
      "prd": "reference/components-and-states.md",
      "kind": "reference",
      "navNumber": "R2",
      "status": "draft",
      "pages": ["components", "states"]
    }
  ],
  "pages": [
    {
      "id": "components",
      "title": "组件展示",
      "moduleId": "foundation",
      "file": "prototypes/pages/components.html",
      "annotationFile": "annotations/components.json",
      "kind": "component-gallery",
      "device": "desktop",
      "viewport": { "width": 1440, "height": 900 },
      "canvas": { "x": 80, "y": 80 }
    }
  ],
  "relations": [
    { "id": "r-components-states", "from": "components", "to": "states", "label": "查看状态", "trigger": "data-nav=states" }
  ]
}
```

### 不变条件

- `schemaVersion` 必须是 `1`。
- `product.source.mode` 必须为 `idea` 或 `demo`。Demo 模式还必须记录非空 `source.path`，并提供 `code-evidence` 模块：`kind: "shaping"`、`navNumber: "C1"`、`shaping/00-code-evidence.md`。
- 正式 PRD 必须包含 `product-definition`、`users-and-needs`、`stories-and-journey`、`metrics-and-north-star` 四个基础模块；不得以 shaping 文件代替。后续功能模块同样使用 `kind: "prd"`。
- 两种入口都包含竞品分析（`S0`，引用 `shaping/00-competitive-analysis.md`）与 7 个常规 `shaping` 模块（`S1`–`S7`，分别引用 `shaping/00-intake.md` 至 `shaping/06-shaped-brief.md`）。
- `design-system` 使用 `kind: "reference"`、`navNumber: "R1"`，引用 `reference/DESIGN.md`；`foundation` 使用 `kind: "reference"`、`navNumber: "R2"`，引用 `reference/components-and-states.md`。
- `plan` 是唯一的过程模块，固定使用 `kind: "process"`、`navNumber: "00"` 和布尔值 `hidden`。底座只从目录与默认阅读路径过滤 `hidden: true` 的模块，文件不会被删除；顶部按钮可随时显示或隐藏全部过程模块。
- `kind` 只允许 `prd`、`shaping`、`reference`、`process`。底座依次显示“正式 PRD”“产品研究与参考”“作业过程”；默认打开第一个可见的 `prd`。
- 正式模块目录序号按 manifest 中 `kind: "prd"` 的顺序从 `01` 递增，其他类型不占号。代码证据使用 `C*`，shaping/reference 使用稳定的 `S*`/`R*` 编号，process 使用 `00`。
- 所有 ID 在各自集合内唯一，只用小写字母、数字和连字符。
- 原型 HTML 的文件 basename 必须等于页面 ID，例如页面 `order-detail` 使用 `order-detail.html`；这样 iframe 的原生链接与底座状态可以双向同步。
- 模块必须引用存在的 PRD 和页面；页面必须引用存在的模块、HTML 和标注文件。
- `device` 为 `desktop` 或 `mobile`；宽高是正整数。一个页面 ID 只对应一种设备视口。
- `relations[].from/to` 必须引用已存在页面，边 ID 唯一。
- `canvas.x/y` 是全局画布坐标，由底座根据 `relations` 分层计算并在拖拽结束后保存。Agent 应先维护关系，再点击“自动排列”；仅在浏览器中拖拽页面标题做人工微调，不应直接批量猜写坐标。
- 底座将页面按关系深度分列、同层页面分行，默认页面卡片为 `440×300`，水平步长 `620`、垂直步长 `400`。已保存坐标缺失或发生重叠时，画布展示会自动采用无重叠布局。
- 拖拽结束会把所有页面位置写回 `living-prd.json`。页面关系仍以 `relations` 为事实源；坐标只描述展示布局，不表达业务跳转语义。

## 标注文件

```json
{
  "pageId": "components",
  "annotations": [
    {
      "id": "a-components-001",
      "number": 1,
      "coordinateSpace": "document",
      "x": 0.42,
      "y": 0.18,
      "target": "#primary-action",
      "anchor": { "x": 1, "y": 0.5 },
      "title": "主操作",
      "content": "对应 PRD §F-foundation-01。",
      "status": "active"
    }
  ]
}
```

- `target` 是同源原型页中的稳定 CSS 选择器，优先使用唯一 ID 或 `data-annotation-anchor`；不要依赖易变化的 `nth-child`、显示文案或长层级选择器。
- `anchor.x/y` 是目标元素内部的相对锚点，均为 `0..1`；默认 `{ "x": 0.5, "y": 0.5 }`。为避免遮挡正文，通常使用目标边缘，如 `{ "x": 1, "y": 0.5 }`。
- `coordinateSpace: "document"` 表示 `x/y` 相对完整可滚动文档归一化，而不是当前可见视口；它是 `target` 失效时的回退位置。
- 不允许手工猜测 `x/y`。没有稳定目标元素时，必须通过底座“添加标注”在实际渲染页面上点击生成坐标。
- `number` 在同页唯一且已发布后不因排序变化；删除旧标注不应重用序号。
- `status` 可为 `active` 或 `resolved`。

底座默认不显示原型上的气泡。“显示标注”只控制气泡可见性；对照模式右侧审阅栏通过“文档 / 页面标注”Tag 切换内容。点击气泡时自动切到“页面标注”并短暂高亮对应条目，不得调用浏览器 `alert`、`confirm` 或 `prompt` 展示标注详情。

## 审阅布局

- 顶级导航只保留“文档与原型”和“全局画布”，不把 PRD 与交互原型做成两个需要来回切换的同级 Tag。
- “文档与原型”默认展示完整 PRD；有原型的模块提供“对照原型”，无原型模块将该按钮禁用。
- 对照模式使用约 `2fr / 1fr` 两栏：左侧固定比例原型，右侧审阅栏；审阅栏内部用紧凑 Tag 切换当前模块 PRD 与当前页面标注。
- “展开原型”只扩大当前底座内的原型区域，不调用浏览器全屏权限。展开后右栏默认收起，显示一个悬浮入口；打开后以覆盖式面板呈现 PRD/标注，关闭不改变当前原型页。

## 原型导航协议

原型 HTML 中的跨页操作使用原生链接 `<a href="./<page-id>.html" data-nav="<page-id>">…</a>`。原生 `href` 保证原型脱离底座也可跳转，`data-nav` 让底座同步页面选择；manifest 中应存在与真实操作相符的 relation，`trigger` 记录触发控件或条件。

## 保存协议

- 底座只允许读写 manifest 明确引用的 Markdown、HTML 和标注 JSON，以及 `prototypes/shared/` 下文件。
- 底座编辑器使用显式“保存”动作，成功后重新读取并更新视图。不使用仅存于浏览器的 localStorage 作为真相源。
- 后端拒绝绝对路径、`..`、符号链接逃逸和契约之外的文件扩展名。
