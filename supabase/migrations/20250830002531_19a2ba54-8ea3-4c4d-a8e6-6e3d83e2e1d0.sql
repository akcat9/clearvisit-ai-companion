-- Create a table for shared visit summaries
CREATE TABLE public.shared_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  visit_summary JSON NOT NULL,
  message TEXT,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  viewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.shared_visits ENABLE ROW LEVEL SECURITY;

-- Create policies for shared visits
CREATE POLICY "Users can view visits shared with them" 
ON public.shared_visits 
FOR SELECT 
USING (
  recipient_email = (
    SELECT email FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view visits they shared" 
ON public.shared_visits 
FOR SELECT 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can create shared visits" 
ON public.shared_visits 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);