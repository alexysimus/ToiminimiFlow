import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass?: string;
  position?: 'top' | 'bottom';
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerRight,
  children,
  maxWidthClass = 'max-w-lg',
  position = 'bottom',
}) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const isHandleDragRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        triggerClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset drag on open
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsDragging(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch (err) {
        // Ignore restricted vibration
      }
    }
  };

  const triggerClose = useCallback(() => {
    setIsClosing(true);
    triggerHaptic();
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragY(0);
    }, 220);
  }, [onClose]);

  // Handle touch starting directly from grab handle or header (Always allows drag)
  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX;
    startTimeRef.current = Date.now();
    isHandleDragRef.current = true;
    setIsDragging(true);
  };

  // Handle touch starting from content area
  const handleContentTouchStart = (e: React.TouchEvent) => {
    const scrollContainer = scrollContainerRef.current;
    if (position === 'top') {
      if (!scrollContainer || scrollContainer.scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
        startTimeRef.current = Date.now();
        isHandleDragRef.current = false;
        setIsDragging(true);
      }
    } else if (!scrollContainer || scrollContainer.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      startTimeRef.current = Date.now();
      isHandleDragRef.current = false;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - startYRef.current;
    const deltaX = currentX - startXRef.current;

    // Reject horizontal gestures
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaY) < 12) {
      return;
    }

    if (position === 'top') {
      if (deltaY < 0) {
        // Dragging UP to dismiss
        let effectiveY = deltaY;
        if (deltaY < -120) {
          effectiveY = -120 + (deltaY + 120) * 0.42;
        }
        setDragY(effectiveY);
        if (e.cancelable && deltaY < -10) {
          e.preventDefault();
        }
      } else {
        // Upward resistance (rubber band)
        setDragY(deltaY * 0.12);
      }
    } else {
      if (deltaY > 0) {
        // Downward drag with rubber-band dampening past 120px
        let effectiveY = deltaY;
        if (deltaY > 120) {
          effectiveY = 120 + (deltaY - 120) * 0.42;
        }
        setDragY(effectiveY);

        if (e.cancelable && deltaY > 10) {
          e.preventDefault();
        }
      } else {
        // Upward resistance (rubber band)
        setDragY(deltaY * 0.12);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const elapsed = Date.now() - startTimeRef.current;
    const velocity = dragY / Math.max(elapsed, 1); // px/ms

    if (position === 'top') {
      if (dragY < -90 || (dragY < -30 && velocity < -0.35)) {
        triggerClose();
      } else {
        setDragY(0);
      }
    } else {
      // Dismiss if dragged past 110px or flicked downward with high velocity
      if (dragY > 110 || (dragY > 40 && velocity > 0.42)) {
        triggerClose();
      } else {
        // Snap back up
        setDragY(0);
      }
    }
  };

  if (!isOpen) return null;

  // Backdrop opacity fades down as sheet is pulled away
  const backdropOpacity = Math.max(0.08, 1 - Math.min(1, Math.abs(dragY) / 320));
  const isTop = position === 'top';

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center transition-opacity duration-200 ${
        isTop 
          ? 'items-start p-2.5 sm:p-4 md:p-6 pt-safe overflow-hidden animate-fadeIn' 
          : 'items-end sm:items-center p-0 sm:p-4'
      }`}
      style={{
        backgroundColor: `rgba(0, 53, 128, ${0.28 * backdropOpacity})`, // Finnish blue tinted translucent scrim
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={triggerClose}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`bg-white ${
          isTop 
            ? 'rounded-2xl shadow-2xl mt-1 sm:mt-4 md:mt-6 animate-in slide-in-from-top-4 duration-200' 
            : 'rounded-t-[28px] sm:rounded-2xl shadow-2xl'
        } w-full ${maxWidthClass} ${
          isTop ? 'max-h-[92dvh] sm:max-h-[90dvh]' : 'max-h-[90dvh]'
        } flex flex-col border border-slate-200/90 overflow-hidden`}
        style={{
          transform: isClosing
            ? (isTop ? 'translate3d(0, -100%, 0)' : 'translate3d(0, 100%, 0)')
            : `translate3d(0, ${isTop ? Math.min(0, dragY) : Math.max(0, dragY)}px, 0)`,
          transition: isDragging
            ? 'none'
            : isClosing
            ? 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)'
            : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* iOS Grabber Pill Area (Dedicated handle for touch drag) */}
        {!isTop && (
          <div
            onTouchStart={handleHeaderTouchStart}
            className="sm:hidden pt-3 pb-1 cursor-grab active:cursor-grabbing flex items-center justify-center select-none touch-none bg-white"
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full transition-transform" />
          </div>
        )}

        {/* Header (Pure Finnish Blue & White aesthetic, draggable on mobile) */}
        {(title || icon || headerRight) && (
          <div
            onTouchStart={handleHeaderTouchStart}
            className="px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 select-none cursor-grab sm:cursor-default"
          >
            <div className="flex items-center space-x-3 min-w-0 pr-2 pointer-events-none sm:pointer-events-auto">
              {icon && (
                <div className="w-9 h-9 rounded-xl bg-[#003580] text-white flex items-center justify-center shadow-xs shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-[11px] text-slate-500 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {headerRight}
              <button
                onClick={triggerClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 hover:bg-slate-200 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Sulje"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content Container (Pure Crisp White Background) */}
        <div
          ref={scrollContainerRef}
          onTouchStart={handleContentTouchStart}
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 text-slate-800 bg-white pb-safe"
        >
          {children}
        </div>
      </div>
    </div>
  );
};
