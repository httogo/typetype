import { useSettings } from '../context/SettingsContext';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">设置</h1>

      {/* 字体大小设置 */}
      <section className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 p-6">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">字体大小</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={14}
              max={32}
              step={2}
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-sm font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg min-w-[60px] text-center">
              {settings.fontSize}px
            </span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">预览效果：</p>
            <p
              style={{ fontSize: `${settings.fontSize}px` }}
              className="text-gray-800 dark:text-gray-200 font-mono leading-relaxed"
            >
              The quick brown fox jumps over the lazy dog. 敏捷的棕色狐狸跳过了懒狗。
            </p>
          </div>
        </div>
      </section>

      {/* 显示实时统计 */}
      <section className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">显示实时统计</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">练习时显示实时 WPM 和准确率</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showLiveStats}
            onClick={() => updateSettings({ showLiveStats: !settings.showLiveStats })}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              settings.showLiveStats ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.showLiveStats ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 主题切换 */}
      <section className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 p-6">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">主题</h2>
        <div className="flex gap-3">
          <button
            onClick={() => updateSettings({ theme: 'light' })}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all duration-200 ${
              settings.theme === 'light'
                ? 'border-indigo-500 bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 shadow-sm ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-800'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Light
          </button>
          <button
            onClick={() => updateSettings({ theme: 'dark' })}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all duration-200 ${
              settings.theme === 'dark'
                ? 'border-indigo-500 bg-gray-800 dark:bg-gray-700 text-white shadow-sm ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-800'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
            Dark
          </button>
        </div>
      </section>
    </div>
  );
}
