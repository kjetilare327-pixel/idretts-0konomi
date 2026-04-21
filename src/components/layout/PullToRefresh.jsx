import React, { useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const scrollRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const el = scrollRef.current;
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      await onRefresh?.();
      setRefreshing(false);
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col">
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none transition-all"
          style={{ height: refreshing ? THRESHOLD : pullDistance, opacity: progress }}
        >
          <div className="w-9 h-9 rounded-full bg-card border border-border shadow flex items-center justify-center">
            <RefreshCw
              className="w-4 h-4 text-primary"
              style={{
                transform: `rotate(${refreshing ? 0 : progress * 360}deg)`,
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none', transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}