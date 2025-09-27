import { RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
  shouldShow: boolean;
}

export const PullToRefresh = ({ 
  pullDistance, 
  isRefreshing, 
  threshold, 
  shouldShow 
}: PullToRefreshProps) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const isReady = pullDistance >= threshold;

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-transform duration-200",
        "bg-background/80 backdrop-blur-sm border-b",
        shouldShow ? "translate-y-0" : "-translate-y-full"
      )}
      style={{ 
        height: Math.max(pullDistance * 0.8, shouldShow ? 60 : 0),
        transform: `translateY(${shouldShow ? Math.max(pullDistance * 0.3 - 60, -60) : -60}px)`
      }}
    >
      <div className="flex flex-col items-center gap-2">
        {isRefreshing ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Refreshing...</span>
          </>
        ) : (
          <>
            <div className="relative">
              <ChevronDown 
                className={cn(
                  "w-5 h-5 transition-all duration-200",
                  isReady ? "text-primary rotate-180" : "text-muted-foreground",
                )}
                style={{ 
                  transform: `rotate(${Math.min(progress * 180, 180)}deg)` 
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {isReady ? "Release to refresh" : "Pull to refresh"}
            </span>
          </>
        )}
      </div>
    </div>
  );
};