import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface NotificationsButtonProps {
  onClick: () => void;
}

export const NotificationsButton = ({ onClick }: NotificationsButtonProps) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('app_notifications')
        .select('id')
        .eq('is_active', true);
      
      setUnreadCount(data?.length || 0);
    };

    fetchNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'app_notifications' }, 
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClick}
        className="flex items-center gap-2 self-start sm:self-auto"
      >
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">Notifications</span>
      </Button>
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </div>
  );
};