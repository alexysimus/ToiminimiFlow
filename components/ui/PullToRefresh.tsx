import React, { useState, useRef, useEffect } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className = '',
  threshold = 64,
}) => {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasTriggeredHapticRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    
    // Check both window scroll and container scrollTop
    const windowScrollY = typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop || 0) : 0;
    const container = containerRef.current;
    const containerScrollTop = container ? container.scrollTop : 0;

    // Only allow pull to refresh when truly at the very top of the page
    if (windowScrollY <= 2 && containerScrollTop <= 2) {
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isDraggingRef.current = true;
      hasTriggeredHapticRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - startYRef.current;
    const deltaX = currentX - startXRef.current;

    // Ensure it is a primarily downward vertical swipe, reject horizontal and upward
    if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX) * 1.3) {
      // iOS rubber-band resistance curve
      const resistance = 0.44;
      const calculatedPull = Math.min(95, deltaY * resistance);
      setPullY(calculatedPull);

      // Trigger subtle haptic pulse upon crossing threshold
      if (calculatedPull >= threshold && !hasTriggeredHapticRef.current) {
        hasTriggeredHapticRef.current = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(10);
          } catch (err) {
            // Ignore restricted vibration
          }
        }
      }

      // Prevent native browser scroll bounce while active
      if (deltaY > 15 && e.cancelable) {
        e.preventDefault();
      }
    } else if (deltaY < 0) {
      isDraggingRef.current = false;
      setPullY(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (pullY >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullY(48); // Smooth snap to resting spinner height
      try {
        await Promise.resolve(onRefresh());
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullY(0);
        }, 320);
      }
    } else {
      setPullY(0);
    }
  };

  const progress = Math.min(1, pullY / threshold);
  const blades = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative ${className}`}
    >
      {/* Native iOS Pull-to-Refresh Radial Tick Spinner Area */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-center overflow-hidden z-20"
        style={{
          height: `${pullY}px`,
          transition: isDraggingRef.current ? 'none' : 'height 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/95 shadow-md backdrop-blur-md border border-slate-200/90 transition-transform"
          style={{
            transform: `scale(${Math.max(0.65, Math.min(1, 0.65 + progress * 0.35))})`,
            opacity: Math.max(0.2, progress),
          }}
        >
          {/* iOS 12-Spoke Radial Activity Indicator in Finnish Flag Blue */}
          <svg
            className={`w-5 h-5 text-[#003580] ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              animationDuration: '0.85s',
              transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
            }}
            viewBox="0 0 24 24"
            fill="none"
          >
            {blades.map((i) => {
              // Standard iOS blade opacities
              const activeBladeCount = Math.floor(progress * 12);
              const isBladeLit = i <= activeBladeCount;
              const restingOpacities = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.42, 0.35, 0.28, 0.22, 0.16, 0.1];
              const opacity = isRefreshing
                ? restingOpacities[i]
                : isBladeLit
                ? 0.9
                : 0.15;

              return (
                <line
                  key={i}
                  x1="12"
                  y1="3"
                  x2="12"
                  y2="6.2"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  transform={`rotate(${i * 30} 12 12)`}
                  opacity={opacity}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Main Content with dynamic downward displacement */}
      <div
        style={{
          transform: `translate3d(0, ${pullY}px, 0)`,
          transition: isDraggingRef.current ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
