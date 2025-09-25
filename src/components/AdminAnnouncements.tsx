import { useState, useEffect } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

export const AdminAnnouncements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('created_by', user?.id)
      .order('created_at', { ascending: false });
    
    setAnnouncements(data || []);
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and message",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const { error } = await supabase
      .from('app_notifications')
      .insert({
        title: title.trim(),
        message: message.trim(),
        created_by: user?.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Announcement created successfully",
      });
      setTitle("");
      setMessage("");
      setShowCreateForm(false);
      fetchAnnouncements();
    }
    setCreating(false);
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('app_notifications')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Announcement ${!currentState ? 'activated' : 'deactivated'}`,
      });
      fetchAnnouncements();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('app_notifications')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });
      fetchAnnouncements();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>App Announcements</CardTitle>
        <CardDescription>
          Send announcements to all users. Only active announcements are visible to users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showCreateForm ? (
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Announcement
          </Button>
        ) : (
          <div className="space-y-4 p-4 border rounded-lg">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter announcement title"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter announcement message"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {announcements.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Your Announcements</h4>
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{announcement.title}</span>
                    {announcement.is_active ? (
                      <Eye className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{announcement.message}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={announcement.is_active}
                      onCheckedChange={() => handleToggleActive(announcement.id, announcement.is_active)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {announcement.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(announcement.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};