/**
 * Patient Matching Utilities
 * 
 * Implements a robust multi-criteria matching algorithm with confidence scoring
 * to ensure accurate patient identification when searching Epic.
 */

export interface PatientInput {
    name_first?: string;
    name_last: string;
    dob?: string; // YYYY-MM-DD
    address_line?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
    mrn?: string;
    ssn_last4?: string;
}

export interface FHIRPatientData {
    id: string;
    name?: Array<{
        family?: string;
        given?: string[];
        text?: string;
    }>;
    birthDate?: string;
    gender?: string;
    address?: Array<{
        line?: string[];
        city?: string;
        state?: string;
        postalCode?: string;
    }>;
    identifier?: Array<{
        system?: string;
        value?: string;
    }>;
}

export interface MatchResult {
    fhirPatient: FHIRPatientData;
    confidence: number; // 0-100
    matchDetails: {
        nameMatch: number;
        dobMatch: boolean;
        addressMatch: number;
        mrnMatch: boolean;
        factors: string[];
    };
}

/**
 * Normalize a string for comparison:
 * - Lowercase
 * - Remove extra whitespace
 * - Remove common prefixes/suffixes
 * - Handle accented characters
 */
function normalizeString(str: string | undefined | null): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }

    return dp[m][n];
}

/**
 * Calculate string similarity (0-1) using Levenshtein distance
 */
function stringSimilarity(s1: string, s2: string): number {
    const n1 = normalizeString(s1);
    const n2 = normalizeString(s2);

    if (n1 === n2) return 1;
    if (!n1 || !n2) return 0;

    const maxLen = Math.max(n1.length, n2.length);
    if (maxLen === 0) return 1;

    const distance = levenshteinDistance(n1, n2);
    return 1 - distance / maxLen;
}

/**
 * Match patient names with fuzzy matching support
 * Returns match score 0-100
 */
function matchNames(
    inputFirst: string | undefined,
    inputLast: string,
    fhirNames: FHIRPatientData['name']
): number {
    if (!fhirNames || fhirNames.length === 0) return 0;

    let bestScore = 0;

    for (const name of fhirNames) {
        const fhirLast = name.family || '';
        const fhirFirst = name.given?.join(' ') || '';
        const fhirFull = name.text || '';

        // Last name matching (most important)
        const lastNameSim = stringSimilarity(inputLast, fhirLast);

        // First name matching (if provided)
        let firstNameSim = 1; // Default to 1 if not provided
        if (inputFirst) {
            // Try matching against first given name
            const fhirFirstName = name.given?.[0] || '';
            firstNameSim = stringSimilarity(inputFirst, fhirFirstName);

            // Also try matching against full name text
            if (fhirFull) {
                const fullNameSim = stringSimilarity(`${inputFirst} ${inputLast}`, fhirFull);
                firstNameSim = Math.max(firstNameSim, fullNameSim);
            }
        }

        // Weight: Last name 60%, First name 40%
        const score = (lastNameSim * 0.6 + firstNameSim * 0.4) * 100;
        bestScore = Math.max(bestScore, score);
    }

    return bestScore;
}

/**
 * Match date of birth exactly
 */
function matchDOB(inputDOB: string | undefined, fhirDOB: string | undefined): boolean {
    if (!inputDOB || !fhirDOB) return false;

    // Normalize date formats
    const normalize = (d: string) => {
        // Try to parse various formats
        const parsed = new Date(d);
        if (isNaN(parsed.getTime())) return d;
        return parsed.toISOString().split('T')[0];
    };

    return normalize(inputDOB) === normalize(fhirDOB);
}

/**
 * Match address with fuzzy matching
 * Returns match score 0-100
 */
function matchAddress(
    input: {
        city?: string;
        state?: string;
        zip?: string;
        line?: string;
    },
    fhirAddresses: FHIRPatientData['address']
): number {
    if (!fhirAddresses || fhirAddresses.length === 0) return 0;

    // If no input address provided, skip address matching
    if (!input.city && !input.state && !input.zip) return 0;

    let bestScore = 0;

    for (const addr of fhirAddresses) {
        let matchPoints = 0;
        let totalPoints = 0;

        // City match (fuzzy)
        if (input.city) {
            totalPoints += 40;
            const citySim = stringSimilarity(input.city, addr.city || '');
            matchPoints += citySim * 40;
        }

        // State match (exact after normalization)
        if (input.state) {
            totalPoints += 30;
            const inputState = normalizeString(input.state);
            const fhirState = normalizeString(addr.state || '');
            if (inputState === fhirState ||
                inputState.length === 2 && fhirState.includes(inputState)) {
                matchPoints += 30;
            }
        }

        // Zip match (prefix match for zip+4)
        if (input.zip) {
            totalPoints += 30;
            const inputZip = input.zip.replace(/\D/g, '').slice(0, 5);
            const fhirZip = (addr.postalCode || '').replace(/\D/g, '').slice(0, 5);
            if (inputZip === fhirZip) {
                matchPoints += 30;
            }
        }

        const score = totalPoints > 0 ? (matchPoints / totalPoints) * 100 : 0;
        bestScore = Math.max(bestScore, score);
    }

    return bestScore;
}

/**
 * Match MRN (Medical Record Number)
 */
function matchMRN(
    inputMRN: string | undefined,
    fhirIdentifiers: FHIRPatientData['identifier']
): boolean {
    if (!inputMRN || !fhirIdentifiers) return false;

    const normalizedInput = inputMRN.replace(/\D/g, '');

    for (const id of fhirIdentifiers) {
        if (id.system?.toLowerCase().includes('mrn') ||
            id.system?.toLowerCase().includes('mr') ||
            id.system?.toLowerCase().includes('medical')) {
            const normalizedFhir = (id.value || '').replace(/\D/g, '');
            if (normalizedInput === normalizedFhir) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Calculate overall match confidence for a patient
 * 
 * Confidence levels:
 * - 95-100: Very high confidence (exact match on multiple criteria)
 * - 85-94: High confidence (strong match with DOB confirmation)
 * - 70-84: Moderate confidence (good match, may need review)
 * - 50-69: Low confidence (partial match, needs review)
 * - Below 50: Not a match
 */
export function calculateMatchConfidence(
    input: PatientInput,
    fhirPatient: FHIRPatientData
): MatchResult {
    const matchDetails = {
        nameMatch: 0,
        dobMatch: false,
        addressMatch: 0,
        mrnMatch: false,
        factors: [] as string[],
    };

    // Name matching (required)
    matchDetails.nameMatch = matchNames(input.name_first, input.name_last, fhirPatient.name);

    // DOB matching (very important for confirmation)
    matchDetails.dobMatch = matchDOB(input.dob, fhirPatient.birthDate);

    // Address matching
    matchDetails.addressMatch = matchAddress(
        {
            city: input.address_city,
            state: input.address_state,
            zip: input.address_zip,
            line: input.address_line,
        },
        fhirPatient.address
    );

    // MRN matching (if provided, this is a strong indicator)
    matchDetails.mrnMatch = matchMRN(input.mrn, fhirPatient.identifier);

    // Calculate confidence score
    let confidence = 0;

    // MRN match is the strongest indicator (if provided)
    if (matchDetails.mrnMatch) {
        confidence = 95;
        matchDetails.factors.push('MRN exact match');

        // Boost with name confirmation
        if (matchDetails.nameMatch >= 80) {
            confidence = 100;
            matchDetails.factors.push('Name confirmed');
        }
    } else {
        // Without MRN, use name + DOB as primary

        // Name contributes up to 50 points
        const namePoints = (matchDetails.nameMatch / 100) * 50;
        confidence += namePoints;

        if (matchDetails.nameMatch >= 90) {
            matchDetails.factors.push('Strong name match');
        } else if (matchDetails.nameMatch >= 70) {
            matchDetails.factors.push('Good name match');
        } else if (matchDetails.nameMatch >= 50) {
            matchDetails.factors.push('Partial name match');
        }

        // DOB match is critical - adds 30 points
        if (matchDetails.dobMatch) {
            confidence += 30;
            matchDetails.factors.push('DOB exact match');
        } else if (input.dob) {
            // DOB provided but didn't match - significant penalty
            confidence -= 20;
            matchDetails.factors.push('DOB mismatch');
        }

        // Address contributes up to 20 points
        const addressPoints = (matchDetails.addressMatch / 100) * 20;
        confidence += addressPoints;

        if (matchDetails.addressMatch >= 80) {
            matchDetails.factors.push('Address confirmed');
        } else if (matchDetails.addressMatch >= 50) {
            matchDetails.factors.push('Partial address match');
        }
    }

    // Ensure confidence is in valid range
    confidence = Math.max(0, Math.min(100, confidence));

    return {
        fhirPatient,
        confidence: Math.round(confidence * 100) / 100,
        matchDetails,
    };
}

/**
 * Rank and filter match results
 * Returns only matches above threshold, sorted by confidence
 */
export function rankMatches(
    results: MatchResult[],
    minConfidence: number = 50
): MatchResult[] {
    return results
        .filter(r => r.confidence >= minConfidence)
        .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Determine if a single match is definitive
 * Returns true if there's exactly one high-confidence match
 */
export function isDefinitiveMatch(results: MatchResult[]): boolean {
    const highConfidence = results.filter(r => r.confidence >= 85);

    if (highConfidence.length === 1) {
        return true;
    }

    if (highConfidence.length > 1) {
        // Check if there's a clear winner (>10 point difference)
        const sorted = highConfidence.sort((a, b) => b.confidence - a.confidence);
        return sorted[0].confidence - sorted[1].confidence >= 10;
    }

    return false;
}
