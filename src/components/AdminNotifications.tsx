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

interface Notification {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

export const AdminNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('created_by', user?.id)
      .order('created_at', { ascending: false });
    
    setNotifications(data || []);
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
        description: "Failed to create notification",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Notification created successfully",
      });
      setTitle("");
      setMessage("");
      setShowCreateForm(false);
      fetchNotifications();
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
        description: "Failed to update notification",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Notification ${!currentState ? 'activated' : 'deactivated'}`,
      });
      fetchNotifications();
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
        description: "Failed to delete notification",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Notification deleted successfully",
      });
      fetchNotifications();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>App Notifications</CardTitle>
        <CardDescription>
          Send announcements to all users. Only active notifications are visible to users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showCreateForm ? (
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Notification
          </Button>
        ) : (
          <div className="space-y-4 p-4 border rounded-lg">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter notification title"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter notification message"
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

        {notifications.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Your Notifications</h4>
            {notifications.map((notification) => (
              <div key={notification.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{notification.title}</span>
                    {notification.is_active ? (
                      <Eye className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(notification.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={notification.is_active}
                      onCheckedChange={() => handleToggleActive(notification.id, notification.is_active)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {notification.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(notification.id)}
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