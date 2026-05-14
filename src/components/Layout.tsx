import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import type { TimedDuration } from '../types';

type Difficulty = 'easy' | 'medium' | 'hard';
const TIMED_OPTIONS: TimedDuration[] = [15, 30, 60, 120];

const navItems = [
  { to: '/', label: '练习', end: true },
  { to: '/custom', label: '自定义文本' },
  { to: '/history', label: '历史记录' },
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const { settings, updateSettings } = useSettings();

  // Apply dark mode class on document root
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // 切换主题，并临时添加过渡 class 以避免闪烁
  const toggleTheme = () => {
    const root = document.documentElement;
    // 添加颜色过渡 class
    root.classList.add('theme-transition');
    // 整页 opacity 抨动，让视觉切换更统一
    root.style.transition = 'opacity 0.15s ease';
    root.style.opacity = '0.85';

    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: newTheme });

    // 恢复透明度
    requestAnimationFrame(() => {
      setTimeout(() => {
        root.style.opacity = '1';
        setTimeout(() => {
          root.style.transition = '';
          root.classList.remove('theme-transition');
        }, 200);
      }, 50);
    });
  };

  // Close settings panel on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsOpen && settingsPanelRef.current && !settingsPanelRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  // Close settings on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [settingsOpen]);

  return (
    <div className="h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col transition-colors duration-200">
      {/* 顶部导航栏 - 紧凑 */}
      <nav className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            {/* 左侧：品牌名 */}
            <NavLink to="/" className="flex-shrink-0">
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                TypeType
              </span>
            </NavLink>

            {/* 右侧：导航链接 + 齿轮 + 移动端汉堡 */}
            <div className="flex items-center gap-1">
              {/* 桌面端导航链接 */}
              <div className="hidden sm:flex items-center space-x-1 mr-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              {/* Theme toggle button */}
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                title="切换主题"
              >
                {settings.theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* 齿轮设置按钮 */}
              <div className="relative" ref={settingsPanelRef}>
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  title="设置"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {/* Settings popover */}
                {settingsOpen && (
                  <div className="animate-fade-in absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 border border-gray-200 dark:border-gray-700 p-4 z-50 divide-y divide-gray-100 dark:divide-gray-700">
                    {/* Difficulty */}
                    <div className="pb-4">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">难度</label>
                      <div className="flex gap-1 mt-1.5">
                        {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                          <button
                            key={diff}
                            onClick={() => updateSettings({ difficulty: diff })}
                            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                              settings.difficulty === diff
                                ? 'bg-indigo-600 text-white ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-800'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {diff === 'easy' ? '简单' : diff === 'medium' ? '中等' : '困难'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mode */}
                    <div className="py-4">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">模式</label>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <button
                          onClick={() => updateSettings({ mode: 'full' })}
                          className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                            settings.mode === 'full'
                              ? 'bg-indigo-600 text-white ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-800'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          全文
                        </button>
                        {TIMED_OPTIONS.map((d) => (
                          <button
                            key={d}
                            onClick={() => updateSettings({ mode: 'timed', timedDuration: d })}
                            className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                              settings.mode === 'timed' && settings.timedDuration === d
                                ? 'bg-indigo-600 text-white ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-800'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {d}s
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font size */}
                    <div className="py-4">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        字体大小: {settings.fontSize}px
                      </label>
                      <input
                        type="range"
                        min={14}
                        max={32}
                        value={settings.fontSize}
                        onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                        className="w-full mt-1.5 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    {/* Show stats toggle */}
                    <div className="py-4 flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">显示统计</label>
                      <button
                        onClick={() => updateSettings({ showLiveStats: !settings.showLiveStats })}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${settings.showLiveStats ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${settings.showLiveStats ? 'translate-x-4' : ''}`}
                        />
                      </button>
                    </div>

                    {/* Phrase highlight toggle */}
                    <div className="py-4 flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">词组提示</label>
                      <button
                        onClick={() => updateSettings({ phraseHighlight: !settings.phraseHighlight })}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${settings.phraseHighlight ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${settings.phraseHighlight ? 'translate-x-4' : ''}`}
                        />
                      </button>
                    </div>

                    {/* Sound toggle */}
                    <div className="pt-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">按键音效</label>
                        <button
                          onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                          className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${settings.soundEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${settings.soundEnabled ? 'translate-x-4' : ''}`}
                          />
                        </button>
                      </div>
                      {settings.soundEnabled && (
                        <div className="mt-2">
                          <label className="text-xs text-gray-400 dark:text-gray-500">音量: {Math.round(settings.soundVolume * 100)}%</label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(settings.soundVolume * 100)}
                            onChange={(e) => updateSettings({ soundVolume: Number(e.target.value) / 100 })}
                            className="w-full mt-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 移动端菜单按钮 */}
              <button
                className="sm:hidden p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* 主内容区域 - 占满剩余空间 */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-gray-800 mx-2 sm:mx-4 my-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
