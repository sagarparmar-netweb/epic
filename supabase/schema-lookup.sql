-- Patient Lookup Feature - Additional Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- Lookup Requests (batch uploads from clients)
-- ============================================
CREATE TABLE IF NOT EXISTS lookup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_site_id UUID NOT NULL REFERENCES hospital_sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  total_patients INTEGER DEFAULT 0,
  matched_patients INTEGER DEFAULT 0,
  failed_patients INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- ============================================
-- Lookup Patients (individual patient search requests)
-- ============================================
CREATE TABLE IF NOT EXISTS lookup_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_request_id UUID NOT NULL REFERENCES lookup_requests(id) ON DELETE CASCADE,
  -- Input demographics from client
  input_name_first TEXT,
  input_name_last TEXT NOT NULL,
  input_dob DATE,
  input_address_line TEXT,
  input_address_city TEXT,
  input_address_state TEXT,
  input_address_zip TEXT,
  input_date_of_service DATE,
  input_mrn TEXT,
  input_ssn_last4 TEXT,
  -- Match results
  status TEXT NOT NULL DEFAULT 'pending', -- pending, searching, matched, not_found, multiple_matches, error
  matched_patient_id UUID REFERENCES patient_records(id),
  match_confidence DECIMAL(5, 2), -- 0-100 percentage
  match_details JSONB, -- Details about what matched
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_lookup_requests_site ON lookup_requests(hospital_site_id);
CREATE INDEX IF NOT EXISTS idx_lookup_requests_status ON lookup_requests(status);
CREATE INDEX IF NOT EXISTS idx_lookup_patients_request ON lookup_patients(lookup_request_id);
CREATE INDEX IF NOT EXISTS idx_lookup_patients_status ON lookup_patients(status);
