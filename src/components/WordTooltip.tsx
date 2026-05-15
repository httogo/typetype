import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { storageService } from '../services/storage';
import type { WordListTerm } from '../types';

interface WordTooltipProps {
  word: string;
  phonetic: string;
  translation: string;
  position: { x: number; y: number; width: number; top: number };
  onClose: () => void;
}

const WordTooltip = React.memo(function WordTooltip({ word, phonetic, translation, position, onClose }: WordTooltipProps) {
  const { t } = useTranslation();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<'above' | 'below'>('above');
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const [visible, setVisible] = useState(false);
  const [addedToList, setAddedToList] = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);

  const wordLists = storageService.getWordLists();
  const hasWordLists = wordLists.length > 0;

  // Check if the word is already in any word list
  const isInWordList = useMemo(() => {
    const normalizedWord = word.toLowerCase().trim();
    return wordLists.some(list =>
      list.terms.some(term => term.value === normalizedWord)
    );
  }, [word, wordLists]);

  const handleAddToWordList = () => {
    const lists = storageService.getWordLists();
    if (lists.length === 0) return;

    const targetList = lists[0];
    const normalizedWord = word.toLowerCase().trim();

    // Avoid duplicates
    if (targetList.terms.some(t => t.value === normalizedWord)) {
      setAddedToList(true);
      return;
    }

    const term: WordListTerm = {
      id: `term-${Date.now()}`,
      value: normalizedWord,
      createdAt: Date.now(),
    };

    targetList.terms.push(term);
    targetList.updatedAt = Date.now();
    storageService.saveWordLists(lists);
    window.dispatchEvent(new CustomEvent('wordlists-updated'));
    setAddedToList(true);
  };

  const handleAddToSpecificList = (listId: string) => {
    const lists = storageService.getWordLists();
    const targetList = lists.find(l => l.id === listId);
    if (!targetList) return;

    const normalizedWord = word.toLowerCase().trim();
    if (targetList.terms.some(t => t.value === normalizedWord)) {
      setShowListPicker(false);
      setAddedToList(true);
      return;
    }

    const term: WordListTerm = {
      id: `term-${Date.now()}`,
      value: normalizedWord,
      createdAt: Date.now(),
    };

    targetList.terms.push(term);
    targetList.updatedAt = Date.now();
    storageService.saveWordLists(lists);
    window.dispatchEvent(new CustomEvent('wordlists-updated'));
    setShowListPicker(false);
    setAddedToList(true);
  };

  const getContainingListName = () => {
    const normalizedWord = word.toLowerCase();
    for (const list of wordLists) {
      if (list.terms.some(t => t.value === normalizedWord)) {
        return list.name;
      }
    }
    return t('tooltip.wordList');
  };

  const handleRemoveFromWordList = () => {
    const lists = storageService.getWordLists();
    const normalizedWord = word.toLowerCase().trim();

    let removed = false;
    for (const list of lists) {
      const idx = list.terms.findIndex(t => t.value === normalizedWord);
      if (idx !== -1) {
        list.terms.splice(idx, 1);
        list.updatedAt = Date.now();
        removed = true;
        break;
      }
    }

    if (removed) {
      storageService.saveWordLists(lists);
      window.dispatchEvent(new CustomEvent('wordlists-updated'));
      setAddedToList(false);
    }
  };

  useEffect(() => {
    if (!tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const tooltipHeight = rect.height;
    const tooltipWidth = rect.width;

    // Determine placement: above or below
    const spaceAbove = position.top;
    const shouldPlaceBelow = spaceAbove < tooltipHeight + 12;
    setPlacement(shouldPlaceBelow ? 'below' : 'above');

    // Calculate horizontal position (center on word)
    let left = position.x + position.width / 2 - tooltipWidth / 2;
    // Clamp to viewport
    const margin = 8;
    if (left < margin) left = margin;
    if (left + tooltipWidth > window.innerWidth - margin) {
      left = window.innerWidth - margin - tooltipWidth;
    }

    // Calculate vertical position
    let top: number;
    if (shouldPlaceBelow) {
      top = position.y + 8; // below the word
    } else {
      top = position.top - tooltipHeight - 8; // above the word
    }

    setCoords({ left, top });

    // Trigger fade-in after positioning
    requestAnimationFrame(() => setVisible(true));
  }, [position]);

  // Reset list picker when tooltip is hidden
  useEffect(() => {
    if (!visible) setShowListPicker(false);
  }, [visible]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showListPicker) {
          setShowListPicker(false);
          return;
        }
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [onClose, showListPicker]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use setTimeout to avoid the same click that opened it from closing it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-label={t('tooltip.definition', { word })}
      className={`fixed z-50 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ left: coords.left, top: coords.top }}
    >
      <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg px-4 py-3 max-w-xs">
        {/* Arrow */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 border bg-white/90 dark:bg-gray-800/90 ${
            placement === 'above'
              ? 'bottom-[-6px] border-b border-r border-gray-200 dark:border-gray-600'
              : 'top-[-6px] border-t border-l border-gray-200 dark:border-gray-600'
          }`}
        />

        {/* Content */}
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-sm text-gray-800 dark:text-gray-100 mb-1">{word}</div>
              {phonetic && (
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1 font-mono">{phonetic}</div>
              )}
            </div>
            {hasWordLists && (
              <div className="relative ml-2">
                {isInWordList || addedToList ? (
                  <button
                    onClick={handleRemoveFromWordList}
                    className="ml-2 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title={t('tooltip.removeFrom', { name: getContainingListName() })}
                  >
                    −
                  </button>
                ) : (
                  <button
                    onClick={handleAddToWordList}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (wordLists.length > 1) {
                        setShowListPicker(true);
                      }
                    }}
                    className="ml-2 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title={wordLists.length > 1 
                      ? t('tooltip.addToWithAlt', { name: wordLists[0]?.name })
                      : t('tooltip.addTo', { name: wordLists[0]?.name })}
                  >
                    +
                  </button>
                )}
                {showListPicker && (
                  <div className="absolute right-0 top-full mt-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-600 rounded-md shadow-lg py-1 min-w-[100px] z-50">
                    {wordLists.map(list => (
                      <button
                        key={list.id}
                        onClick={() => handleAddToSpecificList(list.id)}
                        className="block w-full text-left px-3 py-1 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                      >
                        {list.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{translation}</div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.word === nextProps.word &&
    prevProps.phonetic === nextProps.phonetic &&
    prevProps.translation === nextProps.translation &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.position.width === nextProps.position.width &&
    prevProps.position.top === nextProps.position.top &&
    prevProps.onClose === nextProps.onClose;
});

WordTooltip.displayName = 'WordTooltip';
export default WordTooltip;
