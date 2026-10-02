import { marked } from '/vendor/marked.js';
import mermaid from '/vendor/mermaid.js';
import { buildFeishuNotionMarkdown } from './export-markdown.mjs';

mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });

const state = { manifest: null, module: null, page: null, view: 'document', annotations: [], annotate: false, showAnnotations: false, selectedAnnotation: null, frame: null, prototypeExpanded: false, inspectorTab: 'prd', inspectorOpen: true, currentMarkdown: '', zoom: .6, canvasPositions: new Map(), snapshots: new Map(), editorDirty: false };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(url, options) {
  const response = await fetch(url, options);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`);
  return value;
}

async function getFile(path) {
  const result = await api(`/api/file?path=${encodeURIComponent(path)}`);
  state.snapshots.set(path, result.content);
  return result.content;
}

async function saveFile(path, content) {
  await api('/api/file', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, content }) });
  state.snapshots.set(path, content);
  setStatus(`已保存 ${path}`);
}

function setStatus(message) { $('#save-state').textContent = message; }
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2400); }

async function boot() {
  state.manifest = await api('/api/manifest');
  $('#product-name').textContent = state.manifest.product.name;
  $('#product-type').textContent = `${state.manifest.product.type} / ${state.manifest.product.status}`;
  renderNav();
  bind();
  await selectModule(firstVisibleModule()?.id);
  setInterval(refreshExternalChanges, 2500);
}

function moduleKind(module) { return module.kind || 'prd'; }
function visibleModules() { return state.manifest.modules.filter((module) => !module.hidden); }
function firstVisibleModule() { return visibleModules().find((module) => moduleKind(module) === 'prd') || visibleModules()[0] || null; }
function moduleNavNumber(module) {
  if (module.navNumber) return module.navNumber;
  if (module.kind === 'process') return '00';
  const formalModules = state.manifest.modules.filter((item) => moduleKind(item) === 'prd');
  return String(formalModules.indexOf(module) + 1).padStart(2, '0');
}

function updateProcessToggle() {
  const processModules = state.manifest.modules.filter((module) => module.kind === 'process');
  const button = $('#process-toggle');
  button.hidden = processModules.length === 0;
  if (!processModules.length) return;
  const allHidden = processModules.every((module) => module.hidden);
  button.textContent = allHidden ? '显示过程产物' : '隐藏过程产物';
  button.classList.toggle('active', !allHidden);
  button.setAttribute('aria-pressed', String(!allHidden));
}

function renderNav() {
  const groups = [
    { title: '正式 PRD', kinds: ['prd'] },
    { title: '产品研究与参考', kinds: ['shaping', 'reference'] },
    { title: '作业过程', kinds: ['process'] },
  ];
  $('#nav-items').innerHTML = groups.map((group) => {
    const modules = visibleModules().filter((module) => group.kinds.includes(moduleKind(module)));
    if (!modules.length) return '';
    return `<section class="nav-section"><div class="nav-section-title">${group.title}</div>${modules.map((module) => `<button class="nav-item" data-module="${module.id}"><span class="nav-index">${escapeHtml(moduleNavNumber(module))}</span><span>${escapeHtml(module.title)}</span></button>`).join('')}</section>`;
  }).join('');
  $$('.nav-item').forEach((button) => button.addEventListener('click', () => selectModule(button.dataset.module)));
  updateProcessToggle();
}

async function toggleProcessModules() {
  const processModules = state.manifest.modules.filter((module) => module.kind === 'process');
  if (!processModules.length) return;
  const hide = processModules.some((module) => !module.hidden);
  processModules.forEach((module) => { module.hidden = hide; });
  await saveFile('living-prd.json', `${JSON.stringify(state.manifest, null, 2)}\n`);
  renderNav();
  if (state.module?.kind === 'process' && state.module.hidden) {
    const next = firstVisibleModule();
    if (next) await selectModule(next.id);
  }
  toast(hide ? '已隐藏过程产物，文件仍保留' : '已显示过程产物');
}

async function selectModule(id) {
  state.module = state.manifest.modules.find((item) => item.id === id);
  if (!state.module) return;
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.module === id));
  await renderDocument();
  renderPageSelect();
  const firstPage = state.manifest.pages.find((page) => state.module.pages.includes(page.id));
  if (firstPage) await selectPage(firstPage.id); else clearPrototype();
  $('#compare-button').disabled = !firstPage;
  $('#compare-button').textContent = firstPage ? '对照原型' : '暂无原型';
  const kind = moduleKind(state.module);
  $('#document-context').textContent = kind === 'prd' ? '正式 PRD：先连续阅读，需要核对交互时进入同页对照。' : kind === 'process' ? '作业过程：用于计划与审核，最终交付时可隐藏。' : '产品研究与参考：保留推导依据和设计基线，不计入正式 PRD。';
  $('#export-button').disabled = kind === 'process';
  $('#export-button').textContent = kind === 'prd' ? '导出当前模块' : kind === 'process' ? '过程产物不导出' : '导出当前资料';
  if (state.view === 'canvas') renderCanvas();
}

async function renderDocument(content) {
  content ??= await getFile(state.module.prd);
  state.currentMarkdown = content;
  await renderMarkdownInto($('#markdown'), content);
  await renderMarkdownInto($('#split-markdown'), content);
}

async function renderMarkdownInto(container, content) {
  if (!container) return;
  container.innerHTML = marked.parse(content);
  container.querySelectorAll('pre > code.language-mermaid').forEach((code) => {
    const div = document.createElement('div'); div.className = 'mermaid'; div.textContent = code.textContent; code.parentElement.replaceWith(div);
  });
  try { await mermaid.run({ nodes: container.querySelectorAll('.mermaid') }); } catch (error) { toast(`Mermaid: ${error.message}`); }
}

function renderPageSelect() {
  const pages = state.manifest.pages.filter((page) => state.module.pages.includes(page.id));
  $('#page-select').innerHTML = pages.map((page) => `<option value="${page.id}">${escapeHtml(page.title)}</option>`).join('');
}

async function selectPage(id) {
  state.page = state.manifest.pages.find((item) => item.id === id);
  if (!state.page) return;
  state.annotate = false;
  state.showAnnotations = false;
  state.selectedAnnotation = null;
  state.frame = null;
  updateAnnotationControls();
  $('#page-select').value = id;
  $('#viewport-label').textContent = `${state.page.device} / ${state.page.viewport.width} × ${state.page.viewport.height}`;
  await loadAnnotations();
  renderPrototype();
}

function clearPrototype() {
  state.page = null; state.annotations = []; state.frame = null; state.showAnnotations = false; state.selectedAnnotation = null;
  updateAnnotationControls();
  $('#prototype-stage').innerHTML = '<div class="empty">该模块没有原型页。</div>';
  renderAnnotationList();
}

async function loadAnnotations(content) {
  if (!state.page) return;
  content ??= await getFile(state.page.annotationFile);
  state.annotations = JSON.parse(content).annotations || [];
  renderAnnotationList();
}

function renderPrototype() {
  if (!state.page) return clearPrototype();
  const stage = $('#prototype-stage');
  const available = Math.max(560, stage.clientWidth - 40);
  const scale = Math.min(1, available / state.page.viewport.width, 660 / state.page.viewport.height);
  const width = state.page.viewport.width * scale, height = state.page.viewport.height * scale;
  stage.innerHTML = `<div class="frame-wrap" style="width:${width}px;height:${height}px"><iframe title="${escapeHtml(state.page.title)}" src="/content/${encodeURI(state.page.file)}?v=${Date.now()}" style="width:${state.page.viewport.width}px;height:${state.page.viewport.height}px;transform:scale(${scale});transform-origin:top left"></iframe><div class="annotation-overlay ${state.annotate ? 'annotating' : ''}"></div></div>`;
  const frame = stage.querySelector('iframe');
  state.frame = frame;
  frame.addEventListener('load', () => {
    bindPrototypeNavigation(frame);
    frame.contentWindow?.addEventListener('scroll', renderBubbles, { passive: true });
    try {
      const relative = decodeURIComponent(frame.contentWindow.location.pathname).replace(/^\/content\//, '');
      const navigated = state.manifest.pages.find((page) => page.file === relative);
      if (navigated && navigated.id !== state.page.id) selectPage(navigated.id);
    } catch {}
    renderBubbles();
  });
  renderBubbles();
}

function bindPrototypeNavigation(frame) {
  frame.contentDocument?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-nav]');
    if (!target) return;
    const next = state.manifest.pages.find((page) => page.id === target.dataset.nav);
    if (next) { const module = state.manifest.modules.find((item) => item.id === next.moduleId); if (module.id !== state.module.id) selectModule(module.id).then(() => { setView('prototype'); selectPage(next.id); }); else selectPage(next.id); }
  });
}

function renderBubbles() {
  const overlay = $('.annotation-overlay');
  if (!overlay) return;
  if (!state.showAnnotations && !state.annotate) { overlay.innerHTML = ''; return; }
  overlay.innerHTML = state.annotations.filter((item) => item.status !== 'resolved').map((item) => {
    const position = annotationPosition(item);
    if (!position || position.x < 0 || position.x > 1 || position.y < 0 || position.y > 1) return '';
    return `<button class="bubble ${state.selectedAnnotation === item.id ? 'selected' : ''}" data-annotation="${item.id}" title="${escapeHtml(item.title)}" style="left:${position.x * 100}%;top:${position.y * 100}%">${item.number}</button>`;
  }).join('');
  overlay.onclick = async (event) => {
    const bubble = event.target.closest('.bubble');
    if (bubble) { event.stopPropagation(); focusAnnotation(bubble.dataset.annotation); return; }
    if (!state.annotate) return;
    const bounds = overlay.getBoundingClientRect();
    const frameWindow = state.frame?.contentWindow;
    const frameDocument = state.frame?.contentDocument;
    const documentWidth = Math.max(state.page.viewport.width, frameDocument?.documentElement.scrollWidth || 0);
    const documentHeight = Math.max(state.page.viewport.height, frameDocument?.documentElement.scrollHeight || 0);
    const viewportX = (event.clientX - bounds.left) / bounds.width * state.page.viewport.width;
    const viewportY = (event.clientY - bounds.top) / bounds.height * state.page.viewport.height;
    const x = Math.max(0, Math.min(1, ((frameWindow?.scrollX || 0) + viewportX) / documentWidth));
    const y = Math.max(0, Math.min(1, ((frameWindow?.scrollY || 0) + viewportY) / documentHeight));
    const title = prompt('标注标题'); if (!title) return;
    const content = prompt('标注内容（建议引用 PRD 小节）') || '';
    const number = Math.max(0, ...state.annotations.map((item) => item.number || 0)) + 1;
    state.annotations.push({ id: `a-${state.page.id}-${String(number).padStart(3, '0')}`, number, coordinateSpace: 'document', x: +x.toFixed(4), y: +y.toFixed(4), title, content, status: 'active' });
    await persistAnnotations();
  };
}

function annotationPosition(item) {
  const frameWindow = state.frame?.contentWindow;
  const frameDocument = state.frame?.contentDocument;
  if (!frameWindow || !frameDocument) return item.coordinateSpace === 'document' ? null : { x: item.x, y: item.y };
  if (item.target) {
    try {
      const target = frameDocument.querySelector(item.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        const anchorX = Number.isFinite(item.anchor?.x) ? item.anchor.x : .5;
        const anchorY = Number.isFinite(item.anchor?.y) ? item.anchor.y : .5;
        return { x: (rect.left + rect.width * anchorX) / state.page.viewport.width, y: (rect.top + rect.height * anchorY) / state.page.viewport.height };
      }
    } catch {}
  }
  if (item.coordinateSpace !== 'document') return { x: item.x, y: item.y };
  const documentWidth = Math.max(state.page.viewport.width, frameDocument.documentElement.scrollWidth);
  const documentHeight = Math.max(state.page.viewport.height, frameDocument.documentElement.scrollHeight);
  return { x: (item.x * documentWidth - frameWindow.scrollX) / state.page.viewport.width, y: (item.y * documentHeight - frameWindow.scrollY) / state.page.viewport.height };
}

async function persistAnnotations() {
  const content = JSON.stringify({ pageId: state.page.id, annotations: state.annotations }, null, 2) + '\n';
  await saveFile(state.page.annotationFile, content); renderBubbles(); renderAnnotationList();
}

function renderAnnotationList() {
  const root = $('#annotation-list');
  root.innerHTML = '<h2>页面标注</h2>' + (state.annotations.length ? state.annotations.map((item) => `<div class="annotation-item ${state.selectedAnnotation === item.id ? 'selected' : ''}" data-annotation="${item.id}"><strong><span class="annotation-number">${item.number}</span>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.content)}</p></div>`).join('') : '<div class="empty">点击“添加标注”，再在原型的准确位置落点。</div>');
  root.querySelectorAll('[data-annotation]').forEach((item) => item.addEventListener('click', () => focusAnnotation(item.dataset.annotation)));
}

function focusAnnotation(id) {
  const item = state.annotations.find((annotation) => annotation.id === id); if (!item) return;
  state.selectedAnnotation = id;
  state.showAnnotations = true;
  state.inspectorTab = 'annotations';
  state.inspectorOpen = true;
  updateAnnotationControls();
  updateReviewLayout();
  const target = item.target ? state.frame?.contentDocument?.querySelector(item.target) : null;
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  renderAnnotationList();
  renderBubbles();
  const listItem = $(`.annotation-item[data-annotation="${CSS.escape(id)}"]`);
  if (listItem) {
    listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    listItem.classList.remove('flash');
    void listItem.offsetWidth;
    listItem.classList.add('flash');
    setTimeout(() => listItem.classList.remove('flash'), 1100);
  }
  setTimeout(renderBubbles, 420);
}

function updateAnnotationControls() {
  const visibility = $('#annotation-visibility-button');
  const annotate = $('#annotate-button');
  if (visibility) { visibility.classList.toggle('active', state.showAnnotations); visibility.textContent = state.showAnnotations ? '隐藏标注' : '显示标注'; }
  if (annotate) { annotate.classList.toggle('active', state.annotate); annotate.textContent = state.annotate ? '结束添加' : '添加标注'; }
}

function setView(view) {
  state.view = view;
  $$('.view').forEach((node) => node.classList.toggle('active', node.id === `${view}-view`));
  $$('.tab').forEach((node) => node.classList.toggle('active', node.dataset.view === view || (view === 'prototype' && node.dataset.view === 'document')));
  if (view === 'prototype') { updateReviewLayout(); renderPrototype(); }
  if (view === 'canvas') renderCanvas();
}

function setInspectorTab(tab) {
  state.inspectorTab = tab;
  state.inspectorOpen = true;
  updateReviewLayout();
}

function updateReviewLayout() {
  const layout = $('#review-layout'); if (!layout) return;
  layout.classList.toggle('expanded', state.prototypeExpanded);
  layout.classList.toggle('inspector-open', !state.prototypeExpanded || state.inspectorOpen);
  $$('.inspector-tab').forEach((button) => button.classList.toggle('active', button.dataset.inspector === state.inspectorTab));
  $('#inspector-prd').classList.toggle('active', state.inspectorTab === 'prd');
  $('#inspector-annotations').classList.toggle('active', state.inspectorTab === 'annotations');
  $('#expand-prototype').textContent = state.prototypeExpanded ? '退出展开' : '展开原型';
  $('#floating-inspector').textContent = state.inspectorTab === 'prd' ? 'PRD' : '页面标注';
}

function renderCanvas() {
  const pages = state.manifest.pages;
  ensureCanvasPositions();
  const canvas = $('#canvas');
  canvas.style.transform = `scale(${state.zoom})`;
  const cards = pages.map((page) => `<article class="canvas-card" data-page="${page.id}"><header><strong>${escapeHtml(page.title)}</strong><span class="mono">${page.device}</span></header><iframe src="/content/${encodeURI(page.file)}"></iframe></article>`).join('');
  canvas.innerHTML = `<svg><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#666"/></marker></defs><g id="canvas-relations"></g></svg>${cards}`;
  canvas.querySelectorAll('.canvas-card').forEach((card) => {
    bindCanvasDrag(card);
    card.addEventListener('click', async () => {
      if (card.dataset.dragged === 'true') { card.dataset.dragged = 'false'; return; }
      const page = state.manifest.pages.find((p) => p.id === card.dataset.page); await selectModule(page.moduleId); await selectPage(page.id); setView('prototype');
    });
  });
  updateCanvasGeometry();
  $('#zoom-label').textContent = `${Math.round(state.zoom * 100)}%`;
}

function ensureCanvasPositions() {
  const pages = state.manifest.pages;
  const ids = new Set(pages.map((page) => page.id));
  const stale = state.canvasPositions.size !== pages.length || [...state.canvasPositions.keys()].some((id) => !ids.has(id));
  if (!stale) return;
  const saved = new Map(pages.map((page) => [page.id, { x: Number(page.canvas?.x), y: Number(page.canvas?.y) }]));
  state.canvasPositions = canvasPositionsValid(saved, pages) ? saved : computeAutoLayout();
  if (!canvasPositionsValid(saved, pages)) setStatus('检测到画布坐标缺失或重叠，已自动排列');
}

function canvasPositionsValid(positions, pages) {
  const cardW = 440, cardH = 300, gap = 40;
  if (pages.some((page) => { const p = positions.get(page.id); return !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0; })) return false;
  for (let index = 0; index < pages.length; index++) for (let next = index + 1; next < pages.length; next++) {
    const a = positions.get(pages[index].id), b = positions.get(pages[next].id);
    if (a.x < b.x + cardW + gap && a.x + cardW + gap > b.x && a.y < b.y + cardH + gap && a.y + cardH + gap > b.y) return false;
  }
  return true;
}

function computeAutoLayout() {
  const pages = state.manifest.pages;
  const pageOrder = new Map(pages.map((page, index) => [page.id, index]));
  const outgoing = new Map(pages.map((page) => [page.id, []]));
  const indegree = new Map(pages.map((page) => [page.id, 0]));
  for (const relation of state.manifest.relations) if (outgoing.has(relation.from) && indegree.has(relation.to)) { outgoing.get(relation.from).push(relation.to); indegree.set(relation.to, indegree.get(relation.to) + 1); }
  const rank = new Map();
  const queue = pages.filter((page) => indegree.get(page.id) === 0).map((page) => page.id);
  if (!queue.length && pages[0]) queue.push(pages[0].id);
  for (const id of queue) rank.set(id, 0);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const id = queue[cursor];
    for (const target of outgoing.get(id) || []) {
      rank.set(target, Math.max(rank.get(target) || 0, (rank.get(id) || 0) + 1));
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    }
  }
  const maxRank = Math.max(0, ...rank.values());
  for (const page of pages) if (!rank.has(page.id)) rank.set(page.id, maxRank + 1);
  const columns = new Map();
  for (const page of pages) { const value = rank.get(page.id); if (!columns.has(value)) columns.set(value, []); columns.get(value).push(page); }
  const positions = new Map();
  for (const [column, items] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
    items.sort((a, b) => pageOrder.get(a.id) - pageOrder.get(b.id));
    items.forEach((page, row) => positions.set(page.id, { x: 80 + column * 620, y: 80 + row * 400 }));
  }
  return positions;
}

function updateCanvasGeometry() {
  const cardW = 440, cardH = 300;
  const canvas = $('#canvas'); if (!canvas) return;
  const positions = [...state.canvasPositions.values()];
  const width = Math.max(1200, ...positions.map((p) => p.x + cardW + 120));
  const height = Math.max(700, ...positions.map((p) => p.y + cardH + 120));
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  const svg = canvas.querySelector('svg'); svg.setAttribute('width', width); svg.setAttribute('height', height);
  for (const card of canvas.querySelectorAll('.canvas-card')) { const p = state.canvasPositions.get(card.dataset.page); card.style.left = `${p.x}px`; card.style.top = `${p.y}px`; }
  const pages = new Map(state.manifest.pages.map((page) => [page.id, page]));
  $('#canvas-relations').innerHTML = state.manifest.relations.map((relation) => {
    if (!pages.has(relation.from) || !pages.has(relation.to)) return '';
    const from = state.canvasPositions.get(relation.from), to = state.canvasPositions.get(relation.to);
    const dx = to.x - from.x, dy = to.y - from.y;
    let x1, y1, x2, y2, c1x, c1y, c2x, c2y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      x1 = dx >= 0 ? from.x + cardW : from.x; y1 = from.y + cardH / 2; x2 = dx >= 0 ? to.x : to.x + cardW; y2 = to.y + cardH / 2;
      const bend = Math.max(70, Math.abs(x2 - x1) / 2); c1x = x1 + Math.sign(x2 - x1 || 1) * bend; c1y = y1; c2x = x2 - Math.sign(x2 - x1 || 1) * bend; c2y = y2;
    } else {
      x1 = from.x + cardW / 2; y1 = dy >= 0 ? from.y + cardH : from.y; x2 = to.x + cardW / 2; y2 = dy >= 0 ? to.y : to.y + cardH;
      const bend = Math.max(70, Math.abs(y2 - y1) / 2); c1x = x1; c1y = y1 + Math.sign(y2 - y1 || 1) * bend; c2x = x2; c2y = y2 - Math.sign(y2 - y1 || 1) * bend;
    }
    const labelX = (x1 + x2) / 2, labelY = (y1 + y2) / 2 - 8;
    return `<path d="M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}" fill="none" stroke="#666" stroke-width="2" marker-end="url(#arrow)"/><text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="12" fill="#4d4d4d" paint-order="stroke" stroke="#f4f4f4" stroke-width="5">${escapeHtml(relation.label || '')}</text>`;
  }).join('');
}

function bindCanvasDrag(card) {
  const handle = card.querySelector('header');
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const origin = { ...state.canvasPositions.get(card.dataset.page) };
    const start = { x: event.clientX, y: event.clientY };
    let moved = false;
    card.classList.add('dragging'); handle.setPointerCapture?.(event.pointerId);
    const move = (next) => {
      const dx = (next.clientX - start.x) / state.zoom, dy = (next.clientY - start.y) / state.zoom;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      state.canvasPositions.set(card.dataset.page, { x: Math.max(0, Math.round(origin.x + dx)), y: Math.max(0, Math.round(origin.y + dy)) });
      updateCanvasGeometry();
    };
    const up = async () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); card.classList.remove('dragging');
      if (moved) { card.dataset.dragged = 'true'; await persistCanvasPositions(); }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up, { once: true });
  });
}

async function persistCanvasPositions() {
  for (const page of state.manifest.pages) page.canvas = { ...state.canvasPositions.get(page.id) };
  const content = JSON.stringify(state.manifest, null, 2) + '\n';
  await saveFile('living-prd.json', content);
  toast('画布布局已保存');
}

async function autoLayoutCanvas() {
  state.canvasPositions = computeAutoLayout();
  renderCanvas();
  await persistCanvasPositions();
}

function editorOptions() {
  const options = [{ label: `文档 / ${state.module.title}`, path: state.module.prd }];
  if (state.page) { options.push({ label: `HTML / ${state.page.title}`, path: state.page.file }); options.push({ label: `标注 / ${state.page.title}`, path: state.page.annotationFile }); }
  return options;
}

async function openEditor() {
  const options = editorOptions();
  $('#editor-file').innerHTML = options.map((item) => `<option value="${item.path}">${escapeHtml(item.label)}</option>`).join('');
  $('#editor-content').value = await getFile(options[0].path); state.editorDirty = false; $('#editor').showModal();
}

async function loadEditorFile() { $('#editor-content').value = await getFile($('#editor-file').value); state.editorDirty = false; }

async function saveEditor() {
  const path = $('#editor-file').value, content = $('#editor-content').value;
  await saveFile(path, content); state.editorDirty = false;
  if (path === state.module.prd) await renderDocument(content);
  if (state.page && path === state.page.annotationFile) await loadAnnotations(content);
  if (state.page && path === state.page.file) renderPrototype();
  toast('已保存并更新视图');
}

async function exportModule() {
  const pages = state.manifest.pages.filter((page) => state.module.pages.includes(page.id));
  $('#export-button').disabled = true; setStatus(`正在截取 ${pages.length} 个原型…`);
  try {
    const screenshots = [];
    for (const page of pages) screenshots.push({ pageId: page.id, dataUrl: await capturePage(page) });
    const result = await api('/api/export', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ moduleId: state.module.id, screenshots }) });
    toast(`已导出到 ${result.folder}`); setStatus('导出完成');
  } catch (error) { toast(`导出失败：${error.message}`); setStatus('导出失败'); }
  finally { $('#export-button').disabled = moduleKind(state.module) === 'process'; }
}

function openExportDialog() {
  if (moduleKind(state.module) === 'process') return;
  $('#export-dialog').showModal();
}

async function collectModuleExportData() {
  const pages = state.manifest.pages.filter((page) => state.module.pages.includes(page.id));
  const annotationsByPage = {};
  for (const page of pages) {
    try {
      annotationsByPage[page.id] = JSON.parse(await getFile(page.annotationFile)).annotations || [];
    } catch { annotationsByPage[page.id] = []; }
  }
  const prd = await getFile(state.module.prd);
  return { pages, annotationsByPage, prd };
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const textarea = document.createElement('textarea');
    textarea.value = text; textarea.style.position = 'fixed'; textarea.style.left = '-20000px';
    document.body.appendChild(textarea); textarea.select();
    document.execCommand('copy'); textarea.remove();
  }
}

async function copyFeishuNotionMarkdown() {
  try {
    const { pages, annotationsByPage, prd } = await collectModuleExportData();
    const markdown = buildFeishuNotionMarkdown({ product: state.manifest.product, module: state.module, prd, pages, annotationsByPage });
    await copyText(markdown);
    toast('已复制飞书/Notion Markdown，可直接粘贴到文档');
  } catch (error) { toast(`复制失败：${error.message}`); }
}

async function downloadFeishuNotionMarkdown() {
  try {
    const { pages, annotationsByPage, prd } = await collectModuleExportData();
    const markdown = buildFeishuNotionMarkdown({ product: state.manifest.product, module: state.module, prd, pages, annotationsByPage });
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${state.module.id}-feishu-notion.md`; link.click();
    URL.revokeObjectURL(url);
    toast('已下载 Markdown 文件');
  } catch (error) { toast(`下载失败：${error.message}`); }
}

function capturePage(page) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe'); frame.className = 'capture-frame'; frame.width = page.viewport.width; frame.height = page.viewport.height; frame.src = `/content/${encodeURI(page.file)}?capture=${Date.now()}`; document.body.appendChild(frame);
    frame.onload = async () => {
      try {
        const frameWindow = frame.contentWindow, frameDocument = frame.contentDocument;
        await inlineFrameStyles(frameDocument);
        await waitForFrameAssets(frameWindow, frameDocument);
        const html2canvas = await loadFrameHtml2Canvas(frameWindow, frameDocument);
        frameWindow.scrollTo(0, 0);
        const background = frameWindow.getComputedStyle(frameDocument.body).backgroundColor || '#ffffff';
        const canvas = await html2canvas(frameDocument.body, { width:page.viewport.width, height:page.viewport.height, windowWidth:page.viewport.width, windowHeight:page.viewport.height, scrollX:0, scrollY:0, x:0, y:0, scale:1, useCORS:true, allowTaint:false, backgroundColor:background, logging:false });
        resolve(canvas.toDataURL('image/png'));
      } catch (error) { reject(error); } finally { frame.remove(); }
    };
    frame.onerror = () => { frame.remove(); reject(new Error(`无法加载 ${page.title}`)); };
  });
}

async function inlineFrameStyles(frameDocument) {
  const links = [...frameDocument.querySelectorAll('link[rel="stylesheet"]')];
  for (const link of links) {
    const response = await fetch(link.href, { cache:'no-store' });
    if (!response.ok) throw new Error(`无法读取原型样式：${link.href}`);
    const css = rebaseCssUrls(await response.text(), link.href);
    const style = frameDocument.createElement('style');
    style.dataset.exportStylesheet = link.href;
    style.textContent = css;
    link.after(style);
  }
}

function rebaseCssUrls(css, stylesheetUrl) {
  return css.replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/g, (match, quote, value) => {
    const resource = value.trim();
    if (!resource || /^(data:|blob:|https?:|\/)/i.test(resource)) return match;
    return `url("${new URL(resource, stylesheetUrl).href}")`;
  });
}

async function waitForFrameAssets(frameWindow, frameDocument) {
  await frameDocument.fonts?.ready;
  await Promise.all([...frameDocument.images].map(async (image) => {
    if (image.complete) { try { await image.decode?.(); } catch {} return; }
    await new Promise((resolve) => { image.addEventListener('load', resolve, { once:true }); image.addEventListener('error', resolve, { once:true }); });
  }));
  await new Promise((resolve) => frameWindow.requestAnimationFrame(() => frameWindow.requestAnimationFrame(resolve)));
}

function loadFrameHtml2Canvas(frameWindow, frameDocument) {
  if (frameWindow.html2canvas) return Promise.resolve(frameWindow.html2canvas);
  return new Promise((resolve, reject) => {
    const script = frameDocument.createElement('script');
    script.src = '/vendor/html2canvas.umd.js';
    script.onload = () => frameWindow.html2canvas ? resolve(frameWindow.html2canvas) : reject(new Error('截图组件未初始化'));
    script.onerror = () => reject(new Error('无法加载截图组件'));
    frameDocument.head.appendChild(script);
  });
}

async function refreshExternalChanges() {
  if (!state.module || state.editorDirty || $('#editor').open) return;
  try {
    const manifest = await api('/api/manifest');
    if (JSON.stringify(manifest) !== JSON.stringify(state.manifest)) { const moduleId = state.module.id; state.manifest = manifest; state.canvasPositions = new Map(); renderNav(); const current = manifest.modules.find((module) => module.id === moduleId && !module.hidden); await selectModule(current?.id || firstVisibleModule()?.id); toast('已加载 Agent 更新的项目结构'); return; }
    const watched = [state.module.prd, state.page?.file, state.page?.annotationFile].filter(Boolean);
    for (const path of watched) {
      const result = await api(`/api/file?path=${encodeURIComponent(path)}`);
      if (state.snapshots.has(path) && state.snapshots.get(path) !== result.content) {
        state.snapshots.set(path, result.content);
        if (path === state.module.prd) await renderDocument(result.content);
        if (state.page && path === state.page.file) renderPrototype();
        if (state.page && path === state.page.annotationFile) await loadAnnotations(result.content);
        setStatus('已加载 Agent 更新');
      }
    }
  } catch (error) { setStatus(`同步失败：${error.message}`); }
}

function bind() {
  $$('.tab').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#page-select').addEventListener('change', (event) => selectPage(event.target.value));
  $('#compare-button').addEventListener('click', () => { if (state.page) { state.prototypeExpanded = false; state.inspectorOpen = true; state.inspectorTab = 'prd'; setView('prototype'); } });
  $('#exit-compare').addEventListener('click', () => setView('document'));
  $('#expand-prototype').addEventListener('click', () => { state.prototypeExpanded = !state.prototypeExpanded; state.inspectorOpen = !state.prototypeExpanded; updateReviewLayout(); requestAnimationFrame(renderPrototype); });
  $('#floating-inspector').addEventListener('click', () => { state.inspectorOpen = true; updateReviewLayout(); });
  $('#close-inspector').addEventListener('click', () => { if (state.prototypeExpanded) { state.inspectorOpen = false; updateReviewLayout(); } });
  $$('.inspector-tab').forEach((button) => button.addEventListener('click', () => setInspectorTab(button.dataset.inspector)));
  $('#annotation-visibility-button').addEventListener('click', () => { state.showAnnotations = !state.showAnnotations; updateAnnotationControls(); renderBubbles(); });
  $('#annotate-button').addEventListener('click', () => { state.annotate = !state.annotate; if (state.annotate) state.showAnnotations = true; updateAnnotationControls(); renderPrototype(); });
  $('#process-toggle').addEventListener('click', toggleProcessModules);
  $('#edit-button').addEventListener('click', openEditor); $('#editor-file').addEventListener('change', loadEditorFile); $('#save-editor').addEventListener('click', (event) => { event.preventDefault(); saveEditor(); });
  $('#editor-content').addEventListener('input', () => { state.editorDirty = true; });
  $('#export-button').addEventListener('click', openExportDialog);
  $('#export-bundle-button').addEventListener('click', () => { exportModule(); });
  $('#export-copy-button').addEventListener('click', copyFeishuNotionMarkdown);
  $('#export-download-button').addEventListener('click', downloadFeishuNotionMarkdown);
  $('#auto-layout').addEventListener('click', autoLayoutCanvas);
  $('#zoom-in').addEventListener('click', () => { state.zoom = Math.min(1, state.zoom + .1); renderCanvas(); });
  $('#zoom-out').addEventListener('click', () => { state.zoom = Math.max(.3, state.zoom - .1); renderCanvas(); });
  window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== 'living-prd:navigate') return;
    const next = state.manifest.pages.find((page) => page.id === event.data.pageId);
    if (!next) return;
    if (next.moduleId !== state.module.id) await selectModule(next.moduleId);
    await selectPage(next.id);
    setView('prototype');
  });
  window.addEventListener('resize', () => { if (state.view === 'prototype') renderPrototype(); });
}

function escapeHtml(value='') { return String(value).replace(/[&<>"]/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[character])); }

boot().catch((error) => { document.body.innerHTML = `<pre style="padding:32px">${escapeHtml(error.stack || error.message)}</pre>`; });
