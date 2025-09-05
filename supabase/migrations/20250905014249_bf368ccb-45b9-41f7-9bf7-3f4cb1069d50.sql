-- Add AI-generated medical history to profiles table
ALTER TABLE public.profiles 
ADD COLUMN ai_generated_history JSONB DEFAULT '[]'::jsonb;

-- Add index for better performance on AI history queries
CREATE INDEX idx_profiles_ai_history ON public.profiles USING GIN(ai_generated_history);

-- Update the update_updated_at trigger to work with profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();