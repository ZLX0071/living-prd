// 飞书 / Notion 友好 Markdown 转换：无浏览器依赖，可用 Node 直接测试。
// 约定：Mermaid 代码块折叠为节点链说明（两个平台都不渲染 Mermaid），
// 页面标注与原型清单转为表格（气泡在协作文档里不可见）。

function inline(text) {
  return String(text ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function escapeHtml(text) {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mermaidEdges(source) {
  const labels = new Map();
  const labelOf = (raw) => {
    const match = /^\s*([A-Za-z0-9_]+)\s*(?:[(\[{]["“]?([^)\]}"”]*)["”]?[)\]}])?/.exec(raw);
    if (!match) return null;
    const [, id, text] = match;
    if (!labels.has(id)) labels.set(id, (text || '').trim() || id);
    return id;
  };
  const edges = [];
  for (const line of String(source).split(/\r?\n/)) {
    if (!line.includes('-->')) continue;
    const [left, ...rest] = line.split('-->');
    const from = labelOf(left);
    const to = labelOf(rest.join('-->'));
    if (from && to) edges.push([from, to]);
  }
  return { labels, edges };
}

function foldMermaid(code) {
  const { labels, edges } = mermaidEdges(code);
  const lines = ['> **流程图（Mermaid 已折叠）**：请在 Living PRD 底座或全局画布中查看渲染图。'];
  if (edges.length) {
    lines.push('> 节点流：');
    for (const [from, to] of edges) lines.push(`> - ${labels.get(from)} → ${labels.get(to)}`);
  } else {
    lines.push('> 本段流程图无法在飞书 / Notion 中渲染，请对照底座原型查看。');
  }
  return lines.join('\n');
}

function transformPrd(prd) {
  return String(prd ?? '').replace(/```mermaid\r?\n([\s\S]*?)```/g, (match, code) => foldMermaid(code));
}

function anchorOf(annotation) {
  if (annotation.target) return `\`${annotation.target}\``;
  const percent = (value) => `${Math.round(Number(value || 0) * 100)}%`;
  return `${percent(annotation.x)}, ${percent(annotation.y)}`;
}

export function buildFeishuNotionMarkdown({ product = {}, module, prd = '', pages = [], annotationsByPage = {}, exportedAt = new Date() } = {}) {
  if (!module) throw new Error('buildFeishuNotionMarkdown requires a module');
  const date = exportedAt instanceof Date ? exportedAt : new Date(exportedAt || Date.now());
  const lines = [];
  lines.push(`# ${module.title}`);
  lines.push('');
  lines.push(`> 导出自 Living PRD 工作区「${product.name || '未命名产品'}」· ${module.title} · ${date.toISOString().slice(0, 10)}`);
  lines.push('> 已为飞书 / Notion 适配：Mermaid 流程图折叠为节点说明，页面标注转为表格。可交互原型与截图请使用底座的资料包导出。');
  lines.push('');
  lines.push(transformPrd(prd).trimEnd());
  lines.push('');
  lines.push('## 附：页面标注');
  const annotated = pages.filter((page) => (annotationsByPage[page.id] || []).length);
  if (!annotated.length) {
    lines.push('');
    lines.push('本模块暂无页面标注。');
  } else {
    for (const page of annotated) {
      lines.push('');
      lines.push(`### ${page.title}`);
      lines.push('');
      lines.push('| 编号 | 标题 | 说明 | 锚点 |');
      lines.push('| --- | --- | --- | --- |');
      for (const item of annotationsByPage[page.id]) {
        lines.push(`| ${inline(item.number)} | ${inline(item.title)} | ${inline(item.content)} | ${anchorOf(item)} |`);
      }
    }
  }
  if (pages.length) {
    lines.push('');
    lines.push('## 附：原型页面');
    lines.push('');
    lines.push('| 页面 | 设备 | 视口 |');
    lines.push('| --- | --- | --- |');
    for (const page of pages) lines.push(`| ${inline(page.title)} | ${inline(page.device)} | ${page.viewport?.width}×${page.viewport?.height} |`);
  }
  return lines.join('\n').trimEnd() + '\n';
}
