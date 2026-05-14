import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// 开发模式下的 API 中间件
function apiMiddleware() {
  return {
    name: 'api-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/extract', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // 使用传统事件方式读取请求体（兼容所有 Node 版本）
        const chunks: Buffer[] = [];
        req.on('data', (chunk: any) => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        });
        req.on('end', () => {
          handleExtract(chunks, res).catch((err: any) => {
            console.error('[api-middleware] unhandled error:', err);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: '服务器内部错误' }));
            }
          });
        });
        req.on('error', (err: any) => {
          console.error('[api-middleware] request read error:', err);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '读取请求失败' }));
          }
        });
      });
    },
  };
}

async function handleExtract(chunks: Buffer[], res: any) {
  const body = Buffer.concat(chunks).toString('utf-8');

  let url: string;
  try {
    const parsed = JSON.parse(body);
    url = parsed.url;
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '请求格式错误' }));
    return;
  }

  if (!url || typeof url !== 'string') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '请提供有效的网址' }));
    return;
  }

  try {
    new URL(url);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'URL 格式不正确' }));
    return;
  }

  try {
    // 动态导入（避免生产构建时包含这些依赖）
    const { JSDOM } = await import('jsdom');
    const { Readability } = await import('@mozilla/readability');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `无法访问该网页 (HTTP ${response.status})` }));
      return;
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '无法提取网页正文内容' }));
      return;
    }

    const cleanText = article.textContent
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      title: article.title || '',
      content: cleanText,
      length: cleanText.length,
    }));
  } catch (error: any) {
    const message = error.name === 'AbortError'
      ? '请求超时，请检查网址是否可访问'
      : '提取失败：' + (error.message || '未知错误');
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    watch: {
      usePolling: true,
    },
  },
  plugins: [
    apiMiddleware(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'TypeType - 打字练习',
        short_name: 'TypeType',
        description: '提升你的打字速度',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
})
