import { describe, test, expect, beforeEach } from 'vitest';
import { storageService } from './storage';

describe('storageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveResult', () => {
    test('saves and retrieves typing result', () => {
      const result = {
        id: 'test-1',
        wpm: 60,
        accuracy: 95,
        duration: 30,
        timestamp: Date.now(),
        totalChars: 100,
        correctChars: 95,
        incorrectChars: 5,
        mode: 'full' as const,
        textPreview: 'test text preview',
      };
      const saved = storageService.saveResult(result);
      expect(saved).toBe(true);

      const history = storageService.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].wpm).toBe(60);
      expect(history[0].id).toBe('test-1');
    });
  });

  describe('saveTypingResult (atomic)', () => {
    test('saves result and error stats atomically', () => {
      const result = {
        id: 'test-2',
        wpm: 60,
        accuracy: 95,
        duration: 30,
        timestamp: Date.now(),
        totalChars: 100,
        correctChars: 95,
        incorrectChars: 5,
        mode: 'full' as const,
        textPreview: 'test text preview',
      };
      const errorMap = { a: { errors: 2, total: 10 } };
      const saved = storageService.saveTypingResult(result, errorMap);
      expect(saved).toBe(true);

      const history = storageService.getHistory();
      expect(history.length).toBe(1);

      const errorStats = storageService.getErrorStats();
      expect(errorStats.a.errors).toBe(2);
      expect(errorStats.a.total).toBe(10);
    });
  });

  describe('getHistory', () => {
    test('returns empty array when no history', () => {
      expect(storageService.getHistory()).toEqual([]);
    });
  });

  describe('deleteResult', () => {
    test('removes a result by id', () => {
      const result = {
        id: 'to-delete',
        wpm: 50,
        accuracy: 90,
        duration: 20,
        timestamp: Date.now(),
        totalChars: 80,
        correctChars: 72,
        incorrectChars: 8,
        mode: 'full' as const,
        textPreview: 'delete me',
      };
      storageService.saveResult(result);
      expect(storageService.getHistory().length).toBe(1);

      storageService.deleteResult('to-delete');
      expect(storageService.getHistory().length).toBe(0);
    });
  });

  describe('settings', () => {
    test('returns default settings when none saved', () => {
      const settings = storageService.getSettings();
      expect(settings.fontSize).toBe(20);
      expect(settings.theme).toBe('light');
      expect(settings.soundEnabled).toBe(false);
    });

    test('saves and retrieves settings', () => {
      const settings = storageService.getSettings();
      settings.fontSize = 24;
      settings.theme = 'dark';
      storageService.saveSettings(settings);

      const loaded = storageService.getSettings();
      expect(loaded.fontSize).toBe(24);
      expect(loaded.theme).toBe('dark');
    });
  });
});
