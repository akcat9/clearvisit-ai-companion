-- Add language preference column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add check constraint for supported languages
ALTER TABLE public.profiles ADD CONSTRAINT valid_language CHECK (language IN ('en', 'es', 'ar'));