import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/patients/[id] - Get full patient record with all related data
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createServiceClient();

        // Fetch patient with all related records
        const { data, error } = await supabase
            .from('patient_records')
            .select(`
        *,
        hospital_site:hospital_sites(id, name, fhir_base_url),
        coverage_records(*),
        claim_records(*),
        condition_records(*),
        encounter_records(*),
        procedure_records(*),
        medication_records(*),
        document_records(*)
      `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ patient: data });
    } catch (error) {
        console.error('Error fetching patient:', error);
        return NextResponse.json(
            { error: 'Failed to fetch patient' },
            { status: 500 }
        );
    }
}
