-- Update Schema for Global Batch Upload
-- Run this in Supabase SQL Editor

-- 1. Make hospital_site_id optional in lookup_requests
ALTER TABLE lookup_requests ALTER COLUMN hospital_site_id DROP NOT NULL;

-- 2. Add input_site_name to lookup_patients
ALTER TABLE lookup_patients ADD COLUMN IF NOT EXISTS input_site_name TEXT;
