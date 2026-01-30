import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createFHIRClient, HospitalSite } from '@/lib/fhir/client';
import { createResourceFetcher } from '@/lib/fhir/resources';
import { transformEncounter, transformDocument } from '@/lib/transformers';
import {
    calculateMatchConfidence,
    rankMatches,
    isDefinitiveMatch,
    PatientInput,
    FHIRPatientData,
    MatchResult
} from '@/lib/matching/patient-matcher';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LookupPatient {
    id: string;
    input_name_first: string | null;
    input_name_last: string;
    input_dob: string | null;
    input_address_line: string | null;
    input_address_city: string | null;
    input_address_state: string | null;
    input_address_zip: string | null;
    input_date_of_service: string | null;
    input_mrn: string | null;
}

interface FHIRBundle {
    resourceType: 'Bundle';
    entry?: Array<{ resource: FHIRPatientData }>;
    total?: number;
}

// Minimum confidence threshold for automatic matching
const MIN_AUTO_MATCH_CONFIDENCE = 85;
const MIN_REVIEW_CONFIDENCE = 50;

// POST /api/lookup/process - Process a lookup request with robust matching
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lookup_request_id } = body as { lookup_request_id: string };

        if (!lookup_request_id) {
            return NextResponse.json(
                { error: 'lookup_request_id is required' },
                { status: 400 }
            );
        }

        // Get the lookup request with site info (hospital_site could be null now)
        const { data: lookupRequest, error: reqError } = await supabase
            .from('lookup_requests')
            .select(`
        *,
        hospital_site:hospital_sites(*)
      `)
            .eq('id', lookup_request_id)
            .single();

        if (reqError || !lookupRequest) {
            return NextResponse.json({ error: 'Lookup request not found' }, { status: 404 });
        }

        // Update status to processing
        await supabase
            .from('lookup_requests')
            .update({ status: 'processing' })
            .eq('id', lookup_request_id);

        // Get pending patients
        const { data: patients, error: patientsError } = await supabase
            .from('lookup_patients')
            .select('*')
            .eq('lookup_request_id', lookup_request_id)
            .eq('status', 'pending')
            .limit(50); // Process in smaller batches for reliability

        if (patientsError) throw patientsError;

        if (!patients || patients.length === 0) {
            return NextResponse.json({ message: 'No pending patients to process' });
        }

        // --- SITE RESOLUTION STRATEGY ---
        let defaultSite: HospitalSite | null = lookupRequest.hospital_site as HospitalSite | null;
        const siteCache = new Map<string, HospitalSite>();

        // If this is a Global Request (no default site), preload all sites for efficient lookup
        if (!defaultSite) {
            const { data: allSites } = await supabase
                .from('hospital_sites')
                .select('*');

            if (allSites) {
                for (const s of allSites) {
                    siteCache.set(s.name.toLowerCase().trim(), s as HospitalSite);
                    siteCache.set(s.id, s as HospitalSite); // Cache by ID too just in case
                }
            }
        }

        const results = {
            processed: 0,
            matched: 0,
            needsReview: 0,
            notFound: 0,
            errors: 0,
        };

        // Process each patient
        for (const patient of patients as any[]) { // Typed as any to handle new column input_site_name
            try {
                // Determine Site
                let site = defaultSite;
                if (!site && patient.input_site_name) {
                    site = siteCache.get(patient.input_site_name.toLowerCase().trim()) || null;
                }

                if (!site) {
                    throw new Error(`Target hospital site not found. Input: "${patient.input_site_name || 'None'}"`);
                }

                await supabase
                    .from('lookup_patients')
                    .update({ status: 'searching' })
                    .eq('id', patient.id);

                // Create FHIR Client for this specific site
                const fhirClient = createFHIRClient(site);
                const patientInput: PatientInput = {
                    name_first: patient.input_name_first || undefined,
                    name_last: patient.input_name_last,
                    dob: patient.input_dob || undefined,
                    address_line: patient.input_address_line || undefined,
                    address_city: patient.input_address_city || undefined,
                    address_state: patient.input_address_state || undefined,
                    address_zip: patient.input_address_zip || undefined,
                    mrn: patient.input_mrn || undefined,
                };

                // Multi-pass search strategy for best results
                const allMatches = await searchEpicPatient(fhirClient, patientInput);

                if (allMatches.length === 0) {
                    // No matches found
                    await updatePatientStatus(patient.id, 'not_found', null, {
                        searchStrategies: getSearchStrategiesUsed(patientInput),
                        message: 'No patients found matching the provided criteria',
                    });
                    results.notFound++;
                } else {
                    // Calculate confidence for all matches
                    const matchResults: MatchResult[] = allMatches.map(fhirPatient =>
                        calculateMatchConfidence(patientInput, fhirPatient)
                    );

                    // Rank and filter matches
                    const rankedMatches = rankMatches(matchResults, MIN_REVIEW_CONFIDENCE);

                    if (rankedMatches.length === 0) {
                        // Matches found but none meet minimum confidence
                        await updatePatientStatus(patient.id, 'not_found', null, {
                            candidatesFound: allMatches.length,
                            message: 'Candidates found but none met confidence threshold',
                            topCandidate: matchResults[0]?.matchDetails,
                        });
                        results.notFound++;
                    } else if (isDefinitiveMatch(rankedMatches) && rankedMatches[0].confidence >= MIN_AUTO_MATCH_CONFIDENCE) {
                        // Single high-confidence match - auto-match
                        const bestMatch = rankedMatches[0];
                        const savedPatient = await savePatientRecord(site.id, bestMatch.fhirPatient);

                        // --- FETCH DATA FOR MATCHED PATIENT ---
                        try {
                            const fetcher = createResourceFetcher(fhirClient); // Create for this site

                            // 1. Fetch Encounters
                            const encounters = await fetcher.getPatientEncounters(bestMatch.fhirPatient.id);
                            for (const enc of encounters) {
                                const encData = transformEncounter(enc, savedPatient.id);
                                await supabase
                                    .from('encounter_records')
                                    .upsert(encData, { onConflict: 'patient_record_id,encounter_fhir_id' });
                            }

                            // 2. Fetch Documents
                            const documents = await fetcher.getPatientDocuments(bestMatch.fhirPatient.id);
                            for (const doc of documents) {
                                const docData = transformDocument(doc, savedPatient.id);
                                await supabase
                                    .from('document_records')
                                    .upsert(docData, { onConflict: 'patient_record_id,document_fhir_id' });
                            }

                            console.log(`Downloaded ${encounters.length} encounters and ${documents.length} documents for ${savedPatient.id}`);

                        } catch (fetchErr) {
                            console.error('Error fetching patient data after match:', fetchErr);
                            // We don't fail the match, but we log the error
                        }
                        // --------------------------------------

                        await updatePatientStatus(patient.id, 'matched', savedPatient.id, {
                            confidence: bestMatch.confidence,
                            factors: bestMatch.matchDetails.factors,
                            fhir_id: bestMatch.fhirPatient.id,
                        }, bestMatch.confidence);
                        results.matched++;
                    } else {
                        // Multiple matches or low confidence - needs review
                        const status = rankedMatches.length > 1 ? 'multiple_matches' : 'needs_review';

                        await updatePatientStatus(patient.id, status, null, {
                            candidatesCount: rankedMatches.length,
                            candidates: rankedMatches.slice(0, 5).map(m => ({
                                fhir_id: m.fhirPatient.id,
                                name: extractName(m.fhirPatient),
                                birthDate: m.fhirPatient.birthDate,
                                confidence: m.confidence,
                                factors: m.matchDetails.factors,
                            })),
                            topConfidence: rankedMatches[0].confidence,
                        });
                        results.needsReview++;
                    }
                }

                results.processed++;
            } catch (error) {
                console.error(`Error processing patient ${patient.id}:`, error);
                await updatePatientStatus(patient.id, 'error', null, {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                results.errors++;
                results.processed++;
            }
        }

        // Update lookup request counts
        await updateLookupRequestCounts(lookup_request_id);

        return NextResponse.json({
            success: true,
            ...results,
        });
    } catch (error) {
        console.error('Lookup processing error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process lookup' },
            { status: 500 }
        );
    }
}

/**
 * Multi-pass search strategy to find patients in Epic
 * Uses progressively broader searches to maximize match chances
 */
async function searchEpicPatient(
    fhirClient: ReturnType<typeof createFHIRClient>,
    input: PatientInput
): Promise<FHIRPatientData[]> {
    const allResults: Map<string, FHIRPatientData> = new Map();

    // Strategy 1: Exact search with all available criteria
    if (input.mrn) {
        try {
            const mrnResults = await fhirClient.search<FHIRBundle>({
                resourceType: 'Patient',
                searchParams: { identifier: input.mrn },
            });
            addToResults(allResults, mrnResults);
        } catch (e) {
            console.log('MRN search failed:', e);
        }
    }

    // Strategy 2: Name + DOB (most reliable combo)
    if (input.dob) {
        try {
            const params: Record<string, string> = {
                family: input.name_last,
                birthdate: input.dob,
            };
            if (input.name_first) {
                params.given = input.name_first;
            }
            const dobResults = await fhirClient.search<FHIRBundle>({
                resourceType: 'Patient',
                searchParams: params,
            });
            addToResults(allResults, dobResults);
        } catch (e) {
            console.log('Name+DOB search failed:', e);
        }
    }

    // Strategy 3: Name only (broader search)
    try {
        const params: Record<string, string> = {
            family: input.name_last,
        };
        if (input.name_first) {
            params.given = input.name_first;
        }
        const nameResults = await fhirClient.search<FHIRBundle>({
            resourceType: 'Patient',
            searchParams: params,
        });
        addToResults(allResults, nameResults);
    } catch (e) {
        console.log('Name search failed:', e);
    }

    // Strategy 4: Last name with phonetic/fuzzy matching (if supported)
    try {
        const phoneticResults = await fhirClient.search<FHIRBundle>({
            resourceType: 'Patient',
            searchParams: {
                'family:contains': input.name_last.substring(0, 4), // First 4 chars
            },
        });
        addToResults(allResults, phoneticResults);
    } catch (e) {
        // Phonetic search not supported, that's okay
        console.log('Phonetic search not supported');
    }

    return Array.from(allResults.values());
}

/**
 * Add search results to the map, deduplicating by ID
 */
function addToResults(
    resultsMap: Map<string, FHIRPatientData>,
    bundle: FHIRBundle | null
) {
    if (!bundle?.entry) return;

    for (const entry of bundle.entry) {
        if (entry.resource?.id) {
            resultsMap.set(entry.resource.id, entry.resource);
        }
    }
}

/**
 * Extract display name from FHIR patient
 */
function extractName(patient: FHIRPatientData): string {
    const name = patient.name?.[0];
    if (!name) return 'Unknown';

    if (name.text) return name.text;

    const given = name.given?.join(' ') || '';
    const family = name.family || '';
    return `${given} ${family}`.trim() || 'Unknown';
}

/**
 * Get list of search strategies that will be used
 */
function getSearchStrategiesUsed(input: PatientInput): string[] {
    const strategies = [];
    if (input.mrn) strategies.push('MRN lookup');
    if (input.dob) strategies.push('Name + DOB search');
    strategies.push('Name search');
    strategies.push('Phonetic/fuzzy search');
    return strategies;
}

/**
 * Update patient lookup status
 */
async function updatePatientStatus(
    patientId: string,
    status: string,
    matchedPatientId: string | null,
    matchDetails: Record<string, unknown>,
    confidence?: number
) {
    await supabase
        .from('lookup_patients')
        .update({
            status,
            matched_patient_id: matchedPatientId,
            match_details: matchDetails,
            match_confidence: confidence || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', patientId);
}

/**
 * Update lookup request aggregate counts
 */
async function updateLookupRequestCounts(requestId: string) {
    const { data: patients } = await supabase
        .from('lookup_patients')
        .select('status')
        .eq('lookup_request_id', requestId);

    if (!patients) return;

    const matched = patients.filter(p => p.status === 'matched').length;
    const failed = patients.filter(p =>
        ['not_found', 'error'].includes(p.status)
    ).length;
    const needsReview = patients.filter(p =>
        ['multiple_matches', 'needs_review'].includes(p.status)
    ).length;
    const pending = patients.filter(p => p.status === 'pending').length;

    const isComplete = pending === 0;

    await supabase
        .from('lookup_requests')
        .update({
            matched_patients: matched,
            failed_patients: failed + needsReview, // Include needs_review in failed for now
            status: isComplete ? 'completed' : 'processing',
            completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq('id', requestId);
}

/**
 * Save or update patient record in database
 */
async function savePatientRecord(siteId: string, fhirPatient: FHIRPatientData) {
    const name = fhirPatient.name?.[0];
    const address = fhirPatient.address?.[0];

    // Find MRN in identifiers
    const mrn = fhirPatient.identifier?.find(i =>
        i.system?.toLowerCase().includes('mrn') ||
        i.system?.toLowerCase().includes('mr')
    )?.value;

    const { data, error } = await supabase
        .from('patient_records')
        .upsert({
            hospital_site_id: siteId,
            patient_fhir_id: fhirPatient.id,
            mrn,
            name_family: name?.family,
            name_given: name?.given?.join(' '),
            name_full: name?.text || `${name?.given?.join(' ') || ''} ${name?.family || ''}`.trim(),
            gender: fhirPatient.gender,
            birth_date: fhirPatient.birthDate,
            address_line: address?.line?.join(', '),
            address_city: address?.city,
            address_state: address?.state,
            address_postal: address?.postalCode,
            raw_fhir: fhirPatient,
            last_synced_at: new Date().toISOString(),
        }, {
            onConflict: 'hospital_site_id,patient_fhir_id',
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}
