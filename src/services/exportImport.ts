import type { TypingResult, TextItem, SavedArticle, Settings, HighlightStyle, WordList } from '../types';
import { storageService } from './storage';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
type ImportDifficulty = typeof DIFFICULTIES[number];

interface ExportData {
  version: number;
  exportedAt: string;
  data: {
    articles: SavedArticle[];
    history: TypingResult[];
    settings: Settings;
    highlightStyles: HighlightStyle[];
    wordLists: WordList[];
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTypingResult(value: unknown): value is TypingResult {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.timestamp === 'number' &&
    typeof value.wpm === 'number' &&
    typeof value.accuracy === 'number';
}

function isImportText(value: unknown): value is { id?: string; content: string; difficulty?: unknown; title?: string } {
  return isRecord(value) &&
    typeof value.content === 'string' &&
    value.content.trim().length > 0;
}

function toDifficulty(value: unknown): ImportDifficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value)
    ? value as ImportDifficulty
    : 'medium';
}

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
      const validRecords = data.filter(isTypingResult);
      // 合并到现有历史（去重）
      const existing = storageService.getHistory();
      const existingIds = new Set(existing.map(r => r.id));
      const newRecords = validRecords.filter((r: TypingResult) => !existingIds.has(r.id));
      newRecords.forEach((r: TypingResult) => storageService.saveResult(r));
      return { success: true, count: newRecords.length };
    } catch (e: unknown) {
      return { success: false, count: 0, error: errorMessage(e) };
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
      const validTexts = data.filter(isImportText).map((t, i: number) => ({
        id: t.id || `imported-${Date.now()}-${i}`,
        content: t.content.trim(),
        difficulty: toDifficulty(t.difficulty),
        title: t.title || `导入文本 ${i + 1}`,
      }));
      return { success: true, texts: validTexts };
    } catch (e: unknown) {
      return { success: false, texts: [], error: errorMessage(e) };
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

  // === 全量数据导出 ===

  exportAllData(): void {
    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        articles: storageService.getSavedArticles(),
        history: storageService.getHistory(),
        settings: storageService.getSettings(),
        highlightStyles: storageService.getHighlightStyles(),
        wordLists: storageService.getWordLists(),
      },
    };
    const content = JSON.stringify(exportData, null, 2);
    this.downloadFile(content, `typetype-backup-${Date.now()}.json`, 'application/json');
  },

  // === 全量数据导入 ===

  importAllData(jsonString: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!isRecord(parsed)) {
        throw new Error('无效的备份文件格式');
      }
      if (!parsed.version || !parsed.data) {
        throw new Error('无效的备份文件格式');
      }
      if (!isRecord(parsed.data)) {
        throw new Error('无效的备份文件格式');
      }
      const { articles, history, settings, highlightStyles, wordLists } = parsed.data;

      // 导入文章
      if (Array.isArray(articles) && articles.length > 0) {
        const existing = storageService.getSavedArticles();
        const existingIds = new Set(existing.map((a: SavedArticle) => a.id));
        const newArticles = articles.filter((a: SavedArticle) => !existingIds.has(a.id));
        const merged = [...newArticles, ...existing];
        localStorage.setItem('typetype_articles', JSON.stringify(merged));
      }

      // 导入历史记录
      if (Array.isArray(history) && history.length > 0) {
        const existing = storageService.getHistory();
        const existingIds = new Set(existing.map((r: TypingResult) => r.id));
        const newRecords = history.filter((r: TypingResult) => !existingIds.has(r.id));
        const merged = [...existing, ...newRecords];
        localStorage.setItem('typetype_history', JSON.stringify(merged));
      }

      // 导入设置
      if (isRecord(settings)) {
        const currentSettings = storageService.getSettings();
        const mergedSettings = {
          ...currentSettings,
          ...settings,
          typography: { ...currentSettings.typography, ...(isRecord(settings.typography) ? settings.typography : {}) },
        } as Settings;
        localStorage.setItem('typetype_settings', JSON.stringify(mergedSettings));
      }

      // 导入高亮样式
      if (Array.isArray(highlightStyles) && highlightStyles.length > 0) {
        const existing = storageService.getHighlightStyles();
        const existingIds = new Set(existing.map((s: HighlightStyle) => s.id));
        const newStyles = highlightStyles.filter((s: HighlightStyle) => s.id && !existingIds.has(s.id));
        storageService.saveHighlightStyles([...existing, ...newStyles]);
      }

      // 导入词表
      if (Array.isArray(wordLists) && wordLists.length > 0) {
        const existing = storageService.getWordLists();
        const existingIds = new Set(existing.map((l: WordList) => l.id));
        const newLists = wordLists.filter((l: WordList) => l.id && !existingIds.has(l.id));
        storageService.saveWordLists([...existing, ...newLists]);
      }

      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: errorMessage(e) };
    }
  },
};
