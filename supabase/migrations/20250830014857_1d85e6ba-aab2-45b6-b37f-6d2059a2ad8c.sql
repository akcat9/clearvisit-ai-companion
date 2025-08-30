-- Create appointments table with proper user isolation
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  doctor_name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  reason TEXT NOT NULL,
  goal TEXT,
  symptoms TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for appointments
CREATE POLICY "Users can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments" 
ON public.appointments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create visit records table
CREATE TABLE public.visit_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  recording_url TEXT,
  transcription TEXT,
  summary JSON,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for visit records
ALTER TABLE public.visit_records ENABLE ROW LEVEL SECURITY;

-- Create policies for visit records
CREATE POLICY "Users can view their own visit records" 
ON public.visit_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own visit records" 
ON public.visit_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visit records" 
ON public.visit_records 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visit_records_updated_at
BEFORE UPDATE ON public.visit_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update shared_visits to allow users to mark as viewed
CREATE POLICY "Users can update shared visits viewed status" 
ON public.shared_visits 
FOR UPDATE 
USING (recipient_email = ( SELECT profiles.email FROM profiles WHERE profiles.user_id = auth.uid()))
WITH CHECK (recipient_email = ( SELECT profiles.email FROM profiles WHERE profiles.user_id = auth.uid()));