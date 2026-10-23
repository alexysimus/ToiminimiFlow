import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';

interface TextRevealProps {
  text: string;
  className?: string;
  isMonospace?: boolean;
  copyable?: boolean;
  label?: string;
  lines?: 1 | 2 | 3;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  className = '',
  isMonospace = false,
  copyable = true,
  label,
  lines = 1,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const lineClampClass = lines === 1 ? 'truncate' : lines === 2 ? 'line-clamp-2' : 'line-clamp-3';

  return (
    <div className="relative inline-flex items-center min-w-0 max-w-full">
      <span
        onClick={() => setIsOpen(!isOpen)}
        title={text}
        className={`cursor-pointer select-none active:opacity-70 transition-opacity min-w-0 ${lineClampClass} ${
          isMonospace ? 'font-mono tabular-nums tracking-tight' : ''
        } ${className}`}
      >
        {text}
      </span>

      {/* iOS Translucent Inspector Popover / Tooltip */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed inset-x-4 bottom-20 z-50 md:absolute md:inset-auto md:left-0 md:top-full md:mt-2 md:w-80 p-3.5 rounded-2xl bg-white/98 backdrop-blur-xl border border-slate-200 shadow-xl text-slate-800 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {label || 'Koko teksti'}
            </span>
            <div className="flex items-center space-x-1">
              {copyable && (
                <button
                  onClick={handleCopy}
                  className="px-2 py-1 text-[11px] font-semibold text-[#003580] bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center space-x-1 min-h-[32px]"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copied ? 'Kopioitu!' : 'Kopioi'}</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div
            className={`text-xs select-all break-words max-h-48 overflow-y-auto leading-relaxed ${
              isMonospace ? 'font-mono tabular-nums bg-slate-50 border border-slate-200/60 p-2 rounded-lg text-slate-900' : ''
            }`}
          >
            {text}
          </div>
        </div>
      )}
    </div>
  );
};
