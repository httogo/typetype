import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportImportService } from '../services/exportImport';
import { storageService } from '../services/storage';

export default function Custom() {
  const [text, setText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();
  const importInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStart = () => {
    if (!text.trim()) return;
    navigate('/', { state: { text: text.trim(), title: '自定义文本' } });
  };

  const handleImportTexts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = exportImportService.importTexts(reader.result as string);
      if (result.success && result.texts.length > 0) {
        storageService.addCustomTexts(result.texts);
        showToast(`成功导入 ${result.texts.length} 篇文本`);
      } else if (result.error) {
        showToast(`导入失败：${result.error}`);
      } else {
        showToast('未找到有效文本');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportTexts = () => {
    const customTexts = storageService.getCustomTexts();
    if (customTexts.length === 0) {
      showToast('没有可导出的自定义文本');
      return;
    }
    const content = exportImportService.exportTextsAsJSON(customTexts);
    exportImportService.downloadFile(content, `typetype-texts-${Date.now()}.json`, 'application/json');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-6">
      {/* 标题区 */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">自定义文本</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">输入或粘贴你想练习的文本</p>
      </div>

      {/* textarea 占满剩余空间 */}
      <textarea
        className="flex-1 min-h-0 w-full p-4 border border-gray-200 dark:border-gray-600 rounded-lg
                   bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100
                   font-mono text-base resize-none
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                   transition-shadow duration-200
                   placeholder-gray-400 dark:placeholder-gray-500"
        placeholder="在此输入或粘贴文本..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {/* 底部：字符计数 + 按钮 */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-sm text-gray-400 dark:text-gray-500">{text.length} 个字符</span>
        <button
          onClick={handleStart}
          disabled={!text.trim()}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium
                     rounded-lg transition-all duration-200 hover:shadow-md active:scale-95
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          开始练习
        </button>
      </div>

      {/* 导入导出区域 */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => importInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4 4m0 0l4-4m-4 4V4" />
          </svg>
          导入文本集(.json)
        </button>
        <button
          onClick={handleExportTexts}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出所有文本
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          onChange={handleImportTexts}
          className="hidden"
        />
      </div>

      {/* Toast 提示 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-sm font-medium rounded-lg shadow-lg animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  );
}
