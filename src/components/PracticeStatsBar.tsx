import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PracticeMode } from '../types';

interface PracticeStatsBarProps {
  wpm: number;
  accuracy: number;
  elapsed: number;
  timeDisplay: number;
  mode: PracticeMode;
  currentIndex: number;
  totalChars: number;
  historicalBest?: number;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const PracticeStatsBar: React.FC<PracticeStatsBarProps> = React.memo(({
  wpm,
  accuracy,
  timeDisplay,
  mode,
  currentIndex,
  totalChars,
  historicalBest,
}) => {
  const { t } = useTranslation();
  return (
    <div id="practice-stats" role="status" aria-live="polite" aria-atomic="true" className="border-b border-gray-100 dark:border-gray-700">
      <div className="max-w-4xl mx-auto px-3 sm:px-8 py-1.5 flex items-center text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span>
            {t('practice.wpm')}: <span className="font-medium text-gray-700 dark:text-gray-200">{wpm}</span>
            {historicalBest != null && wpm > 0 && (
              <span className={wpm >= historicalBest ? 'text-green-500 ml-1' : 'text-gray-400 ml-1'}>
                {wpm >= historicalBest ? '↑' : '↓'} {t('practice.best')} {historicalBest}
              </span>
            )}
          </span>
          <span>{t('practice.accuracy')}: <span className="font-medium text-gray-700 dark:text-gray-200">{accuracy}%</span></span>
          <span>{mode === 'timed' ? t('practice.remaining') : t('practice.time')}: <span className="font-medium text-gray-700 dark:text-gray-200">{formatTime(timeDisplay)}</span></span>
          <span className="hidden sm:inline">{t('practice.progress')}: <span className="font-medium text-gray-700 dark:text-gray-200">{currentIndex}/{totalChars}</span></span>
        </div>
      </div>
    </div>
  );
});

PracticeStatsBar.displayName = 'PracticeStatsBar';
