import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { exportImportService } from '../services/exportImport';
import { storageService } from '../services/storage';
import { fetchWithRetry } from '../utils/fetchWithRetry';

export default function Custom() {
  const [text, setText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedTitle, setExtractedTitle] = useState('');
  const navigate = useNavigate();
  const importInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleExtract = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    // 简单 URL 格式校验
    try {
      new URL(trimmedUrl);
    } catch {
      showToast('请输入有效的网址');
      return;
    }

    setExtracting(true);
    try {
      const res = await fetchWithRetry('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      }, {
        maxRetries: 2,
        timeout: 15000,
      });

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('服务器返回了无效的响应');
      }

      if (!res.ok) {
        showToast(data.error || `请求失败 (${res.status})`);
        return;
      }

      // XSS 防御：sanitize 外部来源的数据（纯文本，移除所有 HTML 标签）
      const sanitizedContent = DOMPurify.sanitize(data.content || '', { ALLOWED_TAGS: [] });
      const sanitizedTitle = DOMPurify.sanitize(data.title || '', { ALLOWED_TAGS: [] });

      setText(sanitizedContent);
      if (sanitizedTitle) {
        setExtractedTitle(sanitizedTitle);
        showToast(`已提取：${sanitizedTitle}`);
      } else {
        setExtractedTitle('');
        showToast(`已提取 ${sanitizedContent.length} 个字符`);
      }
    } catch (err: any) {
      showToast('网络错误：' + (err.message || '请检查网络连接'));
    } finally {
      setExtracting(false);
    }
  };

  const handleStart = () => {
    if (!text.trim()) return;
    navigate('/', { state: { text: text.trim(), title: '导入文章' } });
  };

  const handleSaveArticle = () => {
    if (!text.trim()) return;
    const title = extractedTitle || text.trim().slice(0, 20);
    const source = url.trim() || '手动输入';
    storageService.saveArticle({ title, content: text.trim(), source });
    showToast('文章已保存');
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
      showToast('没有可导出的导入文章');
      return;
    }
    const content = exportImportService.exportTextsAsJSON(customTexts);
    exportImportService.downloadFile(content, `typetype-texts-${Date.now()}.json`, 'application/json');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-6">
      <div className="flex flex-col flex-1 min-h-0 max-w-4xl mx-auto w-full">
        {/* 标题区 */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">导入文章</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">输入或粘贴你想练习的文本</p>
        </div>

        {/* 网址提取卡片 */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-1.5 mb-2.5">
            <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">从网页提取</span>
          </div>
          <div className="relative flex">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none z-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleExtract(); }}
              placeholder="粘贴网页地址，自动提取正文..."
              className="flex-1 pl-10 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600
                         rounded-l-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         transition-all duration-200"
            />
            <button
              onClick={handleExtract}
              disabled={extracting || !url.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                         bg-indigo-600 hover:bg-indigo-700 text-white
                         rounded-r-lg transition-all duration-200
                         disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {extracting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  提取中
                </>
              ) : '提取'}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            支持 Gutenberg、Standard Ebooks、Open Library、LibreTexts、ManyBooks 等在线书籍网站
          </p>
        </div>

        {/* Textarea 区域 */}
        <div className="flex flex-col flex-1 min-h-0">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">练习文本</span>
          <textarea
            className="flex-1 min-h-0 w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl
                       bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
                       font-mono text-base leading-relaxed resize-none
                       shadow-sm dark:shadow-none
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                       transition-all duration-200
                       placeholder-gray-400 dark:placeholder-gray-500"
            placeholder={"在此输入或粘贴英文文本…\n\n也可以使用上方网址提取功能自动获取网页正文"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {/* 底部：字符计数 + 开始按钮 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
          <span className="inline-flex items-center bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400">
            {text.length} 字符
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveArticle}
              disabled={!text.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-indigo-600 dark:text-indigo-400 font-medium
                         border border-indigo-300 dark:border-indigo-600
                         rounded-lg transition-all duration-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              保存文章
            </button>
            <button
              onClick={handleStart}
              disabled={!text.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium
                         rounded-lg transition-all duration-200 hover:shadow-md active:scale-95
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              开始练习
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>

        {/* 导入导出区域 */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2 block">数据管理</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                         text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800
                         border border-gray-200 dark:border-gray-600
                         rounded-lg shadow-sm dark:shadow-none
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              导入文本集
            </button>
            <button
              onClick={handleExportTexts}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                         text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800
                         border border-gray-200 dark:border-gray-600
                         rounded-lg shadow-sm dark:shadow-none
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
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
        </div>
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
