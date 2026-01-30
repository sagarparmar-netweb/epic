import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createFHIRClient, createResourceFetcher } from '@/lib/fhir';
import type {
    FHIRPatient,
    FHIRCoverage,
    FHIRClaim,
    FHIRCondition,
    FHIREncounter,
    FHIRProcedure,
    FHIRMedicationRequest,
    FHIRDocumentReference
} from '@/lib/fhir';
import type { HospitalSite } from '@/lib/database/types';

// POST /api/sync - Trigger a sync for a hospital site
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { site_id, patient_identifier } = body;

        if (!site_id) {
            return NextResponse.json(
                { error: 'Missing required field: site_id' },
                { status: 400 }
            );
        }

        const supabase = await createServiceClient();

        // Get the hospital site configuration
        const { data: site, error: siteError } = await supabase
            .from('hospital_sites')
            .select('*')
            .eq('id', site_id)
            .single();

        if (siteError || !site) {
            return NextResponse.json(
                { error: 'Hospital site not found' },
                { status: 404 }
            );
        }

        // Create FHIR client and resource fetcher
        const fhirClient = createFHIRClient(site as HospitalSite);
        const fetcher = createResourceFetcher(fhirClient);

        // Create sync job
        const { data: syncJob, error: jobError } = await supabase
            .from('sync_jobs')
            .insert({
                hospital_site_id: site_id,
                status: 'running',
                started_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (jobError) {
            return NextResponse.json(
                { error: 'Failed to create sync job' },
                { status: 500 }
            );
        }

        try {
            // Search for patients - if identifier provided, search by it
            let patients: FHIRPatient[] = [];

            if (patient_identifier) {
                patients = await fetcher.searchPatients({ identifier: patient_identifier });
            } else {
                // For demo, just fetch a limited set
                // In production, you'd implement pagination or bulk export
                patients = await fetcher.searchPatients({ name: 'Smith' });
            }

            let patientsSynced = 0;

            for (const patient of patients) {
                // Upsert patient record
                const patientData = transformPatient(patient, site_id);

                const { data: patientRecord, error: patientError } = await supabase
                    .from('patient_records')
                    .upsert(patientData, {
                        onConflict: 'hospital_site_id,patient_fhir_id',
                    })
                    .select()
                    .single();

                if (patientError || !patientRecord) {
                    console.error('Error upserting patient:', patientError);
                    continue;
                }

                // Fetch all records for this patient
                const records = await fetcher.getAllInsuranceRecords(patient.id);

                // Upsert coverage records
                for (const coverage of records.coverage) {
                    const coverageData = transformCoverage(coverage, patientRecord.id);
                    await supabase
                        .from('coverage_records')
                        .upsert(coverageData, {
                            onConflict: 'patient_record_id,coverage_fhir_id',
                        });
                }

                // Upsert claim records
                for (const claim of records.claims) {
                    const claimData = transformClaim(claim, patientRecord.id);
                    await supabase
                        .from('claim_records')
                        .upsert(claimData, {
                            onConflict: 'patient_record_id,claim_fhir_id',
                        });
                }

                // Upsert condition records
                for (const condition of records.conditions) {
                    const conditionData = transformCondition(condition, patientRecord.id);
                    await supabase
                        .from('condition_records')
                        .upsert(conditionData, {
                            onConflict: 'patient_record_id,condition_fhir_id',
                        });
                }

                // Upsert encounter records
                for (const encounter of records.encounters) {
                    const encounterData = transformEncounter(encounter, patientRecord.id);
                    await supabase
                        .from('encounter_records')
                        .upsert(encounterData, {
                            onConflict: 'patient_record_id,encounter_fhir_id',
                        });
                }

                // Upsert procedure records
                for (const procedure of records.procedures) {
                    const procedureData = transformProcedure(procedure, patientRecord.id);
                    await supabase
                        .from('procedure_records')
                        .upsert(procedureData, {
                            onConflict: 'patient_record_id,procedure_fhir_id',
                        });
                }

                // Upsert medication records
                for (const medication of records.medications) {
                    const medicationData = transformMedication(medication, patientRecord.id);
                    await supabase
                        .from('medication_records')
                        .upsert(medicationData, {
                            onConflict: 'patient_record_id,medication_fhir_id',
                        });
                }

                // Upsert document records
                for (const document of records.documents) {
                    const documentData = transformDocument(document, patientRecord.id);
                    await supabase
                        .from('document_records')
                        .upsert(documentData, {
                            onConflict: 'patient_record_id,document_fhir_id',
                        });
                }

                patientsSynced++;
            }

            // Update sync job as completed
            await supabase
                .from('sync_jobs')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    patients_synced: patientsSynced,
                })
                .eq('id', syncJob.id);

            // Update hospital site last sync time
            await supabase
                .from('hospital_sites')
                .update({ last_sync_at: new Date().toISOString() })
                .eq('id', site_id);

            return NextResponse.json({
                success: true,
                job_id: syncJob.id,
                patients_synced: patientsSynced,
            });

        } catch (syncError) {
            // Update sync job as failed
            await supabase
                .from('sync_jobs')
                .update({
                    status: 'failed',
                    completed_at: new Date().toISOString(),
                    error_message: syncError instanceof Error ? syncError.message : 'Unknown error',
                })
                .eq('id', syncJob.id);

            throw syncError;
        }

    } catch (error) {
        console.error('Error during sync:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Sync failed' },
            { status: 500 }
        );
    }
}

// Transform functions to convert FHIR resources to database records

function transformPatient(patient: FHIRPatient, siteId: string) {
    const name = patient.name?.[0];
    const address = patient.address?.[0];
    const phone = patient.telecom?.find(t => t.system === 'phone');
    const email = patient.telecom?.find(t => t.system === 'email');
    const mrn = patient.identifier?.find(
        i => i.type?.coding?.some(c => c.code === 'MR')
    );

    return {
        hospital_site_id: siteId,
        patient_fhir_id: patient.id,
        mrn: mrn?.value || null,
        name_family: name?.family || null,
        name_given: name?.given?.join(' ') || null,
        name_full: name?.text || `${name?.given?.join(' ')} ${name?.family}`.trim() || null,
        gender: patient.gender || null,
        birth_date: patient.birthDate || null,
        address_line: address?.line?.join(', ') || null,
        address_city: address?.city || null,
        address_state: address?.state || null,
        address_postal: address?.postalCode || null,
        phone: phone?.value || null,
        email: email?.value || null,
        raw_fhir: patient,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}

function transformCoverage(coverage: FHIRCoverage, patientRecordId: string) {
    const memberId = coverage.identifier?.find(
        i => i.system?.includes('member')
    );
    const groupClass = coverage.class?.find(
        c => c.type?.coding?.some(code => code.code === 'group')
    );

    return {
        patient_record_id: patientRecordId,
        coverage_fhir_id: coverage.id,
        status: coverage.status || null,
        payer_name: coverage.payor?.[0]?.display || null,
        plan_type: coverage.type?.coding?.[0]?.display || null,
        member_id: memberId?.value || null,
        group_number: groupClass?.value || null,
        subscriber_id: coverage.subscriber?.reference?.split('/')[1] || null,
        period_start: coverage.period?.start || null,
        period_end: coverage.period?.end || null,
        raw_fhir: coverage,
        updated_at: new Date().toISOString(),
    };
}

function transformClaim(claim: FHIRClaim, patientRecordId: string) {
    return {
        patient_record_id: patientRecordId,
        claim_fhir_id: claim.id,
        claim_type: claim.type?.coding?.[0]?.display || claim.type?.coding?.[0]?.code || null,
        status: claim.status || null,
        provider_name: claim.provider?.display || null,
        service_date: claim.created || null,
        service_period_start: claim.billablePeriod?.start || null,
        service_period_end: claim.billablePeriod?.end || null,
        total_amount: claim.total?.value || null,
        currency: claim.total?.currency || 'USD',
        diagnoses: claim.diagnosis || null,
        procedures: claim.procedure || null,
        line_items: claim.item || null,
        raw_fhir: claim,
        updated_at: new Date().toISOString(),
    };
}

function transformCondition(condition: FHIRCondition, patientRecordId: string) {
    const coding = condition.code?.coding?.[0];

    return {
        patient_record_id: patientRecordId,
        condition_fhir_id: condition.id,
        clinical_status: condition.clinicalStatus?.coding?.[0]?.code || null,
        verification_status: condition.verificationStatus?.coding?.[0]?.code || null,
        category: condition.category?.[0]?.coding?.[0]?.display || null,
        code: coding?.code || null,
        code_display: coding?.display || condition.code?.text || null,
        code_system: coding?.system || null,
        onset_date: condition.onsetDateTime || null,
        recorded_date: condition.recordedDate || null,
        raw_fhir: condition,
        updated_at: new Date().toISOString(),
    };
}

function transformEncounter(encounter: FHIREncounter, patientRecordId: string) {
    return {
        patient_record_id: patientRecordId,
        encounter_fhir_id: encounter.id,
        status: encounter.status || null,
        encounter_class: encounter.class?.display || encounter.class?.code || null,
        encounter_type: encounter.type?.[0]?.coding?.[0]?.display || null,
        period_start: encounter.period?.start || null,
        period_end: encounter.period?.end || null,
        reason: encounter.reasonCode?.[0]?.text || encounter.reasonCode?.[0]?.coding?.[0]?.display || null,
        provider_name: encounter.serviceProvider?.display || null,
        raw_fhir: encounter,
        updated_at: new Date().toISOString(),
    };
}

function transformProcedure(procedure: FHIRProcedure, patientRecordId: string) {
    const coding = procedure.code?.coding?.[0];

    return {
        patient_record_id: patientRecordId,
        procedure_fhir_id: procedure.id,
        status: procedure.status || null,
        code: coding?.code || null,
        code_display: coding?.display || procedure.code?.text || null,
        code_system: coding?.system || null,
        performed_date: procedure.performedDateTime || procedure.performedPeriod?.start || null,
        raw_fhir: procedure,
        updated_at: new Date().toISOString(),
    };
}

function transformMedication(medication: FHIRMedicationRequest, patientRecordId: string) {
    const coding = medication.medicationCodeableConcept?.coding?.[0];

    return {
        patient_record_id: patientRecordId,
        medication_fhir_id: medication.id,
        status: medication.status || null,
        intent: medication.intent || null,
        medication_name: coding?.display || medication.medicationCodeableConcept?.text || null,
        medication_code: coding?.code || null,
        authored_on: medication.authoredOn || null,
        dosage_instruction: medication.dosageInstruction?.[0]?.text || null,
        raw_fhir: medication,
        updated_at: new Date().toISOString(),
    };
}

function transformDocument(document: FHIRDocumentReference, patientRecordId: string) {
    const typeCoding = document.type?.coding?.[0];

    return {
        patient_record_id: patientRecordId,
        document_fhir_id: document.id,
        status: document.status || null,
        doc_type: typeCoding?.code || null,
        doc_type_display: typeCoding?.display || null,
        description: document.description || null,
        doc_date: document.date || null,
        content_type: document.content?.[0]?.attachment?.contentType || null,
        content_url: document.content?.[0]?.attachment?.url || null,
        raw_fhir: document,
        updated_at: new Date().toISOString(),
    };
}
