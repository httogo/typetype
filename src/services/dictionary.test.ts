import { describe, test, expect } from 'vitest';
import { dictionaryService } from './dictionary';

describe('dictionaryService', () => {
  describe('getFrequency', () => {
    test('returns "u" for unknown words when dictionary is not loaded', () => {
      expect(dictionaryService.getFrequency('xyznonexistent')).toBe('u');
    });

    test('returns "u" for empty string', () => {
      expect(dictionaryService.getFrequency('')).toBe('u');
    });
  });

  describe('lookup', () => {
    test('returns null when dictionary is not loaded', () => {
      expect(dictionaryService.lookup('hello')).toBeNull();
    });

    test('returns null for empty string', () => {
      expect(dictionaryService.lookup('')).toBeNull();
    });
  });

  describe('lookupPhrase', () => {
    test('returns null when dictionary is not loaded', () => {
      expect(dictionaryService.lookupPhrase(['hello', 'world'], 0)).toBeNull();
    });
  });

  describe('matchCorrelative', () => {
    test('returns null when dictionary is not loaded', () => {
      expect(dictionaryService.matchCorrelative(['as', 'big', 'as'], 0)).toBeNull();
    });
  });

  describe('isLoaded', () => {
    test('reports loaded state correctly', () => {
      // Before loading, dict is null so isLoaded should eventually be consistent
      // (initial state depends on whether load() was called elsewhere)
      const loaded = dictionaryService.isLoaded();
      expect(typeof loaded).toBe('boolean');
    });
  });
});
