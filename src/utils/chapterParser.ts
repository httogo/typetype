import type { Chapter } from '../types';

/**
 * 解析文本内容中的章节结构
 * 支持 CHAPTER/Chapter/BOOK/Book/PART/Part + 编号 格式
 */
export function parseChapters(content: string): Chapter[] {
  const lines = content.split('\n');
  const chapterStarts: { lineIndex: number; title: string; charIndex: number }[] = [];

  // 章节标记正则：匹配 CHAPTER/Chapter/BOOK/Book/PART/Part + 编号
  const chapterRegex = /^\s*(CHAPTER|Chapter|BOOK|Book|PART|Part)\s+([IVXLCDM0-9]+|[A-Za-z]+)\s*\.?\s*(.*)$/;

  let charPos = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(chapterRegex);
    if (match && line.length < 100) {
      // 构建章节标题
      let title = line.trim();
      // 如果下一行非空且较短（可能是章节副标题）
      if (
        i + 1 < lines.length &&
        lines[i + 1].trim().length > 0 &&
        lines[i + 1].trim().length < 80 &&
        !lines[i + 1].match(chapterRegex)
      ) {
        title += ' ' + lines[i + 1].trim();
      }
      chapterStarts.push({ lineIndex: i, title, charIndex: charPos });
    }
    charPos += line.length + 1; // +1 for \n
  }

  // 如果找到的章节太少（<2），返回空
  if (chapterStarts.length < 2) return [];

  // 提取每章内容
  const chapters: Chapter[] = [];
  for (let i = 0; i < chapterStarts.length; i++) {
    const start = chapterStarts[i].charIndex;
    const end = i + 1 < chapterStarts.length ? chapterStarts[i + 1].charIndex : content.length;
    const chapterContent = content.substring(start, end).trim();

    chapters.push({
      id: `ch-${i + 1}`,
      title: chapterStarts[i].title,
      content: chapterContent,
    });
  }

  return chapters;
}
