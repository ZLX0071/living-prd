import fs from 'node:fs';
import path from 'node:path';
import { loadManifest, safeRelative, workspace } from './lib.mjs';

const errors = [];
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const manifest = loadManifest();
if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1');
if (!['idea', 'demo'].includes(manifest.product?.source?.mode)) errors.push('product.source.mode must be idea or demo');
if (manifest.product?.source?.mode === 'demo' && (typeof manifest.product.source.path !== 'string' || !manifest.product.source.path.trim())) errors.push('Demo source must record product.source.path');

function unique(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (!idPattern.test(item.id || '')) errors.push(`${label} has invalid id: ${item.id}`);
    if (seen.has(item.id)) errors.push(`${label} id is duplicated: ${item.id}`);
    seen.add(item.id);
  }
  return seen;
}

const modules = unique(manifest.modules || [], 'module');
const pages = unique(manifest.pages || [], 'page');
unique(manifest.relations || [], 'relation');

const requiredModules = new Map([
  ['product-definition', 'prd/01-product-definition.md'],
  ['users-and-needs', 'prd/02-users-and-needs.md'],
  ['stories-and-journey', 'prd/03-user-stories-and-journey.md'],
  ['metrics-and-north-star', 'prd/04-metrics-and-north-star.md'],
]);
for (const [id, prd] of requiredModules) {
  const module = (manifest.modules || []).find((item) => item.id === id);
  if (!module) errors.push(`Missing required PRD module: ${id}`);
  else {
    if (module.prd !== prd) errors.push(`Required module ${id} must use ${prd}`);
    if ((module.kind || 'prd') !== 'prd') errors.push(`Required module ${id} must have kind prd`);
  }
}

const shapingModules = new Map([
  ['shaping-intake', ['shaping/00-intake.md', 'S1']],
  ['shaping-product', ['shaping/01-product-shaping.md', 'S2']],
  ['shaping-jtbd', ['shaping/02-jtbd.md', 'S3']],
  ['shaping-scope', ['shaping/03-scope.md', 'S4']],
  ['shaping-flows', ['shaping/04-pages-and-flows.md', 'S5']],
  ['shaping-questions', ['shaping/05-open-questions.md', 'S6']],
  ['shaping-brief', ['shaping/06-shaped-brief.md', 'S7']],
]);
for (const [id, [prd, navNumber]] of shapingModules) {
  const module = (manifest.modules || []).find((item) => item.id === id);
  if (!module) errors.push(`Missing shaping module: ${id}`);
  else {
    if (module.kind !== 'shaping') errors.push(`Module ${id} must have kind shaping`);
    if (module.prd !== prd) errors.push(`Shaping module ${id} must use ${prd}`);
    if (module.navNumber !== navNumber) errors.push(`Shaping module ${id} must use navNumber ${navNumber}`);
  }
}

const foundation = (manifest.modules || []).find((module) => module.id === 'foundation');
if (!foundation) errors.push('Missing reference module: foundation');
else {
  if (foundation.kind !== 'reference') errors.push('Module foundation must have kind reference');
  if (foundation.prd !== 'reference/components-and-states.md') errors.push('Module foundation must use reference/components-and-states.md');
  if (foundation.navNumber !== 'R2') errors.push('Module foundation must have navNumber R2');
}

const designSystem = (manifest.modules || []).find((module) => module.id === 'design-system');
if (!designSystem) errors.push('Missing reference module: design-system');
else {
  if (designSystem.kind !== 'reference') errors.push('Module design-system must have kind reference');
  if (designSystem.prd !== 'reference/DESIGN.md') errors.push('Module design-system must use reference/DESIGN.md');
  if (designSystem.navNumber !== 'R1') errors.push('Module design-system must have navNumber R1');
}

const codeEvidence = (manifest.modules || []).find((module) => module.id === 'code-evidence');
if (manifest.product?.source?.mode === 'demo') {
  if (!codeEvidence) errors.push('Demo source requires code-evidence module');
  else {
    if (codeEvidence.kind !== 'shaping') errors.push('Module code-evidence must have kind shaping');
    if (codeEvidence.prd !== 'shaping/00-code-evidence.md') errors.push('Module code-evidence must use shaping/00-code-evidence.md');
    if (codeEvidence.navNumber !== 'C1') errors.push('Module code-evidence must have navNumber C1');
  }
} else if (codeEvidence) errors.push('code-evidence module is only valid for demo source mode');

const plan = (manifest.modules || []).find((module) => module.id === 'plan');
if (!plan) errors.push('Missing process module: plan');
else {
  if (plan.kind !== 'process') errors.push('Module plan must have kind process');
  if (plan.navNumber !== '00') errors.push('Module plan must have navNumber 00');
  if (typeof plan.hidden !== 'boolean') errors.push('Module plan hidden must be boolean');
}

const navNumbers = new Set();
for (const module of manifest.modules || []) {
  if (module.navNumber === undefined) continue;
  if (!/^(?:\d{2}|[CSR]\d+)$/.test(module.navNumber)) errors.push(`Module ${module.id} has invalid navNumber`);
  if (navNumbers.has(module.navNumber)) errors.push(`Module navNumber is duplicated: ${module.navNumber}`);
  navNumbers.add(module.navNumber);
  if (module.hidden !== undefined && typeof module.hidden !== 'boolean') errors.push(`Module ${module.id} hidden must be boolean`);
}

for (const module of manifest.modules || []) {
  if (module.kind !== undefined && !['prd', 'shaping', 'reference', 'process'].includes(module.kind)) errors.push(`Module ${module.id} has invalid kind`);
}

for (const module of manifest.modules || []) {
  try { if (!fs.statSync(safeRelative(module.prd).absolute).isFile()) throw new Error(); } catch { errors.push(`Missing PRD: ${module.prd}`); }
  for (const pageId of module.pages || []) if (!pages.has(pageId)) errors.push(`Module ${module.id} references missing page ${pageId}`);
}

for (const page of manifest.pages || []) {
  if (!modules.has(page.moduleId)) errors.push(`Page ${page.id} references missing module ${page.moduleId}`);
  if (!['desktop', 'mobile'].includes(page.device)) errors.push(`Page ${page.id} has invalid device`);
  if (path.basename(page.file, path.extname(page.file)) !== page.id) errors.push(`Page ${page.id} file basename must match its id`);
  if (!Number.isInteger(page.viewport?.width) || page.viewport.width <= 0 || !Number.isInteger(page.viewport?.height) || page.viewport.height <= 0) errors.push(`Page ${page.id} has invalid viewport`);
  if (!Number.isInteger(page.canvas?.x) || page.canvas.x < 0 || !Number.isInteger(page.canvas?.y) || page.canvas.y < 0) errors.push(`Page ${page.id} has invalid canvas coordinates`);
  for (const field of ['file', 'annotationFile']) {
    try { if (!fs.statSync(safeRelative(page[field]).absolute).isFile()) throw new Error(); } catch { errors.push(`Page ${page.id} missing ${field}: ${page[field]}`); }
  }
  try {
    const annotations = JSON.parse(fs.readFileSync(safeRelative(page.annotationFile).absolute, 'utf8'));
    if (annotations.pageId !== page.id) errors.push(`Annotation pageId mismatch for ${page.id}`);
    const ids = new Set(); const numbers = new Set();
    for (const annotation of annotations.annotations || []) {
      if (ids.has(annotation.id)) errors.push(`Duplicate annotation id ${annotation.id}`); ids.add(annotation.id);
      if (numbers.has(annotation.number)) errors.push(`Duplicate annotation number on ${page.id}: ${annotation.number}`); numbers.add(annotation.number);
      if (![annotation.x, annotation.y].every((n) => typeof n === 'number' && n >= 0 && n <= 1)) errors.push(`Annotation ${annotation.id} has invalid coordinates`);
      if (annotation.coordinateSpace && annotation.coordinateSpace !== 'document') errors.push(`Annotation ${annotation.id} has invalid coordinateSpace`);
      if (annotation.target !== undefined && (typeof annotation.target !== 'string' || !annotation.target.trim())) errors.push(`Annotation ${annotation.id} has invalid target`);
      if (annotation.anchor !== undefined && ![annotation.anchor?.x, annotation.anchor?.y].every((n) => typeof n === 'number' && n >= 0 && n <= 1)) errors.push(`Annotation ${annotation.id} has invalid anchor`);
    }
  } catch (error) { errors.push(`Invalid annotations for ${page.id}: ${error.message}`); }
}

const canvasCard = { width: 440, height: 300, gap: 40 };
for (let index = 0; index < (manifest.pages || []).length; index++) for (let next = index + 1; next < manifest.pages.length; next++) {
  const a = manifest.pages[index], b = manifest.pages[next];
  if (!a.canvas || !b.canvas) continue;
  const overlap = a.canvas.x < b.canvas.x + canvasCard.width + canvasCard.gap && a.canvas.x + canvasCard.width + canvasCard.gap > b.canvas.x && a.canvas.y < b.canvas.y + canvasCard.height + canvasCard.gap && a.canvas.y + canvasCard.height + canvasCard.gap > b.canvas.y;
  if (overlap) errors.push(`Canvas cards overlap or have less than ${canvasCard.gap}px gap: ${a.id}, ${b.id}`);
}

for (const relation of manifest.relations || []) {
  if (!pages.has(relation.from) || !pages.has(relation.to)) errors.push(`Relation ${relation.id} references a missing page`);
}

if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log(`Valid: ${manifest.modules.length} modules, ${manifest.pages.length} pages, ${manifest.relations.length} relations in ${workspace}`);
