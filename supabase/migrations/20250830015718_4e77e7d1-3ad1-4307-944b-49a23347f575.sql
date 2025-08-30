-- Update shared_visits table to include appointment details
ALTER TABLE public.shared_visits 
ADD COLUMN appointment_data json,
ADD COLUMN sender_profile json;

-- Create an index for better performance on recipient_email queries
CREATE INDEX idx_shared_visits_recipient_email ON public.shared_visits(recipient_email);

-- Create an index for better performance on sender_id queries
CREATE INDEX idx_shared_visits_sender_id ON public.shared_visits(sender_id);