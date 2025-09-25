-- Create table to track when users last viewed announcements
CREATE TABLE public.user_announcement_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_announcement_views ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own view records
CREATE POLICY "Users can view their own announcement views" 
ON public.user_announcement_views 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own announcement views" 
ON public.user_announcement_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own announcement views" 
ON public.user_announcement_views 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_announcement_views_updated_at
BEFORE UPDATE ON public.user_announcement_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();