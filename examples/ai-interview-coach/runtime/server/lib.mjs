import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const runtimeDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const workspace = path.dirname(runtimeDir);

export function loadManifest() {
  return JSON.parse(fs.readFileSync(path.join(workspace, 'living-prd.json'), 'utf8'));
}

export function safeRelative(relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\0')) throw new Error('Invalid path');
  const normalized = path.posix.normalize(relative.replaceAll('\\', '/'));
  if (normalized === '..' || normalized.startsWith('../')) throw new Error('Path escapes workspace');
  const absolute = path.resolve(workspace, normalized);
  if (absolute !== workspace && !absolute.startsWith(workspace + path.sep)) throw new Error('Path escapes workspace');
  return { normalized, absolute };
}

export function editablePaths(manifest = loadManifest()) {
  const files = new Set(['living-prd.json']);
  for (const module of manifest.modules || []) files.add(module.prd);
  for (const page of manifest.pages || []) {
    files.add(page.file);
    files.add(page.annotationFile);
  }
  const shared = path.join(workspace, 'prototypes', 'shared');
  if (fs.existsSync(shared)) {
    for (const entry of fs.readdirSync(shared, { withFileTypes: true })) {
      if (entry.isFile() && ['.css', '.js', '.json'].includes(path.extname(entry.name))) files.add(`prototypes/shared/${entry.name}`);
    }
  }
  return files;
}

export function assertEditable(relative, manifest = loadManifest()) {
  const resolved = safeRelative(relative);
  if (!editablePaths(manifest).has(resolved.normalized)) throw new Error('File is outside the content contract');
  const extension = path.extname(resolved.absolute);
  if (!['.md', '.html', '.json', '.css', '.js'].includes(extension)) throw new Error('Unsupported file type');
  if (!fs.existsSync(resolved.absolute) || fs.lstatSync(resolved.absolute).isSymbolicLink()) throw new Error('File must exist and cannot be a symbolic link');
  return resolved.absolute;
}
