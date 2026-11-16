// 本地预览：先构建，再起静态服务；content/ 或 src/ 有改动就重新构建。
// 端口取 PORT，没有就现取空闲端口（listen(0)），不写死。
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, watch } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = process.env.OUT_DIR ?? join(ROOT, 'dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function rebuild() {
  try {
    build();
    console.log(`[${new Date().toLocaleTimeString()}] rebuilt`);
  } catch (e) {
    console.error(`build failed: ${e.message}`);
  }
}

export function startServer(port = 0, host = '127.0.0.1') {
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(OUT, pathname));
    if (!file.startsWith(OUT)) return res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) {
      // 和 GitHub Pages 一样：目录不带斜杠就 301 到带斜杠的
      if (!pathname.endsWith('/')) return res.writeHead(301, { location: `${pathname}/` }).end();
      file = join(file, 'index.html');
    }
    if (!existsSync(file)) {
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      return res.end(readFileSync(join(OUT, '404.html')));
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(port, host, () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rebuild();
  for (const dir of ['content', 'src']) watch(join(ROOT, dir), { recursive: true }, rebuild);
  const server = await startServer(Number(process.env.PORT ?? 0), process.env.HOST ?? '127.0.0.1');
  console.log(`preview: http://localhost:${server.address().port}/`);
}
