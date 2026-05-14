import React from 'react';
import type { PracticeMode } from '../types';

interface PracticeStatsBarProps {
  wpm: number;
  accuracy: number;
  elapsed: number;
  timeDisplay: number;
  mode: PracticeMode;
  currentIndex: number;
  totalChars: number;
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
}) => {
  return (
    <div className="border-b border-gray-100 dark:border-gray-700">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-1.5 flex items-center text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        <div className="flex items-center gap-4">
          <span>WPM: <span className="font-medium text-gray-700 dark:text-gray-200">{wpm}</span></span>
          <span>准确率: <span className="font-medium text-gray-700 dark:text-gray-200">{accuracy}%</span></span>
          <span>{mode === 'timed' ? '剩余' : '用时'}: <span className="font-medium text-gray-700 dark:text-gray-200">{formatTime(timeDisplay)}</span></span>
          <span>进度: <span className="font-medium text-gray-700 dark:text-gray-200">{currentIndex}/{totalChars}</span></span>
        </div>
      </div>
    </div>
  );
});

PracticeStatsBar.displayName = 'PracticeStatsBar';
