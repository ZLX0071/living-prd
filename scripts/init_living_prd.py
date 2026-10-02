#!/usr/bin/env python3
"""Create or complete a self-contained living PRD workspace."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from datetime import date
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_TEMPLATE = SKILL_ROOT / "assets" / "runtime"


def slugify(value: str) -> str:
    value = value.strip() or "living-prd"
    return re.sub(r"[^\w一-鿿.-]+", "-", value, flags=re.UNICODE).strip("-") or "living-prd"


def find_workspace(start: Path) -> Path | None:
    for candidate in (start, *start.parents):
        if (candidate / "living-prd.json").exists():
            return candidate
    return None


def write_once(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(content, encoding="utf-8")


def copy_tree_once(source: Path, target: Path) -> None:
    for item in source.rglob("*"):
        relative = item.relative_to(source)
        destination = target / relative
        if item.is_dir():
            destination.mkdir(parents=True, exist_ok=True)
        elif not destination.exists():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, destination)


def resolve_workspace(name: str, root: str | None) -> Path:
    cwd = Path.cwd().resolve()
    existing = find_workspace(cwd)
    if existing:
        return existing
    if root:
        base = Path(root).expanduser().resolve()
        if (base / "living-prd.json").exists() or base.name.endswith("-workspace"):
            return base
        return base / f"{slugify(name)}-workspace"
    return cwd / f"{slugify(name)}-workspace"


def shaping_templates(name: str, product_type: str) -> dict[str, str]:
    today = date.today().isoformat()
    return {
        "00-competitive-analysis.md": """# 竞品分析

> 在定型确认前完成。结论需回写到 `01-product-shaping.md`（定位与差异化）和 `03-scope.md`（MVP 边界），不作为独立交付漂移在外。

## 竞品选择

| 竞品 | 类型（直接/间接/参照） | 选择理由 | 信息来源 |
| --- | --- | --- | --- |
| [待确认] | 直接 | [待确认] | [待确认] |

## 对比矩阵

| 维度 | 本产品 | 竞品 A | 竞品 B |
| --- | --- | --- | --- |
| 目标用户 | [待确认] | [待确认] | [待确认] |
| 核心场景 | [待确认] | [待确认] | [待确认] |
| 关键能力 | [待确认] | [待确认] | [待确认] |
| 定价/成本 | [待确认] | [待确认] | [待确认] |
| 明显短板 | [待确认] | [待确认] | [待确认] |

## 差异化机会

- [待确认: 本产品可赢的角度，必须与用户痛点对应，不与 01-product-shaping.md 冲突]

## 可借鉴与应避免

| 来源竞品 | 可借鉴 | 应避免 | 对 MVP 的影响 |
| --- | --- | --- | --- |
| [待确认] | [待确认] | [待确认] | [待确认: 回写到 03-scope.md] |
""",
        "00-intake.md": f"""# 输入材料

| 项目 | 内容 |
| --- | --- |
| 产品名 | {name} |
| 产品类型 | {product_type} |
| 创建日期 | {today} |

## 用户原始想法

[待确认]

## 已有材料

- [待确认: 文档、截图、竞品、会议纪要、数据来源]
""",
        "01-product-shaping.md": """# 产品定型

## 一句话定位

[待确认: 为谁，在什么场景，解决什么问题，带来什么进展]

## 目标用户

| 用户类型 | 特征 | 核心诉求 | 决策权/影响 |
| --- | --- | --- | --- |
| 主用户 | [待确认] | [待确认] | [待确认] |

## 核心场景

| 场景 | 触发条件 | 当前做法 | 痛点 | 成功标准 |
| --- | --- | --- | --- | --- |
| [待确认] | [待确认] | [待确认] | [待确认] | [待确认] |

## 产品形态与视觉输入

[待确认: Web / App / 小程序 / 插件 / API / 内部系统；用户视觉规范或默认简洁规范]
""",
        "02-jtbd.md": """# JTBD 分析

## Job Story

当 [情境]，我想要 [动机]，从而 [期望进展]。

## 四力分析

| Push 当前痛点 | Pull 新方案吸引力 | Anxiety 顾虑 | Habit 惯性 |
| --- | --- | --- | --- |
| [待确认] | [待确认] | [待确认] | [待确认] |

## 任务分层

| 类型 | 内容 |
| --- | --- |
| 功能任务 | [待确认] |
| 情感任务 | [待确认] |
| 社会任务 | [待确认] |
""",
        "03-scope.md": """# MVP 范围

## 做
- [待确认]

## 暂缓
- [待确认]

## 不做
- [待确认]

## 成功指标
| 指标 | 定义 | 目标 | 数据来源 |
| --- | --- | --- | --- |
| [待确认] | [待确认] | [待确认] | [待确认] |
""",
        "04-pages-and-flows.md": """# 页面与流程

## 页面清单
| 页面 | 用户任务 | 核心信息 | 主要操作 | 入口/出口 |
| --- | --- | --- | --- | --- |
| [待确认] | [待确认] | [待确认] | [待确认] | [待确认] |

## 主流程
```mermaid
flowchart TD
  A[进入产品] --> B[完成核心任务]
  B --> C[获得结果]
```

## 关键状态
| 对象 | 状态 | 触发条件 | 可执行操作 |
| --- | --- | --- | --- |
| [待确认] | [待确认] | [待确认] | [待确认] |
""",
        "05-open-questions.md": """# 待确认问题

| 编号 | 问题 | 影响范围 | 优先级 | 结论 |
| --- | --- | --- | --- | --- |
| Q1 | [待确认] | [待确认] | 高 | [待确认] |
""",
        "06-shaped-brief.md": """# 定型摘要记录

> 每次用户确认后，把摘要追加到本文件末尾，不覆盖历史版本。
""",
    }


def code_evidence_template(source_path: str) -> str:
    return f"""# Demo 代码事实与规则

> 代码来源：`{source_path}`。本文件记录实现证据，不把当前实现自动等同于最终产品意图。

## 代码快照

| 项目 | 内容 |
| --- | --- |
| 仓库/目录 | `{source_path}` |
| Git commit | [待记录；无 Git 时写明文件时间或快照方式] |
| 技术栈与启动入口 | [待提取] |
| 审阅范围与排除项 | [待记录] |

## 功能模块与页面

| 模块/页面 | 用户可见能力 | 入口/出口 | 关键实现证据 | 结论类型 |
| --- | --- | --- | --- | --- |
| [待提取] | [待提取] | [待提取] | `path/to/file:line` | 已实现事实/推断/待确认 |

## 业务规则与状态

| 规则 ID | 触发/前置 | 规则与结果 | 异常/边界 | 代码证据 | 是否需用户确认 |
| --- | --- | --- | --- | --- | --- |
| CR-01 | [待提取] | [待提取] | [待提取] | `path/to/file:line` | 是 |

## 数据、权限与外部依赖

| 对象/API/角色 | 字段或权限 | 生命周期/约束 | 代码证据 | 不确定性 |
| --- | --- | --- | --- | --- |
| [待提取] | [待提取] | [待提取] | `path/to/file:line` | [待确认] |

## 实现事实与产品意图差异

| 观察 | 当前分类 | 原因 | 需要用户决定的问题 |
| --- | --- | --- | --- |
| [待提取] | 疑似技术偶然/缺陷/产品规则/占位实现 | [证据] | [待确认] |

## 回写 shaping 对照

| 代码结论 | 回写文件/小节 | 状态 |
| --- | --- | --- |
| [待提取] | `shaping/...` | 待回写 |
"""


def design_template(source_mode: str, design_source: str | None) -> str:
    if design_source:
        provenance = f"用户提供独立设计规范：`{design_source}`。跳过 Demo 样式反向提取；本文件只登记权威来源、适用范围和实现差异。"
    elif source_mode == "demo":
        provenance = "未提供独立设计规范。根据 Demo 中重复出现的样式、组件和资源提取；观察事实与建议修订必须分开。"
    else:
        provenance = "等待用户提供品牌/设计规范；若用户没有规范，再采用 Skill 的默认简洁视觉基线。"
    return f"""# DESIGN

> {provenance}

## 来源与适用范围

| 项目 | 内容 |
| --- | --- |
| 权威来源 | {f'`{design_source}`' if design_source else '[待确认/待提取]'} |
| 对应代码快照 | [待记录] |
| 适用平台与视口 | [待确认] |
| 已知不一致 | [待记录] |

## 设计原则与视觉语言

- [待确认/待提取]

## Design Tokens

### 颜色

| Token | 值 | 用途 | 代码证据 | 状态 |
| --- | --- | --- | --- | --- |
| [待提取] | [待提取] | [待提取] | `path/to/file:line` | 已观察/候选/已确认 |

### 字体、间距、圆角与阴影

| 类别/Token | 值 | 用途 | 代码证据 | 状态 |
| --- | --- | --- | --- | --- |
| [待提取] | [待提取] | [待提取] | `path/to/file:line` | 已观察/候选/已确认 |

## 页面框架与响应策略

| 平台/断点 | 固定视口或布局规则 | 页面框架 | 代码证据 |
| --- | --- | --- | --- |
| [待提取] | [待提取] | [待提取] | `path/to/file:line` |

## 组件视觉与交互

| 组件 | 变体/状态 | 视觉规则 | 交互/动效 | 代码证据 |
| --- | --- | --- | --- | --- |
| [待提取] | [待提取] | [待提取] | [待提取] | `path/to/file:line` |

## 图标、图片与其他资源

| 资源 | 来源/许可 | 使用规则 | 文件证据 |
| --- | --- | --- | --- |
| [待提取] | [待确认] | [待提取] | `path/to/asset` |

## 可访问性与设计债务

- 对比度、字号、焦点、键盘与触控目标：[待检查]
- 重复值、一次性样式和不一致组件：[待提取]
- 观察到的实现不等于推荐规范；需要用户确认的修订：[待确认]
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", default="未命名产品")
    parser.add_argument("--type", default="待确认")
    parser.add_argument("--root", default=None)
    parser.add_argument("--source-mode", choices=["idea", "demo"], default="idea")
    parser.add_argument("--source-path", default=".", help="Demo source directory recorded for code-first shaping")
    parser.add_argument("--design-source", default=None, help="User-provided design specification; skips style reverse-engineering")
    args = parser.parse_args()

    workspace = resolve_workspace(args.name, args.root)
    workspace.mkdir(parents=True, exist_ok=True)
    copy_tree_once(RUNTIME_TEMPLATE, workspace)

    for filename, content in shaping_templates(args.name, args.type).items():
        write_once(workspace / "shaping" / filename, content)
    write_once(workspace / "reference" / "DESIGN.md", design_template(args.source_mode, args.design_source))
    if args.source_mode == "demo":
        write_once(workspace / "shaping" / "00-code-evidence.md", code_evidence_template(args.source_path))

    source = {"mode": args.source_mode}
    if args.source_mode == "demo":
        source["path"] = args.source_path
    if args.design_source:
        source["designSource"] = args.design_source

    research_modules = []
    if args.source_mode == "demo":
        research_modules.append({"id": "code-evidence", "title": "Demo 代码事实与规则", "prd": "shaping/00-code-evidence.md", "kind": "shaping", "navNumber": "C1", "status": "draft", "pages": []})
    research_modules.extend([
        {"id": "competitive-analysis", "title": "竞品分析", "prd": "shaping/00-competitive-analysis.md", "kind": "shaping", "navNumber": "S0", "status": "draft", "pages": []},
        {"id": "shaping-intake", "title": "输入材料", "prd": "shaping/00-intake.md", "kind": "shaping", "navNumber": "S1", "status": "draft", "pages": []},
        {"id": "shaping-product", "title": "产品定型", "prd": "shaping/01-product-shaping.md", "kind": "shaping", "navNumber": "S2", "status": "draft", "pages": []},
        {"id": "shaping-jtbd", "title": "JTBD 分析", "prd": "shaping/02-jtbd.md", "kind": "shaping", "navNumber": "S3", "status": "draft", "pages": []},
        {"id": "shaping-scope", "title": "MVP 范围", "prd": "shaping/03-scope.md", "kind": "shaping", "navNumber": "S4", "status": "draft", "pages": []},
        {"id": "shaping-flows", "title": "页面与流程", "prd": "shaping/04-pages-and-flows.md", "kind": "shaping", "navNumber": "S5", "status": "draft", "pages": []},
        {"id": "shaping-questions", "title": "待确认问题", "prd": "shaping/05-open-questions.md", "kind": "shaping", "navNumber": "S6", "status": "draft", "pages": []},
        {"id": "shaping-brief", "title": "定型摘要", "prd": "shaping/06-shaped-brief.md", "kind": "shaping", "navNumber": "S7", "status": "draft", "pages": []},
        {"id": "design-system", "title": "视觉设计规范", "prd": "reference/DESIGN.md", "kind": "reference", "navNumber": "R1", "status": "draft", "pages": []},
        {"id": "foundation", "title": "组件与状态", "prd": "reference/components-and-states.md", "kind": "reference", "navNumber": "R2", "status": "draft", "pages": ["components", "states"]},
    ])

    manifest = {
        "schemaVersion": 1,
        "product": {"name": args.name, "type": args.type, "status": "shaping", "source": source},
        "modules": [
            {"id": "product-definition", "title": "产品定义与目标", "prd": "prd/01-product-definition.md", "kind": "prd", "status": "draft", "pages": []},
            {"id": "users-and-needs", "title": "用户与需求分析", "prd": "prd/02-users-and-needs.md", "kind": "prd", "status": "draft", "pages": []},
            {"id": "stories-and-journey", "title": "用户故事与旅程", "prd": "prd/03-user-stories-and-journey.md", "kind": "prd", "status": "draft", "pages": []},
            {"id": "metrics-and-north-star", "title": "数据与北极星指标", "prd": "prd/04-metrics-and-north-star.md", "kind": "prd", "status": "draft", "pages": []},
            *research_modules,
            {"id": "plan", "title": "PRD 板块计划", "prd": "prd/00-plan.md", "kind": "process", "navNumber": "00", "hidden": False, "status": "draft", "pages": []},
        ],
        "pages": [
            {"id": "components", "title": "组件展示", "moduleId": "foundation", "file": "prototypes/pages/components.html", "annotationFile": "annotations/components.json", "kind": "component-gallery", "device": "desktop", "viewport": {"width": 1440, "height": 900}, "canvas": {"x": 80, "y": 80}},
            {"id": "states", "title": "状态展示", "moduleId": "foundation", "file": "prototypes/pages/states.html", "annotationFile": "annotations/states.json", "kind": "state-gallery", "device": "desktop", "viewport": {"width": 1440, "height": 900}, "canvas": {"x": 620, "y": 80}},
        ],
        "relations": [{"id": "r-components-states", "from": "components", "to": "states", "label": "查看状态", "trigger": "data-nav=states"}],
    }
    write_once(workspace / "living-prd.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    write_once(workspace / ".gitignore", "node_modules/\nexports/\n")
    print(workspace)


if __name__ == "__main__":
    main()
