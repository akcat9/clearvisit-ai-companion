-- Create app_notifications table for admin announcements
CREATE TABLE public.app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active notifications
CREATE POLICY "Anyone can view active notifications" 
ON public.app_notifications 
FOR SELECT 
USING (is_active = true);

-- Only authenticated users can create notifications (we'll add admin check later)
CREATE POLICY "Authenticated users can create notifications" 
ON public.app_notifications 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Only creators can update their notifications
CREATE POLICY "Users can update their own notifications" 
ON public.app_notifications 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Only creators can delete their notifications
CREATE POLICY "Users can delete their own notifications" 
ON public.app_notifications 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_app_notifications_updated_at
BEFORE UPDATE ON public.app_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();