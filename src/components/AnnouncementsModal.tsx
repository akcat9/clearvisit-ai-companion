import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface AnnouncementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AnnouncementsModal = ({ open, onOpenChange }: AnnouncementsModalProps) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user) {
      fetchAnnouncements();
      markAsViewed();
    }
  }, [open, user]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error) {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const markAsViewed = async () => {
    if (!user) return;

    // Update or insert the user's last viewed timestamp
    const { error } = await supabase
      .from('user_announcement_views')
      .upsert({
        user_id: user.id,
        last_viewed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error marking announcements as viewed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Announcements
            {announcements.length > 0 && (
              <Badge variant="secondary">{announcements.length}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading announcements...
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No announcements yet
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{announcement.title}</h4>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {announcement.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};