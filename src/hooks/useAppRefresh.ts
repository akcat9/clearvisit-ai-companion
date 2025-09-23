import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAppRefresh = () => {
  const { toast } = useToast();
  const [isRecovering, setIsRecovering] = useState(false);

  const refreshApp = useCallback(async () => {
    // Graceful session recovery without hard reload
    setIsRecovering(true);
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('Session error, attempting silent refresh');
        // Try to refresh the session instead of immediate reload
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.log('Session refresh failed, clearing auth state');
          await supabase.auth.signOut({ scope: 'local' });
        }
      }
    } catch (error) {
      console.error('Session recovery error:', error);
    } finally {
      setIsRecovering(false);
    }
  }, []);

  useEffect(() => {
    // Listen for network reconnection
    const handleOnline = () => {
      console.log('Network reconnected, refreshing session');
      refreshApp();
    };

    // Listen for app becoming visible (mobile app focus)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Only refresh if app was hidden for more than 30 seconds
        const hiddenTime = Date.now() - (window as any).appHiddenTime;
        if (hiddenTime > 30000) {
          console.log('App focused after long absence, refreshing');
          refreshApp();
        }
      } else {
        (window as any).appHiddenTime = Date.now();
      }
    };

    // Listen for page focus (browser tab switching)
    const handleFocus = () => {
      const focusTime = Date.now() - (window as any).appBlurTime;
      if (focusTime > 60000) { // 1 minute
        console.log('Page focused after long absence, refreshing');
        refreshApp();
      }
    };

    const handleBlur = () => {
      (window as any).appBlurTime = Date.now();
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [refreshApp]);

  return { refreshApp, isRecovering };
};