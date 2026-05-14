import React from 'react';

interface PracticeResultCardProps {
  result: {
    wpm: number;
    accuracy: number;
    duration: number;
    correctChars: number;
    incorrectChars: number;
  };
  onReset: () => void;
  onNext: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const PracticeResultCard: React.FC<PracticeResultCardProps> = React.memo(({
  result,
  onReset,
  onNext,
}) => {
  return (
    <div className="w-full max-w-md text-center animate-fade-in">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">练习完成</h2>

      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        {/* WPM Hero Number */}
        <div className="mb-5">
          <div className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tabular-nums animate-count-up">
            {result.wpm}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">WPM</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="relative bg-green-50 dark:bg-green-900/20 rounded-lg p-3 animate-count-up overflow-hidden" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <div className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">{result.accuracy}%</div>
            <div className="text-xs text-green-500 dark:text-green-400">准确率</div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400"></div>
          </div>
          <div className="relative bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 animate-count-up overflow-hidden" style={{ animationDelay: '0.2s', opacity: 0 }}>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">{formatTime(result.duration)}</div>
            <div className="text-xs text-purple-500 dark:text-purple-400">用时</div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
          </div>
          <div className="relative bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 animate-count-up overflow-hidden" style={{ animationDelay: '0.3s', opacity: 0 }}>
            <div className="text-lg font-bold tabular-nums">
              <span className="text-green-600 dark:text-green-400">{result.correctChars}</span>
              <span className="text-gray-400 dark:text-gray-500 mx-0.5">/</span>
              <span className="text-red-500 dark:text-red-400">{result.incorrectChars}</span>
            </div>
            <div className="text-xs text-orange-500 dark:text-orange-400">正确/错误</div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 animate-float">按 Enter 开始下一篇</p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onNext}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 hover:shadow-md transition-all duration-200"
        >
          下一篇
        </button>
        <button
          onClick={onReset}
          className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md transition-all duration-200"
        >
          重新练习
        </button>
      </div>
    </div>
  );
});

PracticeResultCard.displayName = 'PracticeResultCard';
