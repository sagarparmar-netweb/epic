import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test patient data for UI testing
const TEST_PATIENTS = [
    {
        patient_fhir_id: 'test-patient-001',
        mrn: 'MRN12345',
        name_family: 'Smith',
        name_given: 'John',
        name_full: 'John Smith',
        gender: 'male',
        birth_date: '1985-03-15',
        address_line: '123 Main Street',
        address_city: 'Chicago',
        address_state: 'IL',
        address_postal: '60601',
        phone: '312-555-0101',
        email: 'john.smith@email.com',
    },
    {
        patient_fhir_id: 'test-patient-002',
        mrn: 'MRN12346',
        name_family: 'Johnson',
        name_given: 'Sarah',
        name_full: 'Sarah Johnson',
        gender: 'female',
        birth_date: '1990-07-22',
        address_line: '456 Oak Avenue',
        address_city: 'Boston',
        address_state: 'MA',
        address_postal: '02101',
        phone: '617-555-0202',
        email: 'sarah.johnson@email.com',
    },
    {
        patient_fhir_id: 'test-patient-003',
        mrn: 'MRN12347',
        name_family: 'Williams',
        name_given: 'Michael',
        name_full: 'Michael Williams',
        gender: 'male',
        birth_date: '1978-11-08',
        address_line: '789 Elm Road',
        address_city: 'Houston',
        address_state: 'TX',
        address_postal: '77001',
        phone: '713-555-0303',
        email: 'michael.williams@email.com',
    },
    {
        patient_fhir_id: 'test-patient-004',
        mrn: 'MRN12348',
        name_family: 'Brown',
        name_given: 'Emily',
        name_full: 'Emily Brown',
        gender: 'female',
        birth_date: '1995-02-14',
        address_line: '321 Pine Street',
        address_city: 'San Francisco',
        address_state: 'CA',
        address_postal: '94102',
        phone: '415-555-0404',
        email: 'emily.brown@email.com',
    },
    {
        patient_fhir_id: 'test-patient-005',
        mrn: 'MRN12349',
        name_family: 'Garcia',
        name_given: 'Carlos',
        name_full: 'Carlos Garcia',
        gender: 'male',
        birth_date: '1982-09-30',
        address_line: '654 Maple Drive',
        address_city: 'Miami',
        address_state: 'FL',
        address_postal: '33101',
        phone: '305-555-0505',
        email: 'carlos.garcia@email.com',
    },
];

// Test hospital site
const TEST_SITE = {
    id: 'test-site-001',
    name: 'Epic Sandbox Hospital (TEST)',
    fhir_base_url: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
    client_id: 'test-client',
    is_active: true,
};

// POST /api/seed - Create test data
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action } = body as { action: string };

        if (action === 'create') {
            // Create test hospital site if it doesn't exist
            const { data: existingSite } = await supabase
                .from('hospital_sites')
                .select('id')
                .eq('name', TEST_SITE.name)
                .single();

            let siteId = existingSite?.id;

            if (!siteId) {
                const { data: newSite, error: siteError } = await supabase
                    .from('hospital_sites')
                    .insert({
                        name: TEST_SITE.name,
                        fhir_base_url: TEST_SITE.fhir_base_url,
                        client_id: TEST_SITE.client_id,
                        private_key: 'test-key-base64',
                        token_url: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
                        is_active: true,
                    })
                    .select()
                    .single();

                if (siteError) throw siteError;
                siteId = newSite.id;
            }

            // Create test patients
            const patientsToInsert = TEST_PATIENTS.map(p => ({
                ...p,
                hospital_site_id: siteId,
                last_synced_at: new Date().toISOString(),
                raw_fhir: {
                    resourceType: 'Patient',
                    id: p.patient_fhir_id,
                    name: [{ family: p.name_family, given: [p.name_given] }],
                    gender: p.gender,
                    birthDate: p.birth_date,
                },
            }));

            const { data: patients, error: patientError } = await supabase
                .from('patient_records')
                .upsert(patientsToInsert, {
                    onConflict: 'hospital_site_id,patient_fhir_id',
                })
                .select();

            if (patientError) throw patientError;

            // Create a test lookup request with some patients
            const { data: lookupRequest, error: lookupError } = await supabase
                .from('lookup_requests')
                .insert({
                    hospital_site_id: siteId,
                    name: 'Test Batch - January 2026',
                    status: 'completed',
                    total_patients: 5,
                    matched_patients: 3,
                    failed_patients: 2,
                })
                .select()
                .single();

            if (lookupError) throw lookupError;

            // Create lookup patients with various statuses
            const lookupPatients = [
                {
                    lookup_request_id: lookupRequest.id,
                    input_name_first: 'John',
                    input_name_last: 'Smith',
                    input_dob: '1985-03-15',
                    input_address_city: 'Chicago',
                    input_address_state: 'IL',
                    status: 'matched',
                    matched_patient_id: patients[0]?.id,
                    match_confidence: 98.5,
                    match_details: { factors: ['Strong name match', 'DOB exact match', 'Address confirmed'] },
                },
                {
                    lookup_request_id: lookupRequest.id,
                    input_name_first: 'Sarah',
                    input_name_last: 'Johnson',
                    input_dob: '1990-07-22',
                    input_address_city: 'Boston',
                    input_address_state: 'MA',
                    status: 'matched',
                    matched_patient_id: patients[1]?.id,
                    match_confidence: 95.0,
                    match_details: { factors: ['Strong name match', 'DOB exact match'] },
                },
                {
                    lookup_request_id: lookupRequest.id,
                    input_name_first: 'Michael',
                    input_name_last: 'Williams',
                    input_dob: '1978-11-08',
                    status: 'matched',
                    matched_patient_id: patients[2]?.id,
                    match_confidence: 92.0,
                    match_details: { factors: ['Strong name match', 'DOB exact match'] },
                },
                {
                    lookup_request_id: lookupRequest.id,
                    input_name_first: 'Robert',
                    input_name_last: 'Davis',
                    input_dob: '1970-05-20',
                    input_address_city: 'Phoenix',
                    input_address_state: 'AZ',
                    status: 'not_found',
                    match_details: { message: 'No patients found matching the provided criteria' },
                },
                {
                    lookup_request_id: lookupRequest.id,
                    input_name_first: 'Jennifer',
                    input_name_last: 'Miller',
                    input_dob: '1988-12-01',
                    status: 'multiple_matches',
                    match_confidence: 75.0,
                    match_details: {
                        candidatesCount: 3,
                        candidates: [
                            { name: 'Jennifer Miller', confidence: 75, factors: ['Good name match'] },
                            { name: 'Jennifer A. Miller', confidence: 68, factors: ['Partial name match'] },
                            { name: 'J. Miller', confidence: 55, factors: ['Partial name match'] },
                        ],
                    },
                },
            ];

            await supabase.from('lookup_patients').insert(lookupPatients);

            return NextResponse.json({
                success: true,
                message: 'Test data created successfully',
                data: {
                    site_id: siteId,
                    patients_created: patients.length,
                    lookup_request_id: lookupRequest.id,
                },
            });
        }

        if (action === 'delete') {
            // Delete test data
            await supabase
                .from('hospital_sites')
                .delete()
                .eq('name', TEST_SITE.name);

            return NextResponse.json({
                success: true,
                message: 'Test data deleted successfully',
            });
        }

        return NextResponse.json({ error: 'Invalid action. Use "create" or "delete"' }, { status: 400 });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to seed data' },
            { status: 500 }
        );
    }
}

// GET /api/seed - Get info about test data
export async function GET() {
    return NextResponse.json({
        message: 'Test data API',
        usage: 'POST with { "action": "create" } or { "action": "delete" }',
        test_patients: TEST_PATIENTS.map(p => ({
            name: p.name_full,
            dob: p.birth_date,
            city: p.address_city,
            mrn: p.mrn,
        })),
    });
}
