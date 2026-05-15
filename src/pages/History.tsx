import { useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { storageService } from '../services/storage';
import { exportImportService } from '../services/exportImport';
import KeyboardHeatmap from '../components/KeyboardHeatmap';
import type { TypingResult } from '../types';

type TabType = 'trend' | 'stats' | 'goal';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(sec: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (sec < 60) return `${Math.round(sec)}${t('history.seconds')}`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s > 0 ? t('history.minuteSecond', { m, s }) : t('history.minutes', { m });
}

function formatTotalTime(sec: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (sec < 60) return t('history.totalSeconds', { n: Math.round(sec) });
  if (sec < 3600) return t('history.totalMinutes', { n: Math.floor(sec / 60) });
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m > 0 ? t('history.totalHoursMinutes', { h, m }) : t('history.totalHours', { h });
}

export default function History() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<TypingResult[]>(() => storageService.getHistory());
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('trend');
  const importInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleExportJSON = () => {
    const content = exportImportService.exportHistoryAsJSON();
    exportImportService.downloadFile(content, `typetype-history-${Date.now()}.json`, 'application/json');
  };

  const handleExportCSV = () => {
    const content = exportImportService.exportHistoryAsCSV();
    exportImportService.downloadFile(content, `typetype-history-${Date.now()}.csv`, 'text/csv');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = exportImportService.importHistory(reader.result as string);
      if (result.success) {
        showToast(t('history.importSuccess', { count: result.count }));
        setHistory(storageService.getHistory());
      } else {
        showToast(t('history.importFail', { error: result.error }));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sorted = useMemo(
    () => [...history].sort((a, b) => b.timestamp - a.timestamp),
    [history],
  );

  const chartData = useMemo(() => {
    const chronological = [...history].sort((a, b) => a.timestamp - b.timestamp);
    return chronological.slice(-20).map((r, i) => ({
      index: i + 1,
      wpm: r.wpm,
    }));
  }, [history]);

  const handleClearAll = useCallback(() => {
    storageService.clearHistory();
    setHistory([]);
    setShowConfirm(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    storageService.deleteResult(id);
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ---- 空状态 ----
  if (history.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mx-auto w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
          <svg className="w-10 h-10 text-indigo-400 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5M6 12h.008M9.75 12h.008M13.5 12h.008M17.25 12h.008M6 15.75h12M3 6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V6.75z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">{t('history.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{t('history.empty')}</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 hover:shadow-md transition-all duration-200"
        >
                    {t('history.startPractice')}
        </Link>
      </div>
    );
  }

  // ---- 有记录 ----
  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 sm:p-6">
      {/* 页面标题 + 操作 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">{t('history.title')}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('history.exportJSON')}
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('history.exportCSV')}
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4 4m0 0l4-4m-4 4V4" />
            </svg>
            {t('history.import')}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
                        {t('history.clearAll')}
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
        {([
          { key: 'trend' as TabType, label: t('history.trend') },
          { key: 'stats' as TabType, label: t('history.stats') },
          { key: 'goal' as TabType, label: t('history.goal') },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 趋势 Tab */}
      {activeTab === 'trend' && (
        <TrendPanel history={history} sorted={sorted} chartData={chartData} onDelete={handleDelete} />
      )}

      {/* 统计 Tab */}
      {activeTab === 'stats' && (
        <StatsPanel history={history} />
      )}

      {/* 目标 Tab */}
      {activeTab === 'goal' && (
        <GoalPanel history={history} />
      )}

      {/* 确认弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{t('history.confirmClearTitle')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{t('history.confirmClearMsg')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                {t('history.cancel')}
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                {t('history.confirmClear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-sm font-medium rounded-lg shadow-lg animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ========== Trend Panel ========== */

function TrendPanel({
  history,
  sorted,
  chartData,
  onDelete,
}: {
  history: TypingResult[];
  sorted: TypingResult[];
  chartData: { index: number; wpm: number }[];
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const totalWpm = history.reduce((s, r) => s + r.wpm, 0);
    return {
      count: history.length,
      avgWpm: Math.round(totalWpm / history.length),
      maxWpm: Math.max(...history.map((r) => r.wpm)),
    };
  }, [history]);

  return (
    <div className="space-y-6">
      {/* 统计摘要 */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/30 dark:to-gray-800 rounded-xl p-3 sm:p-4 text-center border border-indigo-100 dark:border-indigo-800/50">
            <p className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium">{t('history.totalSessions')}</p>
            <p className="text-xl sm:text-3xl font-bold text-indigo-700 dark:text-indigo-300 mt-1 tabular-nums">{stats.count}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/30 dark:to-gray-800 rounded-xl p-3 sm:p-4 text-center border border-green-100 dark:border-green-800/50">
            <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">{t('history.avgWpm')}</p>
            <p className="text-xl sm:text-3xl font-bold text-green-700 dark:text-green-300 mt-1 tabular-nums">{stats.avgWpm}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/30 dark:to-gray-800 rounded-xl p-3 sm:p-4 text-center border border-amber-100 dark:border-amber-800/50">
            <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium">{t('history.bestWpm')}</p>
            <p className="text-xl sm:text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1 tabular-nums">{stats.maxWpm}</p>
          </div>
        </div>
      )}

      {/* WPM 趋势折线图 */}
      {chartData.length >= 2 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">{t('history.wpmTrend', { count: chartData.length })}</h2>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2 sm:p-4 border border-gray-100 dark:border-gray-600" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="index"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  label={{ value: t('history.sessionCount'), position: 'insideBottomRight', offset: -5, fontSize: 12, fill: '#9ca3af' }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip
                  formatter={(value) => [`${value} WPM`, t('history.wpm')]}
                  labelFormatter={(label) => t('history.sessionN', { n: label })}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="wpm"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#6366f1' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 按键错误分布热力图 */}
      <ErrorHeatmapSection />

      {/* 记录列表 */}
      <div className="space-y-2">
        {sorted.map((r) => (
          <div
            key={r.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 sm:p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{formatDate(r.timestamp)}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.mode === 'timed'
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  }`}
                >
                  {r.mode === 'timed' ? (r.timedDuration ? t('history.timedWithDuration', { duration: r.timedDuration }) : t('history.timed')) : t('history.fullText')}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{formatDuration(r.duration, t)}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{r.textPreview}</p>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">
              <div className="text-right">
                <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{r.wpm}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('history.wpm')}</p>
              </div>
              <div className="text-right">
                <p className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">{r.accuracy.toFixed(1)}%</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('history.accuracy')}</p>
              </div>
              <button
                onClick={() => onDelete(r.id)}
                className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
                title="删除"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========== Stats Panel ========== */

function StatsPanel({ history }: { history: TypingResult[] }) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  const rangeStats = useMemo(() => {
    const now = Date.now();
    const from = timeRange === 'week' ? now - 7 * 86400000
      : timeRange === 'month' ? now - 30 * 86400000
      : 0;
    const filtered = history.filter(r => r.timestamp >= from);

    return {
      sessions: filtered.length,
      avgWpm: filtered.length ? Math.round(filtered.reduce((s, r) => s + r.wpm, 0) / filtered.length) : 0,
      avgAccuracy: filtered.length ? Math.round(filtered.reduce((s, r) => s + r.accuracy, 0) / filtered.length) : 0,
      totalTime: filtered.reduce((s, r) => s + r.duration, 0),
      bestWpm: filtered.length ? Math.max(...filtered.map(r => r.wpm)) : 0,
    };
  }, [history, timeRange]);

  const topErrors = useMemo(() => storageService.getTopErrors(10), []);

  return (
    <div className="space-y-6">
      {/* 时间段选择器 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{t('history.timeRangeStats')}</h2>
        </div>
        <div className="flex gap-2 mb-4">
          {([
            { key: 'week' as const, label: t('history.lastWeek') },
            { key: 'month' as const, label: t('history.lastMonth') },
            { key: 'all' as const, label: t('history.all') },
          ]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setTimeRange(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                timeRange === opt.key
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700'
                  : 'text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label={t('history.sessions')} value={String(rangeStats.sessions)} color="indigo" />
          <StatCard label={t('history.avgWpm')} value={String(rangeStats.avgWpm)} color="green" />
          <StatCard label={t('history.avgAccuracy')} value={`${rangeStats.avgAccuracy}%`} color="blue" />
          <StatCard label={t('history.totalTime')} value={formatTotalTime(rangeStats.totalTime, t)} color="purple" />
          <StatCard label={t('history.bestWpm')} value={String(rangeStats.bestWpm)} color="amber" />
        </div>
      </div>

      {/* 错误字符排行 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-red-400 rounded-full"></div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{t('history.topErrors')}</h2>
        </div>
        {topErrors.length > 0 ? (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600 space-y-2.5">
            {topErrors.map(e => (
              <div key={e.char} className="flex items-center gap-3">
                <span className="font-mono text-sm w-8 text-center font-bold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 rounded px-1.5 py-0.5">
                  {e.char === ' ' ? '␣' : e.char}
                </span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-400 to-red-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(e.rate * 100, 2)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right tabular-nums">
                  {Math.round(e.rate * 100)}%
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 w-16 text-right">
                  {e.errors}/{e.total}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-8 border border-gray-100 dark:border-gray-600 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('history.needMoreDataErrors')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== Goal Panel ========== */

function GoalPanel({ history }: { history: TypingResult[] }) {
  const { t } = useTranslation();
  const [goal, setGoal] = useState(() => storageService.getDailyGoal());
  const [editMode, setEditMode] = useState(!goal);
  const [wpmInput, setWpmInput] = useState(String(goal?.wpmTarget ?? 60));
  const [sessionsInput, setSessionsInput] = useState(String(goal?.sessionsTarget ?? 5));

  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayResults = history.filter(r => r.timestamp >= today.getTime());
    return {
      sessions: todayResults.length,
      bestWpm: todayResults.length ? Math.max(...todayResults.map(r => r.wpm)) : 0,
      avgWpm: todayResults.length ? Math.round(todayResults.reduce((s, r) => s + r.wpm, 0) / todayResults.length) : 0,
    };
  }, [history]);

  const handleSaveGoal = () => {
    const wpmTarget = Math.max(1, parseInt(wpmInput) || 60);
    const sessionsTarget = Math.max(1, parseInt(sessionsInput) || 5);
    const newGoal = { wpmTarget, sessionsTarget };
    storageService.saveDailyGoal(newGoal);
    setGoal(newGoal);
    setEditMode(false);
  };

  const wpmProgress = goal ? Math.min(100, (todayStats.bestWpm / goal.wpmTarget) * 100) : 0;
  const sessionsProgress = goal ? Math.min(100, (todayStats.sessions / goal.sessionsTarget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-5 bg-green-500 rounded-full"></div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{t('history.dailyGoal')}</h2>
      </div>

      {/* 目标设定 */}
      {editMode ? (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 border border-gray-100 dark:border-gray-600 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t('history.wpmTarget')}</label>
              <input
                type="number"
                min="1"
                max="300"
                value={wpmInput}
                onChange={e => setWpmInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t('history.sessionsTarget')}</label>
              <input
                type="number"
                min="1"
                max="100"
                value={sessionsInput}
                onChange={e => setSessionsInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveGoal}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              {t('history.saveGoal')}
            </button>
            {goal && (
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                {t('history.cancel')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 border border-gray-100 dark:border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('history.goalDisplay')}<span className="font-semibold text-gray-700 dark:text-gray-200">{t('history.wpmGoalValue', { value: goal?.wpmTarget })}</span> ·{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-200">{t('history.sessionsGoalValue', { value: goal?.sessionsTarget })}</span>
            </p>
            <button
              onClick={() => setEditMode(true)}
              className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
            >
                            {t('history.edit')}
            </button>
          </div>
        </div>
      )}

      {/* 今日进度 */}
      {goal && !editMode && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-green-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{t('history.todayProgress')}</h3>
          </div>

          {/* WPM 进度 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('history.todayBestWpm')}</span>
              <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
                {todayStats.bestWpm} / {goal.wpmTarget}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  wpmProgress >= 100
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                    : 'bg-gradient-to-r from-indigo-400 to-indigo-500'
                }`}
                style={{ width: `${wpmProgress}%` }}
              />
            </div>
            {wpmProgress >= 100 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 font-medium">{t('history.wpmGoalAchieved')}</p>
            )}
          </div>

          {/* 练习次数进度 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('history.todaySessions')}</span>
              <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
                {todayStats.sessions} / {goal.sessionsTarget}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  sessionsProgress >= 100
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                    : 'bg-gradient-to-r from-purple-400 to-purple-500'
                }`}
                style={{ width: `${sessionsProgress}%` }}
              />
            </div>
            {sessionsProgress >= 100 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 font-medium">{t('history.sessionsGoalAchieved')}</p>
            )}
          </div>

          {/* 今日统计摘要 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('history.todayPractice')}</p>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">{todayStats.sessions}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('history.todayBest')}</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-0.5 tabular-nums">{todayStats.bestWpm}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('history.todayAvg')}</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5 tabular-nums">{todayStats.avgWpm}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== Shared Components ========== */

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'from-indigo-50 to-white dark:from-indigo-900/30 dark:to-gray-800 border-indigo-100 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400',
    green: 'from-green-50 to-white dark:from-green-900/30 dark:to-gray-800 border-green-100 dark:border-green-800/50 text-green-600 dark:text-green-400',
    blue: 'from-blue-50 to-white dark:from-blue-900/30 dark:to-gray-800 border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400',
    purple: 'from-purple-50 to-white dark:from-purple-900/30 dark:to-gray-800 border-purple-100 dark:border-purple-800/50 text-purple-600 dark:text-purple-400',
    amber: 'from-amber-50 to-white dark:from-amber-900/30 dark:to-gray-800 border-amber-100 dark:border-amber-800/50 text-amber-600 dark:text-amber-400',
  };
  const cls = colorMap[color] ?? colorMap.indigo;

  return (
    <div className={`bg-gradient-to-br ${cls} rounded-xl p-3 text-center border`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

/* ========== Error Heatmap Section ========== */

function ErrorHeatmapSection() {
  const { t } = useTranslation();
  const errorStats = useMemo(() => storageService.getErrorStats(), []);
  const hasData = Object.keys(errorStats).length > 0 &&
    Object.values(errorStats).some((s) => s.total > 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{t('history.errorHeatmap')}</h2>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 sm:p-6 border border-gray-100 dark:border-gray-600 overflow-x-auto">
        {hasData ? (
          <KeyboardHeatmap errorStats={errorStats} />
        ) : (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
            {t('history.needMoreDataHeatmap')}
          </p>
        )}
      </div>
    </div>
  );
}
