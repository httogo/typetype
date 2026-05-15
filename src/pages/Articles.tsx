import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { storageService } from '../services/storage';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { parseChapters } from '../utils/chapterParser';
import type { SavedArticle, Chapter } from '../types';

export default function Articles() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importText, setImportText] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setArticles(storageService.getSavedArticles());
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleExtract = async () => {
    const trimmedUrl = importUrl.trim();
    if (!trimmedUrl) return;

    try {
      new URL(trimmedUrl);
    } catch {
      showToast(t('articles.invalidUrl'));
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
        throw new Error(t('articles.invalidResponse'));
      }

      if (!res.ok) {
        showToast(data.error || `请求失败 (${res.status})`);
        return;
      }

      const sanitizedContent = DOMPurify.sanitize(data.content || '', { ALLOWED_TAGS: [] });
      const sanitizedTitle = DOMPurify.sanitize(data.title || '', { ALLOWED_TAGS: [] });

      setImportText(sanitizedContent);
      if (sanitizedTitle) {
        setImportTitle(sanitizedTitle);
        showToast(t('articles.extracted', { title: sanitizedTitle }));
      } else {
        showToast(t('articles.extractedChars', { count: sanitizedContent.length }));
      }
    } catch (err: any) {
      showToast(t('articles.networkError') + (err.message || ''));
    } finally {
      setExtracting(false);
    }
  };

  /** 提取保存逻辑供复用 */
  const doSaveImport = () => {
    const content = importText.trim();
    if (!content) return null;
    const title = importTitle.trim() || content.slice(0, 20);
    const source = importUrl.trim() || t('articles.manualInput');
    storageService.saveArticle({ title, content, source });
    setArticles(storageService.getSavedArticles());
    return { title, content };
  };

  const clearImportPanel = () => {
    setImportTitle('');
    setImportText('');
    setImportUrl('');
    setShowImport(false);
  };

  const handleSaveImport = () => {
    const saved = doSaveImport();
    if (!saved) return;
    clearImportPanel();
    showToast(t('articles.saved'));
  };

  const handlePracticeImport = () => {
    const saved = doSaveImport();
    if (!saved) return;
    clearImportPanel();
    navigate('/', { state: { text: saved.content, title: saved.title } });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('articles.confirmDelete'))) return;
    storageService.deleteArticle(id);
    setArticles(storageService.getSavedArticles());
    showToast(t('articles.deleted'));
  };

  const handlePractice = (article: SavedArticle) => {
    navigate('/', { state: { text: article.content, title: article.title } });
  };

  const handleRead = (article: SavedArticle) => {
    navigate('/reading', { state: { text: article.content, title: article.title } });
  };

  const handlePracticeChapter = (article: SavedArticle, chapter: Chapter) => {
    navigate('/', { state: { text: chapter.content, title: `${article.title} - ${chapter.title}` } });
  };

  const handleReadChapter = (article: SavedArticle, chapter: Chapter) => {
    navigate('/reading', { state: { text: chapter.content, title: `${article.title} - ${chapter.title}` } });
  };

  const toggleExpand = (article: SavedArticle) => {
    const id = article.id;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // 如果旧文章没有 chapters 字段，延迟解析
        if (!article.chapters) {
          const chapters = parseChapters(article.content);
          if (chapters.length > 0) {
            storageService.updateArticle(id, { chapters });
            setArticles((arts) =>
              arts.map((a) => (a.id === id ? { ...a, chapters } : a))
            );
          }
        }
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        {/* 标题区 */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{t('articles.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('articles.savedCount', { count: articles.length })}
            </p>
          </div>
          <button
            onClick={() => setShowImport(!showImport)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                       bg-indigo-600 hover:bg-indigo-700 text-white
                       rounded-lg transition-all duration-200 hover:shadow-md active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            导入文章
          </button>
        </div>

        {/* 导入面板 */}
        {showImport && (
          <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t('articles.import')}</h3>
              <button
                onClick={() => setShowImport(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 标题输入 */}
            <input
              type="text"
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
              placeholder={t('articles.importTitle')}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600
                         rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         transition-all duration-200"
            />

            {/* URL 提取 */}
            <div className="mt-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('articles.fromWeb')}</span>
              </div>
              <div className="flex">
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleExtract(); }}
                  placeholder={t('articles.urlPlaceholder')}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600
                             rounded-l-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100
                             placeholder-gray-400 dark:placeholder-gray-500
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                             transition-all duration-200"
                />
                <button
                  onClick={handleExtract}
                  disabled={extracting || !importUrl.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
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
                      {t('articles.extracting')}
                    </>
                  ) : t('articles.extract')}
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t('articles.urlSupport')}
              </p>
            </div>

            {/* 文本粘贴 */}
            <div className="mt-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">{t('articles.pasteContent')}</span>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={t('articles.textPlaceholder')}
                rows={6}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600
                           rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100
                           font-mono leading-relaxed resize-none
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                           transition-all duration-200"
              />
              {importText && (
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
                  {importText.length} {t('articles.chars')}
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setShowImport(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-700
                           rounded-lg transition-all duration-200"
              >
                {t('articles.cancel')}
              </button>
              <button
                onClick={handlePracticeImport}
                disabled={!importText.trim()}
                className="px-4 py-2 text-sm font-medium
                           bg-teal-500 hover:bg-teal-600 text-white
                           rounded-lg transition-all duration-200 hover:shadow-md
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('articles.practice')}
              </button>
              <button
                onClick={handleSaveImport}
                disabled={!importText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                           bg-indigo-600 hover:bg-indigo-700 text-white
                           rounded-lg transition-all duration-200 hover:shadow-md
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                                {t('articles.saveToArticles')}
              </button>
            </div>
          </div>
        )}

        {/* 文章列表 */}
        {articles.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('articles.empty')}</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t('articles.emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => {
              const chapters = article.chapters;
              const isExpanded = expandedIds.has(article.id);

              return (
                <div
                  key={article.id}
                  className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md dark:hover:shadow-none hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(article.createdAt)}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          {article.source === '手动输入' || article.source === 'Manual input' ? t('articles.manual') : 'URL'}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {article.content.length} {t('articles.chars')}
                        </span>
                        {chapters && chapters.length > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            {chapters.length} {t('articles.chapters')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                        {article.content.slice(0, 100)}
                        {article.content.length > 100 ? '…' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleRead(article)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                                   bg-teal-600 hover:bg-teal-700 text-white
                                   rounded-lg transition-all duration-200"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {t('articles.read')}
                      </button>
                      <button
                        onClick={() => handlePractice(article)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                                   bg-indigo-600 hover:bg-indigo-700 text-white
                                   rounded-lg transition-all duration-200"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        {t('articles.practice')}
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                                   text-red-600 dark:text-red-400
                                   border border-red-200 dark:border-red-800
                                   hover:bg-red-50 dark:hover:bg-red-900/20
                                   rounded-lg transition-all duration-200"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {t('articles.delete')}
                      </button>
                    </div>
                  </div>

                  {/* 章节展开区域 */}
                  {(chapters && chapters.length > 0 || !article.chapters) && article.content.length > 1000 && (
                    <button
                      onClick={() => toggleExpand(article)}
                      className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      <span className="text-[10px]">{isExpanded ? '▼' : '▶'}</span>
                      {chapters && chapters.length > 0
                        ? (isExpanded ? t('articles.collapseChaptersCount', { count: chapters.length }) : t('articles.viewChaptersCount', { count: chapters.length }))
                        : isExpanded ? t('articles.collapseChapters') : t('articles.viewChapters')}
                    </button>
                  )}

                  {isExpanded && chapters && chapters.length > 0 && (
                    <div className="mt-2 pl-2 border-l-2 border-gray-200 dark:border-gray-600 space-y-0.5 max-h-64 overflow-y-auto">
                      {chapters.map((ch) => (
                        <div
                          key={ch.id}
                          className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
                        >
                          <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                            {ch.title}
                          </span>
                          <button
                            onClick={() => handleReadChapter(article, ch)}
                            className="ml-2 px-2 py-0.5 text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded transition-colors"
                          >
                            {t('articles.read')}
                          </button>
                          <button
                            onClick={() => handlePracticeChapter(article, ch)}
                            className="ml-2 px-2 py-0.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                          >
                            {t('articles.practice')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && (!chapters || chapters.length === 0) && (
                    <div className="mt-2 pl-2 text-xs text-gray-400 dark:text-gray-500">
                      {t('articles.noChapters')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
