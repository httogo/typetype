import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export const config = {
  runtime: 'nodejs',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function extractGutenberg(id: string) {
  const txtUrl = `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`;
  const response = await fetch(txtUrl, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`无法下载 Gutenberg 书籍 (HTTP ${response.status})`);

  let text = await response.text();

  // 清理 header（*** START OF ... *** 之前的内容）
  const startMark = text.indexOf('*** START OF');
  if (startMark !== -1) {
    const afterStart = text.indexOf('\n', startMark);
    text = text.substring(afterStart + 1);
  }

  // 清理 footer（*** END OF ... *** 之后的内容）
  const endMark = text.indexOf('*** END OF');
  if (endMark !== -1) {
    text = text.substring(0, endMark);
  }

  // 清理多余空行
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // 提取标题（通常是清理后的第一行非空内容）
  const firstLine = text.split('\n').find(l => l.trim().length > 0) || 'Gutenberg Book';

  return {
    title: firstLine.substring(0, 100),
    content: text,
    length: text.length,
  };
}

async function extractStandardEbooks(author: string, book: string) {
  const txtUrl = `https://standardebooks.org/ebooks/${author}/${book}/downloads/${book}.txt`;
  const response = await fetch(txtUrl, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`无法下载 Standard Ebooks 书籍 (HTTP ${response.status})`);

  let text = await response.text();
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // 标题用 book slug 转为可读格式
  const title = book.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    title,
    content: text,
    length: text.length,
  };
}

async function extractWithReadability(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`无法访问该网页 (HTTP ${response.status})`);

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent) {
    throw new Error('无法提取网页正文内容');
  }

  const cleanText = article.textContent
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return {
    title: article.title || '',
    content: cleanText,
    length: cleanText.length,
  };
}

async function extractContent(url: string) {
  // 1. Project Gutenberg
  const gutenbergMatch = url.match(/gutenberg\.org\/ebooks\/(\d+)/);
  if (gutenbergMatch) {
    return await extractGutenberg(gutenbergMatch[1]);
  }

  // 2. Standard Ebooks
  const seMatch = url.match(/standardebooks\.org\/ebooks\/([^/]+)\/([^/]+)/);
  if (seMatch) {
    return await extractStandardEbooks(seMatch[1], seMatch[2]);
  }

  // 3. 其他网站：使用 Readability 通用提取
  return await extractWithReadability(url);
}

export default async function handler(req: any, res: any) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: '请提供有效的网址' });
  }

  // 验证 URL 格式和协议
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'URL 格式不正确' });
  }

  // 仅允许 http/https 协议，防止 SSRF
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: '仅支持 http 和 https 协议' });
  }

  // URL 长度限制
  if (url.length > 2048) {
    return res.status(400).json({ error: 'URL 过长' });
  }

  try {
    const result = await extractContent(url);
    // 响应内容大小限制（5MB）
    if (result.content.length > 5 * 1024 * 1024) {
      result.content = result.content.substring(0, 5 * 1024 * 1024);
      result.length = result.content.length;
    }
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(408).json({ error: '请求超时，请检查网址是否可访问' });
    }
    return res.status(500).json({ error: '提取失败：' + (error.message || '未知错误') });
  }
}
