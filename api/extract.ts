import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: '请提供有效的网址' });
  }

  // 验证 URL 格式
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'URL 格式不正确' });
  }

  try {
    // 获取网页内容
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TypeType/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000), // 10秒超时
    });

    if (!response.ok) {
      return res.status(400).json({ error: `无法访问该网页 (${response.status})` });
    }

    const html = await response.text();

    // 使用 Readability 提取正文
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      return res.status(400).json({ error: '无法提取网页正文内容' });
    }

    // 清理文本：去除多余空行，规范化空白
    const cleanText = article.textContent
      .replace(/\n{3,}/g, '\n\n')  // 多个空行合并为两个
      .replace(/[ \t]+/g, ' ')      // 多个空格合并
      .trim();

    return res.status(200).json({
      title: article.title || '',
      content: cleanText,
      length: cleanText.length,
    });
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(408).json({ error: '请求超时，请检查网址是否可访问' });
    }
    return res.status(500).json({ error: '提取失败：' + (error.message || '未知错误') });
  }
}
