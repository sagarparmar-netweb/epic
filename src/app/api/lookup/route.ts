import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LookupPatientInput {
    name_first?: string;
    name_last: string;
    dob?: string;
    address_line?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
    date_of_service?: string;
    mrn?: string;
    ssn_last4?: string;
}

// POST /api/lookup - Create a new lookup request from CSV data
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { site_id, name, patients } = body as {
            site_id: string | null;
            name: string;
            patients: LookupPatientInput[];
        };

        if (!patients || !Array.isArray(patients) || patients.length === 0) {
            return NextResponse.json(
                { error: 'patients array is required' },
                { status: 400 }
            );
        }

        // Validate site exists IF provided
        if (site_id) {
            const { data: site } = await supabase
                .from('hospital_sites')
                .select('id, name')
                .eq('id', site_id)
                .single();

            if (!site) {
                return NextResponse.json({ error: 'Hospital site not found' }, { status: 404 });
            }
        }

        // Create lookup request
        const { data: lookupRequest, error: requestError } = await supabase
            .from('lookup_requests')
            .insert({
                hospital_site_id: site_id || null, // Allow null for global batch
                name: name || `Lookup ${new Date().toISOString()}`,
                total_patients: patients.length,
                status: 'pending',
            })
            .select()
            .single();

        if (requestError) {
            throw requestError;
        }

        // Insert lookup patients
        const lookupPatients = patients.map((p) => ({
            lookup_request_id: lookupRequest.id,
            input_name_first: p.name_first || null,
            input_name_last: p.name_last,
            input_dob: p.dob || null,
            input_address_line: p.address_line || null,
            input_address_city: p.address_city || null,
            input_address_state: p.address_state || null,
            input_address_zip: p.address_zip || null,
            input_date_of_service: p.date_of_service || null,
            input_mrn: p.mrn || null,
            input_ssn_last4: p.ssn_last4 || null,
            input_site_name: (p as any).site_name || null, // Capture site name from CSV
            status: 'pending',
        }));

        const { error: patientsError } = await supabase
            .from('lookup_patients')
            .insert(lookupPatients);

        if (patientsError) {
            throw patientsError;
        }

        return NextResponse.json({
            success: true,
            lookup_request: lookupRequest,
            message: `Created lookup request with ${patients.length} patients`,
        });
    } catch (error) {
        console.error('Lookup creation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create lookup' },
            { status: 500 }
        );
    }
}

// GET /api/lookup - List lookup requests
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('site_id');

        let query = supabase
            .from('lookup_requests')
            .select(`
        *,
        hospital_site:hospital_sites(id, name)
      `)
            .order('created_at', { ascending: false });

        if (siteId) {
            query = query.eq('hospital_site_id', siteId);
        }

        const { data, error } = await query.limit(50);

        if (error) throw error;

        return NextResponse.json({ lookup_requests: data });
    } catch (error) {
        console.error('Lookup list error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to list lookups' },
            { status: 500 }
        );
    }
}
