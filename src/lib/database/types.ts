// Database type definitions matching Supabase schema

export interface HospitalSite {
    id: string;
    name: string;
    fhir_base_url: string;
    token_url: string;
    client_id: string;
    private_key: string;
    is_active: boolean;
    last_sync_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface PatientRecord {
    id: string;
    hospital_site_id: string;
    patient_fhir_id: string;
    mrn: string | null;
    name_family: string | null;
    name_given: string | null;
    name_full: string | null;
    gender: string | null;
    birth_date: string | null;
    address_line: string | null;
    address_city: string | null;
    address_state: string | null;
    address_postal: string | null;
    phone: string | null;
    email: string | null;
    raw_fhir: unknown;
    last_synced_at: string;
    created_at: string;
    updated_at: string;
}

export interface CoverageRecord {
    id: string;
    patient_record_id: string;
    coverage_fhir_id: string;
    status: string | null;
    payer_name: string | null;
    plan_type: string | null;
    member_id: string | null;
    group_number: string | null;
    subscriber_id: string | null;
    period_start: string | null;
    period_end: string | null;
    raw_fhir: unknown;
    created_at: string;
    updated_at: string;
}

export interface ClaimRecord {
    id: string;
    patient_record_id: string;
    claim_fhir_id: string;
    claim_type: string | null;
    status: string | null;
    provider_name: string | null;
    service_date: string | null;
    service_period_start: string | null;
    service_period_end: string | null;
    total_amount: number | null;
    currency: string;
    diagnoses: unknown;
    procedures: unknown;
    line_items: unknown;
    raw_fhir: unknown;
    created_at: string;
    updated_at: string;
}

export interface ConditionRecord {
    id: string;
    patient_record_id: string;
    condition_fhir_id: string;
    clinical_status: string | null;
    verification_status: string | null;
    category: string | null;
    code: string | null;
    code_display: string | null;
    code_system: string | null;
    onset_date: string | null;
    recorded_date: string | null;
    raw_fhir: unknown;
    created_at: string;
    updated_at: string;
}

export interface EncounterRecord {
    id: string;
    patient_record_id: string;
    encounter_fhir_id: string;
    status: string | null;
    encounter_class: string | null;
    encounter_type: string | null;
    period_start: string | null;
    period_end: string | null;
    reason: string | null;
    provider_name: string | null;
    raw_fhir: unknown;
    created_at: string;
    updated_at: string;
}

export interface ProcedureRecord {
    id: string;
    patient_record_id: string;
    procedure_fhir_id: string;
    status: string | null;
    code: string | null;
    code_display: string | null;
    code_system: string | null;
    performed_date: string | null;
    raw_fhir: unknown;
    created_at: string;
    updated_at: string;
}

export interface MedicationRecord {
    id: string;
    patient_record_id: string;
    medication_fhir_id: string;
    status: string | null;
    intent: string | null;
    medication_name: string | null;
    medication_code: string | null;
    authored_on: string | null;
    dosage_instruction: string | null;
    raw_fhir: unknown;
    created_at: string;
    updated_at: string;
}

export interface DocumentRecord {
    id: string;
    patient_record_id: string;
    document_fhir_id: string;
    status: string | null;
    doc_type: string | null;
    doc_type_display: string | null;
    description: string | null;
    doc_date: string | null;
    content_type: string | null;
    content_url: string | null;
    raw_fhir: unknown;
    created_at: string;
    updated_at: string;
}

export interface SyncJob {
    id: string;
    hospital_site_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    started_at: string | null;
    completed_at: string | null;
    patients_synced: number;
    error_message: string | null;
    created_at: string;
}

// Extended types with relations
export interface PatientRecordWithCoverage extends PatientRecord {
    coverage_records?: CoverageRecord[];
    hospital_site?: HospitalSite;
}

export interface PatientRecordFull extends PatientRecord {
    hospital_site?: HospitalSite;
    coverage_records?: CoverageRecord[];
    claim_records?: ClaimRecord[];
    condition_records?: ConditionRecord[];
    encounter_records?: EncounterRecord[];
    procedure_records?: ProcedureRecord[];
    medication_records?: MedicationRecord[];
    document_records?: DocumentRecord[];
}
