import { FHIRPatient, FHIRCoverage, FHIRClaim, FHIRCondition, FHIREncounter, FHIRProcedure, FHIRMedicationRequest, FHIRDocumentReference } from './fhir';

export function transformPatient(patient: FHIRPatient, siteId: string) {
    const name = patient.name?.[0];
    const address = patient.address?.[0];
    const phone = patient.telecom?.find(t => t.system === 'phone');
    const email = patient.telecom?.find(t => t.system === 'email');
    const mrn = patient.identifier?.find(
        i => i.type?.coding?.some(c => c.code === 'MR')
    )?.value;

    return {
        hospital_site_id: siteId,
        patient_fhir_id: patient.id,
        mrn: mrn || null,
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

export function transformCoverage(coverage: FHIRCoverage, patientRecordId: string) {
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

export function transformClaim(claim: FHIRClaim, patientRecordId: string) {
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

export function transformCondition(condition: FHIRCondition, patientRecordId: string) {
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

export function transformEncounter(encounter: FHIREncounter, patientRecordId: string) {
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

export function transformProcedure(procedure: FHIRProcedure, patientRecordId: string) {
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

export function transformMedication(medication: FHIRMedicationRequest, patientRecordId: string) {
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

export function transformDocument(document: FHIRDocumentReference, patientRecordId: string) {
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
