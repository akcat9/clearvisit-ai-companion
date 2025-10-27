import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AnnouncementsButtonProps {
  onClick: () => void;
}

export const AnnouncementsButton = ({ onClick }: AnnouncementsButtonProps) => {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    checkForUnreadAnnouncements();

    // Set up real-time subscription for new announcements
    const channel = supabase
      .channel('announcements')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'app_notifications' }, 
        () => {
          checkForUnreadAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkForUnreadAnnouncements = async () => {
    if (!user) return;

    // Get user's last viewed timestamp
    const { data: viewData } = await supabase
      .from('user_announcement_views')
      .select('last_viewed_at')
      .eq('user_id', user.id)
      .single();

    // Get latest active announcement
    const { data: latestAnnouncement } = await supabase
      .from('app_notifications')
      .select('created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (latestAnnouncement) {
      const lastViewed = viewData?.last_viewed_at ? new Date(viewData.last_viewed_at) : new Date(0);
      const latestAnnouncementDate = new Date(latestAnnouncement.created_at);
      setHasUnread(latestAnnouncementDate > lastViewed);
    } else {
      setHasUnread(false);
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon"
        onClick={onClick}
        className="text-primary-foreground hover:bg-primary-foreground/20 h-9 w-9 sm:h-10 sm:w-10"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
      </Button>
      {hasUnread && (
        <div className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border border-primary" />
      )}
    </div>
  );
};