-- Add unique constraint on appointment_id in visit_records table
-- This allows for proper upsert operations where one visit record per appointment
ALTER TABLE public.visit_records 
ADD CONSTRAINT visit_records_appointment_id_unique UNIQUE (appointment_id);