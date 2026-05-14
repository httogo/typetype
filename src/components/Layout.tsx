import { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useStorageSync } from '../hooks/useStorageSync';
import NavigationBar from './NavigationBar';
import SettingsPanel from './SettingsPanel';

export default function Layout() {
  useStorageSync();
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
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';

    // 添加过渡类
    root.classList.add('theme-transitioning');
    updateSettings({ theme: newTheme });

    // 过渡完成后移除类
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
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
      {/* 顶部导航栏 */}
      <NavigationBar>
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
          <SettingsPanel
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            settings={settings}
            onUpdateSettings={updateSettings}
          />
        </div>
      </NavigationBar>

      {/* 主内容区域 - 占满剩余空间 */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-gray-800 mx-2 sm:mx-4 my-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
