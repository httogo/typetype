import { useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { storageService } from '../services/storage';
import { exportImportService } from '../services/exportImport';
import KeyboardHeatmap from '../components/KeyboardHeatmap';
import type { TypingResult } from '../types';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}秒`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}

export default function History() {
  const [history, setHistory] = useState<TypingResult[]>(() => storageService.getHistory());
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
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
        showToast(`成功导入 ${result.count} 条记录`);
        setHistory(storageService.getHistory());
      } else {
        showToast(`导入失败：${result.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sorted = useMemo(
    () => [...history].sort((a, b) => b.timestamp - a.timestamp),
    [history],
  );

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const totalWpm = history.reduce((s, r) => s + r.wpm, 0);
    return {
      count: history.length,
      avgWpm: Math.round(totalWpm / history.length),
      maxWpm: Math.max(...history.map((r) => r.wpm)),
    };
  }, [history]);

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
        {/* SVG keyboard icon */}
        <div className="mx-auto w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
          <svg className="w-10 h-10 text-indigo-400 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5M6 12h.008M9.75 12h.008M13.5 12h.008M17.25 12h.008M6 15.75h12M3 6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V6.75z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">练习历史</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">还没有练习记录，去练习一下吧！</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 hover:shadow-md transition-all duration-200"
        >
          开始练习
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">练习历史</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出 JSON
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出 CSV
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4 4m0 0l4-4m-4 4V4" />
            </svg>
            导入
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
            清除全部
          </button>
        </div>
      </div>

      {/* 统计摘要 */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/30 dark:to-gray-800 rounded-xl p-4 text-center border border-indigo-100 dark:border-indigo-800/50">
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">总练习次数</p>
            <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 mt-1 tabular-nums">{stats.count}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/30 dark:to-gray-800 rounded-xl p-4 text-center border border-green-100 dark:border-green-800/50">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">平均 WPM</p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1 tabular-nums">{stats.avgWpm}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/30 dark:to-gray-800 rounded-xl p-4 text-center border border-amber-100 dark:border-amber-800/50">
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">最高 WPM</p>
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1 tabular-nums">{stats.maxWpm}</p>
          </div>
        </div>
      )}

      {/* 记录列表 */}
      <div className="space-y-2">
        {sorted.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(r.timestamp)}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.mode === 'timed'
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  }`}
                >
                  {r.mode === 'timed' ? `限时${r.timedDuration ? ` ${r.timedDuration}s` : ''}` : '全文'}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{formatDuration(r.duration)}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{r.textPreview}</p>
            </div>

            <div className="flex items-center gap-6 ml-4 flex-shrink-0">
              <div className="text-right">
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{r.wpm}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">WPM</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">{r.accuracy.toFixed(1)}%</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">准确率</p>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
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

      {/* WPM 趋势折线图 */}
      {chartData.length >= 2 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">WPM 趋势（最近 {chartData.length} 次）</h2>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="index"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  label={{ value: '练习次数', position: 'insideBottomRight', offset: -5, fontSize: 12, fill: '#9ca3af' }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip
                  formatter={(value) => [`${value} WPM`, 'WPM']}
                  labelFormatter={(label) => `第 ${label} 次`}
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

      {/* 确认弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">确认清除</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">确定要清除所有练习记录吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                确认清除
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

/* ---------- Error Heatmap Section ---------- */

function ErrorHeatmapSection() {
  const errorStats = useMemo(() => storageService.getErrorStats(), []);
  const hasData = Object.keys(errorStats).length > 0 &&
    Object.values(errorStats).some((s) => s.total > 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">按键错误分布</h2>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-100 dark:border-gray-600">
        {hasData ? (
          <KeyboardHeatmap errorStats={errorStats} />
        ) : (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
            需要更多练习数据来生成热力图
          </p>
        )}
      </div>
    </div>
  );
}
