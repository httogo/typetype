import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createHighlightStyle, createWordListTerm } from '../services/customization';
import { storageService } from '../services/storage';
import type { HighlightStyle, HighlightStyleConfig, WordList, WordListTerm } from '../types';

const DEFAULT_STYLE_ID = 'style-new';

function reindex(lists: WordList[]): WordList[] {
  return lists.map((list, index) => ({ ...list, priority: index, updatedAt: Date.now() }));
}

function termsFromText(text: string, existing: WordListTerm[]): WordListTerm[] {
  const existingByValue = new Map(existing.map(term => [term.value.toLowerCase(), term]));
  const seen = new Set<string>();
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(value => createWordListTerm(value))
    .filter(term => {
      const key = term.value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(term => existingByValue.get(term.value.toLowerCase()) ?? term);
}

function updateConfig(style: HighlightStyle, patch: Partial<HighlightStyleConfig>): HighlightStyle {
  return {
    ...style,
    config: { ...style.config, ...patch },
    updatedAt: Date.now(),
  };
}

export default function Vocabulary() {
  const { t } = useTranslation();
  const [lists, setLists] = useState<WordList[]>(() => storageService.getWordLists());
  const [styles, setStyles] = useState<HighlightStyle[]>(() => storageService.getHighlightStyles());
  const [selectedListId, setSelectedListId] = useState<string | null>(() => lists[0]?.id ?? null);
  const [selectedStyleId, setSelectedStyleId] = useState<string>(() => styles[0]?.id ?? DEFAULT_STYLE_ID);
  const [termDrafts, setTermDrafts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const selectedList = lists.find(list => list.id === selectedListId) ?? lists[0] ?? null;
  const selectedStyle = styles.find(style => style.id === selectedStyleId) ?? styles[0] ?? null;
  const selectedTermText = selectedList
    ? termDrafts[selectedList.id] ?? selectedList.terms.map(term => term.value).join('\n')
    : '';

  const styleById = useMemo(() => new Map(styles.map(style => [style.id, style])), [styles]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  };

  const persistLists = (next: WordList[]) => {
    const normalized = reindex(next);
    storageService.saveWordLists(normalized);
    setLists(normalized);
    window.dispatchEvent(new CustomEvent('wordlists-updated'));
  };

  const persistStyles = (next: HighlightStyle[]) => {
    storageService.saveHighlightStyles(next);
    setStyles(next);
    window.dispatchEvent(new CustomEvent('wordlists-updated'));
  };

  const createList = () => {
    const defaultStyleId = styles.find(style => style.id === DEFAULT_STYLE_ID)?.id ?? styles[0]?.id ?? DEFAULT_STYLE_ID;
    const list = storageService.saveWordList({
      name: t('vocabulary.newListName', { n: lists.length + 1 }),
      styleId: defaultStyleId,
      enabled: true,
      priority: lists.length,
      matchForms: true,
      terms: [],
    });
    const next = [...lists, list];
    setLists(next);
    setSelectedListId(list.id);
    showToast(t('vocabulary.listCreated'));
  };

  const updateList = (id: string, patch: Partial<WordList>) => {
    const next = lists.map(list => list.id === id ? { ...list, ...patch, updatedAt: Date.now() } : list);
    persistLists(next);
  };

  const updateTerms = (list: WordList, value: string) => {
    setTermDrafts((drafts) => ({ ...drafts, [list.id]: value }));
    updateList(list.id, { terms: termsFromText(value, list.terms) });
  };

  const deleteList = (id: string) => {
    if (!window.confirm(t('vocabulary.confirmDeleteList'))) return;
    const next = lists.filter(list => list.id !== id);
    persistLists(next);
    setSelectedListId(next[0]?.id ?? null);
    showToast(t('vocabulary.listDeleted'));
  };

  const moveList = (id: string, direction: -1 | 1) => {
    const index = lists.findIndex(list => list.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= lists.length) return;
    const next = [...lists];
    [next[index], next[target]] = [next[target], next[index]];
    persistLists(next);
  };

  const createStyle = () => {
    const style = createHighlightStyle({
      id: `style-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${t('vocabulary.styleName')} ${styles.length + 1}`,
      config: {
        textColor: '#4f46e5',
        backgroundColor: '#eef2ff',
        borderRadius: 3,
      },
    });
    persistStyles([...styles, style]);
    setSelectedStyleId(style.id);
    showToast(t('vocabulary.styleCreated'));
  };

  const updateStyle = (style: HighlightStyle) => {
    persistStyles(styles.map(item => item.id === style.id ? style : item));
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-5">
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{t('vocabulary.title')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('vocabulary.priorityHint')}
              </p>
            </div>
            <button
              onClick={createList}
              className="px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
                            {t('vocabulary.newList')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[0.95fr_1.05fr] gap-4">
            <div className="space-y-2">
              {lists.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('vocabulary.empty')}</p>
                  <button
                    onClick={createList}
                    className="mt-3 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg"
                  >
                    {t('vocabulary.createFirst')}
                  </button>
                </div>
              ) : lists.map((list, index) => {
                const style = styleById.get(list.styleId);
                return (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedList?.id === list.id
                        ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{list.name}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${list.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {list.enabled ? t('vocabulary.enabled') : t('vocabulary.disabled')}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                      <span>{t('vocabulary.termsCount', { count: list.terms.length })} · {style?.name ?? t('vocabulary.noStyle')}</span>
                      <span>#{index + 1}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 min-h-[360px]">
              {selectedList ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('vocabulary.listName')}</label>
                    <input
                      aria-label="词表名称"
                      value={selectedList.name}
                      onChange={(e) => updateList(selectedList.id, { name: e.target.value })}
                      className="mt-1.5 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateList(selectedList.id, { enabled: !selectedList.enabled })}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${selectedList.enabled ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    >
                      {selectedList.enabled ? t('vocabulary.isEnabled') : t('vocabulary.isDisabled')}
                    </button>
                    <button
                      onClick={() => updateList(selectedList.id, { matchForms: !selectedList.matchForms })}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${selectedList.matchForms ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    >
                      {selectedList.matchForms ? t('vocabulary.matchForms') : t('vocabulary.exactMatch')}
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('vocabulary.applyStyle')}</label>
                    <select
                      value={selectedList.styleId}
                      onChange={(e) => updateList(selectedList.id, { styleId: e.target.value })}
                      className="mt-1.5 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {styles.map(style => (
                        <option key={style.id} value={style.id}>{style.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => moveList(selectedList.id, -1)} className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">{t('vocabulary.moveUp')}</button>
                    <button onClick={() => moveList(selectedList.id, 1)} className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">{t('vocabulary.moveDown')}</button>
                    <button onClick={() => deleteList(selectedList.id)} className="flex-1 px-3 py-2 text-sm rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">{t('vocabulary.delete')}</button>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('vocabulary.terms')}</label>
                    <textarea
                      aria-label={t('vocabulary.terms')}
                      value={selectedTermText}
                      onChange={(e) => updateTerms(selectedList, e.target.value)}
                      placeholder={t('vocabulary.termsPlaceholder')}
                      className="mt-1.5 h-48 w-full resize-none px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{t('vocabulary.termsHint')}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                  {t('vocabulary.selectOrCreate')}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{t('vocabulary.styleTemplates')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('vocabulary.styleHint')}</p>
            </div>
            <button
              onClick={createStyle}
              className="px-3 py-2 text-sm font-medium border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            >
                            {t('vocabulary.newStyle')}
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {styles.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyleId(style.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selectedStyle?.id === style.id
                      ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>

            {selectedStyle && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('vocabulary.styleName')}</label>
                  <input
                    aria-label="样式名称"
                    value={selectedStyle.name}
                    onChange={(e) => updateStyle({ ...selectedStyle, name: e.target.value, updatedAt: Date.now() })}
                    className="mt-1.5 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    {t('vocabulary.textColor')}
                    <input
                      type="color"
                      value={selectedStyle.config.textColor ?? '#111827'}
                      onChange={(e) => updateStyle(updateConfig(selectedStyle, { textColor: e.target.value }))}
                      className="mt-1 block w-full h-9 rounded border border-gray-200 dark:border-gray-600 bg-transparent"
                    />
                  </label>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    {t('vocabulary.bgColor')}
                    <input
                      type="color"
                      value={selectedStyle.config.backgroundColor ?? '#ffffff'}
                      onChange={(e) => updateStyle(updateConfig(selectedStyle, { backgroundColor: e.target.value }))}
                      className="mt-1 block w-full h-9 rounded border border-gray-200 dark:border-gray-600 bg-transparent"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateStyle(updateConfig(selectedStyle, { fontWeight: selectedStyle.config.fontWeight === '700' ? undefined : '700' }))}
                    className={`px-3 py-2 text-sm font-bold rounded-lg border ${selectedStyle.config.fontWeight === '700' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                  >
                    {t('vocabulary.bold')}
                  </button>
                  <button
                    onClick={() => updateStyle(updateConfig(selectedStyle, { fontStyle: selectedStyle.config.fontStyle === 'italic' ? undefined : 'italic' }))}
                    className={`px-3 py-2 text-sm italic rounded-lg border ${selectedStyle.config.fontStyle === 'italic' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                  >
                    {t('vocabulary.italic')}
                  </button>
                  <button
                    onClick={() => updateStyle(updateConfig(selectedStyle, { underline: !selectedStyle.config.underline, underlineColor: selectedStyle.config.textColor }))}
                    className={`px-3 py-2 text-sm underline rounded-lg border ${selectedStyle.config.underline ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                  >
                    {t('vocabulary.underline')}
                  </button>
                  <button
                    onClick={() => updateStyle(updateConfig(selectedStyle, { strikethrough: !selectedStyle.config.strikethrough, strikethroughColor: selectedStyle.config.textColor }))}
                    className={`px-3 py-2 text-sm line-through rounded-lg border ${selectedStyle.config.strikethrough ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                  >
                    {t('vocabulary.strikethrough')}
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('vocabulary.fontFamily')}</label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {(['mono', 'sans', 'serif'] as const).map(font => (
                      <button
                        key={font}
                        onClick={() => updateStyle(updateConfig(selectedStyle, { fontFamily: selectedStyle.config.fontFamily === font ? undefined : font }))}
                        className={`px-2 py-2 text-xs font-medium rounded-lg border ${
                          selectedStyle.config.fontFamily === font
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {font === 'mono' ? t('vocabulary.mono') : font === 'sans' ? t('vocabulary.sans') : t('vocabulary.serif')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">{t('vocabulary.borderRadius')}: {selectedStyle.config.borderRadius ?? 0}px</label>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    value={selectedStyle.config.borderRadius ?? 0}
                    onChange={(e) => updateStyle(updateConfig(selectedStyle, { borderRadius: Number(e.target.value) }))}
                    className="w-full mt-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{t('vocabulary.preview')}</p>
                  <p className="text-base leading-8 text-gray-700 dark:text-gray-200">
                    The careful{' '}
                    <span
                      style={{
                        color: selectedStyle.config.textColor,
                        backgroundColor: selectedStyle.config.backgroundColor,
                        fontFamily: selectedStyle.config.fontFamily === 'serif'
                          ? 'Georgia, Cambria, Times New Roman, serif'
                          : selectedStyle.config.fontFamily === 'sans'
                            ? 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
                            : selectedStyle.config.fontFamily === 'mono'
                              ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                              : undefined,
                        fontWeight: selectedStyle.config.fontWeight,
                        fontStyle: selectedStyle.config.fontStyle,
                        textDecorationLine: [
                          selectedStyle.config.underline ? 'underline' : '',
                          selectedStyle.config.strikethrough ? 'line-through' : '',
                        ].filter(Boolean).join(' ') || undefined,
                        textDecorationColor: selectedStyle.config.underlineColor ?? selectedStyle.config.strikethroughColor,
                        textUnderlineOffset: '0.18em',
                        borderRadius: selectedStyle.config.borderRadius,
                      }}
                    >
                      analysis
                    </span>{' '}
                    of evidence reveals patterns.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-sm font-medium rounded-lg shadow-lg animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  );
}
