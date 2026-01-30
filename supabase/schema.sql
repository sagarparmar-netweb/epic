-- Epic Apple Orchard Integration - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Hospital Sites Configuration
-- ============================================
CREATE TABLE IF NOT EXISTS hospital_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fhir_base_url TEXT NOT NULL,
  token_url TEXT NOT NULL DEFAULT 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
  client_id TEXT NOT NULL,
  -- Private key should be stored encrypted in production
  private_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Patient Records
-- ============================================
CREATE TABLE IF NOT EXISTS patient_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_site_id UUID NOT NULL REFERENCES hospital_sites(id) ON DELETE CASCADE,
  patient_fhir_id TEXT NOT NULL,
  mrn TEXT,
  name_family TEXT,
  name_given TEXT,
  name_full TEXT,
  gender TEXT,
  birth_date DATE,
  address_line TEXT,
  address_city TEXT,
  address_state TEXT,
  address_postal TEXT,
  phone TEXT,
  email TEXT,
  raw_fhir JSONB NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hospital_site_id, patient_fhir_id)
);

-- ============================================
-- Insurance Coverage Records
-- ============================================
CREATE TABLE IF NOT EXISTS coverage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_record_id UUID NOT NULL REFERENCES patient_records(id) ON DELETE CASCADE,
  coverage_fhir_id TEXT NOT NULL,
  status TEXT,
  payer_name TEXT,
  plan_type TEXT,
  member_id TEXT,
  group_number TEXT,
  subscriber_id TEXT,
  period_start DATE,
  period_end DATE,
  raw_fhir JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_record_id, coverage_fhir_id)
);

-- ============================================
-- Claims / Explanation of Benefits
-- ============================================
CREATE TABLE IF NOT EXISTS claim_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_record_id UUID NOT NULL REFERENCES patient_records(id) ON DELETE CASCADE,
  claim_fhir_id TEXT NOT NULL,
  claim_type TEXT,
  status TEXT,
  provider_name TEXT,
  service_date DATE,
  service_period_start DATE,
  service_period_end DATE,
  total_amount DECIMAL(12, 2),
  currency TEXT DEFAULT 'USD',
  diagnoses JSONB,
  procedures JSONB,
  line_items JSONB,
  raw_fhir JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_record_id, claim_fhir_id)
);

-- ============================================
-- Conditions / Diagnoses
-- ============================================
CREATE TABLE IF NOT EXISTS condition_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_record_id UUID NOT NULL REFERENCES patient_records(id) ON DELETE CASCADE,
  condition_fhir_id TEXT NOT NULL,
  clinical_status TEXT,
  verification_status TEXT,
  category TEXT,
  code TEXT,
  code_display TEXT,
  code_system TEXT,
  onset_date DATE,
  recorded_date DATE,
  raw_fhir JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_record_id, condition_fhir_id)
);

-- ============================================
-- Encounters (Visits)
-- ============================================
CREATE TABLE IF NOT EXISTS encounter_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_record_id UUID NOT NULL REFERENCES patient_records(id) ON DELETE CASCADE,
  encounter_fhir_id TEXT NOT NULL,
  status TEXT,
  encounter_class TEXT,
  encounter_type TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  reason TEXT,
  provider_name TEXT,
  raw_fhir JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_record_id, encounter_fhir_id)
);

-- ============================================
-- Procedures
-- ============================================
CREATE TABLE IF NOT EXISTS procedure_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_record_id UUID NOT NULL REFERENCES patient_records(id) ON DELETE CASCADE,
  procedure_fhir_id TEXT NOT NULL,
  status TEXT,
  code TEXT,
  code_display TEXT,
  code_system TEXT,
  performed_date DATE,
  raw_fhir JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_record_id, procedure_fhir_id)
);

-- ============================================
-- Medications
-- ============================================
CREATE TABLE IF NOT EXISTS medication_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_record_id UUID NOT NULL REFERENCES patient_records(id) ON DELETE CASCADE,
  medication_fhir_id TEXT NOT NULL,
  status TEXT,
  intent TEXT,
  medication_name TEXT,
  medication_code TEXT,
  authored_on DATE,
  dosage_instruction TEXT,
  raw_fhir JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_record_id, medication_fhir_id)
);

-- ============================================
-- Documents
-- ============================================
CREATE TABLE IF NOT EXISTS document_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_record_id UUID NOT NULL REFERENCES patient_records(id) ON DELETE CASCADE,
  document_fhir_id TEXT NOT NULL,
  status TEXT,
  doc_type TEXT,
  doc_type_display TEXT,
  description TEXT,
  doc_date TIMESTAMPTZ,
  content_type TEXT,
  content_url TEXT,
  raw_fhir JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_record_id, document_fhir_id)
);

-- ============================================
-- Sync Jobs (for tracking data pull history)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_site_id UUID NOT NULL REFERENCES hospital_sites(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  patients_synced INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_patient_records_hospital ON patient_records(hospital_site_id);
CREATE INDEX IF NOT EXISTS idx_patient_records_mrn ON patient_records(mrn);
CREATE INDEX IF NOT EXISTS idx_patient_records_name ON patient_records(name_full);
CREATE INDEX IF NOT EXISTS idx_coverage_patient ON coverage_records(patient_record_id);
CREATE INDEX IF NOT EXISTS idx_claim_patient ON claim_records(patient_record_id);
CREATE INDEX IF NOT EXISTS idx_condition_patient ON condition_records(patient_record_id);
CREATE INDEX IF NOT EXISTS idx_encounter_patient ON encounter_records(patient_record_id);
CREATE INDEX IF NOT EXISTS idx_procedure_patient ON procedure_records(patient_record_id);
CREATE INDEX IF NOT EXISTS idx_medication_patient ON medication_records(patient_record_id);
CREATE INDEX IF NOT EXISTS idx_document_patient ON document_records(patient_record_id);

-- ============================================
-- Row Level Security (RLS) - Optional for multi-tenant
-- ============================================
-- Enable RLS on all tables if you want user-based access control
-- ALTER TABLE hospital_sites ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE patient_records ENABLE ROW LEVEL SECURITY;
-- etc.
