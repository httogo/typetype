import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * 监听 localStorage 的 storage 事件，实现多标签页间设置和数据同步。
 * storage 事件只在其他标签页修改时触发，不会在当前标签页触发。
 */
export function useStorageSync() {
  const { updateSettings } = useSettings();

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) return;

      try {
        if (e.key === 'typetype_settings') {
          const newSettings = JSON.parse(e.newValue);
          updateSettings(newSettings);
        }
        // 历史记录变化时可通过自定义事件通知
        if (e.key === 'typetype_history') {
          window.dispatchEvent(new CustomEvent('history-updated'));
        }
      } catch {
        // ignore malformed data
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [updateSettings]);
}
