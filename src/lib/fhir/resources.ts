import { EpicFHIRClient } from './client';

// FHIR Resource Types (simplified for our use case)
export interface FHIRPatient {
    resourceType: 'Patient';
    id: string;
    identifier?: Array<{
        system?: string;
        value?: string;
        type?: { coding?: Array<{ code?: string }> };
    }>;
    name?: Array<{
        use?: string;
        family?: string;
        given?: string[];
        text?: string;
    }>;
    gender?: string;
    birthDate?: string;
    address?: Array<{
        use?: string;
        line?: string[];
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
    }>;
    telecom?: Array<{
        system?: string;
        value?: string;
        use?: string;
    }>;
}

export interface FHIRCoverage {
    resourceType: 'Coverage';
    id: string;
    status?: string;
    type?: {
        coding?: Array<{ code?: string; display?: string }>;
    };
    subscriber?: { reference?: string };
    beneficiary?: { reference?: string };
    payor?: Array<{
        reference?: string;
        display?: string;
    }>;
    class?: Array<{
        type?: { coding?: Array<{ code?: string }> };
        value?: string;
        name?: string;
    }>;
    period?: {
        start?: string;
        end?: string;
    };
    identifier?: Array<{
        system?: string;
        value?: string;
    }>;
}

export interface FHIRClaim {
    resourceType: 'Claim' | 'ExplanationOfBenefit';
    id: string;
    status?: string;
    type?: {
        coding?: Array<{ code?: string; display?: string }>;
    };
    patient?: { reference?: string };
    provider?: { reference?: string; display?: string };
    created?: string;
    billablePeriod?: {
        start?: string;
        end?: string;
    };
    total?: {
        value?: number;
        currency?: string;
    };
    diagnosis?: Array<{
        sequence?: number;
        diagnosisCodeableConcept?: {
            coding?: Array<{ system?: string; code?: string; display?: string }>;
        };
    }>;
    procedure?: Array<{
        sequence?: number;
        procedureCodeableConcept?: {
            coding?: Array<{ system?: string; code?: string; display?: string }>;
        };
    }>;
    item?: Array<{
        sequence?: number;
        productOrService?: {
            coding?: Array<{ code?: string; display?: string }>;
        };
        servicedDate?: string;
        quantity?: { value?: number };
        unitPrice?: { value?: number };
        net?: { value?: number };
    }>;
}

export interface FHIRCondition {
    resourceType: 'Condition';
    id: string;
    clinicalStatus?: {
        coding?: Array<{ code?: string }>;
    };
    verificationStatus?: {
        coding?: Array<{ code?: string }>;
    };
    category?: Array<{
        coding?: Array<{ code?: string; display?: string }>;
    }>;
    code?: {
        coding?: Array<{ system?: string; code?: string; display?: string }>;
        text?: string;
    };
    subject?: { reference?: string };
    onsetDateTime?: string;
    recordedDate?: string;
}

export interface FHIRDocumentReference {
    resourceType: 'DocumentReference';
    id: string;
    status?: string;
    type?: {
        coding?: Array<{ system?: string; code?: string; display?: string }>;
    };
    subject?: { reference?: string };
    date?: string;
    description?: string;
    content?: Array<{
        attachment?: {
            contentType?: string;
            url?: string;
            title?: string;
        };
    }>;
}

export interface FHIREncounter {
    resourceType: 'Encounter';
    id: string;
    status?: string;
    class?: {
        code?: string;
        display?: string;
    };
    type?: Array<{
        coding?: Array<{ code?: string; display?: string }>;
    }>;
    subject?: { reference?: string };
    period?: {
        start?: string;
        end?: string;
    };
    reasonCode?: Array<{
        coding?: Array<{ code?: string; display?: string }>;
        text?: string;
    }>;
    serviceProvider?: { reference?: string; display?: string };
}

export interface FHIRProcedure {
    resourceType: 'Procedure';
    id: string;
    status?: string;
    code?: {
        coding?: Array<{ system?: string; code?: string; display?: string }>;
        text?: string;
    };
    subject?: { reference?: string };
    performedDateTime?: string;
    performedPeriod?: {
        start?: string;
        end?: string;
    };
}

export interface FHIRMedicationRequest {
    resourceType: 'MedicationRequest';
    id: string;
    status?: string;
    intent?: string;
    medicationCodeableConcept?: {
        coding?: Array<{ system?: string; code?: string; display?: string }>;
        text?: string;
    };
    subject?: { reference?: string };
    authoredOn?: string;
    dosageInstruction?: Array<{
        text?: string;
    }>;
}

export interface FHIRAllergyIntolerance {
    resourceType: 'AllergyIntolerance';
    id: string;
    clinicalStatus?: {
        coding?: Array<{ code?: string }>;
    };
    verificationStatus?: {
        coding?: Array<{ code?: string }>;
    };
    type?: string;
    category?: string[];
    criticality?: string;
    code?: {
        coding?: Array<{ system?: string; code?: string; display?: string }>;
        text?: string;
    };
    patient?: { reference?: string };
    onsetDateTime?: string;
    recordedDate?: string;
    reaction?: Array<{
        manifestation?: Array<{
            coding?: Array<{ code?: string; display?: string }>;
        }>;
        severity?: string;
    }>;
}

export interface FHIRObservation {
    resourceType: 'Observation';
    id: string;
    status?: string;
    category?: Array<{
        coding?: Array<{ code?: string; display?: string }>;
    }>;
    code?: {
        coding?: Array<{ system?: string; code?: string; display?: string }>;
        text?: string;
    };
    subject?: { reference?: string };
    effectiveDateTime?: string;
    valueQuantity?: {
        value?: number;
        unit?: string;
        system?: string;
        code?: string;
    };
    valueString?: string;
    interpretation?: Array<{
        coding?: Array<{ code?: string; display?: string }>;
    }>;
}

export interface FHIRImmunization {
    resourceType: 'Immunization';
    id: string;
    status?: string;
    vaccineCode?: {
        coding?: Array<{ system?: string; code?: string; display?: string }>;
        text?: string;
    };
    patient?: { reference?: string };
    occurrenceDateTime?: string;
    primarySource?: boolean;
    lotNumber?: string;
    site?: {
        coding?: Array<{ code?: string; display?: string }>;
    };
}

export interface FHIRDiagnosticReport {
    resourceType: 'DiagnosticReport';
    id: string;
    status?: string;
    category?: Array<{
        coding?: Array<{ code?: string; display?: string }>;
    }>;
    code?: {
        coding?: Array<{ system?: string; code?: string; display?: string }>;
        text?: string;
    };
    subject?: { reference?: string };
    effectiveDateTime?: string;
    issued?: string;
    result?: Array<{ reference?: string }>;
    conclusion?: string;
    presentedForm?: Array<{
        contentType?: string;
        url?: string;
        title?: string;
    }>;
}

export interface FHIRCarePlan {
    resourceType: 'CarePlan';
    id: string;
    status?: string;
    intent?: string;
    category?: Array<{
        coding?: Array<{ code?: string; display?: string }>;
    }>;
    subject?: { reference?: string };
    period?: {
        start?: string;
        end?: string;
    };
    activity?: Array<{
        detail?: {
            status?: string;
            code?: {
                coding?: Array<{ code?: string; display?: string }>;
            };
            description?: string;
        };
    }>;
}

export interface FHIRAppointment {
    resourceType: 'Appointment';
    id: string;
    status?: string;
    serviceType?: Array<{
        coding?: Array<{ code?: string; display?: string }>;
    }>;
    reasonCode?: Array<{
        coding?: Array<{ code?: string; display?: string }>;
        text?: string;
    }>;
    start?: string;
    end?: string;
    participant?: Array<{
        actor?: { reference?: string; display?: string };
        status?: string;
    }>;
}

export interface FHIRBundle<T = unknown> {
    resourceType: 'Bundle';
    type: string;
    total?: number;
    link?: Array<{ relation: string; url: string }>;
    entry?: Array<{ resource: T }>;
}

/**
 * Resource fetchers for Epic FHIR API
 */
export class FHIRResourceFetcher {
    private client: EpicFHIRClient;

    constructor(client: EpicFHIRClient) {
        this.client = client;
    }

    // ============== Patient ==============

    async searchPatients(params: {
        name?: string;
        identifier?: string;
        birthdate?: string;
    }): Promise<FHIRPatient[]> {
        const searchParams: Record<string, string> = {};

        if (params.name) searchParams.name = params.name;
        if (params.identifier) searchParams.identifier = params.identifier;
        if (params.birthdate) searchParams.birthdate = params.birthdate;

        return this.client.searchAll<FHIRPatient>({
            resourceType: 'Patient',
            searchParams,
        });
    }

    async getPatient(patientId: string): Promise<FHIRPatient> {
        return this.client.read<FHIRPatient>({
            resourceType: 'Patient',
            id: patientId,
        });
    }

    // ============== Coverage (Insurance) ==============

    async getPatientCoverage(patientId: string): Promise<FHIRCoverage[]> {
        return this.client.searchAll<FHIRCoverage>({
            resourceType: 'Coverage',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== Claims / EOB ==============

    async getPatientClaims(patientId: string): Promise<FHIRClaim[]> {
        return this.client.searchAll<FHIRClaim>({
            resourceType: 'ExplanationOfBenefit',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== Conditions ==============

    async getPatientConditions(patientId: string): Promise<FHIRCondition[]> {
        return this.client.searchAll<FHIRCondition>({
            resourceType: 'Condition',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== Encounters ==============

    async getPatientEncounters(patientId: string): Promise<FHIREncounter[]> {
        return this.client.searchAll<FHIREncounter>({
            resourceType: 'Encounter',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== Procedures ==============

    async getPatientProcedures(patientId: string): Promise<FHIRProcedure[]> {
        return this.client.searchAll<FHIRProcedure>({
            resourceType: 'Procedure',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== Documents ==============

    async getPatientDocuments(patientId: string): Promise<FHIRDocumentReference[]> {
        return this.client.searchAll<FHIRDocumentReference>({
            resourceType: 'DocumentReference',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== Medications ==============

    async getPatientMedications(patientId: string): Promise<FHIRMedicationRequest[]> {
        return this.client.searchAll<FHIRMedicationRequest>({
            resourceType: 'MedicationRequest',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== Allergies ==============

    async getPatientAllergies(patientId: string): Promise<FHIRAllergyIntolerance[]> {
        return this.client.searchAll<FHIRAllergyIntolerance>({
            resourceType: 'AllergyIntolerance',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== Observations (Vitals, Labs) ==============

    async getPatientObservations(patientId: string, category?: string): Promise<FHIRObservation[]> {
        const searchParams: Record<string, string> = { patient: patientId };
        if (category) searchParams.category = category;

        return this.client.searchAll<FHIRObservation>({
            resourceType: 'Observation',
            searchParams,
        });
    }

    async getPatientVitals(patientId: string): Promise<FHIRObservation[]> {
        return this.getPatientObservations(patientId, 'vital-signs');
    }

    async getPatientLabResults(patientId: string): Promise<FHIRObservation[]> {
        return this.getPatientObservations(patientId, 'laboratory');
    }

    // ============== Immunizations ==============

    async getPatientImmunizations(patientId: string): Promise<FHIRImmunization[]> {
        return this.client.searchAll<FHIRImmunization>({
            resourceType: 'Immunization',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== Diagnostic Reports ==============

    async getPatientDiagnosticReports(patientId: string): Promise<FHIRDiagnosticReport[]> {
        return this.client.searchAll<FHIRDiagnosticReport>({
            resourceType: 'DiagnosticReport',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== Care Plans ==============

    async getPatientCarePlans(patientId: string): Promise<FHIRCarePlan[]> {
        return this.client.searchAll<FHIRCarePlan>({
            resourceType: 'CarePlan',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== Appointments ==============

    async getPatientAppointments(patientId: string): Promise<FHIRAppointment[]> {
        return this.client.searchAll<FHIRAppointment>({
            resourceType: 'Appointment',
            searchParams: {
                patient: patientId,
            },
        });
    }

    // ============== All Records for Insurance ==============

    /**
     * Fetch all insurance-relevant records for a patient with graceful error handling
     */
    async getAllInsuranceRecords(patientId: string): Promise<{
        patient: FHIRPatient;
        coverage: FHIRCoverage[];
        claims: FHIRClaim[];
        conditions: FHIRCondition[];
        encounters: FHIREncounter[];
        procedures: FHIRProcedure[];
        documents: FHIRDocumentReference[];
        medications: FHIRMedicationRequest[];
        allergies: FHIRAllergyIntolerance[];
        vitals: FHIRObservation[];
        labResults: FHIRObservation[];
        immunizations: FHIRImmunization[];
        diagnosticReports: FHIRDiagnosticReport[];
        carePlans: FHIRCarePlan[];
        appointments: FHIRAppointment[];
    }> {
        const safeFetch = async <T>(fn: () => Promise<T[]>, name: string): Promise<T[]> => {
            try {
                return await fn();
            } catch (err: any) {
                console.warn(`Gracefully skipped ${name} fetch:`, err.message);
                return [];
            }
        };

        const patient = await this.getPatient(patientId);

        const [
            coverage,
            claims,
            conditions,
            encounters,
            procedures,
            documents,
            medications,
            allergies,
            vitals,
            labResults,
            immunizations,
            diagnosticReports,
            carePlans,
            appointments,
        ] = await Promise.all([
            safeFetch(() => this.getPatientCoverage(patientId), 'Coverage'),
            safeFetch(() => this.getPatientClaims(patientId), 'Claims'),
            safeFetch(() => this.getPatientConditions(patientId), 'Conditions'),
            safeFetch(() => this.getPatientEncounters(patientId), 'Encounters'),
            safeFetch(() => this.getPatientProcedures(patientId), 'Procedures'),
            safeFetch(() => this.getPatientDocuments(patientId), 'Documents'),
            safeFetch(() => this.getPatientMedications(patientId), 'Medications'),
            safeFetch(() => this.getPatientAllergies(patientId), 'Allergies'),
            safeFetch(() => this.getPatientVitals(patientId), 'Vitals'),
            safeFetch(() => this.getPatientLabResults(patientId), 'Labs'),
            safeFetch(() => this.getPatientImmunizations(patientId), 'Immunizations'),
            safeFetch(() => this.getPatientDiagnosticReports(patientId), 'DiagnosticReports'),
            safeFetch(() => this.getPatientCarePlans(patientId), 'CarePlans'),
            safeFetch(() => this.getPatientAppointments(patientId), 'Appointments'),
        ]);

        return {
            patient,
            coverage,
            claims,
            conditions,
            encounters,
            procedures,
            documents,
            medications,
            allergies,
            vitals,
            labResults,
            immunizations,
            diagnosticReports,
            carePlans,
            appointments,
        };
    }
}

/**
 * Create a resource fetcher for a FHIR client
 */
export function createResourceFetcher(client: EpicFHIRClient): FHIRResourceFetcher {
    return new FHIRResourceFetcher(client);
}
