import type { TypingResult, TextItem } from '../types';
import { storageService } from './storage';

export const exportImportService = {
  // === 历史记录导出 ===

  exportHistoryAsJSON(): string {
    const history = storageService.getHistory();
    return JSON.stringify(history, null, 2);
  },

  exportHistoryAsCSV(): string {
    const history = storageService.getHistory();
    const headers = ['日期', '模式', '限时(秒)', 'WPM', '准确率(%)', '用时(秒)', '总字符', '正确字符', '错误字符', '文本预览'];
    const rows = history.map(r => [
      new Date(r.timestamp).toLocaleString(),
      r.mode === 'timed' ? '限时' : '全文',
      r.timedDuration || '',
      r.wpm,
      r.accuracy.toFixed(1),
      r.duration,
      r.totalChars,
      r.correctChars,
      r.incorrectChars,
      `"${r.textPreview.replace(/"/g, '""')}"`,
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  },

  // === 历史记录导入 ===

  importHistory(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) throw new Error('数据格式错误：需要数组');
      // 验证每条记录的基本字段
      const validRecords = data.filter((r: any) =>
        r.id && r.timestamp && typeof r.wpm === 'number' && typeof r.accuracy === 'number'
      );
      // 合并到现有历史（去重）
      const existing = storageService.getHistory();
      const existingIds = new Set(existing.map(r => r.id));
      const newRecords = validRecords.filter((r: TypingResult) => !existingIds.has(r.id));
      newRecords.forEach((r: TypingResult) => storageService.saveResult(r));
      return { success: true, count: newRecords.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message };
    }
  },

  // === 练习文本导出 ===

  exportTextsAsJSON(texts: TextItem[]): string {
    return JSON.stringify(texts, null, 2);
  },

  // === 练习文本导入 ===

  importTexts(jsonString: string): { success: boolean; texts: TextItem[]; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) throw new Error('数据格式错误：需要数组');
      const validTexts = data.filter((t: any) =>
        t.content && typeof t.content === 'string' && t.content.trim().length > 0
      ).map((t: any, i: number) => ({
        id: t.id || `imported-${Date.now()}-${i}`,
        content: t.content.trim(),
        difficulty: (['easy', 'medium', 'hard'] as const).includes(t.difficulty) ? t.difficulty : 'medium',
        title: t.title || `导入文本 ${i + 1}`,
      }));
      return { success: true, texts: validTexts };
    } catch (e: any) {
      return { success: false, texts: [], error: e.message };
    }
  },

  // === 文件下载辅助 ===

  downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
