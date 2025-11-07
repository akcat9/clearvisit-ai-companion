-- Add education_content column to appointments table to cache generated content
ALTER TABLE appointments
ADD COLUMN education_content jsonb;