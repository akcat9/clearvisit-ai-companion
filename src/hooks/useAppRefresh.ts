import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAppRefresh = () => {
  const { toast } = useToast();
  const [isRecovering, setIsRecovering] = useState(false);

  const refreshApp = useCallback(async () => {
    setIsRecovering(true);
    
    // Add timeout to prevent infinite recovery
    const timeoutId = setTimeout(() => {
      console.log('Recovery timeout, clearing state');
      setIsRecovering(false);
    }, 10000); // 10 second timeout
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('Session error, attempting refresh');
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.log('Session refresh failed, signing out');
          await supabase.auth.signOut({ scope: 'local' });
        }
      }
    } catch (error) {
      console.error('Session recovery error:', error);
      // Clear auth state on error
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      clearTimeout(timeoutId);
      setIsRecovering(false);
    }
  }, []);

  useEffect(() => {
    // Listen for network reconnection
    const handleOnline = () => {
      console.log('Network reconnected, refreshing session');
      refreshApp();
    };

    // Listen for app becoming visible after long absence  
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const hiddenTime = Date.now() - (window as any).appHiddenTime;
        if (hiddenTime > 30000) { // 30 seconds
          console.log('App focused after long absence, refreshing');
          refreshApp();
        }
      } else {
        (window as any).appHiddenTime = Date.now();
      }
    };

    // Listen for page focus after long absence
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