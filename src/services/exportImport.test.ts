import { describe, test, expect, beforeEach, vi } from 'vitest';
import { exportImportService } from './exportImport';
import { storageService } from './storage';

describe('exportImportService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('a) 导出格式', () => {
    test('exportHistoryAsJSON 返回正确的 JSON 字符串', () => {
      const result = {
        id: 'test-1',
        timestamp: 1700000000000,
        wpm: 60,
        accuracy: 95,
        duration: 30,
        totalChars: 100,
        correctChars: 95,
        incorrectChars: 5,
        mode: 'full' as const,
        textPreview: 'test text',
      };
      storageService.saveResult(result);

      const json = exportImportService.exportHistoryAsJSON();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].id).toBe('test-1');
      expect(parsed[0].wpm).toBe(60);
    });

    test('exportHistoryAsCSV 返回正确的 CSV 格式', () => {
      const result = {
        id: 'test-csv',
        timestamp: 1700000000000,
        wpm: 75,
        accuracy: 98.5,
        duration: 60,
        totalChars: 200,
        correctChars: 197,
        incorrectChars: 3,
        mode: 'full' as const,
        textPreview: 'csv test',
      };
      storageService.saveResult(result);

      const csv = exportImportService.exportHistoryAsCSV();
      const lines = csv.split('\n');
      expect(lines.length).toBe(2); // header + 1 row
      expect(lines[0]).toContain('WPM');
      expect(lines[1]).toContain('75');
    });

    test('exportAllData 包含正确结构字段', () => {
      // Mock downloadFile to capture the content
      const downloadSpy = vi.spyOn(exportImportService, 'downloadFile').mockImplementation(() => {});

      // Setup some data
      storageService.saveSettings({
        fontSize: 24,
        showLiveStats: true,
        theme: 'dark',
        difficulty: 'medium',
        mode: 'full',
        timedDuration: 30,
        soundEnabled: false,
        soundVolume: 0.5,
        phraseHighlight: true,
        freqHighlight: { h: false, m: false, l: false },
        freqAnnotation: { h: true, m: true, l: true },
        freqDimLow: false,
        freqDimUltraLow: false,
      });

      exportImportService.exportAllData();

      expect(downloadSpy).toHaveBeenCalledTimes(1);
      const content = downloadSpy.mock.calls[0][0];
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe(1);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.data).toBeDefined();
      expect(parsed.data.settings).toBeDefined();
      expect(parsed.data.history).toBeDefined();
      expect(parsed.data.articles).toBeDefined();
      expect(parsed.data.settings.theme).toBe('dark');

      downloadSpy.mockRestore();
    });

    test('exportTextsAsJSON 返回正确的 JSON', () => {
      const texts = [
        { id: 't1', content: 'text content', difficulty: 'easy' as const, title: 'Test' },
      ];
      const json = exportImportService.exportTextsAsJSON(texts);
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(1);
      expect(parsed[0].content).toBe('text content');
    });
  });

  describe('b) 导入验证', () => {
    test('合法 JSON 历史记录导入成功', () => {
      const data = [
        {
          id: 'import-1',
          timestamp: 1700000000000,
          wpm: 60,
          accuracy: 95,
          duration: 30,
          totalChars: 100,
          correctChars: 95,
          incorrectChars: 5,
          mode: 'full',
          textPreview: 'imported',
        },
      ];
      const result = exportImportService.importHistory(JSON.stringify(data));
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);

      const history = storageService.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].id).toBe('import-1');
    });

    test('非法 JSON 导入报错', () => {
      const result = exportImportService.importHistory('not valid json{{{');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('格式不匹配时报错（非数组）', () => {
      const result = exportImportService.importHistory(JSON.stringify({ key: 'value' }));
      expect(result.success).toBe(false);
      expect(result.error).toContain('数组');
    });

    test('合法 JSON 文本导入成功', () => {
      const data = [
        { content: 'hello world', title: 'Test', difficulty: 'easy' },
      ];
      const result = exportImportService.importTexts(JSON.stringify(data));
      expect(result.success).toBe(true);
      expect(result.texts.length).toBe(1);
      expect(result.texts[0].content).toBe('hello world');
      expect(result.texts[0].difficulty).toBe('easy');
    });

    test('文本导入时无效 content 被过滤', () => {
      const data = [
        { content: '', title: 'Empty' },
        { content: 'valid text', title: 'Valid' },
        { title: 'No content' },
      ];
      const result = exportImportService.importTexts(JSON.stringify(data));
      expect(result.success).toBe(true);
      expect(result.texts.length).toBe(1);
      expect(result.texts[0].content).toBe('valid text');
    });

    test('文本导入时非法 JSON 报错', () => {
      const result = exportImportService.importTexts('invalid json!!!');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('importAllData 合法备份导入成功', () => {
      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          articles: [{ id: 'art-1', title: 'Article', content: 'content', createdAt: Date.now() }],
          history: [
            {
              id: 'hist-1',
              timestamp: Date.now(),
              wpm: 50,
              accuracy: 90,
              duration: 20,
              totalChars: 80,
              correctChars: 72,
              incorrectChars: 8,
              mode: 'full',
              textPreview: 'test',
            },
          ],
          settings: { theme: 'dark', fontSize: 22 },
        },
      };
      const result = exportImportService.importAllData(JSON.stringify(backup));
      expect(result.success).toBe(true);

      const history = storageService.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].id).toBe('hist-1');

      const settings = storageService.getSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.fontSize).toBe(22);

      const articles = storageService.getSavedArticles();
      expect(articles.length).toBe(1);
      expect(articles[0].id).toBe('art-1');
    });

    test('importAllData 无效格式报错', () => {
      const result = exportImportService.importAllData(JSON.stringify({ foo: 'bar' }));
      expect(result.success).toBe(false);
      expect(result.error).toContain('无效');
    });

    test('importAllData 非法 JSON 报错', () => {
      const result = exportImportService.importAllData('not json!!!');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('重复导入历史记录去重', () => {
      const data = [
        {
          id: 'dup-1',
          timestamp: 1700000000000,
          wpm: 60,
          accuracy: 95,
          duration: 30,
          totalChars: 100,
          correctChars: 95,
          incorrectChars: 5,
          mode: 'full',
          textPreview: 'dup test',
        },
      ];
      // Import twice
      exportImportService.importHistory(JSON.stringify(data));
      const result2 = exportImportService.importHistory(JSON.stringify(data));
      expect(result2.count).toBe(0); // no new records

      const history = storageService.getHistory();
      expect(history.length).toBe(1); // only one
    });
  });
});
