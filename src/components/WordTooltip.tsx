import React, { useEffect, useRef, useState } from 'react';

interface WordTooltipProps {
  word: string;
  phonetic: string;
  translation: string;
  position: { x: number; y: number; width: number; top: number };
  onClose: () => void;
}

const WordTooltip = React.memo(function WordTooltip({ word, phonetic, translation, position, onClose }: WordTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<'above' | 'below'>('above');
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const [visible, setVisible] = useState(false);

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

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

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
          <div className="font-medium text-sm text-gray-800 dark:text-gray-100 mb-1">{word}</div>
          {phonetic && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-1 font-mono">{phonetic}</div>
          )}
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
