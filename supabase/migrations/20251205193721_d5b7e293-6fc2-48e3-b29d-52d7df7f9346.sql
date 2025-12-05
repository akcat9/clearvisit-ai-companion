-- Create medical_history table
CREATE TABLE public.medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- User-editable fields
  current_medications JSONB DEFAULT '[]'::jsonb,
  allergies JSONB DEFAULT '[]'::jsonb,
  chronic_conditions JSONB DEFAULT '[]'::jsonb,
  past_surgeries JSONB DEFAULT '[]'::jsonb,
  family_history TEXT,
  blood_type TEXT,
  emergency_contact JSONB,
  
  -- Auto-populated from visits
  visit_derived_data JSONB DEFAULT '{}'::jsonb,
  last_visit_sync TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own medical history"
ON public.medical_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medical history"
ON public.medical_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical history"
ON public.medical_history FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_medical_history_updated_at
BEFORE UPDATE ON public.medical_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();