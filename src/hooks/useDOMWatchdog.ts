import { useEffect, useRef, useState } from 'react';

interface DOMWatchdogConfig {
  checkInterval: number;
  consecutiveFailuresThreshold: number;
}

export const useDOMWatchdog = (
  onDOMCorruption: () => void,
  config: DOMWatchdogConfig = {
    checkInterval: 5000, // Check every 5 seconds
    consecutiveFailuresThreshold: 2 // Trigger after 2 consecutive failures
  }
) => {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const consecutiveFailuresRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const observerRef = useRef<MutationObserver>();

  const checkDOMHealth = (): boolean => {
    // Check if critical DOM elements exist
    const root = document.getElementById('root');
    const body = document.body;
    
    // Basic DOM health checks
    const hasRoot = root && root.isConnected;
    const hasBody = body && body.innerHTML.trim().length > 0;
    const hasChildren = root && root.children.length > 0;

    return !!(hasRoot && hasBody && hasChildren);
  };

  const handleDOMFailure = () => {
    consecutiveFailuresRef.current += 1;
    
    if (consecutiveFailuresRef.current >= config.consecutiveFailuresThreshold) {
      console.warn('DOM corruption detected, triggering recovery');
      setIsMonitoring(false);
      onDOMCorruption();
    }
  };

  const handleDOMSuccess = () => {
    consecutiveFailuresRef.current = 0;
  };

  useEffect(() => {
    if (!isMonitoring) return;

    // Set up periodic DOM health checks
    intervalRef.current = setInterval(() => {
      if (checkDOMHealth()) {
        handleDOMSuccess();
      } else {
        handleDOMFailure();
      }
    }, config.checkInterval);

    // Set up MutationObserver to detect sudden DOM changes
    observerRef.current = new MutationObserver((mutations) => {
      const criticalMutation = mutations.some(mutation => {
        // Check if root element or its children were removed
        const removedNodes = Array.from(mutation.removedNodes);
        return removedNodes.some(node => 
          node instanceof Element && 
          (node.id === 'root' || node.contains(document.getElementById('root')))
        );
      });

      if (criticalMutation) {
        console.warn('Critical DOM mutation detected');
        // Give a brief moment for React to potentially recover
        setTimeout(() => {
          if (!checkDOMHealth()) {
            handleDOMFailure();
          }
        }, 100);
      }
    });

    // Start observing the document body for changes
    if (document.body) {
      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isMonitoring, config.checkInterval, config.consecutiveFailuresThreshold, onDOMCorruption]);

  return {
    isMonitoring,
    stopMonitoring: () => setIsMonitoring(false),
    restartMonitoring: () => {
      consecutiveFailuresRef.current = 0;
      setIsMonitoring(true);
    }
  };
};