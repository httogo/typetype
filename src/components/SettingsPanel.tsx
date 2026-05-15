import { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { exportImportService } from '../services/exportImport';
import type { Settings, TimedDuration } from '../types';

type Difficulty = 'easy' | 'medium' | 'hard';

const TIMED_OPTIONS: TimedDuration[] = [15, 30, 60, 120];

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
}

export default function SettingsPanel({ isOpen, onClose, settings, onUpdateSettings }: SettingsPanelProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isReadingPage = location.pathname === '/reading';
  const importInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleExportAll = () => {
    exportImportService.exportAllData();
    showToast(t('settings.exported'));
  };

  const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = exportImportService.importAllData(reader.result as string);
      if (result.success) {
        showToast(t('settings.importSuccess'));
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(t('settings.importFail', { error: result.error }));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      {isOpen && (
        <aside role="complementary" aria-label={t('settings.title')} className="animate-fade-in fixed inset-0 z-50 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 bg-white dark:bg-gray-800 sm:rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 border border-gray-200 dark:border-gray-700 p-4 sm:z-50 divide-y divide-gray-100 dark:divide-gray-700 overflow-y-auto sm:max-h-[80vh]">
          {/* 移动端关闭按钮 */}
          <div className="sm:hidden flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('settings.title')}</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('settings.close')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Difficulty */}
          <fieldset className="pb-4">
            <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('settings.difficulty')}</legend>
            <div className="flex gap-1 mt-1.5">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => onUpdateSettings({ difficulty: diff })}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    settings.difficulty === diff
                      ? 'bg-indigo-600 text-white ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-800'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {diff === 'easy' ? t('settings.easy') : diff === 'medium' ? t('settings.medium') : t('settings.hard')}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Mode */}
          <fieldset className="py-4">
            <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('settings.mode')}</legend>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <button
                onClick={() => onUpdateSettings({ mode: 'full' })}
                className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  settings.mode === 'full'
                    ? 'bg-indigo-600 text-white ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('settings.fullText')}
              </button>
              {TIMED_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => onUpdateSettings({ mode: 'timed', timedDuration: d })}
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
          </fieldset>

          {/* Font size */}
          <div className="py-4">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('settings.fontSize')}: {settings.fontSize}px
            </label>
            <input
              type="range"
              min={14}
              max={32}
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
              className="w-full mt-1.5 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Show stats toggle */}
          <div className="py-4 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('settings.showStats')}</label>
            <button
              onClick={() => onUpdateSettings({ showLiveStats: !settings.showLiveStats })}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${settings.showLiveStats ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${settings.showLiveStats ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>

          {/* Phrase highlight toggle */}
          <div className="py-4 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('settings.phraseHighlight')}</label>
            <button
              onClick={() => onUpdateSettings({ phraseHighlight: !settings.phraseHighlight })}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${settings.phraseHighlight ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${settings.phraseHighlight ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>

          {/* Sound toggle */}
          <div className="py-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('settings.sound')}</label>
              <button
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${settings.soundEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${settings.soundEnabled ? 'translate-x-4' : ''}`}
                />
              </button>
            </div>
            {settings.soundEnabled && (
              <div className="mt-2">
                <label className="text-xs text-gray-400 dark:text-gray-500">{t('settings.volume')}: {Math.round(settings.soundVolume * 100)}%</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.soundVolume * 100)}
                  onChange={(e) => onUpdateSettings({ soundVolume: Number(e.target.value) / 100 })}
                  className="w-full mt-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            )}
          </div>

          {/* 词频设置 */}
          <div className="py-4">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('settings.freqColor')}</label>
            <div className="flex gap-3 mt-1.5">
              {([['h', t('settings.high')], ['m', t('settings.mid')], ['l', t('settings.low')]] as ['h' | 'm' | 'l', string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.freqHighlight[key]}
                    onChange={() => onUpdateSettings({ freqHighlight: { ...settings.freqHighlight, [key]: !settings.freqHighlight[key] } })}
                    className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="py-4">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('settings.freqAnnotation')}</label>
            <div className="flex gap-3 mt-1.5">
              {([['h', t('settings.high')], ['m', t('settings.mid')], ['l', t('settings.low')]] as ['h' | 'm' | 'l', string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.freqAnnotation[key]}
                    onChange={() => onUpdateSettings({ freqAnnotation: { ...settings.freqAnnotation, [key]: !settings.freqAnnotation[key] } })}
                    className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* 阅读设置 - 仅在阅读页面显示 */}
          {isReadingPage && (
          <div className="pt-4">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('settings.readingSettings')}</label>
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.freqDimLow}
                  onChange={() => onUpdateSettings({ freqDimLow: !settings.freqDimLow })}
                  className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                {t('settings.dimLow')}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.freqDimUltraLow}
                  onChange={() => onUpdateSettings({ freqDimUltraLow: !settings.freqDimUltraLow })}
                  className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                {t('settings.dimUltraLow')}
              </label>
            </div>
          </div>
          )}

          {/* 语言切换 */}
          <div className="pt-4">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('settings.language')}</label>
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={() => i18n.changeLanguage('zh')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  i18n.language?.startsWith('zh')
                    ? 'bg-indigo-600 text-white ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => i18n.changeLanguage('en')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  i18n.language?.startsWith('en')
                    ? 'bg-indigo-600 text-white ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* 数据管理 */}
          <div className="pt-4">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('settings.dataManagement')}</label>
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={handleExportAll}
                className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                {t('settings.export')}
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                {t('settings.import')}
              </button>
              <input
                type="file"
                ref={importInputRef}
                className="hidden"
                accept=".json"
                onChange={handleImportAll}
              />
            </div>
          </div>
        </aside>
      )}

      {/* Toast 提示 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-sm font-medium rounded-lg shadow-lg animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}
    </>
  );
}
