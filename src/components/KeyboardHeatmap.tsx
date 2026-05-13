import { useState } from 'react';

interface KeyboardHeatmapProps {
  errorStats: Record<string, { errors: number; total: number }>;
}

const KEYBOARD_ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  [' '],
];

function getErrorRate(stats: { errors: number; total: number } | undefined): number {
  if (!stats || stats.total === 0) return -1; // -1 means no data
  return stats.errors / stats.total;
}

function getKeyColor(rate: number): string {
  if (rate < 0) return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
  if (rate === 0) return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
  if (rate < 0.05) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
  if (rate < 0.15) return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300';
  if (rate < 0.30) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300';
  return 'bg-red-200 dark:bg-red-900/50 text-red-700 dark:text-red-300';
}

function getKeyLabel(key: string): string {
  if (key === ' ') return 'Space';
  return key;
}

export default function KeyboardHeatmap({ errorStats }: KeyboardHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    key: string;
    errors: number;
    total: number;
    rate: number;
    x: number;
    y: number;
  } | null>(null);

  const handleMouseEnter = (
    e: React.MouseEvent,
    key: string,
  ) => {
    const stats = errorStats[key];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const rate = stats ? stats.errors / stats.total : 0;
    setTooltip({
      key,
      errors: stats?.errors ?? 0,
      total: stats?.total ?? 0,
      rate,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className="relative">
      <div className="flex flex-col items-center gap-1.5">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1.5 justify-center">
            {row.map((key) => {
              const stats = errorStats[key];
              const rate = getErrorRate(stats);
              const colorClass = getKeyColor(rate);
              const isSpace = key === ' ';

              return (
                <div
                  key={key}
                  onMouseEnter={(e) => handleMouseEnter(e, key)}
                  onMouseLeave={handleMouseLeave}
                  className={`
                    ${isSpace ? 'w-48 sm:w-64' : 'w-9 sm:w-10'}
                    h-9 sm:h-10 flex items-center justify-center
                    rounded-md text-xs sm:text-sm font-mono font-medium
                    border border-gray-200 dark:border-gray-600
                    cursor-default select-none transition-all duration-150
                    hover:scale-110 hover:shadow-md hover:z-10
                    ${colorClass}
                  `}
                >
                  {getKeyLabel(key)}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"></div>
          <span>无数据</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-900/40 border border-gray-200 dark:border-gray-600"></div>
          <span>&lt;5%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-yellow-100 dark:bg-yellow-900/40 border border-gray-200 dark:border-gray-600"></div>
          <span>5-15%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-orange-100 dark:bg-orange-900/40 border border-gray-200 dark:border-gray-600"></div>
          <span>15-30%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-red-200 dark:bg-red-900/50 border border-gray-200 dark:border-gray-600"></div>
          <span>&gt;30%</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && tooltip.total > 0 && (
        <div
          className="fixed z-50 px-3 py-2 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-medium mb-0.5">
            按键: <span className="font-mono">{getKeyLabel(tooltip.key)}</span>
          </div>
          <div>错误: {tooltip.errors} / {tooltip.total} 次</div>
          <div>错误率: {(tooltip.rate * 100).toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
}
