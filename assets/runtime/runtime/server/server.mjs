import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { assertEditable, loadManifest, runtimeDir, safeRelative, workspace } from './lib.mjs';

const port = Number(process.env.PORT || 4173);
const publicDir = path.join(runtimeDir, 'public');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function json(res, status, value) { send(res, status, JSON.stringify(value), 'application/json; charset=utf-8'); }

async function body(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 20 * 1024 * 1024) throw new Error('Request too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function serveFile(res, absolute) {
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return send(res, 404, 'Not found', 'text/plain');
  send(res, 200, fs.readFileSync(absolute), mime[path.extname(absolute)] || 'application/octet-stream');
}

function vendorFile(urlPath) {
  const vendors = {
    '/vendor/marked.js': 'node_modules/marked/lib/marked.esm.js',
    '/vendor/mermaid.js': 'node_modules/mermaid/dist/mermaid.esm.min.mjs',
    '/vendor/html2canvas.umd.js': 'node_modules/html2canvas/dist/html2canvas.min.js'
  };
  if (vendors[urlPath]) return path.join(workspace, vendors[urlPath]);
  if (urlPath.startsWith('/vendor/chunks/')) {
    const relative = urlPath.slice('/vendor/'.length);
    const base = path.join(workspace, 'node_modules', 'mermaid', 'dist');
    const absolute = path.resolve(base, relative);
    return absolute.startsWith(base + path.sep) ? absolute : null;
  }
  return null;
}

function dataUrlToBuffer(value) {
  const match = /^data:image\/png;base64,(.+)$/.exec(value || '');
  if (!match) throw new Error('Screenshot must be a PNG data URL');
  return Buffer.from(match[1], 'base64');
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/api/manifest') return json(res, 200, loadManifest());
    if (req.method === 'GET' && url.pathname === '/api/file') {
      const relative = url.searchParams.get('path');
      const absolute = assertEditable(relative);
      return json(res, 200, { path: relative, content: fs.readFileSync(absolute, 'utf8') });
    }
    if (req.method === 'PUT' && url.pathname === '/api/file') {
      const payload = await body(req);
      const absolute = assertEditable(payload.path);
      if (typeof payload.content !== 'string') throw new Error('content must be a string');
      if (path.extname(absolute) === '.json') JSON.parse(payload.content);
      fs.writeFileSync(absolute, payload.content, 'utf8');
      return json(res, 200, { ok: true, path: payload.path });
    }
    if (req.method === 'POST' && url.pathname === '/api/export') {
      const payload = await body(req);
      const manifest = loadManifest();
      const module = manifest.modules.find((item) => item.id === payload.moduleId);
      if (!module) throw new Error('Unknown module');
      const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
      const folder = path.join(workspace, 'exports', `${module.id}-${stamp}`);
      fs.mkdirSync(folder, { recursive: true });
      const prd = fs.readFileSync(assertEditable(module.prd, manifest), 'utf8');
      const lines = [prd.trimEnd(), '', '## 原型截图', ''];
      for (const screenshot of payload.screenshots || []) {
        const page = manifest.pages.find((item) => item.id === screenshot.pageId && item.moduleId === module.id);
        if (!page) throw new Error(`Unknown page ${screenshot.pageId}`);
        const filename = `${page.id}.png`;
        fs.writeFileSync(path.join(folder, filename), dataUrlToBuffer(screenshot.dataUrl));
        lines.push(`### ${page.title}`, '', `![${page.title}](./${filename})`, '');
      }
      const expected = (module.pages || []).length;
      if ((payload.screenshots || []).length !== expected) throw new Error(`Expected ${expected} screenshots`);
      fs.writeFileSync(path.join(folder, `${module.id}.md`), lines.join('\n'), 'utf8');
      return json(res, 200, { ok: true, folder: path.relative(workspace, folder), markdown: `${module.id}.md` });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/content/')) {
      const relative = decodeURIComponent(url.pathname.slice('/content/'.length));
      const { absolute } = safeRelative(relative);
      return serveFile(res, absolute);
    }
    const vendor = vendorFile(url.pathname);
    if (req.method === 'GET' && vendor) return serveFile(res, vendor);
    const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const absolute = path.resolve(publicDir, requested);
    if (!absolute.startsWith(publicDir + path.sep) && absolute !== path.join(publicDir, 'index.html')) return send(res, 403, 'Forbidden', 'text/plain');
    return serveFile(res, absolute);
  } catch (error) {
    json(res, 400, { error: error.message });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Living PRD: http://127.0.0.1:${port}`);
});
